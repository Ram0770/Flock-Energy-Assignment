export interface Meter {
  id: string;
  serial_number: string;
  location: string;
  latitude: number;
  longitude: number;
  phase: string;
  installation_date: string;
  status: string;
}

export interface MeterDetail extends Meter {
  voltage: number;
  current: number;
  power_factor: number;
  zone: string;
  circle: string;
  substation: string;
  transformer: string;
}

export interface ConsumptionReading {
  date: string;
  energy_kwh: number;
  reactive_kvarh: number;
  demand_kw: number;
}

export interface ConsumptionResponse {
  meter_id: string;
  serial_number: string;
  readings: ConsumptionReading[];
}

export interface HierarchyNode {
  name: string;
  type: string;
  children: HierarchyNode[] | null;
  meter: {
    id: string;
    serial_number: string;
    status: string;
  } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Mock Fallback Data in case the backend server is unreachable
const MOCK_METERS: Meter[] = [
  { id: "1", serial_number: "FLK-001", location: "Indiranagar, Bangalore", latitude: 12.971897, longitude: 77.641151, phase: "Three Phase", installation_date: "2024-01-15", status: "Active" },
  { id: "2", serial_number: "FLK-002", location: "Koramangala, Bangalore", latitude: 12.935192, longitude: 77.624462, phase: "Three Phase", installation_date: "2024-02-10", status: "Active" },
  { id: "3", serial_number: "FLK-003", location: "HSR Layout, Bangalore", latitude: 12.912784, longitude: 77.638687, phase: "Single Phase", installation_date: "2024-03-01", status: "Active" },
  { id: "4", serial_number: "FLK-004", location: "Jayanagar, Bangalore", latitude: 12.930773, longitude: 77.583830, phase: "Three Phase", installation_date: "2024-01-20", status: "Inactive" },
  { id: "5", serial_number: "FLK-005", location: "Malleshwaram, Bangalore", latitude: 12.996160, longitude: 77.571408, phase: "Single Phase", installation_date: "2024-04-12", status: "Active" },
  { id: "6", serial_number: "FLK-006", location: "Whitefield, Bangalore", latitude: 12.969818, longitude: 77.749972, phase: "Three Phase", installation_date: "2023-11-05", status: "Faulty" },
];

const MOCK_METER_DETAILS: Record<string, MeterDetail> = {
  "1": { ...MOCK_METERS[0], voltage: 238.4, current: 12.5, power_factor: 0.95, zone: "East Zone", circle: "Circle Alpha", substation: "Substation-101", transformer: "DT-01" },
  "2": { ...MOCK_METERS[1], voltage: 240.1, current: 8.2, power_factor: 0.92, zone: "East Zone", circle: "Circle Alpha", substation: "Substation-101", transformer: "DT-01" },
  "3": { ...MOCK_METERS[2], voltage: 231.2, current: 4.5, power_factor: 0.89, zone: "East Zone", circle: "Circle Beta", substation: "Substation-102", transformer: "DT-02" },
  "4": { ...MOCK_METERS[3], voltage: 0.0, current: 0.0, power_factor: 0.0, zone: "West Zone", circle: "Circle Gamma", substation: "Substation-201", transformer: "DT-03" },
  "5": { ...MOCK_METERS[4], voltage: 229.8, current: 5.1, power_factor: 0.91, zone: "West Zone", circle: "Circle Delta", substation: "Substation-202", transformer: "DT-04" },
  "6": { ...MOCK_METERS[5], voltage: 180.5, current: 1.2, power_factor: 0.45, zone: "East Zone", circle: "Circle Alpha", substation: "Substation-101", transformer: "DT-05" },
};

function generateMockReadings(id: string, status: string): ConsumptionReading[] {
  const readings: ConsumptionReading[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30);
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    
    let energy = 0;
    let reactive = 0;
    let demand = 0;
    
    if (status === "Active") {
      const isThree = id === "1" || id === "2";
      const mult = isThree ? 4 : 1;
      energy = parseFloat((Math.random() * 20 + 10 * mult).toFixed(2));
      reactive = parseFloat((energy * (Math.random() * 0.2 + 0.1)).toFixed(2));
      demand = parseFloat((Math.random() * 6 + 2 * mult).toFixed(2));
    } else if (status === "Faulty") {
      energy = parseFloat((Math.random() * 2 + 0.1).toFixed(2));
      reactive = parseFloat((energy * 0.1).toFixed(2));
      demand = parseFloat((Math.random() * 0.4).toFixed(2));
    }
    
    readings.push({ date: dateStr, energy_kwh: energy, reactive_kvarh: reactive, demand_kw: demand });
  }
  return readings.reverse();
}

