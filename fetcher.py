"""
fetcher.py — Raw data layer. No analysis here.

Data sources:
- Jolpica API (api.jolpi.ca/ergast/f1) → race results + standings, 2014-2024
- FastF1 → intra-stint lap times, 2018-2024 only (needs warm cache)

All functions return plain dicts or DataFrames. No side effects.

Jolpica is an Ergast fork with identical JSON structure and full hybrid era coverage.
OpenF1 only covers 2023-2024 and is NOT used for race results.
"""
import os
import time
import json
from pathlib import Path
from collections import defaultdict

import requests
import pandas as pd
import fastf1
from dotenv import load_dotenv

load_dotenv()

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
CACHE_DIR = os.getenv("FASTF1_CACHE_DIR", "./src/F1Cashe/data")
fastf1.Cache.enable_cache(CACHE_DIR)

# F1 points systems by era
RACE_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
SPRINT_POINTS = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}

# Status keywords that indicate a mechanical failure (not driver fault)
MECHANICAL_KEYWORDS = {
    "engine", "gearbox", "hydraulics", "transmission", "ers",
    "suspension", "brakes", "electrical", "water pressure",
    "power unit", "oil pressure", "fuel pressure", "overheating",
    "clutch", "exhaust", "throttle", "turbo", "electronics",
    "drs", "mechanical", "retired",
}

# A crash/spin/collision DNF = P21 (driver error = consistency failure)
CRASH_DNF_POSITION = 21


# ── Jolpica helpers ───────────────────────────────────────────────────────────

def _jolpica_get(path: str, params: dict = None, max_retries: int = 5) -> dict:
    """
    GET from Jolpica. Returns full parsed JSON response dict.
    Retries on 429 Too Many Requests with exponential backoff.
    """
    url = f"{JOLPICA_BASE}/{path}"
    backoff = 1.0
    for attempt in range(max_retries):
        resp = requests.get(url, params=params or {}, timeout=30)
        if resp.status_code == 429:
            wait = backoff * (2 ** attempt)
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    wait = float(retry_after)
                except ValueError:
                    pass
            print(f"    [jolpica] 429 — backing off {wait:.1f}s (attempt {attempt + 1}/{max_retries})")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()
    return resp.json()


def _jolpica_get_all_races(path: str) -> list[dict]:
    """
    Fetch all race result objects from a Jolpica endpoint, handling pagination.
    Jolpica caps at 100 entries per request; a full 24-race season has ~480 entries.
    Paginates by offset until all entries are retrieved.
    """
    page_size = 100
    first = _jolpica_get(path, {"limit": page_size, "offset": 0})
    total = int(first["MRData"]["total"])
    races = first["MRData"]["RaceTable"]["Races"]

    for offset in range(page_size, total, page_size):
        page = _jolpica_get(path, {"limit": page_size, "offset": offset})
        races.extend(page["MRData"]["RaceTable"]["Races"])
        time.sleep(0.6)  # polite paging delay (Jolpica rate-limits aggressively)

    return races


def _is_mechanical_dnf(status: str) -> bool:
    s = status.lower()
    return any(kw in s for kw in MECHANICAL_KEYWORDS)


def _is_classified(status: str) -> bool:
    """Finished or completed within N laps of winner."""
    return status == "Finished" or status.startswith("+")


# ── Core Jolpica functions ────────────────────────────────────────────────────

def fetch_jolpica_sprints(year: int) -> list[dict]:
    """
    Return sprint result records for all sprint weekends in the season.
    Same shape as fetch_jolpica_season records, tagged with is_sprint=True.
    Sprint points: 8-7-6-5-4-3-2-1 for P1-P8 (post-2022 system).
    Returns empty list if the year had no sprint races.
    """
    try:
        races = _jolpica_get_all_races(f"{year}/sprint.json")
    except Exception:
        return []

    results = []
    for race in races:
        round_num = int(race["round"])
        race_name = race["raceName"]
        for r in race.get("SprintResults", []):
            pos = int(r["position"])
            pts = SPRINT_POINTS.get(pos, 0)
            results.append({
                "year": year,
                "round": round_num,
                "race_name": race_name,
                "driver_code": r["Driver"]["code"],
                "finish_position": pos,
                "points": float(pts),
                "status": r.get("status", "Finished"),
                "is_classified": True,
                "is_mechanical_dnf": False,
                "is_crash_dnf": False,
                "is_sprint": True,
            })
    return results


