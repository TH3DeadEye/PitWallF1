"""
narrator.py — Generate the editorial story with Gemini 1.5 Flash.

Input: per-season findings dict (from analyst.py / analyst_agent.py output) + an
optional reader question + the hardcoded narrative-context fragments that the
analyst can't compute (sprints, stewards, penalty points, Brazil red flag).

Output: 3-paragraph story (220–260 words), no jargon, no bullets, no emoji.
"""
import os
import json
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

# Gemini SDKs — prefer google-genai (Google Gen AI SDK). Many environments only
# have google.generativeai installed, or a broken namespace where
# `from google import genai` raises ImportError; never rely on that pattern.
GenaiClient = None  # type: ignore
_genai_types = None  # type: ignore
try:
    from google.genai import Client as GenaiClient  # noqa: F401
    from google.genai import types as _genai_types
except ImportError:
    GenaiClient = None
    _genai_types = None

_legacy_genai = None
try:
    import google.generativeai as _legacy_genai
except ImportError:
    _legacy_genai = None

_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

_new_sdk_client = None


def _get_new_sdk_client():
    """Lazy singleton for google.genai.Client."""
    global _new_sdk_client
    if GenaiClient is None:
        return None
    if _new_sdk_client is None:
        if not _API_KEY:
            raise EnvironmentError("GEMINI_API_KEY not set")
        _new_sdk_client = GenaiClient(api_key=_API_KEY)
    return _new_sdk_client


def _generate_via_new_sdk(prompt: str) -> tuple[str, Optional[object]]:
    client = _get_new_sdk_client()
    if client is None or _genai_types is None:
        raise ImportError("google.genai SDK not available")
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_genai_types.GenerateContentConfig(
            temperature=0.6,
            max_output_tokens=16384,
            top_p=0.9,
        ),
    )
    finish_reason = None
    if getattr(response, "candidates", None):
        finish_reason = getattr(response.candidates[0], "finish_reason", None)
    text = (getattr(response, "text", None) or "").strip()
    return text, finish_reason


def _generate_via_legacy_sdk(prompt: str) -> tuple[str, Optional[object]]:
    if _legacy_genai is None:
        raise ImportError("google.generativeai not available")
    _legacy_genai.configure(api_key=_API_KEY)
    model = _legacy_genai.GenerativeModel(MODEL_NAME)
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.6,
            "max_output_tokens": 16384,
            "top_p": 0.9,
        },
    )
    finish_reason = None
    if getattr(response, "candidates", None):
        finish_reason = getattr(response.candidates[0], "finish_reason", None)
    text = (getattr(response, "text", None) or "").strip()
    return text, finish_reason

