from pydantic import BaseModel
from typing import List, Optional

class MeterBase(BaseModel):
    id: str
    serial_number: str
    location: str
    latitude: float
    longitude: float
    phase: str
    installation_date: str
    status: str

class MeterDetail(MeterBase):
    voltage: float
    current: float
    power_factor: float
    zone: str
    circle: str
    substation: str
    transformer: str
