"""
agents/analyst_agent.py — Backboard Analyst agent with memory="Auto".

memory="Auto" is passed per add_message call (not on create_assistant).
Thread ID is persisted to data/outputs/analyst_thread.txt so memory
accumulates across pipeline reruns — the Backboard memory demo feature.

On the second run the agent logs "Reusing thread (memory active)".
"""
import os
import re
import asyncio
import json
import sys
from backboard import BackboardClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

client = BackboardClient(
    api_key=os.getenv("BACKBOARD_API_KEY"),
    base_url=os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api"),
)

ANALYST_ID = os.getenv("BACKBOARD_ANALYST_ID")
THREAD_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "outputs", "analyst_thread.txt",
)


def _get_persisted_thread() -> str | None:
    if os.path.exists(THREAD_FILE):
        with open(THREAD_FILE) as f:
            tid = f.read().strip()
        if tid:
            return tid
    return None


def _save_thread(thread_id) -> None:
    os.makedirs(os.path.dirname(THREAD_FILE), exist_ok=True)
    with open(THREAD_FILE, "w") as f:
        f.write(str(thread_id))


def _execute_tool(fn_name: str, fn_args: dict, raw_data: dict) -> dict:
    """
    Dispatch analyst tool calls to analyst.py functions.
    fn_args is already a dict (parsed_arguments). raw_data passed via closure —
    tools declare no parameters to avoid sending large JSON as tool arguments.
    """
    import analyst

    if fn_name == "compute_metric_1":
        print("  [tool] compute_metric_1 — finishing position stddev ...")
        result = analyst.compute_metric_1(raw_data["results"])
        print(f"  [tool] → {len(result.get('seasons', {}))} seasons computed")
        return result

    if fn_name == "compute_metric_2":
        print("  [tool] compute_metric_2 — championship lead pressure trap ...")
        result = analyst.compute_metric_2(raw_data["results"], raw_data["standings"])
        print(f"  [tool] → {len(result.get('seasons', {}))} seasons with lead changes")
        return result

    if fn_name == "compute_metric_3":
        print("  [tool] compute_metric_3 — intra-stint laptime stddev ...")
        result = analyst.compute_metric_3(raw_data["stints"])
        print(f"  [tool] → {len(result.get('seasons', {}))} seasons computed")
        return result

    return {"error": f"Unknown tool: {fn_name}"}


def _parse_findings(content: str) -> dict:
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"Could not parse analyst response as JSON. Got: {content[:300]}")


async def _run_async(raw_data: dict) -> dict:
    if not ANALYST_ID:
        raise EnvironmentError(
            "BACKBOARD_ANALYST_ID not set. Run agents/setup_agents.py first."
        )

    # Reuse persisted thread for memory continuity across runs
    thread_id = _get_persisted_thread()
    if thread_id:
        print(f"[Analyst Agent] Reusing thread {thread_id[:20]}... (memory active)")
    else:
        thread = await client.create_thread(ANALYST_ID)
        thread_id = str(thread.thread_id)
        _save_thread(thread_id)
        print(f"[Analyst Agent] New thread: {thread_id[:20]}...")

    seasons = sorted(raw_data.get("results", {}).keys())
    total_races = sum(len(v) for v in raw_data["results"].values())
    total_stints = sum(len(v) for v in raw_data.get("stints", {}).values())

    response = await client.add_message(
        thread_id=thread_id,
        content=(
            f"Compute all 3 F1 consistency metrics for the hybrid era.\n"
            f"Data: {len(seasons)} seasons ({min(seasons)}-{max(seasons)}), "
            f"{total_races} driver-race entries, {total_stints} stint-lap records.\n"
            "Call compute_metric_1, compute_metric_2, and compute_metric_3. "
            "Return results as a JSON object."
        ),
        memory="Auto",
        stream=False,
    )

    while response.status == "REQUIRES_ACTION" and response.tool_calls:
        tool_outputs = []

        for tc in response.tool_calls:
            fn_name = tc.function.name
            fn_args = tc.function.parsed_arguments  # already a dict

            result = _execute_tool(fn_name, fn_args, raw_data)
            tool_outputs.append({
                "tool_call_id": tc.id,
                "output": json.dumps(result),
            })

        response = await client.submit_tool_outputs(
            thread_id=thread_id,
            run_id=response.run_id,
            tool_outputs=tool_outputs,
            stream=False,
        )

    print("[Analyst Agent] Run completed.")
    return _parse_findings(response.content)


def run_analyst_agent(raw_data: dict) -> dict:
    """Synchronous entry point."""
    return asyncio.run(_run_async(raw_data))


if __name__ == "__main__":
    RAW_DATA_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data", "outputs", "raw_data.json",
    )
    if not os.path.exists(RAW_DATA_PATH):
        print("raw_data.json not found. Run orchestrator.py first.")
        sys.exit(1)

    with open(RAW_DATA_PATH) as f:
        raw_data = json.load(f)

    findings = run_analyst_agent(raw_data)
    print("\nFindings:")
    print(json.dumps(findings, indent=2))
