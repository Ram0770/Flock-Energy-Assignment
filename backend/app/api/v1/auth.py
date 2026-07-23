from fastapi import APIRouter, Depends, HTTPException, status
from app.models.auth import LoginRequest, LoginResponse
from app.api.deps import get_meter_service
from app.services.meter_service import MeterService
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    service: MeterService = Depends(get_meter_service)
):
    """
    Simulates user login on the API wrapper.
    Verifies connection credentials to the underlying legacy portal.
    """
    logger.info(f"API Login attempt for user: {payload.username}")
    
    # We can verify connection to legacy portal by forcing a login check
    try:
        await service.client.login()
    except Exception as e:
        logger.error(f"Legacy portal authentication validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cannot connect/authenticate to legacy portal: {str(e)}"
        )
        
    # Standard dummy credential check for the wrapper itself
    if payload.username == "admin" and payload.password == "password123":
        logger.info("API authentication successful")
        return LoginResponse(
            success=True,
            message="Authenticated successfully with wrapper and legacy portal",
            token="flock_energy_session_token_secure_jwt_mock"
        )
        
    logger.warning("API authentication failed: Invalid credentials")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials for API access"
    )
