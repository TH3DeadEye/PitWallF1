"""
agents/setup_agents.py — Run ONCE to create Backboard assistants.

Prints two lines to copy into .env:
    BACKBOARD_FETCHER_ID=asst_xxx
    BACKBOARD_ANALYST_ID=asst_xxx

Usage:
    python agents/setup_agents.py
"""
import os
import asyncio
from backboard import BackboardClient
from dotenv import load_dotenv

load_dotenv()

client = BackboardClient(
    api_key=os.getenv("BACKBOARD_API_KEY"),
    base_url=os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api"),
)

HYBRID_ERA = "2014-2024"
FASTF1_ERA = "2018-2024"

# Model for both Backboard assistants. Override via .env.
# Common Backboard identifiers for Claude 3.5 Haiku: try without suffix first.
BACKBOARD_MODEL = os.getenv("BACKBOARD_MODEL", "claude-3-5-haiku-20241022")


async def create_fetcher() -> str:
    assistant = await client.create_assistant(
        name=f"F1 Fetcher {HYBRID_ERA}",
        model=BACKBOARD_MODEL,
        system_prompt=(
            f"You are a data fetcher for F1 hybrid era ({HYBRID_ERA}) analysis. "
            "When asked to fetch data: "
            "(1) Call fetch_hybrid_era_results once to get all race results and standings. "
            f"(2) Call fetch_fastf1_season_stints once per year from 2018 to 2024 (7 calls total). "
            "Do not add commentary. Confirm when all calls are done."
        ),
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "fetch_hybrid_era_results",
                    "description": (
                        "Fetch all race results and championship standings for a range of F1 seasons "
                        "using the Jolpica API (api.jolpi.ca/ergast). "
                        "Returns results and rolling standings for every race in the date range."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "start_year": {
                                "type": "integer",
                                "description": "First season to fetch, e.g. 2014",
                            },
                            "end_year": {
                                "type": "integer",
                                "description": "Last season to fetch, e.g. 2024",
                            },
                        },
                        "required": ["start_year", "end_year"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "fetch_fastf1_season_stints",
                    "description": (
                        "Fetch intra-stint lap time data for all races in one F1 season "
                        "using the local FastF1 cache. Only valid for 2018 and later."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "year": {
                                "type": "integer",
                                "description": "Season year (2018-2024)",
                            }
                        },
                        "required": ["year"],
                    },
                },
            },
        ],
    )
    return assistant.assistant_id


async def create_analyst() -> str:
    assistant = await client.create_assistant(
        name=f"F1 Analyst {HYBRID_ERA}",
        model=BACKBOARD_MODEL,
        system_prompt=(
            f"You are an F1 data analyst for the hybrid era ({HYBRID_ERA}). "
            "When asked to compute metrics, call compute_metric_1, compute_metric_2, and compute_metric_3 in sequence. "
            "After all three tool calls complete, return ONLY a valid JSON object with this exact shape "
            "(fill real numbers, never leave 0.0 placeholders):\n"
            "{\n"
            '  "metric_1": {\n'
            '    "label": "Finishing position stddev (DNFs excluded)",\n'
            '    "seasons": {"2024": {"NOR": 0.0, "VER": 0.0}, "2023": {}}\n'
            "  },\n"
            '  "metric_2": {\n'
            '    "label": "Points-per-race delta after taking championship lead",\n'
            '    "seasons": {"2024": {"NOR": {"before_ppg": 0.0, "after_ppg": 0.0, "delta": 0.0}}}\n'
            "  },\n"
            '  "metric_3": {\n'
            '    "label": "Intra-stint laptime stddev in seconds (2018-2024)",\n'
            '    "seasons": {"2024": {"NOR": 0.0, "VER": 0.0}}\n'
            "  },\n"
            '  "correlation": {\n'
            '    "metric_1_r": 0.0,\n'
            '    "metric_2_r": 0.0,\n'
            '    "metric_3_r": 0.0,\n'
            '    "note": "Pearson r vs final WDC standing rank across hybrid era"\n'
            "  }\n"
            "}\n"
            "No prose, no markdown fences. Only the JSON object."
        ),
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "compute_metric_1",
                    "description": (
                        "Compute finishing position standard deviation per driver per season "
                        "across the full hybrid era. Mechanical DNFs are excluded. "
                        "Returns per-season dict of driver → stddev."
                    ),
                    "parameters": {"type": "object", "properties": {}, "required": []},
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "compute_metric_2",
                    "description": (
                        "For each season where a driver first took the championship lead and then lost it, "
                        "compute points-per-race before vs after they first led the standings. "
                        "The 2024 NOR number is the centrepiece."
                    ),
                    "parameters": {"type": "object", "properties": {}, "required": []},
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "compute_metric_3",
                    "description": (
                        "Compute average intra-stint lap time standard deviation per driver per season "
                        "for 2018-2024 (FastF1 era). Returns per-season dict of driver → stddev in seconds."
                    ),
                    "parameters": {"type": "object", "properties": {}, "required": []},
                },
            },
        ],
    )
    return assistant.assistant_id


async def main():
    print("Creating Fetcher assistant (hybrid era)...")
    fetcher_id = await create_fetcher()
    print(f"BACKBOARD_FETCHER_ID={fetcher_id}")

    print("Creating Analyst assistant (hybrid era, memory=Auto)...")
    analyst_id = await create_analyst()
    print(f"BACKBOARD_ANALYST_ID={analyst_id}")

    print("\nPaste both lines above into your .env file.")


if __name__ == "__main__":
    asyncio.run(main())