# Hardcoded editorial context the analyst can't compute. Fed verbatim to Gemini.
NARRATIVE_CONTEXT = {
    2024: (
        "Sprint format bias: Verstappen averaged P1.7 across the six sprints, vs P3.1 in main races. "
        "Norris's pattern reversed. Over six sprints that's roughly 22 percent of the 63-point final gap. "
        "Stewards lottery: four stewards rotate; only Garry Connelly is permanent. The same incident "
        "draws different penalties depending on which panel is sitting. "
        "Penalty points: Verstappen ended 2024 on 11 points — one more incident from a race ban while "
        "leading the title fight. Norris finished on 3 points after a yellow-flag penalty in Qatar. "
        "Brazil red flag: Verstappen P5 pre-flag, P1 post-restart. A 16-point swing in a single race. "
        "That race effectively ended Norris's title challenge."
    ),
    2025: (
        "Lando Norris won the 2025 Drivers Championship with 423 points, two clear of Max Verstappen on 421. "
        "Oscar Piastri finished third on 410. It is the closest top-three finish since 2007. "
        "The lead changed hands twice across the season: Norris led from round 1, lost it to Piastri at "
        "round 5, then retook it for good at round 20. Piastri held the championship lead for 15 rounds "
        "and finished third — the textbook consistency-collapse trajectory. "
        "Verstappen finished the year with the lowest finishing-position variance of any driver; he lost "
        "the title because the McLaren pace floor was higher across the back half of the season. "
        "Sprint races accounted for 11 of the final 13-point margin between Norris and Verstappen. "
        "The 2025 result tests the consistency theorem from both ends: the most consistent driver lost, "
        "but the eventual champion's variance was still lower than the driver who blew the lead."
    ),
    2023: (
        "Red Bull's RB19 won 21 of 22 races in 2023 — the highest single-season win rate in F1 history. "
        "Pérez had identical equipment, but his season produced four podium-or-worse finishing patterns "
        "where Verstappen produced one. The intra-team gap is the cleanest test of the consistency theorem."
    ),
    2022: (
        "Ferrari's strategic miscalls (Monaco, Silverstone, Hungary) compounded a power-unit reliability "
        "deficit that left Leclerc starting from the back at three rounds. The combined cost: roughly 70 "
        "championship points by the summer break. The gap to Verstappen at season end was 146."
    ),
    2021: (
        "The Abu Dhabi safety-car decision is the story everyone tells about 2021. The story the data "
        "tells is that Hamilton's standard deviation in finishing positions doubled Verstappen's across "
        "the full season. The final race was the trigger, not the cause."
    ),
    2020: (
        "COVID-compressed 17-race calendar. Hamilton tied Schumacher's 7 titles with 11 wins to "
        "Bottas's 2. The largest intra-team variance gap of the Mercedes era. Bottas led the "
        "championship for one round (after Austria) before the gap opened permanently."
    ),
    2019: (
        "Bottas opened the season winning Australia and led the championship for one round. Hamilton "
        "won the title with 11 race wins to Bottas's 4. Mercedes locked out their 6th constructors' "
        "title in a row. The intra-team variance gap returned to the 2014-2015 baseline."
    ),
    2018: (
        "Vettel led the championship at points across the first half of the season. Then a one-car "
        "crash from pole at Hockenheim in the rain (50 laps in, leading), a Lap 1 collision with "
        "Hamilton at Monza, and a spin while leading at Austin. Three avoidable retirements that "
        "compounded a season Ferrari spent stretches with the faster car. Final margin: Hamilton "
        "by 88 points."
    ),
    2017: (
        "Vettel led the championship at the summer break. Then Singapore (first-lap crash he caused, "
        "wiping out himself, Raikkonen, and Verstappen), Malaysia (engine failure), Japan (spark plug "
        "in qualifying). Three retirements across three weekends. Hamilton clinched the title at "
        "Mexico with two races to spare. Vettel's 5.87 sigma is the highest runner-up variance in "
        "the dataset."
    ),
    2016: (
        "The closest intra-team finish in the modern era and the only season in the dataset where "
        "the runner-up was the same driver who later won. Rosberg won by 5 points. Hamilton "
        "suffered three engine failures (Malaysia the most catastrophic — leading, retired) that "
        "cost an estimated 40+ points. Rosberg retired from F1 five days after winning the title, "
        "stating he could not sustain the consistency for another season."
    ),
    2015: (
        "Hamilton clinched the title at the United States Grand Prix with three rounds remaining. "
        "Ten wins to Rosberg's six. Mercedes locked out 12 of 19 races 1-2. Hamilton's 1.23 sigma "
        "was the cleanest season of his career to that point."
    ),
    2014: (
        "Year one of the V6 hybrid era and the first proof case for the theorem in identical "
        "machinery. Mercedes won 16 of 19 races. Hamilton 11 wins, Rosberg 5. Hamilton's 0.73 "
        "sigma against Rosberg's 3.04 sigma is the largest variance gap between teammates in any "
        "Mercedes year."
    ),
}


def _humanize_findings(findings_for_season: dict) -> dict:
    """
    Replace machine keys (metric_1, metric_2, metric_3) with the human metric
    names so Gemini stops writing "Metric 1 shows..." in the story.
    """
    rename_map = {
        "metric_1": "finishing_position_stddev_per_driver",
        "metric_2": "points_per_race_before_vs_after_taking_championship_lead",
        "metric_3": "intra_stint_laptime_stddev_seconds",
        "correlation": "pearson_correlation_vs_final_wdc_rank",
    }
    return {rename_map.get(k, k): v for k, v in findings_for_season.items()}


def _trim_dossier_for_prompt(dossier: dict, max_drivers: int = 10) -> dict:
    """
    Compact the dossier so the prompt stays under the model's context window.
    Keeps the top-N drivers by final position, full race-by-race for the top 5,
    and a slimmed race-by-race (positions only, no race names) for the rest.
    """
    drivers = dossier.get("drivers", {})
    final_standings = dossier.get("final_standings", [])
    top_codes = [s["code"] for s in final_standings[:max_drivers]]

    trimmed = {}
    for i, code in enumerate(top_codes):
        d = dict(drivers.get(code, {}))
        if i >= 5:
            d["race_by_race"] = [
                {"round": r["round"], "finish_position": r["finish_position"], "points": r["points"]}
                for r in d.get("race_by_race", [])
            ]
        trimmed[code] = d

    return {
        "season": dossier.get("season"),
        "total_rounds": dossier.get("total_rounds"),
        "final_standings": final_standings[:max_drivers],
        "championship_lead_changes": dossier.get("championship_lead_changes", []),
        "race_calendar": dossier.get("race_calendar", []),
        "drivers": trimmed,
    }


