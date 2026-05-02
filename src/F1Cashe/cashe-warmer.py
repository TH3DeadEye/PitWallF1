"""
cache_warmer.py — Run FIRST, in a background terminal.
Warms FastF1 cache for hybrid era seasons (2014–2024).

2018–2024: FastF1 backend (F1 timing API). Retries on 500s, sleeps between
           loads to avoid rate-limiting.
2014–2017: Ergast backend. Ergast shut down Mar 2025 — these seasons will
           likely fail. Cache qualifying/race structure only (no lap times).

Usage:
    python cache_warmer.py           # warms all seasons
    python cache_warmer.py 2022 2023 # warms specific seasons
"""
import sys
import time
import fastf1
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "data"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

SEASONS = list(range(2014, 2025))
FASTF1_BACKEND_FROM = 2018  # fastf1 backend supports 2018+
REQUEST_DELAY = 1.5         # seconds between session loads
MAX_RETRIES = 3


def load_session_with_retry(year: int, round_num: int, session_type: str) -> bool:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            session = fastf1.get_session(year, round_num, session_type)
            session.load(laps=True, telemetry=False, weather=False, messages=False)
            return True
        except Exception as e:
            err = str(e)
            is_server_error = "500" in err or "502" in err or "503" in err or "504" in err
            if is_server_error and attempt < MAX_RETRIES:
                wait = 2 ** attempt  # 2s, 4s, 8s
                print(f"  ↺ {year} R{round_num} {session_type} — HTTP error, retry {attempt}/{MAX_RETRIES - 1} in {wait}s")
                time.sleep(wait)
            else:
                print(f"  ✗ {year} R{round_num} {session_type} — {e}")
                return False
    return False


def warm_season(year: int):
    print(f"\n── Season {year} ───────────────────────────")

    backend = "fastf1" if year >= FASTF1_BACKEND_FROM else "ergast"

    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False, backend=backend)
    except Exception as e:
        print(f"  ✗ Failed to get schedule (backend={backend}): {e}")
        return

    for _, event in schedule.iterrows():
        round_num = int(event["RoundNumber"])
        name = event["EventName"]

        for session_type in ["Q", "R"]:
            ok = load_session_with_retry(year, round_num, session_type)
            if ok:
                print(f"  ✓ {year} R{round_num} {session_type} — {name}")
            time.sleep(REQUEST_DELAY)


if __name__ == "__main__":
    years = [int(y) for y in sys.argv[1:]] if len(sys.argv) > 1 else SEASONS
    print(f"Warming FastF1 cache for seasons: {years}")
    print(f"Cache dir: {CACHE_DIR}\n")

    for season in years:
        warm_season(season)

    print("\n✅ Cache warm complete.")
