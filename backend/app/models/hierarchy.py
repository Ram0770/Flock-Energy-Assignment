from pydantic import BaseModel
from typing import List, Optional

class MeterNode(BaseModel):
    id: str
    serial_number: str
    status: str

class HierarchyNode(BaseModel):
    name: str
    type: str  # "zone", "circle", "substation", "transformer", "meter"
    children: Optional[List["HierarchyNode"]] = None
    meter: Optional[MeterNode] = None

# For self-referential models in Pydantic v2:
HierarchyNode.model_rebuild()