def fetch_jolpica_season(year: int) -> list[dict]:
    """
    Return race result records for every driver in every race of the season.

    Each dict:
        {
          "year": int,
          "round": int,
          "race_name": str,
          "driver_code": str,       # "NOR", "VER", etc.
          "finish_position": int,   # actual pos if classified; 21 if crash DNF; None if mechanical
          "points": float,
          "status": str,            # raw status from Jolpica
          "is_classified": bool,
          "is_mechanical_dnf": bool,
          "is_crash_dnf": bool,
        }

    Mechanical DNFs → finish_position=None (excluded from metric 1).
    Crash/error DNFs → finish_position=21 (counts as a consistency failure in metric 1).
    """
    races = _jolpica_get_all_races(f"{year}/results.json")
    results = []
    for race in races:
        round_num = int(race["round"])
        race_name = race["raceName"]
        for r in race["Results"]:
            status = r["status"]
            classified = _is_classified(status)
            mechanical = not classified and _is_mechanical_dnf(status)
            crash = not classified and not mechanical

            if classified:
                finish_pos = int(r["position"])
            elif crash:
                finish_pos = CRASH_DNF_POSITION
            else:
                finish_pos = None  # mechanical — excluded from metric 1

            results.append({
                "year": year,
                "round": round_num,
                "race_name": race_name,
                "driver_code": r["Driver"]["code"],
                "finish_position": finish_pos,
                "points": float(r["points"]),
                "status": status,
                "is_classified": classified,
                "is_mechanical_dnf": mechanical,
                "is_crash_dnf": crash,
            })
    return results


def _compute_rolling_standings(results: list[dict]) -> list[dict]:
    """
    Compute cumulative championship standings after each round.
    Used internally by fetch_hybrid_era_results.

    Returns:
        [{"round": 1, "standings": [{"driver_code": "VER", "points": 25, "position": 1}, ...]}, ...]
    """
    rounds = sorted(set(r["round"] for r in results))
    cumulative: dict[str, float] = defaultdict(float)
    out = []
    for rnd in rounds:
        for r in results:
            if r["round"] == rnd:
                cumulative[r["driver_code"]] += r["points"]
        ranked = sorted(cumulative.items(), key=lambda x: x[1], reverse=True)
        out.append({
            "round": rnd,
            "standings": [
                {"driver_code": code, "points": pts, "position": i + 1}
                for i, (code, pts) in enumerate(ranked)
            ],
        })
    return out


def fetch_hybrid_era_results(start_year: int, end_year: int) -> dict:
    """
    Fetch race results and rolling standings for every season in [start_year, end_year].

    Returns:
        {
          "results":  {year: [race_result_dicts, ...]},
          "standings": {year: [standings_round_dicts, ...]}
        }

    Adds a 0.3s delay between years to stay polite to Jolpica.
    """
    all_results: dict[int, list] = {}
    all_standings: dict[int, list] = {}

    for year in range(start_year, end_year + 1):
        print(f"  Jolpica: fetching {year}...")
        results = fetch_jolpica_season(year)
        sprints = fetch_jolpica_sprints(year)
        if sprints:
            print(f"    + {len(sprints)} sprint entries")
        all_results[year] = results          # race results only (metric 1 uses this)
        all_standings[year] = _compute_rolling_standings(results + sprints)  # includes sprint pts
        time.sleep(0.3)

    return {"results": all_results, "standings": all_standings}


# ── FastF1 functions ──────────────────────────────────────────────────────────

def fetch_fastf1_stints(year: int, round_number: int) -> pd.DataFrame:
    """
    Return cleaned lap times grouped by driver and stint for one race.

    Columns: Driver (str), Stint (int), LapNumber (int), lap_seconds (float)

    Steps:
    1. Load session — laps=True, telemetry=False (fast), weather=False, messages=False
    2. pick_quicklaps() removes SC laps, pit in/out laps, outliers
    3. Convert LapTime → lap_seconds
    4. IQR filter within each (Driver, Stint) group to remove any remaining outliers

    Returns empty DataFrame if session is not in cache — caller skips gracefully.
    """
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(laps=True, telemetry=False, weather=False, messages=False)
    except Exception:
        return pd.DataFrame()

    laps = session.laps.pick_quicklaps().copy()
    if laps.empty:
        return pd.DataFrame()

    laps["lap_seconds"] = laps["LapTime"].dt.total_seconds()
    laps = laps[["Driver", "Stint", "LapNumber", "lap_seconds"]].dropna()

    # IQR filter within each stint to remove remaining outliers
    cleaned = []
    for (driver, stint), group in laps.groupby(["Driver", "Stint"]):
        q1 = group["lap_seconds"].quantile(0.25)
        q3 = group["lap_seconds"].quantile(0.75)
        iqr = q3 - q1
        mask = (group["lap_seconds"] >= q1 - 1.5 * iqr) & (
            group["lap_seconds"] <= q3 + 1.5 * iqr
        )
        cleaned.append(group[mask])

    return pd.concat(cleaned, ignore_index=True) if cleaned else pd.DataFrame()


