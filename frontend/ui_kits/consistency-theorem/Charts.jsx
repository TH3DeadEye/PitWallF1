// Charts.jsx — Two-chart layout with Chart.js
// The Consistency Theorem Design System

const Charts = ({ visible }) => {
  const chart1Ref = React.useRef(null);
  const chart2Ref = React.useRef(null);
  const chart1Instance = React.useRef(null);
  const chart2Instance = React.useRef(null);

  React.useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (chart1Ref.current && !chart1Instance.current) {
        chart1Instance.current = new Chart(chart1Ref.current, {
          type: "bar",
          data: {
            labels: ["2021", "2022", "2023", "2024", "2025"],
            datasets: [
              {
                label: "Champion",
                data: [0.31, 0.28, 0.33, 0.29, 0.31],
                backgroundColor: "#e8002d",
                borderRadius: 1,
                barPercentage: 0.45,
              },
              {
                label: "Runner-up",
                data: [0.72, 0.81, 0.68, 0.75, 0.89],
                backgroundColor: "#444",
                borderRadius: 1,
                barPercentage: 0.45,
              },
            ],
          },
          options: chartOptions("Std Dev (σ)"),
        });
      }
      if (chart2Ref.current && !chart2Instance.current) {
        chart2Instance.current = new Chart(chart2Ref.current, {
          type: "bar",
          data: {
            labels: ["R1","R2","R3","R4","R5","R6","R7","R8","R9","R10","R11","R12","R13","R14","R15","R16","R17","R18","R19","R20","R21","R22","R23","R24"],
            datasets: [
              {
                label: "Points scored",
                data: [18,25,15,25,18,25,12,25,10,15,18,8,25,12,6,15,10,18,8,12,15,6,18,10],
                backgroundColor: (ctx) => {
                  // Round 9 onward = after taking lead
                  return ctx.dataIndex >= 8 ? "#444" : "#e8002d";
                },
                borderRadius: 1,
                barPercentage: 0.7,
              },
            ],
          },
          options: {
            ...chartOptions("Points"),
            plugins: {
              ...chartOptions("Points").plugins,
              annotation: undefined,
            },
          },
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <section
      style={{
        ...chartsStyles.section,
        opacity: visible ? 1 : 0,
        transition: "opacity 700ms ease 200ms",
      }}
    >
      <div style={chartsStyles.inner}>
        <div style={chartsStyles.grid}>
          {/* Chart 1 */}
          <div style={chartsStyles.chartCard}>
            <div style={chartsStyles.cardHeader}>
              <div style={chartsStyles.cardTitle}>
                Finishing position std dev by season
              </div>
              <div style={chartsStyles.cardSub}>
                Champion vs runner-up · 2021–2025
              </div>
              <div style={chartsStyles.legend}>
                <span style={chartsStyles.legendItem}>
                  <span style={{ ...chartsStyles.legendDot, background: "#e8002d" }}></span>
                  Champion
                </span>
                <span style={chartsStyles.legendItem}>
                  <span style={{ ...chartsStyles.legendDot, background: "#444" }}></span>
                  Runner-up
                </span>
              </div>
            </div>
            <canvas ref={chart1Ref} height={200}></canvas>
          </div>

          {/* Chart 2 */}
          <div style={chartsStyles.chartCard}>
            <div style={chartsStyles.cardHeader}>
              <div style={chartsStyles.cardTitle}>
                Points scored per race — Norris 2025
              </div>
              <div style={chartsStyles.cardSub}>
                Before vs after taking championship lead (R9)
              </div>
              <div style={chartsStyles.legend}>
                <span style={chartsStyles.legendItem}>
                  <span style={{ ...chartsStyles.legendDot, background: "#e8002d" }}></span>
                  Before lead (R1–R8)
                </span>
                <span style={chartsStyles.legendItem}>
                  <span style={{ ...chartsStyles.legendDot, background: "#444" }}></span>
                  After lead (R9–R24)
                </span>
              </div>
            </div>
            <canvas ref={chart2Ref} height={200}></canvas>
          </div>
        </div>
      </div>
    </section>
  );
};

function chartOptions(yLabel) {
  return {
    responsive: true,
    animation: { duration: 800, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1a1a",
        borderColor: "#333",
        borderWidth: 1,
        titleColor: "#888",
        bodyColor: "#fff",
        titleFont: { family: "Barlow", size: 10 },
        bodyFont: { family: "Barlow", size: 12, weight: "600" },
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: "#1a1a1a" },
        ticks: { color: "#888", font: { family: "Barlow", size: 10 } },
        border: { color: "#222" },
      },
      y: {
        grid: { color: "#1a1a1a" },
        ticks: { color: "#888", font: { family: "Barlow", size: 10 } },
        border: { color: "#222" },
        title: {
          display: true,
          text: yLabel,
          color: "#555",
          font: { family: "Barlow", size: 10 },
        },
      },
    },
  };
}

const chartsStyles = {
  section: {
    padding: "64px 40px",
    borderBottom: "1px solid #1c1c1c",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1px",
    background: "#1c1c1c",
    border: "1px solid #1c1c1c",
  },
  chartCard: {
    background: "#0f0f0f",
    padding: "24px",
  },
  cardHeader: {
    marginBottom: "16px",
  },
  cardTitle: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#888",
  },
  cardSub: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "10px",
    color: "#444",
    marginTop: "3px",
    letterSpacing: "0.04em",
  },
  legend: {
    display: "flex",
    gap: "14px",
    marginTop: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'Barlow', sans-serif",
    fontSize: "10px",
    color: "#666",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  legendDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "1px",
  },
};

Object.assign(window, { Charts });
