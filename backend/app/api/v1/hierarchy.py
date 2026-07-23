from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.hierarchy import HierarchyNode
from app.api.deps import get_meter_service
from app.services.meter_service import MeterService
from app.core.logging import logger

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])

@router.get("", response_model=List[HierarchyNode])
async def get_hierarchy(service: MeterService = Depends(get_meter_service)):
    """Retrieve normalized grid layout network tree (Zones, Circles, Transformers, Meters)."""
    logger.info("REST request: get_hierarchy")
    try:
        return await service.get_hierarchy()
    except Exception as e:
        logger.error(f"Error fetching hierarchy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy tree from legacy portal"
        )
