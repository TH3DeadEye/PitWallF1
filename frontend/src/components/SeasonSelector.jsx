import { SEASON_YEARS } from '../data/seasons.js';

export default function SeasonSelector({ seasons, selected, onSelect, loading }) {
  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <div style={s.labelRow}>
          <span style={s.label}>Select season</span>
          {loading && <span style={s.loadingPulse}>fetching live data…</span>}
        </div>
        <div style={s.row}>
          {SEASON_YEARS.map((yr) => {
            const d = seasons[yr];
            const isActive = selected === yr;
            return (
              <button
                key={yr}
                onClick={() => onSelect(yr)}
                style={{ ...s.card, ...(isActive ? s.cardActive : {}) }}
              >
                <div style={{ ...s.year, ...(isActive ? s.yearActive : {}) }}>{yr}</div>
                <div style={s.champ}>
                  <span style={s.champName}>{d.champion}</span>
                  <span style={s.dot}>·</span>
                  <span style={s.team}>{d.constructor}</span>
                </div>
                <div style={s.teaser}>{d.theme}</div>
                {isActive && <div style={s.activeLine} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { borderBottom: '1px solid #1c1c1c', padding: '32px 40px 0' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  labelRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  label: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#555',
  },
  loadingPulse: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#e8002d',
    animation: 'pulse 1.4s ease-in-out infinite',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '1px',
    background: '#1c1c1c',
    border: '1px solid #1c1c1c',
    borderBottom: 'none',
  },
  card: {
    background: '#0f0f0f',
    padding: '14px 14px 14px',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
    position: 'relative',
    transition: 'background 150ms ease',
    minHeight: '120px',
  },
  cardActive: { background: '#121212' },
  year: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: '32px',
    letterSpacing: '-0.02em',
    color: '#2a2a2a',
    lineHeight: 1,
    marginBottom: '6px',
    transition: 'color 150ms ease',
  },
  yearActive: { color: '#e8002d' },
  champ: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' },
  champName: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#888',
    letterSpacing: '0.02em',
  },
  dot: { color: '#333', fontSize: '9px' },
  team: { fontFamily: "'Barlow', sans-serif", fontSize: '9.5px', color: '#444' },
  teaser: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    color: '#444',
    lineHeight: 1.35,
    textWrap: 'pretty',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  activeLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#e8002d' },
};
