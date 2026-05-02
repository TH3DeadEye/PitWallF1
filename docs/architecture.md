# Architecture — The Consistency Theorem

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        orchestrator.py                       │
│                                                              │
│  1. Call Fetcher Agent → raw DataFrames (JSON)               │
│  2. Call Analyst Agent → structured findings (JSON)          │
│  3. Call Narrator (Gemini) → story (plain text)              │
│  4. Pass all three to Streamlit app                          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
  │   Fetcher   │    │     Analyst     │    │   Narrator   │
  │  (Backboard)│    │  (Backboard +   │    │   (Gemini    │
  │             │    │   memory:Auto)  │    │  1.5 Flash)  │
  │ FastF1 tool │    │                 │    │              │
  │   calls     │    │ sklearn corr    │    │ 3-paragraph  │
  │             │    │ 3 metrics       │    │ journalist   │
  │ → raw JSON  │    │ → findings JSON │    │ story        │
  └─────────────┘    └─────────────────┘    └──────────────┘
         │
         ▼
  ┌─────────────┐
  │   FastF1    │
  │  (local     │
  │   cache)    │
  └─────────────┘
```

---

## Backboard Tool Calling Loop

The Fetcher agent uses Backboard's REQUIRES_ACTION pattern (identical to OpenAI Assistants v2):

```
orchestrator.py
    │
    ├─ create_message(thread_id, "fetch seasons 2014–2024")
    ├─ create_run(thread_id, assistant_id)
    │
    └─ POLL LOOP:
         │
         ├─ get_run_status(run_id)
         │
         ├─ if "REQUIRES_ACTION":
         │       extract tool_calls[]
         │       for each tool_call:
         │           execute locally (call FastF1 function)
         │           collect tool_output
         │       submit_tool_outputs(run_id, tool_outputs[])
         │       continue polling
         │
         ├─ if "completed":
         │       get_messages(thread_id)
         │       extract last assistant message
         │       return content
         │
         └─ if "failed" | "cancelled" | "expired":
                raise PipelineError(status)
```

---

## Data Contracts

### Fetcher → Analyst
```json
{
  "seasons": [2014, 2015, ..., 2024],
  "qualifying": [
    {
      "year": 2023,
      "round": 1,
      "driver": "VER",
      "position": 1
    }
  ],
  "race_results": [
    {
      "year": 2023,
      "round": 1,
      "driver": "VER",
      "position": 1,
      "points": 25,
      "team": "Red Bull Racing"
    }
  ],
  "lap_times": [
    {
      "year": 2023,
      "round": 1,
      "driver": "VER",
      "lap": 1,
      "lap_seconds": 92.345,
      "compound": "MEDIUM"
    }
  ]
}
```

### Analyst → Narrator
```json
{
  "thesis": "Championship outcomes correlate strongly with consistency metrics, not raw pace",
  "top_finding": "Drivers with lowest quali_std win championships 8 out of 11 seasons",
  "metrics_summary": {
    "quali_std_correlation": -0.73,
    "laptime_std_correlation": -0.68,
    "points_floor_correlation": 0.61
  },
  "champion_profiles": [
    {
      "year": 2023,
      "champion": "VER",
      "quali_std": 0.8,
      "laptime_std_avg": 1.2,
      "points_outside_top3": 145
    }
  ],
  "surprise_finding": "Hamilton 2014–2020 had higher quali std than Rosberg/Bottas but lower laptime std",
  "counterexample": "Vettel 2017–2018 had best quali std but championship losses traced to race incidents"
}
```

### Narrator → Streamlit
```python
{
    "story": "Three paragraphs of plain English...",
    "hook": "First paragraph only (for hero display)",
}
```

---

## Streamlit Layout (minimal)

```
┌──────────────────────────────────────────────┐
│  THE CONSISTENCY THEOREM                      │
│  [hook paragraph — hero text]                 │
├──────────────────────────────────────────────┤
│  [Plotly: quali_std vs championship rank]     │
│  [Plotly: laptime_std by driver/season]       │
├──────────────────────────────────────────────┤
│  [Full story — 3 paragraphs]                  │
├──────────────────────────────────────────────┤
│  [Raw findings JSON — expandable]             │
└──────────────────────────────────────────────┘
```

Two charts max. No extra tabs. No sidebar complexity.
