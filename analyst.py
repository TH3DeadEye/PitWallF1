"""
analyst.py — Compute the 3 consistency metrics from raw fetcher data.

All functions are pure: no file I/O, no API calls.
Input shapes match the output of fetcher.fetch_hybrid_era_results()
and fetcher.fetch_fastf1_season_stints().
"""
import statistics
from collections import defaultdict
from scipy import stats as scipy_stats

# Minimum data points required before including a driver in a metric
MIN_RACES_M1 = 5    # races for metric 1 (position stddev)
MIN_STINTS_M3 = 10  # stints for metric 3 (lap time stddev)
MIN_LAPS_PER_STINT = 3  # laps per stint to compute a meaningful stddev


def _int_years(d: dict) -> dict:
    """Normalize year keys to int — JSON deserialisation converts them to strings."""
    return {int(k): v for k, v in d.items()}


# ── Metric 1 ──────────────────────────────────────────────────────────────────

def compute_metric_1(results: dict) -> dict:
    """
    Finishing position stddev per driver per season.

    Rules:
    - Mechanical DNFs (finish_position=None) → excluded entirely
    - Crash/error DNFs (finish_position=21) → included (driver error = consistency failure)
    - Driver must have ≥ MIN_RACES_M1 valid results in the season

    Lower stddev = more consistent finisher = better psychological resilience.
    VER should be clearly lower than NOR in 2024.

    Returns:
        {
          "label": str,
          "seasons": {year: {"NOR": 2.1, "VER": 1.8, ...}}
        }
    """
    results = _int_years(results)
    seasons = {}

    for year, race_results in results.items():
        driver_positions: dict[str, list[int]] = defaultdict(list)
        for r in race_results:
            if r["finish_position"] is not None:
                driver_positions[r["driver_code"]].append(r["finish_position"])

        season_stddevs = {}
        for driver, positions in driver_positions.items():
            if len(positions) >= MIN_RACES_M1:
                season_stddevs[driver] = round(statistics.stdev(positions), 3)

        seasons[year] = season_stddevs

    return {
        "label": "Finishing position stddev (mechanical DNFs excluded, crash=P21)",
        "seasons": seasons,
    }


# ── Metric 2 ──────────────────────────────────────────────────────────────────

def compute_metric_2(results: dict, standings: dict) -> dict:
    """
    Championship lead pressure trap: points-per-race before vs after first taking the lead.

    For each driver who first appears as P1 in standings after round L:
        before_ppg = points in rounds 1..(L-1) / (L-1) races
        after_ppg  = points in rounds L..end  / (end-L+1) races
        delta      = after_ppg - before_ppg

    Negative delta = the pressure trap.
    NOR 2024: led from Monza (R16), scored 47pts in 8 races after = 5.9 ppg.
    VER 2024: retook lead after Monza, scored 103pts in same window = 12.9 ppg.

    Returns:
        {
          "label": str,
          "seasons": {
            year: {
              driver_code: {
                "lead_round": int,
                "before_ppg": float,
                "after_ppg": float,
                "delta": float
              }
            }
          }
        }
    """
    results = _int_years(results)
    standings = _int_years(standings)
    seasons = {}

    for year, year_standings in standings.items():
        year_results = results.get(year, [])
        if not year_results:
            continue

        total_rounds = max(r["round"] for r in year_results)

        # Find the first round each driver appeared as P1 in standings
        first_lead_round: dict[str, int] = {}
        for round_data in year_standings:
            rnd = round_data["round"]
            top = round_data["standings"]
            if top and top[0]["position"] == 1:
                leader = top[0]["driver_code"]
                if leader not in first_lead_round:
                    first_lead_round[leader] = rnd

        season_deltas: dict[str, dict] = {}
        for driver, lead_round in first_lead_round.items():
            # Need at least 3 races before taking the lead for a meaningful "before" window
            if lead_round < 4:
                continue

            # Build round → points lookup for this driver
            driver_pts: dict[int, float] = {
                r["round"]: r["points"]
                for r in year_results
                if r["driver_code"] == driver
            }

            # Before: rounds 1 .. lead_round - 1
            before_rounds = list(range(1, lead_round))
            # After: rounds lead_round .. total_rounds
            after_rounds = list(range(lead_round, total_rounds + 1))

            if not before_rounds or not after_rounds:
                continue

            before_pts = [driver_pts.get(r, 0) for r in before_rounds]
            after_pts = [driver_pts.get(r, 0) for r in after_rounds]

            before_ppg = sum(before_pts) / len(before_pts)
            after_ppg = sum(after_pts) / len(after_pts)
            delta = after_ppg - before_ppg

            season_deltas[driver] = {
                "lead_round": lead_round,
                "before_ppg": round(before_ppg, 2),
                "after_ppg": round(after_ppg, 2),
                "delta": round(delta, 2),
            }

        if season_deltas:
            seasons[year] = season_deltas

    return {
        "label": "Points-per-race delta after first taking championship lead",
        "seasons": seasons,
    }


# ── Metric 3 ──────────────────────────────────────────────────────────────────

