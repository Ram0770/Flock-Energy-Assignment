import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from app.adapters.urja_client import UrjaClient, LegacySessionError

@pytest.mark.asyncio
async def test_urja_client_csrf_extraction():
    client = UrjaClient()
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.text = '<html><input type="hidden" name="csrf_token" value="test-token-123"></html>'
    
    with patch.object(client.client, 'get', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        token = await client._get_csrf_token()
        assert token == "test-token-123"
        mock_get.assert_called_once_with("/legacy/login")

@pytest.mark.asyncio
async def test_urja_client_login_success():
    client = UrjaClient()
    
    # Mock CSRF extraction
    mock_csrf_resp = MagicMock(spec=httpx.Response)
    mock_csrf_resp.status_code = 200
    mock_csrf_resp.text = '<html><input type="hidden" name="csrf_token" value="token-abc"></html>'
    
    # Mock login redirect POST response
    mock_login_resp = MagicMock(spec=httpx.Response)
    mock_login_resp.status_code = 303
    mock_login_resp.cookies = {"urja_session_id": "session-xyz"}
    
    with patch.object(client.client, 'get', new_callable=AsyncMock) as mock_get, \
         patch.object(client.client, 'post', new_callable=AsyncMock) as mock_post:
         
        mock_get.return_value = mock_csrf_resp
        mock_post.return_value = mock_login_resp
        
        await client.login()
        assert client.session_cookies == {"urja_session_id": "session-xyz"}
        mock_post.assert_called_once_with(
            "/legacy/login",
            data={"username": "admin", "password": "password123", "csrf_token": "token-abc"}
        )

@pytest.mark.asyncio
async def test_urja_client_auto_relogin_on_redirect():
    client = UrjaClient()
    client.session_cookies = {"urja_session_id": "old-session"}
    
    # First request returns 302 redirecting to login page (session expired)
    mock_redirect_resp = MagicMock(spec=httpx.Response)
    mock_redirect_resp.status_code = 302
    mock_redirect_resp.headers = {"Location": "/legacy/login"}
    
    # Second request (after re-login) returns success
    mock_success_resp = MagicMock(spec=httpx.Response)
    mock_success_resp.status_code = 200
    mock_success_resp.text = "Meters HTML Data"
    
    # Mock login process
    mock_csrf_resp = MagicMock(spec=httpx.Response)
    mock_csrf_resp.status_code = 200
    mock_csrf_resp.text = '<html><input type="hidden" name="csrf_token" value="token-abc"></html>'
    
    mock_login_resp = MagicMock(spec=httpx.Response)
    mock_login_resp.status_code = 303
    mock_login_resp.cookies = {"urja_session_id": "new-session"}
    
    with patch.object(client.client, 'request', new_callable=AsyncMock) as mock_req, \
         patch.object(client.client, 'get', new_callable=AsyncMock) as mock_get, \
         patch.object(client.client, 'post', new_callable=AsyncMock) as mock_post:
         
        # request returns redirect first, then success
        mock_req.side_effect = [mock_redirect_resp, mock_success_resp]
        mock_get.return_value = mock_csrf_resp
        mock_post.return_value = mock_login_resp
        
        res = await client.request_with_auth("GET", "/legacy/meters")
        assert res.text == "Meters HTML Data"
        assert client.session_cookies == {"urja_session_id": "new-session"}
        
        # Verify it requested twice
        assert mock_req.call_count == 2
