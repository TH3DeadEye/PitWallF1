// StatCallouts.jsx — 3-column newspaper stat box
// The Consistency Theorem Design System

const StatCallouts = ({ visible }) => {
  const stats = [
    {
      number: "0.89",
      unit: "σ",
      accent: true,
      label: "Norris consistency score",
      sub: "Finishing position std dev, 2025 season",
    },
    {
      number: "−4.8",
      unit: "pts",
      accent: false,
      label: "Points rate collapse",
      sub: "Per-race average after taking championship lead",
    },
    {
      number: "14",
      unit: null,
      accent: false,
      label: "Rounds led, no title",
      sub: "Longest consecutive lead without conversion since 2007",
    },
  ];

  return (
    <section
      style={{
        ...statStyles.section,
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease 200ms",
      }}
    >
      <div style={statStyles.inner}>
        <div style={statStyles.eyebrow}>
          <span style={statStyles.rule}></span>
          <span style={statStyles.eyebrowText}>Key findings</span>
        </div>
        <div style={statStyles.grid}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                ...statStyles.card,
                borderLeft: i === 0 ? "none" : "1px solid #1c1c1c",
              }}
            >
              <div
                style={{
                  ...statStyles.number,
                  color: stat.accent ? "#e8002d" : "#ffffff",
                }}
              >
                {stat.number}
                {stat.unit && (
                  <span style={statStyles.unit}>{stat.unit}</span>
                )}
              </div>
              <div style={statStyles.label}>{stat.label}</div>
              <div style={statStyles.sub}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const statStyles = {
  section: {
    padding: "72px 40px",
    borderBottom: "1px solid #1c1c1c",
    background: "#0a0a0a",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  rule: {
    display: "block",
    width: "24px",
    height: "2px",
    background: "#e8002d",
  },
  eyebrowText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#888",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    border: "1px solid #1c1c1c",
  },
  card: {
    padding: "32px 28px",
  },
  number: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: "64px",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginBottom: "12px",
  },
  unit: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "28px",
    color: "#888",
    marginLeft: "3px",
  },
  label: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: "5px",
  },
  sub: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "12px",
    color: "#444",
    lineHeight: 1.5,
  },
};

Object.assign(window, { StatCallouts });
