// Hero.jsx — Hero lede paragraph
// The Consistency Theorem Design System

const Hero = ({ visible }) => {
  return (
    <section
      style={{
        ...heroStyles.section,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 600ms ease, transform 600ms ease",
      }}
    >
      <div style={heroStyles.inner}>
        <div style={heroStyles.eyebrow}>
          <span style={heroStyles.eyebrowRule}></span>
          <span style={heroStyles.eyebrowText}>The finding</span>
        </div>
        <p style={heroStyles.lede}>
          Oscar Norris led the 2025 World Championship for{" "}
          <span style={heroStyles.highlight}>fourteen consecutive rounds.</span>{" "}
          He had the faster car. He had the data. He did not win.
        </p>
        <p style={heroStyles.teaser}>
          Three metrics explain the collapse. None of them involve the machinery.
        </p>
      </div>
    </section>
  );
};

const heroStyles = {
  section: {
    padding: "80px 40px 72px",
    borderBottom: "1px solid #1c1c1c",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "28px",
  },
  eyebrowRule: {
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
  lede: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: "clamp(28px, 4vw, 52px)",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: "#ffffff",
    maxWidth: "900px",
    textWrap: "pretty",
    marginBottom: "24px",
  },
  highlight: {
    color: "#e8002d",
  },
  teaser: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: "18px",
    color: "#888",
    lineHeight: 1.6,
    fontStyle: "italic",
  },
};

Object.assign(window, { Hero });
