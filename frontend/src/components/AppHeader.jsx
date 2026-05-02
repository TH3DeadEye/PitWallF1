export default function AppHeader() {
  return (
    <header style={s.wrap}>
      <div style={s.inner}>
        <div>
          <div style={s.logo}>
            THE CONSISTENCY <span style={s.accent}>THEOREM</span>
          </div>
          <div style={s.sub}>A data investigation · 2021–2025 F1 Seasons</div>
        </div>
      </div>
    </header>
  );
}

const s = {
  wrap: {
    borderBottom: '1px solid #1c1c1c',
    padding: '0 40px',
    height: '54px',
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    background: '#0f0f0f',
    zIndex: 100,
  },
  inner: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '17px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#fff',
    lineHeight: 1,
  },
  accent: { color: '#e8002d' },
  sub: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#3a3a3a',
    marginTop: '1px',
  },
};
