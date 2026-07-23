from fastapi import Request
from app.services.meter_service import MeterService

def get_meter_service(request: Request) -> MeterService:
    """Dependency injection provider for MeterService."""
    client = request.app.state.urja_client
    cache = request.app.state.cache_repository
    return MeterService(client, cache)