def fetch_fastf1_season_stints(year: int) -> list[dict]:
    """
    Fetch intra-stint lap time data for all races in a season.

    Uses FastF1's event schedule to get the number of rounds, then calls
    fetch_fastf1_stints() per round. Rounds not in cache are skipped silently.

    Returns flat list of stint-lap records. Each record:
        {"Driver": str, "Stint": int, "LapNumber": int, "lap_seconds": float,
         "year": int, "round": int}
    """
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        rounds = schedule["RoundNumber"].tolist()
    except Exception:
        rounds = range(1, 25)  # fallback: try up to 24 rounds

    all_records = []
    for rnd in rounds:
        df = fetch_fastf1_stints(year, int(rnd))
        if df.empty:
            continue
        records = df.to_dict(orient="records")
        for rec in records:
            rec["year"] = year
            rec["round"] = int(rnd)
        all_records.extend(records)

    return all_records


def generate_circuit_cache(year: int, round_number: int, outputs_dir: Path) -> dict:
    """
    Generate circuit outline and driver fastest lap telemetry (X, Y, nGear)
    using FastF1, and save it to data/outputs/circuit_{year}_{round_number}.json.
    """
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(laps=True, telemetry=True, weather=False, messages=False)
        
        # Check if laps were actually loaded (FastF1 throws DataNotLoadedError if missing)
        laps = session.laps
    except Exception as e:
        return {"error": f"FastF1 load failed: {str(e)}"}

    try:
        if not laps.pick_quicklaps().empty:
            fastest_lap = laps.pick_fastest()
        else:
            return {"error": "No quick laps found in session"}

        tel = fastest_lap.get_telemetry()
    except Exception as e:
        return {"error": f"Could not get telemetry: {str(e)}"}

    track = []
    x_min, x_max = float('inf'), float('-inf')
    y_min, y_max = float('inf'), float('-inf')
    
    for row in tel.itertuples():
        x, y = float(row.X), float(row.Y)
        track.append([x, y])
        x_min = min(x_min, x)
        x_max = max(x_max, x)
        y_min = min(y_min, y)
        y_max = max(y_max, y)

    drivers_data = []
    for driver in session.drivers:
        drv_laps = session.laps.pick_driver(driver).pick_quicklaps()
        if drv_laps.empty:
            continue
        lap = drv_laps.pick_fastest()
        code = lap["Driver"]
        valid_laps = sorted([int(x) for x in drv_laps["LapNumber"].unique()])
        try:
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
            
            drivers_data.append({
                "code": code,
                "name": code,
                "lap_time_sec": lap["LapTime"].total_seconds(),
                "path": path,
                "most_used_gear": most_used_gear,
                "avg_gear": avg_gear,
                "lap_number": int(lap["LapNumber"]),
                "valid_laps": valid_laps
            })
        except Exception:
            pass

    out = {
        "season": year,
        "round": round_number,
        "race_name": session.event["EventName"],
        "circuit_name": session.event.get("Location", ""),
        "bbox": {
            "x_min": x_min, "x_max": x_max, "y_min": y_min, "y_max": y_max
        },
        "track": track,
        "drivers": drivers_data
    }
    
    cache_path = outputs_dir / f"circuit_{year}_{round_number}.json"
    cache_path.write_text(json.dumps(out, indent=2))
    return out



def fetch_driver_lap_telemetry(year: int, round_number: int, driver: str, lap_number: int) -> dict:
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(laps=True, telemetry=True, weather=False, messages=False)
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

if __name__ == "__main__":
    print("Testing Jolpica — 2024 season...")
    results_2024 = fetch_jolpica_season(2024)
    nor = [r for r in results_2024 if r["driver_code"] == "NOR"]
    ver = [r for r in results_2024 if r["driver_code"] == "VER"]
    print(f"  NOR races: {len(nor)}, points: {sum(r['points'] for r in nor)}")
    print(f"  VER races: {len(ver)}, points: {sum(r['points'] for r in ver)}")

    print("\nTesting rolling standings — 2024 round 1...")
    standings = _compute_rolling_standings(results_2024)
    r1 = standings[0]["standings"][:3]
    for s in r1:
        print(f"  P{s['position']} {s['driver_code']}: {s['points']} pts")

    print("\nFetching hybrid era (2022-2024 quick test)...")
    era = fetch_hybrid_era_results(2022, 2024)
    for y in [2022, 2023, 2024]:
        n = len(era["results"].get(y, []))
        print(f"  {y}: {n} driver-race entries")

