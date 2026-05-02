"""
orchestrator.py — Race-by-race pipeline for The Consistency Theorem.

Pipeline steps (each checks its output file and skips if cached):
  1. fetch_raw_data()    → data/outputs/raw_data.json
  2. build_timelines()   → data/outputs/timelines.json
  3. compute_findings()  → data/outputs/findings.json
  4. generate_story()    → data/outputs/story.json

CLI:
  python orchestrator.py                  # fast mode, skip cached steps
  python orchestrator.py --reset          # rerun everything from scratch
  python orchestrator.py --season 2024    # run for a specific season
  python orchestrator.py --no-fast        # full 2014-2024, all drivers
"""
import os
import sys
import json
import argparse
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# FAST_MODE — flip to False for the final demo run
# True:  2023-2024 only, full driver grid
# False: full 2014-2024, full driver grid
# ─────────────────────────────────────────────────────────────────────────────
FAST_MODE = True

ROOT    = Path(__file__).parent
sys.path.insert(0, str(ROOT))

OUTPUTS = ROOT / "data" / "outputs"
OUTPUTS.mkdir(parents=True, exist_ok=True)

RAW_DATA_PATH  = OUTPUTS / "raw_data.json"
TIMELINES_PATH = OUTPUTS / "timelines.json"
FINDINGS_PATH  = OUTPUTS / "findings.json"
STORY_PATH     = OUTPUTS / "story.json"

FULL_SEASONS = list(range(2014, 2026))   # 2014-2025
FAST_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025]

# runner_up_code, champion_code, runner_up_name, champion_name, constructor_of_runner_up
SEASON_DRIVERS = {
    2014: ("ROS", "HAM", "Nico Rosberg",     "Lewis Hamilton",  "Mercedes"),
    2015: ("ROS", "HAM", "Nico Rosberg",     "Lewis Hamilton",  "Mercedes"),
    2016: ("HAM", "ROS", "Lewis Hamilton",   "Nico Rosberg",    "Mercedes"),
    2017: ("VET", "HAM", "Sebastian Vettel", "Lewis Hamilton",  "Ferrari"),
    2018: ("VET", "HAM", "Sebastian Vettel", "Lewis Hamilton",  "Ferrari"),
    2019: ("BOT", "HAM", "Valtteri Bottas",  "Lewis Hamilton",  "Mercedes"),
    2020: ("BOT", "HAM", "Valtteri Bottas",  "Lewis Hamilton",  "Mercedes"),
    2021: ("HAM", "VER", "Lewis Hamilton",   "Max Verstappen",  "Mercedes"),
    2022: ("LEC", "VER", "Charles Leclerc",  "Max Verstappen",  "Ferrari"),
    2023: ("PER", "VER", "Sergio Pérez",     "Max Verstappen",  "Red Bull"),
    2024: ("NOR", "VER", "Lando Norris",     "Max Verstappen",  "McLaren"),
    2025: ("VER", "NOR", "Max Verstappen",   "Lando Norris",    "Red Bull"),
}


# ── JSON helpers ──────────────────────────────────────────────────────────────

def _read(path: Path) -> Optional[dict]:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            return None
    return None


def _write(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, default=str))
    print(f"  → wrote {path.name} ({path.stat().st_size // 1024} KB)")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Fetch raw data (full grid, all seasons)
# ─────────────────────────────────────────────────────────────────────────────

def fetch_raw_data(seasons: list[int] = None, reset: bool = False, force: bool = False) -> dict:
    """
    Fetch full-grid race + sprint results for every season.
    Writes incrementally — partial progress is never lost on interruption.

    Returns:
        {
          "results":   {year: [race_result_dicts]},
          "sprints":   {year: [sprint_result_dicts]},
          "standings": {year: [round_standings_dicts]}  # includes sprint pts
        }
    """
    if seasons is None:
        seasons = FAST_SEASONS if FAST_MODE else FULL_SEASONS
    reset = reset or force  # api.py uses force=True

    cached = _read(RAW_DATA_PATH) or {"results": {}, "sprints": {}, "standings": {}}

    if not reset:
        existing = {int(k) for k in cached["results"]}
        missing  = [s for s in seasons if s not in existing]
        if not missing:
            print(f"[1/4] raw_data cached — skipping ({len(existing)} seasons)")
            return cached
        seasons = missing
        print(f"[1/4] Fetching missing seasons: {seasons}")
    else:
        cached   = {"results": {}, "sprints": {}, "standings": {}}
        print(f"[1/4] Fetching (reset): {seasons}")

    from fetcher import fetch_jolpica_season, fetch_jolpica_sprints, _compute_rolling_standings

    for year in sorted(seasons):
        print(f"  {year}: Jolpica...")
        results   = fetch_jolpica_season(year)
        sprints   = fetch_jolpica_sprints(year)
        standings = _compute_rolling_standings(results + sprints)

        cached["results"][year]   = results
        cached["sprints"][year]   = sprints
        cached["standings"][year] = standings

        n_races   = len({r["round"] for r in results})
        n_drivers = len({r["driver_code"] for r in results})
        print(f"    {n_races} races × {n_drivers} drivers, {len(sprints)} sprint entries")
        _write(RAW_DATA_PATH, cached)  # save after each year

    return cached


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Race-by-race timelines
# ─────────────────────────────────────────────────────────────────────────────