const MOCK_HIERARCHY: HierarchyNode[] = [
  {
    name: "East Zone",
    type: "zone",
    children: [
      {
        name: "Circle Alpha",
        type: "circle",
        children: [
          {
            name: "Substation-101",
            type: "substation",
            children: [
              {
                name: "DT-01",
                type: "transformer",
                children: [
                  { name: "FLK-001", type: "meter", children: null, meter: { id: "1", serial_number: "FLK-001", status: "Active" } },
                  { name: "FLK-002", type: "meter", children: null, meter: { id: "2", serial_number: "FLK-002", status: "Active" } },
                ],
                meter: null,
              },
              {
                name: "DT-05",
                type: "transformer",
                children: [
                  { name: "FLK-006", type: "meter", children: null, meter: { id: "6", serial_number: "FLK-006", status: "Faulty" } },
                ],
                meter: null,
              }
            ],
            meter: null,
          }
        ],
        meter: null,
      },
      {
        name: "Circle Beta",
        type: "circle",
        children: [
          {
            name: "Substation-102",
            type: "substation",
            children: [
              {
                name: "DT-02",
                type: "transformer",
                children: [
                  { name: "FLK-003", type: "meter", children: null, meter: { id: "3", serial_number: "FLK-003", status: "Active" } },
                ],
                meter: null,
              }
            ],
            meter: null,
          }
        ],
        meter: null,
      }
    ],
    meter: null,
  },
  {
    name: "West Zone",
    type: "zone",
    children: [
      {
        name: "Circle Gamma",
        type: "circle",
        children: [
          {
            name: "Substation-201",
            type: "substation",
            children: [
              {
                name: "DT-03",
                type: "transformer",
                children: [
                  { name: "FLK-004", type: "meter", children: null, meter: { id: "4", serial_number: "FLK-004", status: "Inactive" } },
                ],
                meter: null,
              }
            ],
            meter: null,
          }
        ],
        meter: null,
      },
      {
        name: "Circle Delta",
        type: "circle",
        children: [
          {
            name: "Substation-202",
            type: "substation",
            children: [
              {
                name: "DT-04",
                type: "transformer",
                children: [
                  { name: "FLK-005", type: "meter", children: null, meter: { id: "5", serial_number: "FLK-005", status: "Active" } },
                ],
                meter: null,
              }
            ],
            meter: null,
          }
        ],
        meter: null,
      }
    ],
    meter: null,
  }
];

export async function fetchMeters(): Promise<Meter[]> {
  try {
    const res = await fetch(`${API_BASE}/meters`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.warn("Using fallback mock meters due to connection failure:", error);
    return MOCK_METERS;
  }
}

export async function fetchMeterDetail(id: string): Promise<MeterDetail> {
  try {
    const res = await fetch(`${API_BASE}/meters/${id}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.warn(`Using fallback mock meter details for ID ${id}:`, error);
    return MOCK_METER_DETAILS[id] || {
      id,
      serial_number: `FLK-00${id}`,
      location: "Unknown Location",
      latitude: 12.97,
      longitude: 77.59,
      phase: "Single Phase",
      installation_date: "2024-01-01",
      status: "Inactive",
      voltage: 0,
      current: 0,
      power_factor: 0,
      zone: "Unknown",
      circle: "Unknown",
      substation: "Unknown",
      transformer: "Unknown",
    };
  }
}

export async function fetchMeterConsumption(id: string): Promise<ConsumptionResponse> {
  try {
    const res = await fetch(`${API_BASE}/meters/${id}/consumption`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.warn(`Using fallback mock consumption data for ID ${id}:`, error);
    const meter = MOCK_METERS.find((m) => m.id === id) || { serial_number: `FLK-00${id}`, status: "Inactive" };
    return {
      meter_id: id,
      serial_number: meter.serial_number,
      readings: generateMockReadings(id, meter.status),
    };
  }
}

export async function fetchHierarchy(): Promise<HierarchyNode[]> {
  try {
    const res = await fetch(`${API_BASE}/hierarchy`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.warn("Using fallback mock hierarchy due to connection failure:", error);
    return MOCK_HIERARCHY;
  }
}
