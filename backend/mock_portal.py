import uuid
from fastapi import FastAPI, Request, Response, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Dict, List, Set
import random
from datetime import datetime, timedelta

app = FastAPI(title="Legacy Urja Meter Ops Portal - Mock")

# In-memory session store & CSRF store
SESSIONS: Set[str] = set()
CSRF_TOKENS: Set[str] = set()

# Mock Database
METERS = [
    {
        "id": "1",
        "serial_number": "FLK-001",
        "location": "Indiranagar, Bangalore",
        "lat": 12.971897,
        "lon": 77.641151,
        "phase": "Three Phase",
        "installation_date": "2024-01-15",
        "status": "Active",
        "voltage": 238.4,
        "current": 12.5,
        "power_factor": 0.95,
        "zone": "East Zone",
        "circle": "Circle Alpha",
        "substation": "Substation-101",
        "transformer": "DT-01"
    },
    {
        "id": "2",
        "serial_number": "FLK-002",
        "location": "Koramangala, Bangalore",
        "lat": 12.935192,
        "lon": 77.624462,
        "phase": "Three Phase",
        "installation_date": "2024-02-10",
        "status": "Active",
        "voltage": 240.1,
        "current": 8.2,
        "power_factor": 0.92,
        "zone": "East Zone",
        "circle": "Circle Alpha",
        "substation": "Substation-101",
        "transformer": "DT-01"
    },
    {
        "id": "3",
        "serial_number": "FLK-003",
        "location": "HSR Layout, Bangalore",
        "lat": 12.912784,
        "lon": 77.638687,
        "phase": "Single Phase",
        "installation_date": "2024-03-01",
        "status": "Active",
        "voltage": 231.2,
        "current": 4.5,
        "power_factor": 0.89,
        "zone": "East Zone",
        "circle": "Circle Beta",
        "substation": "Substation-102",
        "transformer": "DT-02"
    },
    {
        "id": "4",
        "serial_number": "FLK-004",
        "location": "Jayanagar, Bangalore",
        "lat": 12.930773,
        "lon": 77.583830,
        "phase": "Three Phase",
        "installation_date": "2024-01-20",
        "status": "Inactive",
        "voltage": 0.0,
        "current": 0.0,
        "power_factor": 0.00,
        "zone": "West Zone",
        "circle": "Circle Gamma",
        "substation": "Substation-201",
        "transformer": "DT-03"
    },
    {
        "id": "5",
        "serial_number": "FLK-005",
        "location": "Malleshwaram, Bangalore",
        "lat": 12.996160,
        "lon": 77.571408,
        "phase": "Single Phase",
        "installation_date": "2024-04-12",
        "status": "Active",
        "voltage": 229.8,
        "current": 5.1,
        "power_factor": 0.91,
        "zone": "West Zone",
        "circle": "Circle Delta",
        "substation": "Substation-202",
        "transformer": "DT-04"
    },
    {
        "id": "6",
        "serial_number": "FLK-006",
        "location": "Whitefield, Bangalore",
        "lat": 12.969818,
        "lon": 77.749972,
        "phase": "Three Phase",
        "installation_date": "2023-11-05",
        "status": "Faulty",
        "voltage": 180.5,
        "current": 1.2,
        "power_factor": 0.45,
        "zone": "East Zone",
        "circle": "Circle Alpha",
        "substation": "Substation-101",
        "transformer": "DT-05"
    }
]

# Generate consumption readings for past 30 days
def generate_consumption(meter_id: str) -> List[Dict]:
    readings = []
    base_date = datetime.now() - timedelta(days=30)
    random.seed(int(meter_id))  # Consistent data per meter
    
    # Faulty/Inactive meters have zero or very low usage
    meter = next((m for m in METERS if m["id"] == meter_id), None)
    status = meter["status"] if meter else "Active"
    
    for i in range(30):
        date_str = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        if status == "Inactive":
            energy = 0.0
            reactive = 0.0
            demand = 0.0
        elif status == "Faulty":
            energy = round(random.uniform(0.1, 2.0), 2)
            reactive = round(random.uniform(0.1, 1.5), 2)
            demand = round(random.uniform(0.1, 0.5), 2)
        else:
            is_three_phase = meter["phase"] == "Three Phase"
            energy_multiplier = 4.0 if is_three_phase else 1.0
            energy = round(random.uniform(10.0, 30.0) * energy_multiplier, 2)
            reactive = round(energy * random.uniform(0.1, 0.3), 2)
            demand = round(random.uniform(2.0, 8.0) * energy_multiplier, 2)
            
        readings.append({
            "date": date_str,
            "energy_kwh": energy,
            "reactive_kvarh": reactive,
            "demand_kw": demand
        })
    # Sort reverse chronological (legacy systems like new data on top)
    readings.reverse()
    return readings