def build_timelines(raw_data: dict, seasons: list[int], reset: bool = False) -> dict:
    """
    Build a race-by-race arc for every driver in every season.

    Each driver arc includes:
    - Round, race name, finish position, points, cumulative points (incl. sprint)
    - Championship standing after each race
    - Whether they were the leader entering the race
    - Whether they led after the race
    - pressure_trap: computed when a driver first took the championship lead

    Output: {year: {driver_code: driver_entry_dict}}
    """
    cached = _read(TIMELINES_PATH) or {}

    if not reset:
        existing = {int(k) for k in cached}
        missing  = [s for s in seasons if s not in existing]
        if not missing:
            print(f"[2/4] timelines cached — skipping")
            return cached
        seasons = missing
    else:
        cached = {}

    print(f"[2/4] Building timelines for: {seasons}")

    results_all   = {int(k): v for k, v in raw_data["results"].items()}
    standings_all = {int(k): v for k, v in raw_data["standings"].items()}

    for year in sorted(seasons):
        year_results   = results_all.get(year, [])
        year_standings = standings_all.get(year, [])
        if not year_results:
            continue

        n_drivers = len({r["driver_code"] for r in year_results})
        print(f"  {year}: {n_drivers} drivers...")

        # Lookup tables
        standings_by_round   = {rd["round"]: rd["standings"] for rd in year_standings}
        cumulative_by_round  = {
            rd["round"]: {s["driver_code"]: s["points"] for s in rd["standings"]}
            for rd in year_standings
        }

        all_drivers = sorted({r["driver_code"] for r in year_results})
        year_tl: dict = {}

        for driver in all_drivers:
            driver_races = sorted(
                [r for r in year_results if r["driver_code"] == driver],
                key=lambda r: r["round"],
            )
            races = []

            for r in driver_races:
                rnd = r["round"]

                # Who led the championship ENTERING this race (after previous round)
                entering = standings_by_round.get(rnd - 1, []) if rnd > 1 else []
                entering_leader = entering[0]["driver_code"] if entering else None

                # Who leads AFTER this race
                after = standings_by_round.get(rnd, [])
                after_leader = after[0]["driver_code"] if after else None
                after_position = next(
                    (s["position"] for s in after if s["driver_code"] == driver), None
                )

                # True cumulative points from standings (race + sprint)
                cumulative = cumulative_by_round.get(rnd, {}).get(driver, 0.0)

                races.append({
                    "round":                  rnd,
                    "race_name":              r["race_name"],
                    "finish_position":        r["finish_position"],
                    "points_this_race":       r["points"],
                    "cumulative_points":      round(cumulative, 1),
                    "championship_standing":  after_position,
                    "was_leader_entering":    entering_leader == driver,
                    "is_leader_after":        after_leader == driver,
                    "leader_after_race":      after_leader,
                    "status":                 r["status"],
                    "is_dnf":                 r.get("is_crash_dnf", False) or r.get("is_mechanical_dnf", False),
                })

            year_tl[driver] = {
                "driver":         driver,
                "season":         year,
                "final_standing": races[-1]["championship_standing"] if races else None,
                "races":          races,
                "pressure_trap":  _pressure_trap(races),
            }

        cached[year] = year_tl
        _write(TIMELINES_PATH, cached)

    return cached


