# The Consistency Theorem — Frontend

React + Vite frontend for the F1 data-journalism app. Talks to the FastAPI backend
in the parent directory (`../api.py`).

## Stack

- **Vite 5** + React 18 (no TypeScript — hackathon speed)
- **Chart.js 4** for the two bar charts
- Inline component styles to match the editorial design system 1:1
- Vite dev proxy: `/api` → `http://127.0.0.1:8000` (the FastAPI server)

## File layout

```
frontend/
├── package.json
├── vite.config.js
├── index.html              ← also hosts the static #loading-overlay
├── public/favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx             ← top-level state, runPipeline orchestration
│   ├── api.js              ← fetch client for /api/run, /api/findings
│   ├── loadingController.js← imperative driver for the loading overlay
│   ├── data/
│   │   ├── seasons.js      ← static editorial metadata + fallback values
│   │   └── merge.js        ← merges backend findings into season metadata
│   ├── styles/
│   │   ├── tokens.css      ← color/type/spacing CSS custom properties
│   │   └── global.css      ← resets + loading overlay CSS
│   └── components/
│       ├── AppHeader.jsx
│       ├── SeasonSelector.jsx
│       ├── QuestionInput.jsx
│       ├── Hero.jsx
│       ├── Charts.jsx
│       ├── StatCallouts.jsx
│       ├── Story.jsx
│       └── JsonViewer.jsx
└── ui_kits/, preview/, colors_and_type.css   ← original design system (kept for reference)
```

## Run locally

You need both the backend and the frontend running.

### 1. Backend (FastAPI)

From the **parent** directory (`../`):

```bash
cd ..
./venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

The backend exposes:

- `GET  /api/health`
- `GET  /api/seasons`
- `GET  /api/findings`
- `POST /api/run` → body `{"season": int, "question": str | null}` → returns `{season, question, findings, story}`

First call to `/api/run` is slow because it runs:

1. Jolpica fetch for hybrid era → cached at `data/outputs/raw_data.json`
2. Analyst computation → cached at `data/outputs/findings.json`
3. Gemini story → cached at `data/outputs/story_<season>_<hash>.json`

Subsequent calls only re-run the narrator (Gemini) for new questions.

#### Bootstrap fast (skip slow FastF1 cache warm)

```bash
JOLPICA_START_YEAR=2021 JOLPICA_END_YEAR=2024 SKIP_FASTF1=1 \
  ./venv/bin/python orchestrator.py --season 2024
```

This populates `findings.json` in ~30 seconds using only Jolpica data. Metric 3
(intra-stint laptime stddev) will be empty until you run with `SKIP_FASTF1=0`,
which is fine for the demo since metrics 1 and 2 carry the story.

### 2. Frontend (Vite)

From this directory:

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

## How it wires together

1. On page load, `App.jsx` calls `GET /api/findings` to hydrate the season cards
   with real numbers from the cached `findings.json`. If the backend is offline
   or no cache exists, the static `SEASONS` fallback in `src/data/seasons.js`
   is used (this is the data the original mockup shipped with).
2. The user picks a season and optionally types/clicks a question.
3. Hitting "Run Pipeline":
   - Shows the full-screen loading overlay (driven by `loadingController.js`).
   - Calls `POST /api/run` with `{season, question}`.
   - On success, merges the returned findings into `seasons` state, replaces the
     story paragraphs, hides the overlay, and scrolls to the content.
   - On failure (backend offline / Gemini error), shows a small red banner at
     the top and falls back to the cached/static story.
4. The `Raw Pipeline Output` JSON viewer at the bottom shows the actual backend
   response payload after a successful run, or the editorial summary before.

## Tweaking the look

All design tokens live in `src/styles/tokens.css`. Component styles are
co-located inline in each `.jsx` file (not split into CSS Modules) so a designer
can tweak a single component without hunting through stylesheets.
