import pytest
from fastapi.testclient import TestClient
from mock_portal import app, SESSIONS, CSRF_TOKENS
from bs4 import BeautifulSoup

@pytest.fixture
def client():
    SESSIONS.clear()
    CSRF_TOKENS.clear()
    return TestClient(app)

def test_login_flow(client):
    # 1. Fetch login page and extract CSRF token
    response = client.get("/legacy/login")
    assert response.status_code == 200
    
    soup = BeautifulSoup(response.text, "html.parser")
    csrf_input = soup.find("input", {"id": "csrf_token"})
    assert csrf_input is not None
    csrf_token = csrf_input["value"]
    
    # Verify token added to in-memory store
    assert csrf_token in CSRF_TOKENS
    
    # 2. Try logging in with bad credentials
    bad_payload = {
        "username": "admin",
        "password": "wrongpassword",
        "csrf_token": csrf_token
    }
    # csrf_token will be popped/consumed in post_login, so we need to get another token first
    response = client.post("/legacy/login", data=bad_payload)
    assert response.status_code == 401
    
    # Get a fresh CSRF token
    response = client.get("/legacy/login")
    soup = BeautifulSoup(response.text, "html.parser")
    csrf_token = soup.find("input", {"id": "csrf_token"})["value"]
    
    # 3. Log in with correct credentials
    good_payload = {
        "username": "admin",
        "password": "password123",
        "csrf_token": csrf_token
    }
    response = client.post("/legacy/login", data=good_payload, follow_redirects=False)
    # Redirects (303) on success
    assert response.status_code == 303
    assert "urja_session_id" in response.cookies
    session_id = response.cookies["urja_session_id"]
    assert session_id in SESSIONS
    
    # 4. Check protected meters list page
    response = client.get("/legacy/meters", cookies={"urja_session_id": session_id})
    assert response.status_code == 200
    assert "Urja Meter Ops - Core Assets Table" in response.text
    
    # Check detail page
    response = client.get("/legacy/meters/1", cookies={"urja_session_id": session_id})
    assert response.status_code == 200
    assert "Meter Technical Spec Sheet" in response.text
    assert "FLK-001" in response.text

def test_unauthenticated_redirect(client):
    response = client.get("/legacy/meters", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == "/legacy/login"