def _pressure_trap(races: list[dict]) -> Optional[dict]:
    """
    Compute the pressure trap metric for one driver's season arc.

    Finds the exact round they first became championship leader, then measures:
    - PPG in ALL races before that round
    - PPG in the 5 races immediately before (run-up form)
    - PPG in ALL races from that round onwards
    - delta = after - before (negative = pressure trap)
    - Worst and best post-lead races
    - Haemorrhage races (post-lead, < 6 points)

    Returns None if the driver never led, or led from round 1-3 (no useful before window).
    """
    first_lead_round = None
    first_lead_race  = None
    for race in races:
        if race["is_leader_after"] and first_lead_round is None:
            first_lead_round = race["round"]
            first_lead_race  = race

    if first_lead_round is None or first_lead_round < 4:
        return None

    before = [r for r in races if r["round"] < first_lead_round]
    after  = [r for r in races if r["round"] >= first_lead_round]

    if not before or not after:
        return None

    last5_before   = before[-5:]
    ppg_last5      = sum(r["points_this_race"] for r in last5_before) / len(last5_before)
    ppg_before_all = sum(r["points_this_race"] for r in before) / len(before)
    ppg_after_all  = sum(r["points_this_race"] for r in after) / len(after)
    delta          = ppg_after_all - ppg_before_all

    sorted_after = sorted(after, key=lambda r: r["points_this_race"])
    worst = sorted_after[0]
    best  = sorted_after[-1]

    haemorrhage = [r for r in after if r["points_this_race"] < 6]

    return {
        "first_lead_round":     first_lead_round,
        "first_lead_race_name": first_lead_race["race_name"] if first_lead_race else None,
        "races_before":         len(before),
        "races_after":          len(after),
        "ppg_last5_before":     round(ppg_last5, 2),
        "ppg_all_before":       round(ppg_before_all, 2),
        "ppg_after":            round(ppg_after_all, 2),
        "delta":                round(delta, 2),
        "worst_post_lead_race": {
            "round":           worst["round"],
            "race_name":       worst["race_name"],
            "finish_position": worst["finish_position"],
            "points":          worst["points_this_race"],
        },
        "best_post_lead_race": {
            "round":           best["round"],
            "race_name":       best["race_name"],
            "finish_position": best["finish_position"],
            "points":          best["points_this_race"],
        },
        "haemorrhage_races": [
            {
                "round":           r["round"],
                "race_name":       r["race_name"],
                "finish_position": r["finish_position"],
                "points":          r["points_this_race"],
            }
            for r in haemorrhage
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Compute findings
# ─────────────────────────────────────────────────────────────────────────────

def compute_findings(raw_data: dict, timelines: dict, seasons: list[int], reset: bool = False) -> dict:
    """
    Metric 1 — position stddev (analyst.py).
    Metric 2 — pressure trap (derived from timelines — richer than analyst.py version).
    Metric 3 — FastF1 intra-stint lap stddev (skips gracefully if cache missing).
    Correlation, evidence array, pattern summary.
    """
    if not reset and FINDINGS_PATH.exists():
        print(f"[3/4] findings cached — skipping")
        return _read(FINDINGS_PATH)

    print(f"[3/4] Computing findings...")
    import analyst

    results_int   = {int(k): v for k, v in raw_data["results"].items() if int(k) in seasons}
    standings_int = {int(k): v for k, v in raw_data["standings"].items() if int(k) in seasons}
    timelines_int = {int(k): v for k, v in timelines.items() if int(k) in seasons}

    m1   = analyst.compute_metric_1(results_int)
    m2   = _metric_2_from_timelines(timelines_int)
    m3   = _fetch_metric_3(seasons)
    corr = analyst.compute_correlation(m1, m2, m3, standings_int)

    evidence        = _build_evidence(timelines_int, m1)
    pattern_summary = _pattern_summary(timelines_int, standings_int)

    findings = {
        "metric_1":        m1,
        "metric_2":        m2,
        "metric_3":        m3,
        "correlation":     corr,
        "evidence":        evidence,
        "pattern_summary": pattern_summary,
    }
    _write(FINDINGS_PATH, findings)
    return findings


def _metric_2_from_timelines(timelines: dict) -> dict:
    """
    Extract metric 2 from timeline pressure_trap data.
    Format matches narrator._extract_season_findings().
    """
    seasons: dict = {}
    for year, year_tl in sorted(timelines.items()):
        season_data: dict = {}
        for driver, tl in year_tl.items():
            trap = tl.get("pressure_trap")
            if not trap:
                continue
            season_data[driver] = {
                "lead_round":        trap["first_lead_round"],
                "lead_race":         trap["first_lead_race_name"],
                "before_ppg":        trap["ppg_all_before"],
                "before_ppg_last5":  trap["ppg_last5_before"],
                "after_ppg":         trap["ppg_after"],
                "delta":             trap["delta"],
                "haemorrhage_count": len(trap.get("haemorrhage_races", [])),
            }
        if season_data:
            seasons[int(year)] = season_data

    return {
        "label": "Points-per-race delta after first taking the championship lead",
        "seasons": seasons,
    }


def _fetch_metric_3(seasons: list[int]) -> dict:
    """Fetch FastF1 stints and compute metric 3. Skips gracefully if no cache."""
    import analyst
    try:
        from fetcher import fetch_fastf1_season_stints
        stints: dict = {}
        for year in [y for y in seasons if y >= 2018]:
            s = fetch_fastf1_season_stints(year)
            if s:
                stints[year] = s
                print(f"  FastF1 {year}: {len(s)} stint-lap records")
            else:
                print(f"  FastF1 {year}: no cache — skipped")
        return analyst.compute_metric_3(stints)
    except Exception as exc:
        print(f"  FastF1 skipped ({type(exc).__name__}: {exc})")
        return {"label": "Intra-stint laptime stddev (cache unavailable)", "seasons": {}}


def _build_evidence(timelines: dict, m1: dict) -> list[dict]:
    """
    Build a list of citable evidence entries.
    The Gemini narrator treats each as a source it can cite.
    """
    evidence: list[dict] = []

    for year, year_tl in sorted(timelines.items(), reverse=True):
        year = int(year)

        # Pressure trap moments
        for driver, tl in year_tl.items():
            trap = tl.get("pressure_trap")
            if not trap:
                continue

            evidence.append({
                "type":   "lead_change",
                "year":   year,
                "driver": driver,
                "claim":  f"{driver} first took the championship lead at {trap['first_lead_race_name']} ({year})",
                "race":   trap["first_lead_race_name"],
                "round":  trap["first_lead_round"],
                "detail": (
                    f"Before leading: {trap['ppg_all_before']:.1f} pts/race "
                    f"({trap['ppg_last5_before']:.1f} in run-up 5 races). "
                    f"After leading: {trap['ppg_after']:.1f} pts/race. "
                    f"Delta: {trap['delta']:+.1f} pts/race."
                ),
            })

            for hr in trap.get("haemorrhage_races", [])[:2]:
                evidence.append({
                    "type":   "collapse_race",
                    "year":   year,
                    "driver": driver,
                    "claim":  f"{driver} scored only {hr['points']} pts at {hr['race_name']} ({year}) while holding championship lead",
                    "race":   hr["race_name"],
                    "round":  hr["round"],
                    "detail": (
                        f"P{hr['finish_position']}. "
                        f"Was averaging {trap['ppg_last5_before']:.1f} pts/race before taking the lead."
                    ),
                })

        # Consistency gap within season top-5
        m1_season = m1.get("seasons", {}).get(year) or m1.get("seasons", {}).get(str(year)) or {}
        top5 = [
            d for d, tl in year_tl.items()
            if tl.get("final_standing") and tl["final_standing"] <= 5 and d in m1_season
        ]
        if len(top5) >= 2:
            ranked = sorted([(d, m1_season[d]) for d in top5], key=lambda x: x[1])
            best_d, best_v   = ranked[0]
            worst_d, worst_v = ranked[-1]
            if worst_v > best_v * 1.4:
                evidence.append({
                    "type":   "consistency_gap",
                    "year":   year,
                    "driver": worst_d,
                    "claim":  f"{best_d} ({best_v:.3f} stddev) vs {worst_d} ({worst_v:.3f} stddev) — {year}",
                    "race":   "Full season",
                    "round":  None,
                    "detail": (
                        f"{worst_d}'s finishing-position stddev was {worst_v/best_v:.1f}× "
                        f"higher than {best_d}'s, both finishing top-5 in the championship."
                    ),
                })

    return evidence


def _pattern_summary(timelines: dict, standings: dict) -> dict:
    """
    Count across all seasons: how many drivers who first took the championship
    lead saw their PPG decline vs improve? Split by champion vs non-champion.
    This is the 'X of Y' hybrid era claim.
    """
    standings_int = {int(k): v for k, v in standings.items()}
    trappers: list[dict] = []

    for year, year_tl in timelines.items():
        year = int(year)
        final = standings_int.get(year, [])
        champion = final[-1]["standings"][0]["driver_code"] if final and final[-1]["standings"] else None

        for driver, tl in year_tl.items():
            trap = tl.get("pressure_trap")
            if not trap:
                continue
            trappers.append({
                "year":           year,
                "driver":         driver,
                "delta":          trap["delta"],
                "final_standing": tl.get("final_standing"),
                "is_champion":    driver == champion,
            })

    if not trappers:
        return {}

    improved         = [t for t in trappers if t["delta"] > 0]
    declined         = [t for t in trappers if t["delta"] < 0]
    champ_improved   = [t for t in trappers if t["is_champion"] and t["delta"] > 0]
    non_champ_dec    = [t for t in trappers if not t["is_champion"] and t["delta"] < 0]

    return {
        "total_who_led":          len(trappers),
        "improved_after_lead":    len(improved),
        "declined_after_lead":    len(declined),
        "champions_improved":     len(champ_improved),
        "non_champions_declined": len(non_champ_dec),
        "drivers":                trappers,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Generate story
# ─────────────────────────────────────────────────────────────────────────────

def generate_story(findings: dict, season: int, reset: bool = False, question: str = None) -> dict:
    """
    Generate the Gemini story for a season.
    Uses narrator.generate_story(season, dossier, question) — the current narrator signature.
    Cached to story.json unless reset=True or the cached entry is a fallback.
    """
    if not reset and STORY_PATH.exists():
        cached = _read(STORY_PATH)
        if cached and int(cached.get("season", 0)) == int(season) and not cached.get("fallback"):
            print(f"[4/4] story cached — skipping")
            return cached

    print(f"[4/4] Generating story via Gemini (season={season})...")
    import narrator

    dossier = season_dossier(season)
    story   = narrator.generate_story(season=season, dossier=dossier, question=question)
    _write(STORY_PATH, story)
    return story


# ─────────────────────────────────────────────────────────────────────────────
# Public API — used by api.py and app.py
# ─────────────────────────────────────────────────────────────────────────────

def run(season_or_seasons, question_or_story_season=None, force_story: bool = False,
        fast_mode: bool = FAST_MODE, reset: bool = False) -> dict:
    """
    Two calling conventions:

    From api.py:
        run(season_int, question_str, force_story=bool)
        → returns {season, question, findings, story}

    From CLI internally:
        run([season_list], story_season_int, fast_mode=bool, reset=bool)
        → returns {findings, story, timelines}
    """
    if isinstance(season_or_seasons, int):
        # ── api.py path ───────────────────────────────────────────────────────
        season   = season_or_seasons
        question = question_or_story_season

        seasons = FAST_SEASONS if FAST_MODE else FULL_SEASONS
        if season not in seasons:
            seasons = sorted(set(seasons) | {season})

        raw      = fetch_raw_data(seasons, reset=reset)
        tl       = build_timelines(raw, seasons, reset=reset)
        findings = compute_findings(raw, tl, seasons, reset=reset)
        story    = generate_story(findings, season=season, reset=force_story, question=question)

        return {"season": season, "question": question, "findings": findings, "story": story}

    # ── CLI path ──────────────────────────────────────────────────────────────
    seasons      = season_or_seasons
    story_season = question_or_story_season or max(seasons)

    print(f"\n{'='*60}")
    print(f"The Consistency Theorem — Pipeline")
    print(f"  Seasons : {seasons}  |  Story: {story_season}")
    print(f"  FastMode: {fast_mode}  |  Reset: {reset}")
    print(f"{'='*60}\n")

    raw_data  = fetch_raw_data(seasons, reset=reset)
    timelines = build_timelines(raw_data, seasons, reset=reset)
    findings  = compute_findings(raw_data, timelines, seasons, reset=reset)
    story     = generate_story(findings, season=story_season, reset=reset)

    _print_summary(findings, story, story_season)
    return {"findings": findings, "story": story, "timelines": timelines}


def ensure_findings(force: bool = False) -> dict:
    """Entry point for api.py — returns findings, computing if missing."""
    seasons = FAST_SEASONS if FAST_MODE else FULL_SEASONS
    raw     = fetch_raw_data(seasons, reset=force)
    tl      = build_timelines(raw, seasons, reset=force)
    return compute_findings(raw, tl, seasons, reset=force)


# Compatibility shims for api.py
def _read_json(path):
    return _read(Path(path))

FINDINGS_PATH_STR = str(FINDINGS_PATH)


# ─────────────────────────────────────────────────────────────────────────────
# Summary printer
# ─────────────────────────────────────────────────────────────────────────────

def _print_summary(findings: dict, story: dict, season: int):
    print(f"\n{'─'*60}")

    m1     = findings.get("metric_1", {}).get("seasons", {})
    s_m1   = m1.get(season) or m1.get(str(season)) or {}
    if s_m1:
        print(f"\nMetric 1 — Position stddev {season} (top 6):")
        for d, v in sorted(s_m1.items(), key=lambda x: x[1])[:6]:
            print(f"  {d}: {v:.3f}")

    m2   = findings.get("metric_2", {}).get("seasons", {})
    s_m2 = m2.get(season) or m2.get(str(season)) or {}
    if s_m2:
        print(f"\nMetric 2 — Pressure trap {season}:")
        for d, data in sorted(s_m2.items(), key=lambda x: x[1]["delta"]):
            print(f"  {d}: {data['before_ppg']:.1f} → {data['after_ppg']:.1f} pts/race  (Δ{data['delta']:+.1f})")
    else:
        print(f"\nMetric 2 — No mid-season lead change found in {season}")

    ps = findings.get("pattern_summary", {})
    if ps.get("total_who_led"):
        n   = ps["total_who_led"]
        dec = ps["declined_after_lead"]
        ncd = ps["non_champions_declined"]
        print(f"\nHybrid era pressure pattern ({n} instances):")
        print(f"  {dec}/{n} declined in PPG after first leading")
        print(f"  Non-champions who declined: {ncd}")

    ev = [e for e in findings.get("evidence", []) if e["year"] == season]
    if ev:
        print(f"\nEvidence ({season}):")
        for e in ev[:5]:
            print(f"  [{e['type']}] {e['claim']}")

    if story.get("paragraphs"):
        tag = "FALLBACK" if story.get("fallback") else f"Gemini/{story.get('model')}"
        print(f"\nStory [{tag}]:")
        print(f"  {story['paragraphs'][0][:180]}...")
    print(f"{'─'*60}\n")


# ─────────────────────────────────────────────────────────────────────────────
# API-facing helper functions (called by api.py)
# ─────────────────────────────────────────────────────────────────────────────

# Lookup table for display names — extend as needed
DRIVER_NAMES = {
    "VER": "Max Verstappen",   "NOR": "Lando Norris",    "PIA": "Oscar Piastri",
    "LEC": "Charles Leclerc",  "SAI": "Carlos Sainz",    "HAM": "Lewis Hamilton",
    "RUS": "George Russell",   "PER": "Sergio Pérez",    "ALO": "Fernando Alonso",
    "STR": "Lance Stroll",     "GAS": "Pierre Gasly",    "OCO": "Esteban Ocon",
    "ALB": "Alexander Albon",  "BOT": "Valtteri Bottas", "ZHO": "Zhou Guanyu",
    "HUL": "Nico Hülkenberg",  "MAG": "Kevin Magnussen", "TSU": "Yuki Tsunoda",
    "RIC": "Daniel Ricciardo", "LAW": "Liam Lawson",     "SAR": "Logan Sargeant",
    "VET": "Sebastian Vettel", "RAI": "Kimi Räikkönen",  "GRO": "Romain Grosjean",
    "ROS": "Nico Rosberg",     "BUT": "Jenson Button",   "MAS": "Felipe Massa",
    "WEB": "Mark Webber",      "KVY": "Daniil Kvyat",    "ERI": "Marcus Ericsson",
    "NAK": "Nico Hülkenberg",  "DEV": "Nyck de Vries",   "BEA": "Oliver Bearman",
    "DOO": "Jack Doohan",      "ANT": "Andrea Kimi Antonelli",
}


def _season_int(raw_dict: dict, season: int) -> list:
    """Pull a season's data from a dict that may have int or str keys."""
    return raw_dict.get(season) or raw_dict.get(str(season)) or []


def _race_name_for_round(season: int, round_number: int) -> str:
    """Look up a race name from the cached raw_data."""
    raw = _read(RAW_DATA_PATH) or {}
    for r in _season_int(raw.get("results", {}), season):
        if r["round"] == round_number:
            return r["race_name"]
    return f"Round {round_number}"


def championship_progression(raw: dict, season: int, top_n: int = 6) -> dict:
    """
    Top-N drivers' cumulative championship points across all rounds.
    Reads from raw_data standings (which include sprint points).
    """
    season = int(season)
    year_standings = _season_int(raw.get("standings", {}), season)
    if not year_standings:
        return {"season": season, "rounds": [], "drivers": [], "error": "no standings data"}

    final = year_standings[-1]["standings"]
    top_codes = [s["driver_code"] for s in final[:top_n]]

    runner_code, champ_code = SEASON_DRIVERS.get(season, ("NOR", "VER"))[:2]
    rounds = [rd["round"] for rd in year_standings]

    drivers_out = []
    for code in top_codes:
        cum = []
        for rd in year_standings:
            pts = next((s["points"] for s in rd["standings"] if s["driver_code"] == code), None)
            # Fill forward — driver may have missed a round
            cum.append(pts if pts is not None else (cum[-1] if cum else 0))
        drivers_out.append({
            "code":         code,
            "name":         DRIVER_NAMES.get(code, code),
            "is_champion":  code == champ_code,
            "is_runner_up": code == runner_code,
            "cum_points":   cum,
        })

    return {"season": season, "rounds": rounds, "drivers": drivers_out}


def get_summary(season: int) -> Optional[dict]:
    """
    Per-season stats summary for the frontend (charts + callout cards).
    Reads from findings.json + timelines.json + raw_data.json.
    """
    season = int(season)
    findings  = _read(FINDINGS_PATH)
    timelines = _read(TIMELINES_PATH)
    raw       = _read(RAW_DATA_PATH)

    if not findings:
        return None

    runner_code, champ_code, runner_name, champ_name, constructor = SEASON_DRIVERS.get(
        season, ("VER", "NOR", "Max Verstappen", "Lando Norris", "Red Bull")
    )

    m1_season = (findings.get("metric_1", {}).get("seasons") or {})
    m1 = m1_season.get(season) or m1_season.get(str(season)) or {}

    m2_season = (findings.get("metric_2", {}).get("seasons") or {})
    m2 = m2_season.get(season) or m2_season.get(str(season)) or {}
    runner_trap = m2.get(runner_code)
    
    m3_season = (findings.get("metric_3", {}).get("seasons") or {})
    m3 = m3_season.get(season) or m3_season.get(str(season)) or {}

    # Per-round points for the runner-up (feeds chart 2)
    points_per_round = []
    runner_podiums = champion_podiums = 0
    runner_up_rounds_led = 0
    champion_points = runner_up_points = 0
    
    if timelines:
        year_tl    = timelines.get(season) or timelines.get(str(season)) or {}
        runner_tl  = year_tl.get(runner_code, {})
        champ_tl   = year_tl.get(champ_code, {})
        
        points_per_round = [
            {"round": r["round"], "points": r["points_this_race"]}
            for r in runner_tl.get("races", [])
        ]
        
        for race in runner_tl.get("races", []):
            if race.get("finish_position") in [1, 2, 3]:
                runner_podiums += 1
            if race.get("is_leader_after"):
                runner_up_rounds_led += 1
                
        for race in champ_tl.get("races", []):
            if race.get("finish_position") in [1, 2, 3]:
                champion_podiums += 1

    # Win counts from race results
    runner_wins = champ_wins = 0
    if raw:
        for r in _season_int(raw.get("results", {}), season):
            if r.get("finish_position") == 1:
                if r["driver_code"] == runner_code:
                    runner_wins += 1
                elif r["driver_code"] == champ_code:
                    champ_wins += 1
                    
        year_standings = _season_int(raw.get("standings", {}), season)
        if year_standings and year_standings[-1].get("standings"):
            for s in year_standings[-1]["standings"]:
                if s["driver_code"] == champ_code:
                    champion_points = s["points"]
                elif s["driver_code"] == runner_code:
                    runner_up_points = s["points"]

    total_rounds = points_per_round[-1]["round"] if points_per_round else 0

    return {
        "season":            season,
        "runner_up_code":    runner_code,
        "champion_code":     champ_code,
        "runner_up_name":    runner_name,
        "champion_name":     champ_name,
        "constructor":       constructor,
        "runner_up_stddev":  m1.get(runner_code),
        "champion_stddev":   m1.get(champ_code),
        "runner_up_lap_stddev": m3.get(runner_code),
        "champion_lap_stddev":  m3.get(champ_code),
        "before_ppg":        runner_trap["before_ppg"] if runner_trap else None,
        "after_ppg":         runner_trap["after_ppg"] if runner_trap else None,
        "lead_round":        runner_trap["lead_round"] if runner_trap else None,
        "haemorrhage_count": runner_trap.get("haemorrhage_count", 0) if runner_trap else 0,
        "runner_up_wins":    runner_wins,
        "champion_wins":     champ_wins,
        "total_rounds":      total_rounds,
        "points_per_round":  points_per_round,
        "runner_up_points":  runner_up_points,
        "champion_points":   champion_points,
        "final_margin_points": abs(champion_points - runner_up_points) if champion_points and runner_up_points else 0,
        "runner_up_podiums": runner_podiums,
        "champion_podiums":  champion_podiums,
        "runner_up_rounds_led": runner_up_rounds_led,
    }


def get_default_story(season: int) -> Optional[dict]:
    """Return story.json if it's for this season and not a fallback."""
    cached = _read(STORY_PATH)
    if cached and int(cached.get("season", 0)) == int(season) and not cached.get("fallback"):
        return cached
    return None


def generate_story_for(season: int, question: Optional[str]) -> dict:
    """Compatibility shim — called by api.py GET /api/story/{season}."""
    findings = ensure_findings()
    return generate_story(findings, season=int(season), reset=bool(question), question=question)


def _extract_lead_changes(year_tl: dict) -> list[dict]:
    """Find championship lead changes from a season's timeline data."""
    round_leaders: dict[int, dict] = {}
    for driver, tl in year_tl.items():
        for race in tl.get("races", []):
            rnd = race["round"]
            if race.get("is_leader_after"):
                round_leaders[rnd] = {"code": driver, "race_name": race["race_name"]}

    changes: list[dict] = []
    prev = None
    for rnd in sorted(round_leaders):
        code = round_leaders[rnd]["code"]
        if code != prev:
            changes.append({
                "round":            rnd,
                "race_name":        round_leaders[rnd]["race_name"],
                "new_leader":       code,
                "new_leader_name":  DRIVER_NAMES.get(code, code),
                "previous_leader":  prev,
            })
            prev = code
    return changes


def season_dossier(season: int) -> dict:
    """
    Rich per-driver / per-race dossier consumed by narrator.generate_story().
    Also used by /api/season/{season}/races and /api/season/{season}/drivers.

    Shape expected by narrator._trim_dossier_for_prompt():
        {
          season, total_rounds, race_calendar, final_standings,
          championship_lead_changes,
          drivers: {
            code: {name, final_position, position_stddev, laptime_stddev,
                   pressure_trap, race_by_race: [...]}
          }
        }
    """
    season      = int(season)
    raw         = _read(RAW_DATA_PATH) or {}
    timelines   = _read(TIMELINES_PATH) or {}
    findings    = _read(FINDINGS_PATH) or {}

    year_results   = _season_int(raw.get("results", {}), season)
    year_standings = _season_int(raw.get("standings", {}), season)
    year_tl        = timelines.get(season) or timelines.get(str(season)) or {}

    # Race calendar
    seen: set = set()
    race_calendar: list[dict] = []
    for r in year_results:
        if r["round"] not in seen:
            race_calendar.append({"round": r["round"], "race_name": r["race_name"]})
            seen.add(r["round"])
    race_calendar.sort(key=lambda x: x["round"])
    total_rounds = race_calendar[-1]["round"] if race_calendar else 0

    # Final standings
    final_standings: list[dict] = []
    if year_standings:
        for s in year_standings[-1]["standings"]:
            final_standings.append({
                "code":     s["driver_code"],
                "name":     DRIVER_NAMES.get(s["driver_code"], s["driver_code"]),
                "team":     "",
                "position": s["position"],
                "points":   s["points"],
            })

    # Championship lead changes
    lead_changes = _extract_lead_changes(year_tl)

    # Per-driver data (metric values + race-by-race arc)
    m1 = (findings.get("metric_1", {}).get("seasons") or {})
    m1 = m1.get(season) or m1.get(str(season)) or {}
    m3 = (findings.get("metric_3", {}).get("seasons") or {})
    m3 = m3.get(season) or m3.get(str(season)) or {}
    m2 = (findings.get("metric_2", {}).get("seasons") or {})
    m2 = m2.get(season) or m2.get(str(season)) or {}

    drivers_out: dict = {}
    for code, tl in year_tl.items():
        races = tl.get("races", [])
        drivers_out[code] = {
            "name":             DRIVER_NAMES.get(code, code),
            "final_position":   tl.get("final_standing"),
            "position_stddev":  m1.get(code),
            "laptime_stddev":   m3.get(code),
            "pressure_trap":    tl.get("pressure_trap"),
            "race_by_race": [
                {
                    "round":                 r["round"],
                    "race_name":             r["race_name"],
                    "finish_position":       r["finish_position"],
                    "points":                r["points_this_race"],
                    "cumulative_points":     r["cumulative_points"],
                    "championship_standing": r["championship_standing"],
                    "was_leader_entering":   r["was_leader_entering"],
                    "is_leader_after":       r["is_leader_after"],
                    "status":                r["status"],
                    "is_dnf":                r["is_dnf"],
                }
                for r in races
            ],
        }

    return {
        "season":                    season,
        "total_rounds":              total_rounds,
        "race_calendar":             race_calendar,
        "final_standings":           final_standings,
        "championship_lead_changes": lead_changes,
        "drivers":                   drivers_out,
    }


def lap_positions(season: int, round_number: int) -> dict:
    """
    Lap-by-lap position for all drivers in a single race.
    Serves cached positions_{season}_{round}.json first; falls back to FastF1.
    """
    cache = OUTPUTS / f"positions_{season}_{round_number}.json"
    if cache.exists():
        return _read(cache)

    # Try live FastF1 (only works if cache is warm)
    try:
        import fastf1
        import pandas as pd
        session = fastf1.get_session(season, round_number, "R")
        session.load(laps=True, telemetry=False, weather=False, messages=False)
        laps = session.laps

        runner_code, champ_code = SEASON_DRIVERS.get(season, ("NOR", "VER"))[:2]
        total_laps = int(laps["LapNumber"].max()) if not laps.empty else 0
        drivers_out = []

        for drv in laps["Driver"].unique():
            drv_laps = laps[laps["Driver"] == drv].sort_values("LapNumber")
            positions = [None] * total_laps
            for _, row in drv_laps.iterrows():
                lap_n = int(row["LapNumber"]) - 1
                if 0 <= lap_n < total_laps:
                    positions[lap_n] = int(row["Position"]) if not pd.isna(row["Position"]) else 0
            drivers_out.append({
                "code":         drv,
                "is_champion":  drv == champ_code,
                "is_runner_up": drv == runner_code,
                "positions":    positions,
            })

        result = {
            "season":     season,
            "round":      round_number,
            "race_name":  _race_name_for_round(season, round_number),
            "total_laps": total_laps,
            "drivers":    drivers_out,
            "error":      None,
        }
        _write(cache, result)
        return result
    except Exception as exc:
        return {
            "season": season, "round": round_number,
            "race_name": _race_name_for_round(season, round_number),
            "total_laps": 0, "drivers": [],
            "error": f"FastF1 unavailable: {type(exc).__name__}",
        }


def circuit_map(season: int, round_number: int, focus_drivers: Optional[list] = None) -> dict:
    """
    Track outline + optional driver fastest-lap overlays.
    Serves cached circuit_{season}_{round}.json. Generates on the fly if missing.
    """
    cache = OUTPUTS / f"circuit_{season}_{round_number}.json"
    if not cache.exists():
        try:
            from fetcher import generate_circuit_cache
            print(f"Generating circuit cache for {season} round {round_number}...")
            data = generate_circuit_cache(season, round_number, OUTPUTS)
        except Exception as exc:
            data = {"error": f"Failed to generate circuit cache: {exc}"}
    else:
        data = _read(cache) or {}

    if data and "error" not in data:
        if focus_drivers and data.get("drivers"):
            data["drivers"] = [d for d in data["drivers"] if d.get("code") in focus_drivers]
            
    if not data or "error" in data:
        return {
            "season": season, "round": round_number,
            "race_name":    _race_name_for_round(season, round_number),
            "circuit_name": "",
            "track":        [],
            "bbox":         {},
            "drivers":      [],
            "error":        data.get("error", "Circuit data not cached for this round."),
        }
    return data


def race_pace(raw: dict, season: int, round_number: int) -> dict:
    """
    Per-driver lap-time distribution (box-whisker) for a single race.
    Uses FastF1 stints data from fetcher.
    """
    import pandas as pd
    try:
        from fetcher import fetch_fastf1_stints
        df = fetch_fastf1_stints(int(season), int(round_number))
    except Exception as exc:
        return {"season": season, "round": round_number, "drivers": [],
                "error": f"FastF1 unavailable: {type(exc).__name__}"}

    if df.empty:
        return {"season": season, "round": round_number, "drivers": [],
                "race_name": _race_name_for_round(season, round_number),
                "error": "FastF1 data not cached for this round"}

    runner_code, champ_code = SEASON_DRIVERS.get(int(season), ("NOR", "VER"))[:2]
    drivers_out = []

    for drv, grp in df.groupby("Driver"):
        laps = grp["lap_seconds"].dropna()
        if len(laps) < 5:
            continue
        drivers_out.append({
            "code":         drv,
            "is_champion":  drv == champ_code,
            "is_runner_up": drv == runner_code,
            "median": round(float(laps.median()), 3),
            "q1":     round(float(laps.quantile(0.25)), 3),
            "q3":     round(float(laps.quantile(0.75)), 3),
            "min":    round(float(laps.min()), 3),
            "max":    round(float(laps.max()), 3),
            "stddev": round(float(laps.std()), 4),
            "n":      int(len(laps)),
        })

    return {
        "season":    season,
        "round":     round_number,
        "race_name": _race_name_for_round(season, round_number),
        "drivers":   sorted(drivers_out, key=lambda x: x["median"]),
        "error":     None,
    }


def get_agent_status() -> dict:
    thread_file = OUTPUTS / "analyst_thread.txt"
    thread_id   = thread_file.read_text().strip() if thread_file.exists() else None
    return {
        "backboard_configured": bool(
            os.getenv("BACKBOARD_FETCHER_ID") and os.getenv("BACKBOARD_ANALYST_ID")
        ),
        "analyst_thread_id": thread_id,
        "memory_active":     bool(thread_id),
        "raw_data_cached":   RAW_DATA_PATH.exists(),
        "findings_cached":   FINDINGS_PATH.exists(),
    }


def force_analyst_through_backboard() -> dict:
    raw = _read(RAW_DATA_PATH)
    if not raw:
        raise ValueError("raw_data.json not cached. Run the pipeline first.")
    from agents.analyst_agent import run_analyst_agent
    result = run_analyst_agent(raw)
    existing = _read(FINDINGS_PATH) or {}
    existing.update(result)
    _write(FINDINGS_PATH, existing)
    return {"status": "ok", "message": "Analyst rerun via Backboard complete."}


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="The Consistency Theorem pipeline")
    parser.add_argument("--season",  type=int, default=None,
                        help="Season to build story for (default: most recent in scope)")
    parser.add_argument("--reset",   action="store_true",
                        help="Ignore all caches and rerun everything")
    parser.add_argument("--no-fast", action="store_true",
                        help="Full 2014-2024 (overrides FAST_MODE=True)")
    args = parser.parse_args()

    fast    = FAST_MODE and not args.no_fast
    seasons = FAST_SEASONS if fast else FULL_SEASONS

    if args.season and args.season not in seasons:
        seasons = sorted(set(seasons) | {args.season})

    story_season = args.season or max(seasons)

    run(seasons, story_season, fast_mode=fast, reset=args.reset)