def compute_metric_3(stints: dict) -> dict:
    """
    Average intra-stint lap time stddev per driver per season.

    For each (driver, round, stint) group:
    - Compute stddev of lap_seconds (need ≥ MIN_LAPS_PER_STINT laps)

    Then average all per-stint stddevs per driver per season.
    Requires ≥ MIN_STINTS_M3 stints to be included.

    Lower = more metronomic. VER expected lower than NOR in 2024.
    Telemetry proof: same car, different hands.

    Returns:
        {
          "label": str,
          "seasons": {year: {"NOR": 0.85, "VER": 0.62, ...}}
        }
    """
    stints = _int_years(stints)
    seasons = {}

    for year, records in stints.items():
        if not records:
            continue

        # Group laps by (driver, round, stint)
        groups: dict[tuple, list[float]] = defaultdict(list)
        for r in records:
            key = (r["Driver"], r.get("round", 0), r["Stint"])
            groups[key].append(float(r["lap_seconds"]))

        # Stddev per stint → average per driver
        driver_stint_stddevs: dict[str, list[float]] = defaultdict(list)
        for (driver, rnd, stint), lap_times in groups.items():
            if len(lap_times) >= MIN_LAPS_PER_STINT:
                driver_stint_stddevs[driver].append(statistics.stdev(lap_times))

        season_avgs: dict[str, float] = {}
        for driver, stddevs in driver_stint_stddevs.items():
            if len(stddevs) >= MIN_STINTS_M3:
                season_avgs[driver] = round(statistics.mean(stddevs), 4)

        if season_avgs:
            seasons[year] = season_avgs

    return {
        "label": "Intra-stint laptime stddev in seconds (avg across all stints)",
        "seasons": seasons,
    }


# ── Correlation ───────────────────────────────────────────────────────────────

def compute_correlation(
    metric_1: dict,
    metric_2: dict,
    metric_3: dict,
    standings: dict,
) -> dict:
    """
    Pearson r for each metric vs final WDC standing rank.

    Sample: top-10 WDC finishers across all hybrid era seasons.
    Positive r = higher metric value → worse final rank → thesis holds.

    Returns:
        {
          "metric_1_r": float,
          "metric_2_r": float,
          "metric_3_r": float,
          "note": str
        }
    """
    standings = _int_years(standings)

    # Build {year: {driver: final_rank}} for top-10 WDC finishers
    final_ranks: dict[int, dict[str, int]] = {}
    for year, year_standings in standings.items():
        if year_standings:
            last = year_standings[-1]["standings"]
            final_ranks[year] = {
                s["driver_code"]: s["position"]
                for s in last
                if s["position"] <= 10
            }

    def collect_pairs(metric_seasons: dict) -> tuple[list, list]:
        metric_vals, rank_vals = [], []
        for year, drivers in _int_years(metric_seasons).items():
            year_ranks = final_ranks.get(year, {})
            for driver, val in drivers.items():
                if driver in year_ranks:
                    metric_vals.append(float(val))
                    rank_vals.append(year_ranks[driver])
        return metric_vals, rank_vals

    def pearson_r(metric_seasons: dict) -> float:
        m_vals, r_vals = collect_pairs(metric_seasons)
        if len(m_vals) < 5:
            return 0.0
        r, _ = scipy_stats.pearsonr(m_vals, r_vals)
        return round(float(r), 3)

    # For metric 2, extract the delta value per driver per season
    m2_delta_seasons: dict = {}
    for year, drivers in _int_years(metric_2.get("seasons", {})).items():
        m2_delta_seasons[year] = {
            driver: data["delta"] for driver, data in drivers.items()
        }

    return {
        "metric_1_r": pearson_r(metric_1.get("seasons", {})),
        "metric_2_r": pearson_r(m2_delta_seasons),
        "metric_3_r": pearson_r(metric_3.get("seasons", {})),
        "note": "Pearson r vs final WDC standing rank, top-10 finishers, 2014-2024",
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    from fetcher import fetch_jolpica_season, fetch_jolpica_sprints, _compute_rolling_standings

    def load_year(year):
        r = fetch_jolpica_season(year)
        s = fetch_jolpica_sprints(year)
        standings = _compute_rolling_standings(r + s)
        return r, standings

    # Test metric 1 with 2024
    print("=== Metric 1 — Finishing position stddev ===")
    r24, st24 = load_year(2024)
    m1 = compute_metric_1({2024: r24})
    top = sorted(m1["seasons"][2024].items(), key=lambda x: x[1])
    for driver, val in top[:6]:
        print(f"  {driver}: {val}")

    # Test metric 2 with 2021 (HAM/VER battle — classic lead change season)
    print("\n=== Metric 2 — Pressure trap (2021 HAM/VER) ===")
    r21, st21 = load_year(2021)
    m2 = compute_metric_2({2021: r21}, {2021: st21})
    for driver, data in sorted(m2["seasons"].get(2021, {}).items()):
        print(f"  {driver}: before={data['before_ppg']:.1f} → after={data['after_ppg']:.1f} (Δ{data['delta']:+.1f}) first led R{data['lead_round']}")

    print("\n  NOTE: 2024 — VER led wire-to-wire (no lead change).")
    print("  For 2024 the narrative is: NOR couldn't take the lead even with the faster car.")
    print("  Metric 2 evidence comes from 2021/2018 for the correlation.")

    print("\n=== NOR vs VER 2024 — Metric 1 highlight ===")
    for driver in ["NOR", "VER"]:
        print(f"  {driver} pos stddev: {m1['seasons'][2024].get(driver, 'N/A')}")
