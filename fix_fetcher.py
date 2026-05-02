import re

with open("fetcher.py", "r") as f:
    content = f.read()

# 1. Add valid_laps to generate_circuit_cache
content = content.replace(
    'code = lap["Driver"]\n        try:',
    'code = lap["Driver"]\n        valid_laps = sorted([int(x) for x in drv_laps["LapNumber"].unique()])\n        try:'
)
content = content.replace(
    '"lap_number": int(lap["LapNumber"])',
    '"lap_number": int(lap["LapNumber"]),\n                "valid_laps": valid_laps'
)

# 2. Add fetch_driver_lap_telemetry
new_func = """
def fetch_driver_lap_telemetry(year: int, round_number: int, driver: str, lap_number: int) -> dict:
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(telemetry=True, weather=False, messages=False)
        drv_laps = session.laps.pick_driver(driver)
        if drv_laps.empty:
            return {"error": f"Driver {driver} not found"}
        lap = drv_laps[drv_laps["LapNumber"] == lap_number]
        if lap.empty:
            return {"error": f"Lap {lap_number} not found for driver {driver}"}
        lap = lap.iloc[0]
        drv_tel = lap.get_telemetry()
        
        path = []
        gears = []
        for row in drv_tel.itertuples():
            gear = int(row.nGear)
            path.append([float(row.X), float(row.Y), gear])
            if gear > 0:
                gears.append(gear)
        
        most_used_gear = max(set(gears), key=gears.count) if gears else 0
        avg_gear = round(sum(gears) / len(gears), 1) if gears else 0
        
        return {
            "path": path,
            "most_used_gear": most_used_gear,
            "avg_gear": avg_gear,
            "lap_number": lap_number,
            "lap_time_sec": lap["LapTime"].total_seconds() if pd.notnull(lap["LapTime"]) else None
        }
    except Exception as e:
        return {"error": str(e)}

# ── Smoke test ────────────────────────────────────────────────────────────────
"""
content = content.replace("# ── Smoke test ────────────────────────────────────────────────────────────────\n", new_func)

with open("fetcher.py", "w") as f:
    f.write(content)