# Helper dependency to check session cookie
def verify_session(request: Request):
    session_id = request.cookies.get("urja_session_id")
    if not session_id or session_id not in SESSIONS:
        raise HTTPException(
            status_code=302,
            detail="Session expired",
            headers={"Location": "/legacy/login"}
        )
    return session_id

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 302:
        return RedirectResponse(url=exc.headers.get("Location", "/legacy/login"), status_code=302)
    return HTMLResponse(
        content=f"<html><head><title>Urja Portal Error</title></head><body><h1>Legacy Portal Error</h1><p>{exc.detail}</p><a href='/legacy/login'>Go to Login</a></body></html>",
        status_code=exc.status_code
    )

@app.get("/legacy/login", response_class=HTMLResponse)
async def get_login():
    csrf_token = str(uuid.uuid4())
    CSRF_TOKENS.add(csrf_token)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Urja Meter Operations Portal - Login</title>
        <style>
            body {{ font-family: "Courier New", Courier, monospace; background-color: #f0f0f0; margin: 50px; }}
            .login-box {{ background-color: white; border: 3px double #333; padding: 20px; width: 350px; margin: 0 auto; }}
            h2 {{ text-align: center; color: darkblue; margin-top: 0; }}
            .form-group {{ margin-bottom: 15px; }}
            label {{ display: block; margin-bottom: 5px; font-weight: bold; }}
            input[type="text"], input[type="password"] {{ width: 93%; padding: 8px; border: 1px solid #777; }}
            button {{ width: 100%; padding: 10px; background-color: darkblue; color: white; border: none; font-weight: bold; cursor: pointer; }}
            button:hover {{ background-color: blue; }}
            .footer {{ text-align: center; font-size: 11px; margin-top: 20px; color: #555; }}
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>URJA PORTAL LOGIN</h2>
            <form action="/legacy/login" method="POST">
                <input type="hidden" name="csrf_token" id="csrf_token" value="{csrf_token}">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">SUBMIT ACCESS REQUEST</button>
            </form>
            <div class="footer">WARNING: Unauthorized access is strictly prohibited.</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.post("/legacy/login")
async def post_login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    csrf_token: str = Form(...)
):
    if csrf_token not in CSRF_TOKENS:
        return HTMLResponse(
            content="<html><body><h1>CSRF Validation Failed!</h1><p>Security token is missing or expired.</p><a href='/legacy/login'>Try Again</a></body></html>",
            status_code=400
        )
    
    # Cleanup token after use to match strict legacy CSRF implementation
    CSRF_TOKENS.remove(csrf_token)
    
    if username == "admin" and password == "password123":
        session_id = str(uuid.uuid4())
        SESSIONS.add(session_id)
        response = RedirectResponse(url="/legacy/meters", status_code=303)
        response.set_cookie(key="urja_session_id", value=session_id, path="/")
        return response
    
    return HTMLResponse(
        content="<html><body><h1>Invalid Credentials!</h1><p>The username or password was incorrect.</p><a href='/legacy/login'>Try Again</a></body></html>",
        status_code=401
    )

@app.post("/legacy/logout")
async def post_logout(response: Response, session_id: str = Depends(verify_session)):
    if session_id in SESSIONS:
        SESSIONS.remove(session_id)
    response = RedirectResponse(url="/legacy/login", status_code=303)
    response.delete_cookie("urja_session_id", path="/")
    return response

@app.get("/legacy/meters", response_class=HTMLResponse)
async def get_meters(session_id: str = Depends(verify_session)):
    rows = ""
    for meter in METERS:
        rows += f"""
        <tr class="meter-row">
            <td>{meter["id"]}</td>
            <td class="serial-num">{meter["serial_number"]}</td>
            <td>{meter["location"]} (lat: {meter["lat"]}, lon: {meter["lon"]})</td>
            <td>{meter["phase"]}</td>
            <td>{meter["installation_date"]}</td>
            <td><span class="status-badge" style="color: {'green' if meter['status'] == 'Active' else 'gray' if meter['status'] == 'Inactive' else 'red'}; font-weight: bold;">{meter["status"]}</span></td>
            <td>
                <a href="/legacy/meters/{meter["id"]}" class="btn-action">Inspect</a> | 
                <a href="/legacy/meters/{meter["id"]}/consumption" class="btn-action">Consumption</a>
            </td>
        </tr>
        """
        
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Urja Meter Ops Portal - Dashboard</title>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #eef1f5; margin: 20px; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid darkblue; padding-bottom: 10px; }}
            h1 {{ color: darkblue; }}
            table {{ width: 100%; border-collapse: collapse; background-color: white; margin-top: 20px; }}
            th, td {{ padding: 12px; border: 1px solid #ccc; text-align: left; }}
            th {{ background-color: darkblue; color: white; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
            .btn-action {{ color: darkblue; text-decoration: none; font-weight: bold; }}
            .btn-action:hover {{ text-decoration: underline; }}
            .logout-form {{ display: inline; }}
            .logout-btn {{ background-color: darkred; color: white; border: none; padding: 8px 12px; cursor: pointer; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Urja Meter Ops - Core Assets Table</h1>
            <div>
                <span>Welcome, Operator admin | </span>
                <form action="/legacy/logout" method="POST" class="logout-form">
                    <button type="submit" class="logout-btn">DISCONNECT</button>
                </form>
            </div>
        </div>
        
        <p><a href="/legacy/hierarchy">View Asset Grid Hierarchy Tree</a></p>
        
        <table>
            <thead>
                <tr>
                    <th>Asset ID</th>
                    <th>Serial Number</th>
                    <th>Geo-Coordinates & Place</th>
                    <th>Phase Configuration</th>
                    <th>Commission Date</th>
                    <th>Status</th>
                    <th>Operations</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/legacy/meters/{meter_id}", response_class=HTMLResponse)
async def get_meter_detail(meter_id: str, session_id: str = Depends(verify_session)):
    meter = next((m for m in METERS if m["id"] == meter_id), None)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter Asset Not Found")
        
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Meter Asset Inspection: {meter["serial_number"]}</title>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #eef1f5; margin: 20px; }}
            .card {{ background-color: white; padding: 25px; border: 1px solid #ccc; border-radius: 5px; width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            h2 {{ color: darkblue; border-bottom: 2px solid darkblue; padding-bottom: 10px; margin-top: 0; }}
            .info-grid {{ display: grid; grid-template-columns: 200px 1fr; row-gap: 12px; font-size: 15px; }}
            .label {{ font-weight: bold; color: #555; }}
            .back-link {{ display: block; margin-top: 20px; font-weight: bold; color: darkblue; text-decoration: none; }}
            .back-link:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Meter Technical Spec Sheet: {meter["serial_number"]}</h2>
            <div class="info-grid">
                <div class="label">Internal ID:</div><div id="meter-id">{meter["id"]}</div>
                <div class="label">Serial Code:</div><div id="serial-number">{meter["serial_number"]}</div>
                <div class="label">Spatial Location:</div><div id="location">{meter["location"]}</div>
                <div class="label">Latitude:</div><div id="latitude">{meter["lat"]}</div>
                <div class="label">Longitude:</div><div id="longitude">{meter["lon"]}</div>
                <div class="label">Phase Layout:</div><div id="phase">{meter["phase"]}</div>
                <div class="label">Commission Date:</div><div id="installation-date">{meter["installation_date"]}</div>
                <div class="label">Operational Status:</div><div id="status" style="font-weight: bold; color: {'green' if meter['status'] == 'Active' else 'gray' if meter['status'] == 'Inactive' else 'red'};">{meter["status"]}</div>
                <div class="label">RMS Voltage:</div><div id="voltage">{meter["voltage"]} V</div>
                <div class="label">RMS Current:</div><div id="current">{meter["current"]} A</div>
                <div class="label">Power Factor (Cos phi):</div><div id="power-factor">{meter["power_factor"]}</div>
            </div>
            
            <hr>
            <p><a href="/legacy/meters/{meter["id"]}/consumption" class="back-link">Inspect Historical Energy Log Chart</a></p>
            <a href="/legacy/meters" class="back-link">&lt;&lt; Return to Active Table</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/legacy/meters/{meter_id}/consumption", response_class=HTMLResponse)
async def get_meter_consumption(meter_id: str, session_id: str = Depends(verify_session)):
    meter = next((m for m in METERS if m["id"] == meter_id), None)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter Asset Not Found")
        
    readings = generate_consumption(meter_id)
    rows = ""
    for r in readings:
        rows += f"""
        <tr>
            <td class="read-date">{r["date"]}</td>
            <td class="energy-val">{r["energy_kwh"]}</td>
            <td class="reactive-val">{r["reactive_kvarh"]}</td>
            <td class="demand-val">{r["demand_kw"]}</td>
        </tr>
        """
        
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Consumption Logs for {meter["serial_number"]}</title>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #eef1f5; margin: 20px; }}
            .container {{ background-color: white; padding: 25px; border: 1px solid #ccc; max-width: 800px; margin: 0 auto; }}
            h2 {{ color: darkblue; border-bottom: 2px solid darkblue; padding-bottom: 10px; margin-top: 0; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th, td {{ padding: 10px; border: 1px solid #ccc; text-align: right; }}
            th {{ background-color: darkblue; color: white; text-align: right; }}
            td.read-date, th.date-hdr {{ text-align: left; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
            .back-links {{ margin-top: 20px; display: flex; gap: 20px; }}
            .back-link {{ font-weight: bold; color: darkblue; text-decoration: none; }}
            .back-link:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Energy & Demand Daily Readings: {meter["serial_number"]}</h2>
            <p>Meter Location: {meter["location"]} ({meter["phase"]})</p>
            <table>
                <thead>
                    <tr>
                        <th class="date-hdr">Reading Date</th>
                        <th>Active Energy Consumed (kWh)</th>
                        <th>Reactive Energy Consumed (kVARh)</th>
                        <th>Max Recorded Demand (kW)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
            <div class="back-links">
                <a href="/legacy/meters/{meter["id"]}" class="back-link">&lt;&lt; Spec Sheet</a>
                <a href="/legacy/meters" class="back-link">&lt;&lt; Main List</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/legacy/hierarchy", response_class=HTMLResponse)
async def get_hierarchy_page(session_id: str = Depends(verify_session)):
    # Group our mock database into a nested structure dynamically
    zones = {}
    for m in METERS:
        z, c, s, t = m["zone"], m["circle"], m["substation"], m["transformer"]
        if z not in zones:
            zones[z] = {}
        if c not in zones[z]:
            zones[z][c] = {}
        if s not in zones[z][c]:
            zones[z][c][s] = {}
        if t not in zones[z][c][s]:
            zones[z][c][s][t] = []
        zones[z][c][s][t].append(m)
        
    # Render nested list HTML
    def render_tree(tree_dict):
        html_out = "<ul>"
        for key, value in tree_dict.items():
            if isinstance(value, dict):
                html_out += f"<li><span class='node-branch'>{key}</span>{render_tree(value)}</li>"
            elif isinstance(value, list):
                html_out += f"<li><span class='node-branch'>{key}</span><ul>"
                for meter in value:
                    html_out += f"<li class='meter-leaf'>Meter Node: <a href='/legacy/meters/{meter['id']}' class='meter-link'>{meter['serial_number']}</a> ({meter['status']})</li>"
                html_out += "</ul></li>"
        html_out += "</ul>"
        return html_out

    tree_html = render_tree(zones)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Urja Power Grid Distribution Hierarchy</title>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #eef1f5; margin: 20px; }}
            .container {{ background-color: white; padding: 25px; border: 1px solid #ccc; max-width: 900px; margin: 0 auto; }}
            h2 {{ color: darkblue; border-bottom: 2px solid darkblue; padding-bottom: 10px; margin-top: 0; }}
            ul {{ list-style-type: square; margin-left: 20px; padding-left: 10px; }}
            li {{ margin: 6px 0; }}
            .node-branch {{ font-weight: bold; color: darkblue; }}
            .meter-leaf {{ font-style: italic; color: #333; }}
            .meter-link {{ text-decoration: none; font-weight: bold; color: green; }}
            .meter-link:hover {{ text-decoration: underline; }}
            .back-link {{ display: block; margin-top: 20px; font-weight: bold; color: darkblue; text-decoration: none; }}
            .back-link:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Grid Network Physical Tree Asset Map</h2>
            <div id="tree-container">
                {tree_html}
            </div>
            <a href="/legacy/meters" class="back-link">&lt;&lt; Main List</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