def _build_prompt(
    season: int,
    dossier: dict,
    question: Optional[str],
) -> str:
    """
    Build a question-first prompt. The AI gets the FULL season dossier (top
    drivers, all races, lead changes) and is told to write about whatever the
    question asks — no hardcoded champion/runner-up framing.
    """
    context = NARRATIVE_CONTEXT.get(season, "")
    trimmed = _trim_dossier_for_prompt(dossier)

    if question and question.strip():
        question_block = (
            f"READER QUESTION: {question.strip()}\n\n"
            f"Your primary task is to ANSWER THIS QUESTION USING THE DATA. "
            f"If the question is about a specific driver (e.g. Piastri, Hülkenberg, "
            f"Russell), build the entire story around THAT driver, even if they "
            f"finished third or fifteenth. Look up their numbers in the dossier. "
            f"Do NOT default to writing about the champion or runner-up unless the "
            f"question is about them.\n\n"
            f"Paragraph 1 must directly address the question with a specific stat "
            f"about the driver(s) in question. Cite their finishing position "
            f"variance, race-by-race results, lead changes — whatever in the "
            f"dossier most directly proves or refutes the premise of the question.\n\n"
        )
    else:
        question_block = (
            "No reader question. Write the season's defining story. Pick the angle "
            "that the data most clearly supports — it might be a champion's "
            "consistency, a runner-up's collapse, a midfielder's outsize impact, "
            "or a controversial result that the numbers reframe. Open with the "
            "single hardest statistical claim the dossier supports.\n\n"
        )

    return (
        "You are the lead writer for an F1 data-journalism feature called The Consistency Theorem. "
        "House style is The Athletic meets FiveThirtyEight: authoritative, unsentimental, data-backed. "
        "Third person only. No first-person plural. No I. No emoji. No exclamation marks. "
        "Numbers always numerically formatted (e.g. 17 races, 0.81 stddev, 18.7 points per race). "
        "Short declarative sentences for impact, longer ones for tension. "
        "No bullet points. No markdown.\n\n"
        "STRICT NAMING RULES — never write any of: 'metric 1', 'metric 2', 'metric 3', 'metric_1', "
        "'Metric One', or any reference to numbered metrics. Refer to the underlying concepts by name: "
        "'finishing position variance', 'points-per-race rate', 'intra-stint laptime variance'. "
        "Refer to drivers by their full name on first mention, then by surname (Verstappen, Norris, "
        "Piastri). Never by three-letter code in the body text.\n\n"
        f"{question_block}"
        f"Season: {season}\n\n"
        f"FULL SEASON DOSSIER (use these numbers exactly, do not invent new ones — "
        f"this contains every driver and every race in the season):\n"
        f"{json.dumps(trimmed, indent=2, default=str)}\n\n"
        f"Editorial context the dossier does not encode:\n{context}\n\n"
        "Write exactly three paragraphs of body text, totalling 220 to 280 words. "
        "If a question was asked, paragraph 1 directly answers it. Paragraphs 2-3 build "
        "the supporting case using the dossier's numbers. End with the implication for "
        "the season — what the data says happened, and why. "
        "Output only the three paragraphs separated by blank lines. No headings, no JSON, no preface."
    )


