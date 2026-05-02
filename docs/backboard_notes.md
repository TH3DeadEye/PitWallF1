# Backboard SDK Notes

## Setup

```bash
pip install backboard-sdk
```

```python
import backboard

client = backboard.Backboard(
    api_key=os.getenv("BACKBOARD_API_KEY"),
    base_url=os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api")
)
```

---

## Creating Assistants (run setup_agents.py ONCE)

```python
# Fetcher — tool calling, no memory needed
fetcher = client.assistants.create(
    name="F1 Fetcher",
    instructions="You are a data fetcher. When asked for F1 data, call the appropriate tool. Return results exactly as received. Do not add commentary.",
    tools=[
        {
            "type": "function",
            "function": {
                "name": "fetch_season_results",
                "description": "Fetch race results, qualifying positions, and lap times for an F1 season",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "year": {"type": "integer", "description": "Season year (2014-2024)"},
                        "include_laps": {"type": "boolean", "description": "Whether to include lap time data"}
                    },
                    "required": ["year"]
                }
            }
        }
    ]
)

# Analyst — memory: "Auto" for cross-session persistence
analyst = client.assistants.create(
    name="F1 Analyst",
    instructions="""You are an F1 data analyst. You receive raw race data and compute:
1. quali_std: qualifying position standard deviation per driver per season
2. laptime_std: average lap time standard deviation per season
3. points_outside_top3: points scored in races where driver finished P4+

Run sklearn correlation against final championship standing.
Return structured JSON findings only. No prose.""",
    memory="Auto"
)
```

---

## Thread Management

```python
# Create thread (one per pipeline run, or reuse for analyst across sessions)
thread = client.threads.create()
thread_id = thread.id

# For analyst: persist thread_id to reuse memory across sessions
# Store in data/outputs/analyst_thread.txt
```

---

## REQUIRES_ACTION Loop (complete pattern)

```python
import time

def run_agent_with_tools(client, thread_id, assistant_id, message, tool_executor):
    """
    Full Backboard tool calling loop.
    tool_executor: dict mapping tool_name -> callable
    """
    # Add message
    client.messages.create(
        thread_id=thread_id,
        role="user",
        content=message
    )
    
    # Start run
    run = client.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id
    )
    run_id = run.id
    
    # Poll
    while True:
        time.sleep(1)
        run = client.runs.retrieve(thread_id=thread_id, run_id=run_id)
        status = run.status
        
        if status == "completed":
            break
            
        elif status == "requires_action":
            tool_calls = run.required_action.submit_tool_outputs.tool_calls
            tool_outputs = []
            
            for tc in tool_calls:
                fn_name = tc.function.name
                fn_args = json.loads(tc.function.arguments)
                
                if fn_name in tool_executor:
                    result = tool_executor[fn_name](**fn_args)
                else:
                    result = {"error": f"Unknown tool: {fn_name}"}
                
                tool_outputs.append({
                    "tool_call_id": tc.id,
                    "output": json.dumps(result)
                })
            
            client.runs.submit_tool_outputs(
                thread_id=thread_id,
                run_id=run_id,
                tool_outputs=tool_outputs
            )
            
        elif status in ("failed", "cancelled", "expired"):
            raise RuntimeError(f"Run {run_id} ended with status: {status}")
    
    # Get last assistant message
    messages = client.messages.list(thread_id=thread_id)
    for msg in reversed(messages.data):
        if msg.role == "assistant":
            return msg.content[0].text.value
    
    return None
```

---

## Memory (Analyst Agent)

- `memory="Auto"` means Backboard automatically manages conversation memory
- Reuse the **same thread_id** across sessions to build on prior analysis
- Store `analyst_thread_id` in `data/outputs/analyst_thread.txt`
- If file doesn't exist, create new thread and save it

```python
ANALYST_THREAD_FILE = "./data/outputs/analyst_thread.txt"

def get_or_create_analyst_thread(client):
    if os.path.exists(ANALYST_THREAD_FILE):
        with open(ANALYST_THREAD_FILE) as f:
            return f.read().strip()
    thread = client.threads.create()
    with open(ANALYST_THREAD_FILE, "w") as f:
        f.write(thread.id)
    return thread.id
```

---

## Promo Code
`HUSKYHACKS26` — already applied to account

## Assistant IDs
After running `setup_agents.py`, copy printed IDs into `.env`:
```
BACKBOARD_FETCHER_ID=asst_xxx
BACKBOARD_ANALYST_ID=asst_xxx
```
