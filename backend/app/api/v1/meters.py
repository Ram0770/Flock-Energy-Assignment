from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.meter import MeterBase, MeterDetail
from app.models.consumption import ConsumptionResponse
from app.api.deps import get_meter_service
from app.services.meter_service import MeterService
from app.core.logging import logger

router = APIRouter(prefix="/meters", tags=["Meters"])

@router.get("", response_model=List[MeterBase])
async def list_meters(service: MeterService = Depends(get_meter_service)):
    """Retrieve normalized list of all energy meters parsed from legacy portal."""
    logger.info("REST request: list_meters")
    try:
        return await service.get_meters()
    except Exception as e:
        logger.error(f"Error listing meters: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve meters from legacy portal"
        )

@router.get("/{meter_id}", response_model=MeterDetail)
async def get_meter_detail(
    meter_id: str,
    service: MeterService = Depends(get_meter_service)
):
    """Retrieve detailed specs for a specific meter by its ID, merging hierarchy details."""
    logger.info(f"REST request: get_meter_detail for ID {meter_id}")
    try:
        meter = await service.get_meter_detail(meter_id)
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter with ID {meter_id} not found on legacy portal"
            )
        return meter
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching meter details for ID {meter_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve meter details for ID {meter_id}"
        )

@router.get("/{meter_id}/consumption", response_model=ConsumptionResponse)
async def get_meter_consumption(
    meter_id: str,
    service: MeterService = Depends(get_meter_service)
):
    """Retrieve historical active energy, reactive energy, and max demand readings."""
    logger.info(f"REST request: get_meter_consumption for ID {meter_id}")
    try:
        consumption = await service.get_meter_consumption(meter_id)
        if not consumption:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter with ID {meter_id} not found on legacy portal"
            )
        return consumption
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consumption for ID {meter_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve consumption readings for ID {meter_id}"
        )
