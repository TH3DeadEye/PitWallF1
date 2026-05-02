// Header.jsx — App header component
// The Consistency Theorem Design System

const Header = ({ onRunPipeline, isLoading }) => {
  return (
    <header style={headerStyles.header}>
      <div style={headerStyles.inner}>
        <div style={headerStyles.brand}>
          <div style={headerStyles.logotype}>
            THE CONSISTENCY{" "}
            <span style={headerStyles.accent}>THEOREM</span>
          </div>
          <div style={headerStyles.subtitle}>
            A data investigation · 2025 F1 Season
          </div>
        </div>
        <button
          style={{
            ...headerStyles.btn,
            ...(isLoading ? headerStyles.btnLoading : {}),
          }}
          onClick={onRunPipeline}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span style={headerStyles.spinner}></span>
              Running…
            </>
          ) : (
            "Run Pipeline"
          )}
        </button>
      </div>
    </header>
  );
};

const headerStyles = {
  header: {
    borderBottom: "1px solid #1c1c1c",
    padding: "0 40px",
    height: "56px",
    display: "flex",
    alignItems: "center",
    position: "sticky",
    top: 0,
    background: "#0f0f0f",
    zIndex: 100,
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  logotype: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#ffffff",
    lineHeight: 1,
  },
  accent: {
    color: "#e8002d",
  },
  subtitle: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#555",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontFamily: "'Barlow', sans-serif",
    fontWeight: 600,
    fontSize: "12px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: "#e8002d",
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    padding: "0 20px",
    height: "32px",
    cursor: "pointer",
  },
  btnLoading: {
    background: "#a80020",
    opacity: 0.8,
    cursor: "wait",
  },
  spinner: {
    display: "inline-block",
    width: "11px",
    height: "11px",
    border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};

Object.assign(window, { Header });
