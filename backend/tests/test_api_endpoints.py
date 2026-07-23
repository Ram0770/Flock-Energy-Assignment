import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app
from app.api.deps import get_meter_service
from app.models.meter import MeterBase, MeterDetail
from app.models.consumption import ConsumptionResponse
from app.models.hierarchy import HierarchyNode

@pytest.fixture
def client_and_mock():
    mock_service = MagicMock()
    app.dependency_overrides[get_meter_service] = lambda: mock_service
    with TestClient(app) as c:
        yield c, mock_service
    app.dependency_overrides.clear()

def test_list_meters_api(client_and_mock):
    client, mock_service = client_and_mock
    mock_service.get_meters = AsyncMock(return_value=[
        MeterBase(
            id="1",
            serial_number="FLK-001",
            location="Indiranagar",
            latitude=12.97,
            longitude=77.64,
            phase="Three Phase",
            installation_date="2024-01-01",
            status="Active"
        )
    ])
    
    response = client.get("/api/v1/meters")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["serial_number"] == "FLK-001"

def test_get_meter_detail_api(client_and_mock):
    client, mock_service = client_and_mock
    mock_service.get_meter_detail = AsyncMock(return_value=MeterDetail(
        id="1",
        serial_number="FLK-001",
        location="Indiranagar",
        latitude=12.97,
        longitude=77.64,
        phase="Three Phase",
        installation_date="2024-01-01",
        status="Active",
        voltage=240.0,
        current=10.0,
        power_factor=0.95,
        zone="East Zone",
        circle="Circle Alpha",
        substation="Sub-1",
        transformer="DT-1"
    ))
    
    response = client.get("/api/v1/meters/1")
    assert response.status_code == 200
    data = response.json()
    assert data["serial_number"] == "FLK-001"
    assert data["voltage"] == 240.0
    assert data["zone"] == "East Zone"

def test_get_meter_consumption_api(client_and_mock):
    client, mock_service = client_and_mock
    mock_service.get_meter_consumption = AsyncMock(return_value=ConsumptionResponse(
        meter_id="1",
        serial_number="FLK-001",
        readings=[
            {"date": "2024-06-01", "energy_kwh": 20.5, "reactive_kvarh": 3.0, "demand_kw": 4.5}
        ]
    ))
    
    response = client.get("/api/v1/meters/1/consumption")
    assert response.status_code == 200
    data = response.json()
    assert data["meter_id"] == "1"
    assert len(data["readings"]) == 1
    assert data["readings"][0]["energy_kwh"] == 20.5

def test_get_hierarchy_api(client_and_mock):
    client, mock_service = client_and_mock
    mock_service.get_hierarchy = AsyncMock(return_value=[
        HierarchyNode(
            name="East Zone",
            type="zone",
            children=[]
        )
    ])
    
    response = client.get("/api/v1/hierarchy")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "East Zone"
    assert data[0]["type"] == "zone"