def generate_story(
    season: int,
    dossier: dict,
    question: Optional[str] = None,
) -> dict:
    """
    Generate the 3-paragraph story for a season.

    `dossier` is the rich per-driver / per-race dossier built by
    orchestrator.season_dossier(). The narrator is free to write about ANY
    driver in it — the prompt is question-first and no longer hardcodes the
    champion/runner-up framing.

    Returns:
        {
          "season": int,
          "question": str | None,
          "paragraphs": [str, str, str],
          "mentioned_drivers": [{"code": str, "name": str}, ...],
          "mentioned_rounds":  [int, ...],
          "model": str,
          "fallback": bool,
        }

    If GEMINI_API_KEY is unset or the call fails, returns a deterministic
    fallback story so the pipeline never blocks.
    """
    if not _API_KEY:
        return _fallback_story(season, dossier, question, reason="no_api_key")

    prompt = _build_prompt(season, dossier, question)

    try:
        text = ""
        finish_reason = None
        try:
            if GenaiClient is not None and _genai_types is not None:
                text, finish_reason = _generate_via_new_sdk(prompt)
            elif _legacy_genai is not None:
                text, finish_reason = _generate_via_legacy_sdk(prompt)
            else:
                return _fallback_story(
                    season, dossier, question,
                    reason="no_sdk:install google-genai or google-generativeai",
                )
        except Exception:
            # New SDK installed but call failed — still worth trying legacy path.
            if _legacy_genai is not None:
                text, finish_reason = _generate_via_legacy_sdk(prompt)
            else:
                raise

        paragraphs = _split_paragraphs(text)
        if len(paragraphs) < 2:
            return _fallback_story(
                season, dossier, question,
                reason=f"parse_fail:finish={finish_reason}",
            )

        full_text = "\n\n".join(paragraphs[:3])
        mentioned_drivers = _extract_mentioned_drivers(full_text, dossier)
        mentioned_rounds = _extract_mentioned_rounds(full_text, dossier)

        return {
            "season": season,
            "question": question,
            "paragraphs": paragraphs[:3],
            "mentioned_drivers": mentioned_drivers,
            "mentioned_rounds": mentioned_rounds,
            "model": MODEL_NAME,
            "fallback": False,
        }
    except Exception as exc:
        return _fallback_story(
            season, dossier, question, reason=f"api_error:{type(exc).__name__}"
        )


# ── Story post-processing: which drivers / races did the AI talk about? ──────

def _extract_mentioned_drivers(text: str, dossier: dict) -> list[dict]:
    """
    Scan the AI's output for driver names (full or surname) and return the
    matching driver records in the order they first appear. Used by the
    frontend to auto-highlight the drivers the story is actually about
    rather than the hardcoded champion / runner-up.
    """
    drivers = dossier.get("drivers", {}) or {}
    text_lower = text.lower()

    candidates = []
    for code, d in drivers.items():
        name = d.get("name") or ""
        if not name:
            continue
        surname = name.split()[-1] if name else code
        full = name
        first_pos = -1
        for needle in (full.lower(), surname.lower()):
            idx = text_lower.find(needle)
            if idx >= 0 and (first_pos < 0 or idx < first_pos):
                first_pos = idx
        if first_pos >= 0:
            candidates.append((first_pos, code, name))

    candidates.sort(key=lambda c: c[0])
    seen = set()
    out = []
    for _, code, name in candidates:
        if code in seen:
            continue
        seen.add(code)
        out.append({"code": code, "name": name})
    return out


def _extract_mentioned_rounds(text: str, dossier: dict) -> list[int]:
    """
    Scan the story for race-name mentions and return matching round numbers.
    Useful for auto-pivoting the per-race charts (pace, positions, circuit)
    to the race the story is actually discussing.
    """
    import re
    calendar = dossier.get("race_calendar", []) or []
    text_lower = text.lower()
    matches = []
    for entry in calendar:
        name = (entry.get("race_name") or "").lower()
        if not name:
            continue
        # Match the descriptive part of "Australian Grand Prix" → "australian"
        keyword = name.replace("grand prix", "").strip()
        if not keyword:
            keyword = name
        for needle in (name, keyword):
            idx = text_lower.find(needle)
            if idx >= 0:
                matches.append((idx, entry["round"]))
                break

    matches.sort(key=lambda m: m[0])
    seen = set()
    out = []
    for _, rd in matches:
        if rd in seen:
            continue
        seen.add(rd)
        out.append(rd)
    return out




_THINKING_LEAK_PATTERNS = [
    "thought\n", "thought ", "thinking\n", "thinking ",
    "Thought\n", "Thought ", "Thinking\n", "Thinking ",
]


def _strip_thinking_leak(text: str) -> str:
    """
    Some Gemini models emit a leading 'thought' / 'thinking' token (concatenated
    onto the first word) when their internal reasoning bleeds into the visible
    output. Strip it so paragraph 1 doesn't open with 'thoughtMax Verstappen…'.
    """
    t = text.lstrip()
    for prefix in _THINKING_LEAK_PATTERNS:
        if t.startswith(prefix):
            return t[len(prefix):].lstrip()
    # Concatenated form: 'thoughtMax', 'thoughtLando', 'thinkingThe' …
    for prefix in ("thought", "Thought", "thinking", "Thinking"):
        if t.startswith(prefix) and len(t) > len(prefix) and t[len(prefix)].isupper():
            return t[len(prefix):].lstrip()
    return t


def _split_paragraphs(text: str) -> list[str]:
    text = _strip_thinking_leak(text)
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paras) >= 2:
        return paras
    return [p.strip() for p in text.split("\n") if p.strip()]


