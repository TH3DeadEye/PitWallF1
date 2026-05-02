// JsonViewer.jsx — Collapsible raw JSON block
// The Consistency Theorem Design System

const JsonViewer = ({ visible, data }) => {
  const [open, setOpen] = React.useState(false);

  const defaultData = {
    driver: "Oscar Norris",
    season: 2025,
    constructor: "McLaren",
    races_analyzed: 24,
    stddev_positions: 0.89,
    champion_stddev: 0.31,
    stddev_delta: 0.58,
    points_rate_before_lead: 16.2,
    points_rate_after_lead: 11.4,
    points_rate_delta: -4.8,
    rounds_led: 14,
    rounds_total: 24,
    championship_gap_final: -12,
    consistency_rank: 19,
    verdict: "Consistency collapse confirmed. Mechanical advantage insufficient.",
  };

  const payload = data || defaultData;

  return (
    <section
      style={{
        ...jsonStyles.section,
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease 300ms",
      }}
    >
      <div style={jsonStyles.inner}>
        <div
          style={jsonStyles.header}
          onClick={() => setOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        >
          <div style={jsonStyles.headerLeft}>
            <span style={jsonStyles.title}>Raw Pipeline Output</span>
            <span style={jsonStyles.badge}>JSON</span>
            <span style={jsonStyles.count}>{Object.keys(payload).length} keys</span>
          </div>
          <span
            style={{
              ...jsonStyles.chevron,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>

        {open && (
          <div style={jsonStyles.body}>
            <pre style={jsonStyles.pre}>
              {JSON.stringify(payload, null, 2)
                .split("\n")
                .map((line, i) => {
                  // Colorize keys
                  const colonIdx = line.indexOf(":");
                  if (colonIdx > -1) {
                    const key = line.slice(0, colonIdx + 1);
                    const val = line.slice(colonIdx + 1);
                    return (
                      <span key={i}>
                        <span style={jsonStyles.key}>{key}</span>
                        <span style={jsonStyles.val}>{val}</span>
                        {"\n"}
                      </span>
                    );
                  }
                  return <span key={i} style={jsonStyles.brace}>{line + "\n"}</span>;
                })}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
};

const jsonStyles = {
  section: {
    padding: "48px 40px 80px",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#141414",
    border: "1px solid #1c1c1c",
    cursor: "pointer",
    userSelect: "none",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#888",
  },
  badge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    background: "#222",
    color: "#555",
    padding: "2px 7px",
    borderRadius: "2px",
  },
  count: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "10px",
    color: "#444",
  },
  chevron: {
    fontSize: "9px",
    color: "#555",
    transition: "transform 200ms ease",
    display: "inline-block",
  },
  body: {
    background: "#0d0d0d",
    border: "1px solid #1c1c1c",
    borderTop: "none",
    padding: "20px",
    overflowX: "auto",
  },
  pre: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    lineHeight: 1.75,
    margin: 0,
    whiteSpace: "pre",
  },
  key: {
    color: "#e8002d",
  },
  val: {
    color: "#c0c0c0",
  },
  brace: {
    color: "#555",
  },
};

Object.assign(window, { JsonViewer });
