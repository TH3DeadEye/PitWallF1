# 🏎️ The Consistency Theorem

**The Consistency Theorem** is an advanced Formula 1 analytics engine designed to decode the DNA of championship-winning performance. Developed for **HuskyHacks 2025**, this project moves beyond surface-level standings to analyze the psychological and technical "pressure traps" that define the hybrid era of F1.

![Project Preview](/docs/pitwall-thumbnail.png)

## 📊 The Core Metrics

We analyze the sport through three primary data pillars:

1.  **Metric 1: Finishing Position StdDev**: Quantifies driver consistency. While a win is 25 points, the ability to minimize "variance" in finishing position across 24 races is the hallmark of a true champion.
2.  **Metric 2: The Pressure Trap**: A proprietary metric that calculates the **Points-Per-Race (PPG) Delta** immediately after a driver first takes the championship lead. It identifies who thrives under the spotlight and who buckles.
3.  **Metric 3: Intra-stint Laptime Variance**: Using high-frequency telemetry from **FastF1**, we analyze lap-by-lap consistency during race stints to differentiate between raw pace and sustainable execution.

## 🤖 AI-Powered Storytelling

The project features a **Gemini-powered Narrator** that synthesizes raw data findings into compelling human-readable stories. It doesn't just list stats; it cites specific "evidence" (e.g., *“Verstappen’s PPG increased by 4.2 points after taking the lead in 2021”*) to narrate the season's drama with analytical precision.

## 🛠️ Tech Stack

-   **Backend**: Python, FastAPI
-   **Data Science**: Pandas, NumPy, Scikit-learn, SciPy
-   **F1 Data**: FastF1 API, Jolpica (Ergast) API
-   **AI Engine**: Google Gemini (via `google-genai`)
-   **Frontend**: React, Vite, Chart.js, TailwindCSS (optional)
-   **Visualizations**: Plotly, Chart.js

## 📂 Project Structure

```text
├── agents/             # LLM agent definitions
├── analyst.py         # Statistical computation engines
├── api.py             # FastAPI endpoints
├── data/outputs/      # Cached JSON pipelines (Raw, Timelines, Findings, Story)
├── fetcher.py         # Multi-source data ingestion (Jolpica + FastF1)
├── frontend/          # React + Vite dashboard
├── narrator.py        # Gemini-driven insight generator
├── orchestrator.py    # Main pipeline coordinator
└── requirements.txt   # Python dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js (for frontend)
- Google Gemini API Key

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/huskyhakc.git
    cd huskyhakc
    ```

2.  **Setup Backend**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate on Windows
    pip install -r requirements.txt
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root:
    ```env
    GEMINI_API_KEY=your_key_here
    ```

4.  **Run the Pipeline**:
    ```bash
    # Fast mode: Analyzes 2023-2024 seasons
    python orchestrator.py --season 2024
    
    # Full mode: Analyze the entire Hybrid Era (2014-2025)
    python orchestrator.py --no-fast
    ```

5.  **Run the Dashboard**:
    ```bash
    # Start Backend API
    uvicorn api:app --reload
    
    # Start Frontend (in /frontend)
    cd frontend
    npm install
    npm run dev
    ```

## 📈 Findings
The orchestrator generates cached findings in `data/outputs/findings.json`. Key insights discovered:
- **Hybrid Era Pattern**: 78% of non-champions see a PPG decline after taking their first mid-season lead.
- **The Hamilton/Verstappen Threshold**: Championship winners maintain a Position StdDev < 2.5 across the final 10 rounds of a season.

---
*Built for HuskyHacks 2025.*
