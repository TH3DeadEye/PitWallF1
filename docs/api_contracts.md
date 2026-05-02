# API Contracts

## FastF1 → fetcher.py

### Input
```python
fetch_season(year: int) -> dict
fetch_qualifying(year: int, round: int) -> pd.DataFrame
fetch_race_results(year: int, round: int) -> pd.DataFrame
fetch_lap_times(year: int, round: int) -> pd.DataFrame
```

### Output DataFrames

**qualifying_df**
| column | type | notes |
|--------|------|-------|
| year | int | |
| round | int | |
| driver | str | 3-letter code e.g. "VER" |
| position | int | 1-indexed grid position |
| team | str | |

**results_df**
| column | type | notes |
|--------|------|-------|
| year | int | |
| round | int | |
| driver | str | |
| position | int | Finishposition, DNF = NaN |
| points | float | |
| team | str | |
| status | str | "Finished", "DNF", etc |

**laps_df**
| column | type | notes |
|--------|------|-------|
| year | int | |
| round | int | |
| driver | str | |
| lap_number | int | |
| lap_seconds | float | LapTime converted from timedelta |
| compound | str | "SOFT", "MEDIUM", "HARD", etc |
| is_valid | bool | filter outliers |

---

## analyst.py → Findings JSON

```python
{
    # Correlation coefficients (Pearson, against final_standing_rank)
    # Negative = lower std → better championship result
    "correlations": {
        "quali_std": float,           # expected: -0.6 to -0.8
        "laptime_std_avg": float,     # expected: -0.5 to -0.7
        "points_outside_top3": float  # expected: +0.4 to +0.6
    },

    # Per-season champion consistency profile
    "champion_profiles": [
        {
            "year": int,
            "champion": str,          # driver code
            "runner_up": str,
            "quali_std_champion": float,
            "quali_std_runner_up": float,
            "laptime_std_champion": float,
            "laptime_std_runner_up": float,
            "consistency_advantage": bool  # True if champion was more consistent
        }
    ],

    # Seasons where consistency predicted wrong (for Narrator to use)
    "counterexamples": [
        {
            "year": int,
            "note": str
        }
    ],

    # Top-line summary for Narrator
    "headline_stat": str,   # e.g. "8 of 11 hybrid era champions had lowest quali_std in top 3"
    "thesis_supported": bool
}
```

---

## Narrator prompt contract

```python
NARRATOR_PROMPT = """
You are an F1 data journalist writing for a smart general audience.
Never use F1 jargon. Write like The Athletic, not Sky Sports.

You have received data analysis findings:
{findings_json}

Write exactly 3 paragraphs:
1. A provocative hook that challenges what casual fans believe about F1
2. The data evidence in plain English — cite specific numbers and driver names
3. An uncomfortable conclusion about what this means for how we judge greatness

Rules:
- No bullet points. Flowing prose only.
- Never say "standard deviation", "correlation", or "metric"
- Replace jargon: "quali_std" → "how predictable their starting position was"
- Be willing to say something uncomfortable
- Target length: 200–250 words total
"""
```

---

## Streamlit app.py inputs

```python
{
    "story": str,           # Full 3-paragraph story from Narrator
    "hook": str,            # First paragraph only
    "findings": dict,       # Full findings JSON from Analyst
    "quali_df": pd.DataFrame,    # for Plotly chart 1
    "laptime_df": pd.DataFrame,  # for Plotly chart 2
}
```

---

## Error handling conventions

```python
# All pipeline errors should be PipelineError subclasses
class PipelineError(Exception): pass
class FetcherError(PipelineError): pass
class AnalystError(PipelineError): pass
class NarratorError(PipelineError): pass

# Always log before raising
import logging
logger = logging.getLogger(__name__)

try:
    result = risky_call()
except Exception as e:
    logger.error(f"[Fetcher] Failed on year={year}, round={round}: {e}")
    raise FetcherError(str(e)) from e
```
