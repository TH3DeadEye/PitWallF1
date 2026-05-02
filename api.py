"""
api.py — FastAPI server for The Consistency Theorem.

Endpoints:
- GET  /api/health         → {"status": "ok"}
- GET  /api/seasons        → [{year, runner_up, champion, constructor}, ...]
- GET  /api/findings       → cached findings.json (all seasons), or 404 if not yet computed
- POST /api/run            → body {season, question?} → {season, question, findings, story}

Run locally:
    uvicorn api:app --reload --port 8000
"""
import os
import sys
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import orchestrator

app = FastAPI(
    title="Consistency Theorem API",
    version="0.1.0",
    description="Backend for the F1 consistency-theorem data-journalism app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    season: int = Field(ge=2014, le=2025)
    question: Optional[str] = None
    force_fetch: bool = False
    force_findings: bool = False
    force_story: Optional[bool] = None  # default: True iff question provided


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/agent-status")
def agent_status():
    """
    Snapshot of the most recent pipeline run's Backboard usage.

    Used by the demo to prove that:
      - the Fetcher agent ran (registers usage on backboard.io dashboard)
      - the Analyst agent ran with memory="Auto" and a persisted thread_id
        that survives across server restarts.
    """
    return orchestrator.get_agent_status()


@app.post("/api/agent-rerun")
def agent_rerun():
    """
    Force a fresh Analyst agent run through Backboard, bypassing the
    findings.json cache. Used for the live Backboard demo: each click
    should accumulate memory on the same persisted thread.
    """
    try:
        return orchestrator.force_analyst_through_backboard()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@app.get("/api/seasons")
def list_seasons():
    return [
        {
            "year": yr,
            "runner_up_code": rc,
            "champion_code": cc,
            "runner_up": rn,
            "champion": cn,
            "constructor": team,
        }
        for yr, (rc, cc, rn, cn, team) in orchestrator.SEASON_DRIVERS.items()
    ]


@app.get("/api/findings")
def get_findings():
    cached = orchestrator._read_json(orchestrator.FINDINGS_PATH)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail="No findings cached yet. POST /api/run to compute.",
        )
    return cached


@app.get("/api/summary/{season}")
def get_summary(season: int):
    """Per-season real summary (stats + per-round points for chart 2)."""
    summary = orchestrator.get_summary(season)
    if not summary:
        raise HTTPException(status_code=404, detail=f"No summary for season {season}")
    return summary


@app.get("/api/story/{season}")
def get_story(season: int):
    """Cached default (no-question) story for a season. Generates if missing."""
    story = orchestrator.get_default_story(season)
    if story is None:
        try:
            story = orchestrator.generate_story_for(season, None)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
    return story


@app.get("/api/championship-progression/{season}")
def get_championship_progression(season: int, top_n: int = 6):
    """Top-N drivers' cumulative championship points across all rounds of a season."""
    raw = orchestrator._read_json(orchestrator.RAW_DATA_PATH)
    if raw is None:
        raise HTTPException(status_code=404, detail="raw_data.json not cached yet.")
    return orchestrator.championship_progression(raw, season, top_n=top_n)


@app.get("/api/race-pace/{season}/{round_number}")
def get_race_pace(season: int, round_number: int):
    """Per-driver lap-time distribution stats for a single race (FastF1 cache)."""
    raw = orchestrator._read_json(orchestrator.RAW_DATA_PATH)
    if raw is None:
        raise HTTPException(status_code=404, detail="raw_data.json not cached yet.")
    return orchestrator.race_pace(raw, season, round_number)


@app.get("/api/lap-positions/{season}/{round_number}")
def get_lap_positions(season: int, round_number: int):
    """Lap-by-lap position evolution for a single race. Lazy FastF1 fetch + cache."""
    return orchestrator.lap_positions(season, round_number)


@app.get("/api/circuit/{season}/{round_number}")
def get_circuit(season: int, round_number: int, drivers: Optional[str] = None):
    """
    Track outline + optional per-driver fastest-lap overlays for a single race.
    `drivers` is an optional comma-separated list of driver codes (e.g. NOR,VER,PIA).
    """
    focus = [d.strip() for d in drivers.split(",")] if drivers else None
    return orchestrator.circuit_map(season, round_number, focus_drivers=focus)


@app.get("/api/season/{season}/dossier")
def get_dossier(season: int):
    """Comprehensive per-driver/per-race dossier for a season — feeds the AI narrator."""
    return orchestrator.season_dossier(season)

@app.get("/api/telemetry/{season}/{round_number}")
def get_telemetry(season: int, round_number: int, driver: str, lap: int):
    """
    Fetch raw X/Y/nGear telemetry for a specific driver and lap.
    Used for the gear segmentation map on-demand.
    """
    try:
        from fetcher import fetch_driver_lap_telemetry
        data = fetch_driver_lap_telemetry(season, round_number, driver, lap)
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/season/{season}/races")
def get_season_races(season: int):
    """List of all races in a season with round numbers and names."""
    dossier = orchestrator.season_dossier(season)
    return {"season": season, "races": dossier.get("race_calendar", [])}


@app.get("/api/season/{season}/drivers")
def get_season_drivers(season: int):
    """List of drivers who appear in a season, sorted by final standings position."""
    dossier = orchestrator.season_dossier(season)
    return {
        "season": season,
        "drivers": [
            {"code": s["code"], "name": s["name"], "team": s["team"], "final_position": s["position"]}
            for s in dossier.get("final_standings", [])
        ],
    }


@app.post("/api/run")
def run_pipeline(req: RunRequest):
    if req.force_fetch:
        orchestrator.fetch_raw_data(force=True)
    if req.force_findings:
        orchestrator.ensure_findings(force=True)

    # Default policy: a non-empty question always forces a fresh story.
    has_question = bool(req.question and req.question.strip())
    force_story = req.force_story if req.force_story is not None else has_question

    try:
        result = orchestrator.run(req.season, req.question, force_story=force_story)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
