from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any
from app.core.logging import logger

def parse_meters_list(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        logger.error("Meters table not found in legacy HTML")
        return []
        
    meters = []
    rows = table.find_all("tr")[1:]  # skip header row
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue
            
        meter_id = cols[0].get_text(strip=True)
        serial_number = cols[1].get_text(strip=True)
        
        # Parse location: "Place (lat: XX, lon: YY)"
        location_raw = cols[2].get_text(strip=True)
        location = location_raw
        latitude = 0.0
        longitude = 0.0
        
        coord_match = re.search(r"\(lat:\s*([\d\.-]+),\s*lon:\s*([\d\.-]+)\)", location_raw)
        if coord_match:
            try:
                latitude = float(coord_match.group(1))
                longitude = float(coord_match.group(2))
                # Remove coordinates from location name
                location = re.sub(r"\s*\(lat:.*?\)", "", location_raw).strip()
            except ValueError:
                logger.warning(f"Failed to parse coordinates for meter {serial_number}")
                
        phase = cols[3].get_text(strip=True)
        installation_date = cols[4].get_text(strip=True)
        status = cols[5].get_text(strip=True)
        
        meters.append({
            "id": meter_id,
            "serial_number": serial_number,
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "phase": phase,
            "installation_date": installation_date,
            "status": status
        })
    return meters

def parse_meter_detail(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    
    # Try parsing by element IDs (our mock portal uses them, which is a robust modern fallback)
    def get_by_id(element_id: str, default: str = "") -> str:
        elem = soup.find(id=element_id)
        return elem.get_text(strip=True) if elem else default

    meter_id = get_by_id("meter-id")
    serial_number = get_by_id("serial-number")
    location = get_by_id("location")
    phase = get_by_id("phase")
    installation_date = get_by_id("installation-date")
    status = get_by_id("status")
    
    # Clean units from voltage/current
    voltage_str = get_by_id("voltage").replace(" V", "")
    current_str = get_by_id("current").replace(" A", "")
    power_factor_str = get_by_id("power-factor")
    
    # Try parsing numbers
    try:
        latitude = float(get_by_id("latitude", "0.0"))
        longitude = float(get_by_id("longitude", "0.0"))
    except ValueError:
        latitude, longitude = 0.0, 0.0
        
    try:
        voltage = float(voltage_str) if voltage_str else 0.0
        current = float(current_str) if current_str else 0.0
        power_factor = float(power_factor_str) if power_factor_str else 0.0
    except ValueError:
        voltage, current, power_factor = 0.0, 0.0, 0.0
        
    # If IDs not present (e.g. legacy layout variation), fall back to parsing grid info keys
    if not meter_id:
        logger.info("IDs not found, falling back to parsing grid label-value pairs")
        info_grid = soup.find(class_="info-grid")
        if info_grid:
            divs = info_grid.find_all("div")
            data = {}
            for i in range(0, len(divs) - 1, 2):
                label = divs[i].get_text(strip=True).lower().replace(":", "")
                value = divs[i+1].get_text(strip=True)
                data[label] = value
                
            meter_id = data.get("internal id", "")
            serial_number = data.get("serial code", "")
            location = data.get("spatial location", "")
            phase = data.get("phase layout", "")
            installation_date = data.get("commission date", "")
            status = data.get("operational status", "")
            
            try:
                latitude = float(data.get("latitude", "0.0"))
                longitude = float(data.get("longitude", "0.0"))
                voltage = float(data.get("rms voltage", "0.0").replace(" V", ""))
                current = float(data.get("rms current", "0.0").replace(" A", ""))
                power_factor = float(data.get("power factor (cos phi)", "0.0"))
            except ValueError:
                pass

    # Extract zone/circle/substation/transformer context if present (from location or title, fallback to defaults)
    zone, circle, substation, transformer = "Unknown Zone", "Unknown Circle", "Unknown Substation", "Unknown Transformer"
    
    # We can infer hierarchical info or use parsed values if added to template. 
    # Let's inspect the hierarchy tree to map these properly in the service layer, or extract if they are in the spec.
    # In our mock details page, let's also support custom layout:
    return {
        "id": meter_id,
        "serial_number": serial_number,
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "phase": phase,
        "installation_date": installation_date,
        "status": status,
        "voltage": voltage,
        "current": current,
        "power_factor": power_factor,
        "zone": zone,
        "circle": circle,
        "substation": substation,
        "transformer": transformer
    }

def parse_consumption_table(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        logger.error("Consumption table not found in legacy HTML")
        return []
        
    readings = []
    rows = table.find_all("tr")[1:]  # skip header row
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 4:
            continue
            
        date = cols[0].get_text(strip=True)
        try:
            energy = float(cols[1].get_text(strip=True))
            reactive = float(cols[2].get_text(strip=True))
            demand = float(cols[3].get_text(strip=True))
        except ValueError:
            logger.warning(f"Error parsing consumption row float values on date {date}")
            energy, reactive, demand = 0.0, 0.0, 0.0
            
        readings.append({
            "date": date,
            "energy_kwh": energy,
            "reactive_kvarh": reactive,
            "demand_kw": demand
        })
    return readings

def parse_hierarchy_tree(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    tree_container = soup.find(id="tree-container")
    if not tree_container:
        logger.error("Tree container not found in hierarchy HTML")
        return []
        
    # Helper to recursively parse <ul> lists
    def parse_ul(ul_elem, depth=0) -> List[Dict[str, Any]]:
        nodes = []
        if not ul_elem:
            return nodes
            
        for li in ul_elem.find_all("li", recursive=False):
            # Try to get branch name
            branch_span = li.find("span", class_="node-branch", recursive=False)
            if branch_span:
                branch_text = branch_span.get_text(strip=True)
                # Split key/value e.g. "Zone: East Zone"
                parts = branch_text.split(":", 1)
                name = parts[1].strip() if len(parts) > 1 else branch_text
                node_type = parts[0].strip().lower()
                
                # Check for nested ul
                child_ul = li.find("ul", recursive=False)
                children = parse_ul(child_ul, depth + 1) if child_ul else []
                
                nodes.append({
                    "name": name,
                    "type": node_type,
                    "children": children,
                    "meter": None
                })
            else:
                # Check if it's a meter leaf node
                # Structure: "Meter Node: <a href...>FLK-001</a> (Active)"
                li_text = li.get_text(strip=True)
                link = li.find("a", class_="meter-link", recursive=False)
                if link:
                    serial = link.get_text(strip=True)
                    meter_id = link["href"].split("/")[-1]
                    # Extract status from text like "(Active)"
                    status_match = re.search(r"\((.*?)\)", li_text)
                    status = status_match.group(1) if status_match else "Unknown"
                    
                    nodes.append({
                        "name": serial,
                        "type": "meter",
                        "children": None,
                        "meter": {
                            "id": meter_id,
                            "serial_number": serial,
                            "status": status
                        }
                    })
        return nodes

    root_ul = tree_container.find("ul", recursive=False)
    return parse_ul(root_ul)
