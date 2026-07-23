from typing import List, Dict, Any, Optional
from app.adapters.urja_client import UrjaClient
from app.adapters.parser import (
    parse_meters_list,
    parse_meter_detail,
    parse_consumption_table,
    parse_hierarchy_tree
)
from app.repositories.cache import CacheRepository
from app.models.meter import MeterBase, MeterDetail
from app.models.consumption import ConsumptionReading, ConsumptionResponse
from app.models.hierarchy import HierarchyNode, MeterNode
from app.core.logging import logger

class MeterService:
    def __init__(self, client: UrjaClient, cache: CacheRepository):
        self.client = client
        self.cache = cache

    async def get_meters(self) -> List[MeterBase]:
        cache_key = "meters_list"
        cached = await self.cache.get(cache_key)
        if cached:
            return [MeterBase(**item) for item in cached]
            
        logger.info("Cache miss for meter list. Scraping legacy portal...")
        html = await self.client.get_meters_html()
        parsed_meters = parse_meters_list(html)
        
        # Save to cache
        await self.cache.set(cache_key, parsed_meters)
        return [MeterBase(**item) for item in parsed_meters]

    async def get_hierarchy(self) -> List[HierarchyNode]:
        cache_key = "hierarchy_tree"
        cached = await self.cache.get(cache_key)
        if cached:
            return [HierarchyNode(**item) for item in cached]
            
        logger.info("Cache miss for hierarchy. Scraping legacy portal...")
        html = await self.client.get_hierarchy_html()
        parsed_tree = parse_hierarchy_tree(html)
        
        await self.cache.set(cache_key, parsed_tree)
        return [HierarchyNode(**item) for item in parsed_tree]

    def _find_meter_path(self, nodes: List[Dict[str, Any]], meter_id: str, current_path: Dict[str, str]) -> Optional[Dict[str, str]]:
        """Helper to recursively scan hierarchy list to find the parent path of a meter."""
        for node in nodes:
            node_type = node.get("type", "")
            node_name = node.get("name", "")
            
            # Make a copy of the path with the current node added
            new_path = current_path.copy()
            if node_type in ["zone", "circle", "substation", "transformer"]:
                new_path[node_type] = node_name
                
            # Check children
            children = node.get("children")
            if children:
                res = self._find_meter_path(children, meter_id, new_path)
                if res:
                    return res
                    
            # Check meter leaf
            meter = node.get("meter")
            if meter and str(meter.get("id")) == str(meter_id):
                return new_path
        return None

    async def get_meter_detail(self, meter_id: str) -> Optional[MeterDetail]:
        cache_key = f"meter_detail:{meter_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return MeterDetail(**cached)
            
        logger.info(f"Cache miss for meter detail {meter_id}. Scraping legacy portal...")
        try:
            detail_html = await self.client.get_meter_detail_html(meter_id)
        except Exception:
            logger.error(f"Meter details page not found on legacy portal for ID {meter_id}")
            return None
            
        detail_data = parse_meter_detail(detail_html)
        
        # Populate hierarchy information by looking it up in the grid hierarchy
        hierarchy_data = await self.get_hierarchy()
        # Convert Pydantic objects back to dict for traversal helper
        raw_hierarchy = [node.model_dump() for node in hierarchy_data]
        
        path = self._find_meter_path(raw_hierarchy, meter_id, {})
        if path:
            detail_data["zone"] = path.get("zone", "Unknown Zone")
            detail_data["circle"] = path.get("circle", "Unknown Circle")
            detail_data["substation"] = path.get("substation", "Unknown Substation")
            detail_data["transformer"] = path.get("transformer", "Unknown Transformer")
        else:
            logger.warning(f"Could not find hierarchy path for meter ID {meter_id} in tree")
            
        await self.cache.set(cache_key, detail_data)
        return MeterDetail(**detail_data)

    async def get_meter_consumption(self, meter_id: str) -> Optional[ConsumptionResponse]:
        cache_key = f"meter_consumption:{meter_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return ConsumptionResponse(**cached)
            
        # Get basic info to map the serial number
        meter_info = await self.get_meter_detail(meter_id)
        if not meter_info:
            return None
            
        logger.info(f"Cache miss for meter consumption {meter_id}. Scraping legacy portal...")
        html = await self.client.get_consumption_html(meter_id)
        parsed_readings = parse_consumption_table(html)
        
        response_data = {
            "meter_id": meter_id,
            "serial_number": meter_info.serial_number,
            "readings": parsed_readings
        }
        
        await self.cache.set(cache_key, response_data)
        return ConsumptionResponse(**response_data)