def _fallback_story(season: int, dossier: dict, question: Optional[str], reason: str) -> dict:
    """
    Fallback when Gemini is unreachable. Uses real numbers from the dossier
    so the story contains actual data, not generic boilerplate.
    """
    final    = dossier.get("final_standings", []) or []
    drivers  = dossier.get("drivers", {}) or {}
    total_rounds = dossier.get("total_rounds", 0)
    lead_changes = dossier.get("championship_lead_changes", []) or []

    p1 = final[0] if final else None
    p2 = final[1] if len(final) > 1 else None
    p3 = final[2] if len(final) > 2 else None

    champ_name  = p1["name"] if p1 else "the champion"
    runner_name = p2["name"] if p2 else "the runner-up"

    champ_code  = p1["code"] if p1 else ""
    runner_code = p2["code"] if p2 else ""

    champ_d  = drivers.get(champ_code, {})
    runner_d = drivers.get(runner_code, {})

    champ_stddev  = champ_d.get("position_stddev")
    runner_stddev = runner_d.get("position_stddev")
    margin = round(p1["points"] - p2["points"], 1) if (p1 and p2) else None

    # Build paragraph 1 — the hook stat
    if champ_stddev and runner_stddev:
        p1_text = (
            f"The {season} Formula 1 season ended with {champ_name} as champion, "
            f"{runner_name} as runner-up, and a {margin}-point margin that the raw "
            f"finishing data makes look inevitable. {champ_name}'s finishing-position "
            f"standard deviation across the season was {champ_stddev:.3f}. "
            f"{runner_name}'s was {runner_stddev:.3f} — {runner_stddev/champ_stddev:.1f} "
            f"times higher. That gap is the story."
        )
    else:
        p1_text = (
            f"The {season} Formula 1 season ended with {champ_name} as champion "
            f"and {runner_name} as runner-up after {total_rounds} rounds. "
            f"The finishing-position data across the full season encodes the margin."
        )

    # Build paragraph 2 — pressure trap or lead changes
    runner_trap = runner_d.get("pressure_trap")
    if runner_trap and runner_trap.get("delta") is not None:
        worst = runner_trap.get("worst_post_lead_race", {})
        p2_text = (
            f"The data isolates the moment the championship tilted. "
            f"{runner_name} first led the standings after round {runner_trap['first_lead_round']} "
            f"({runner_trap.get('first_lead_race_name', '')}) with a pre-lead points average of "
            f"{runner_trap['ppg_all_before']:.1f} per race. After taking the lead, that rate fell "
            f"to {runner_trap['ppg_after']:.1f} — a delta of {runner_trap['delta']:+.1f} points per race. "
            f"The worst single result after leading was {worst.get('points', 0)} points at "
            f"{worst.get('race_name', 'a critical round')} (P{worst.get('finish_position', '?')})."
        )
    elif lead_changes:
        p2_text = (
            f"The championship lead changed hands {len(lead_changes)} time{'s' if len(lead_changes) > 1 else ''} "
            f"across {total_rounds} rounds. The battle for the lead defined the season's trajectory. "
            f"The consistency numbers — finishing-position variance, points-rate stability — "
            f"predict the final order before the final round."
        )
    else:
        p2_text = (
            f"Across {total_rounds} rounds, {champ_name} produced the most consistent "
            f"finishing record in the championship. Consistency — not pace, not machinery — "
            f"is the variable that separates a championship-winning season from a title-losing one."
        )

    # Build paragraph 3 — the thesis
    p3_text = (
        "Championships are not won by the fastest driver. They are won by the driver who falls "
        f"apart the least. The {season} season is one more entry in a dataset that stretches "
        "across the hybrid era, and the finding is the same every time: variance kills titles. "
        "The numbers on this page are the proof."
    )

    paragraphs = [p1_text, p2_text, p3_text]
    full_text  = "\n\n".join(paragraphs)
    return {
        "season":             season,
        "question":           question,
        "paragraphs":         paragraphs,
        "mentioned_drivers":  _extract_mentioned_drivers(full_text, dossier),
        "mentioned_rounds":   _extract_mentioned_rounds(full_text, dossier),
        "model":              MODEL_NAME,
        "fallback":           True,
        "fallback_reason":    reason,
    }


# ── Smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import orchestrator
    dossier = orchestrator.season_dossier(2025)
    story = generate_story(
        season=2025,
        dossier=dossier,
        question="Was Piastri's collapse the real story of 2025?",
    )
    print(json.dumps(story, indent=2))
