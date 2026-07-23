from pydantic import BaseModel
from typing import List

class ConsumptionReading(BaseModel):
    date: str
    energy_kwh: float
    reactive_kvarh: float
    demand_kw: float

class ConsumptionResponse(BaseModel):
    meter_id: str
    serial_number: str
    readings: List[ConsumptionReading]
