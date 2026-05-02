"""
agents/fetcher_agent.py — Backboard Fetcher agent (REQUIRES_ACTION loop).

Uses BackboardClient async pattern:
  - create_thread(assistant_id)
  - add_message(thread_id, content, stream=False)
  - submit_tool_outputs(thread_id, run_id, tool_outputs, stream=False)
  - tc.function.parsed_arguments → already a dict, no json.loads needed

Tool results are accumulated locally during the loop. The final response.content
is ignored — data comes from executed tools.
"""
import os
import asyncio
import json
import sys
from backboard import BackboardClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fetcher import fetch_hybrid_era_results, fetch_fastf1_season_stints

load_dotenv()

client = BackboardClient(
    api_key=os.getenv("BACKBOARD_API_KEY"),
    base_url=os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api"),
)

FETCHER_ID = os.getenv("BACKBOARD_FETCHER_ID")
FASTF1_YEARS = list(range(2018, 2025))


def _execute_tool(fn_name: str, fn_args: dict) -> dict:
    """Dispatch a tool call to the local fetcher function. fn_args is already a dict."""
    if fn_name == "fetch_hybrid_era_results":
        start = fn_args["start_year"]
        end = fn_args["end_year"]
        print(f"  [tool] fetch_hybrid_era_results({start}, {end}) via Jolpica ...")
        result = fetch_hybrid_era_results(start, end)
        race_count = sum(len(v) for v in result["results"].values())
        print(f"  [tool] → {end - start + 1} seasons, {race_count} driver-race entries")
        return result

    if fn_name == "fetch_fastf1_season_stints":
        year = fn_args["year"]
        print(f"  [tool] fetch_fastf1_season_stints({year}) via FastF1 cache ...")
        stints = fetch_fastf1_season_stints(year)
        print(f"  [tool] → {len(stints)} stint-lap records for {year}")
        return {"year": year, "stints": stints}

    return {"error": f"Unknown tool: {fn_name}"}


async def _run_async() -> dict:
    if not FETCHER_ID:
        raise EnvironmentError(
            "BACKBOARD_FETCHER_ID not set. Run agents/setup_agents.py first."
        )

    print("[Fetcher Agent] Starting hybrid era run (2014-2024)...")

    thread = await client.create_thread(FETCHER_ID)

    response = await client.add_message(
        thread_id=thread.thread_id,
        content=(
            "Fetch all F1 hybrid era data (2014-2024). "
            "Call fetch_hybrid_era_results(2014, 2024) first. "
            "Then call fetch_fastf1_season_stints for each year 2018 through 2024."
        ),
        stream=False,
    )

    raw_data: dict = {"results": {}, "standings": {}, "stints": {}}

    while response.status == "REQUIRES_ACTION" and response.tool_calls:
        tool_outputs = []

        for tc in response.tool_calls:
            fn_name = tc.function.name
            fn_args = tc.function.parsed_arguments  # already a dict

            result = _execute_tool(fn_name, fn_args)

            if fn_name == "fetch_hybrid_era_results":
                raw_data["results"].update(result.get("results", {}))
                raw_data["standings"].update(result.get("standings", {}))
            elif fn_name == "fetch_fastf1_season_stints":
                year = fn_args["year"]
                raw_data["stints"][year] = result.get("stints", [])

            tool_outputs.append({
                "tool_call_id": tc.id,
                "output": json.dumps(result),
            })

        response = await client.submit_tool_outputs(
            thread_id=thread.thread_id,
            run_id=response.run_id,
            tool_outputs=tool_outputs,
            stream=False,
        )

    print("[Fetcher Agent] Run completed.")
    return raw_data


def run_fetcher_agent() -> dict:
    """Synchronous entry point. Returns raw_data dict."""
    return asyncio.run(_run_async())


if __name__ == "__main__":
    data = run_fetcher_agent()
    print("\nraw_data summary:")
    for year in sorted(data["results"].keys()):
        n = len(data["results"][year])
        s = len(data["stints"].get(year, []))
        print(f"  {year}: {n} driver-race entries, {s} stint-lap records")
