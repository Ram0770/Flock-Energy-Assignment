import pytest
from app.adapters.parser import parse_meters_list, parse_meter_detail, parse_consumption_table, parse_hierarchy_tree

def test_parse_meters_list():
    html = """
    <html>
    <table>
        <tr><th>ID</th><th>Serial</th><th>Geo</th><th>Phase</th><th>Date</th><th>Status</th></tr>
        <tr>
            <td>1</td>
            <td class="serial-num">FLK-001</td>
            <td>Indiranagar, Bangalore (lat: 12.971, lon: 77.641)</td>
            <td>Three Phase</td>
            <td>2024-01-15</td>
            <td><span class="status-badge" style="color: green;">Active</span></td>
        </tr>
    </table>
    </html>
    """
    res = parse_meters_list(html)
    assert len(res) == 1
    assert res[0]["id"] == "1"
    assert res[0]["serial_number"] == "FLK-001"
    assert res[0]["location"] == "Indiranagar, Bangalore"
    assert res[0]["latitude"] == 12.971
    assert res[0]["longitude"] == 77.641
    assert res[0]["status"] == "Active"

def test_parse_meter_detail():
    html = """
    <html>
    <div class="card">
        <div id="meter-id">1</div>
        <div id="serial-number">FLK-001</div>
        <div id="location">Indiranagar, Bangalore</div>
        <div id="latitude">12.971</div>
        <div id="longitude">77.641</div>
        <div id="phase">Three Phase</div>
        <div id="installation-date">2024-01-15</div>
        <div id="status">Active</div>
        <div id="voltage">238.4 V</div>
        <div id="current">12.5 A</div>
        <div id="power-factor">0.95</div>
    </div>
    </html>
    """
    res = parse_meter_detail(html)
    assert res["id"] == "1"
    assert res["serial_number"] == "FLK-001"
    assert res["location"] == "Indiranagar, Bangalore"
    assert res["latitude"] == 12.971
    assert res["voltage"] == 238.4
    assert res["current"] == 12.5
    assert res["power_factor"] == 0.95

def test_parse_consumption_table():
    html = """
    <table>
        <tr><th>Reading Date</th><th>Active Energy</th><th>Reactive Energy</th><th>Max Demand</th></tr>
        <tr>
            <td class="read-date">2024-06-01</td>
            <td class="energy-val">24.5</td>
            <td class="reactive-val">4.2</td>
            <td class="demand-val">5.8</td>
        </tr>
    </table>
    """
    res = parse_consumption_table(html)
    assert len(res) == 1
    assert res[0]["date"] == "2024-06-01"
    assert res[0]["energy_kwh"] == 24.5
    assert res[0]["reactive_kvarh"] == 4.2
    assert res[0]["demand_kw"] == 5.8

def test_parse_hierarchy_tree():
    html = """
    <div id="tree-container">
        <ul>
            <li><span class="node-branch">Zone: East Zone</span>
                <ul>
                    <li><span class="node-branch">Circle: Circle Alpha</span>
                        <ul>
                            <li class="meter-leaf">Meter Node: <a href="/legacy/meters/1" class="meter-link">FLK-001</a> (Active)</li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
    """
    res = parse_hierarchy_tree(html)
    assert len(res) == 1
    assert res[0]["name"] == "East Zone"
    assert res[0]["type"] == "zone"
    assert len(res[0]["children"]) == 1
    circle = res[0]["children"][0]
    assert circle["name"] == "Circle Alpha"
    assert circle["type"] == "circle"
    assert len(circle["children"]) == 1
    meter_node = circle["children"][0]
    assert meter_node["type"] == "meter"
    assert meter_node["meter"]["serial_number"] == "FLK-001"
    assert meter_node["meter"]["status"] == "Active"
