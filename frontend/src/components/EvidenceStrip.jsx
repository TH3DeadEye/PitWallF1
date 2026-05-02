import { buildCards } from '../data/stats.jsx';

/**
 * Compact horizontal data strip that backs the answer paragraph.
 *
 * Renders the same 3 per-season findings as the StatCallouts section but in
 * a smaller, evidence-style layout that lives inside the answer flow. Lets
 * the user immediately see "this answer is grounded in these numbers".
 */

const ACCENT = '#e8002d';

export default function EvidenceStrip({ seasons, season }) {
  const d = seasons[season];
  const summary = d.summary || {};
  const cards = buildCards(d, summary);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.rule} />
        <span style={s.label}>Backed by · {season}</span>
      </div>
      <div style={s.grid}>
        {cards.map((c) => (
          <div key={c.id} style={s.cell}>
            <div style={s.tag}>{c.tag}</div>
            <div style={s.numWrap}>
              <span style={{ ...s.number, color: c.numberAccent ? ACCENT : '#fff' }}>
                {c.number}
              </span>
              {c.unit && <span style={s.unit}>{c.unit}</span>}
            </div>
            <div style={s.title}>{c.title}</div>
            <Bars bars={c.bars} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ bars }) {
  return (
    <div style={s.bars}>
      {bars.map((b, i) => {
        const pct = Math.max(4, Math.min(100, b.ratio * 100));
        return (
          <div key={i} style={s.barRow}>
            <span style={s.barLabel}>{b.label}</span>
            <div style={s.barTrack}>
              <div
                style={{
                  ...s.barFill,
                  width: `${pct}%`,
                  background: b.accent ? ACCENT : '#444',
                }}
              />
            </div>
            <span style={s.barValue}>{b.value}</span>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  wrap: {
    marginTop: '36px',
    paddingTop: '28px',
    borderTop: '1px solid #1c1c1c',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  rule: { display: 'block', width: '18px', height: '2px', background: ACCENT },
  label: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#888',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1px',
    background: '#1c1c1c',
    border: '1px solid #1c1c1c',
  },
  cell: {
    background: '#0d0d0d',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  tag: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '8px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#666',
  },
  numWrap: { display: 'flex', alignItems: 'baseline' },
  number: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: '34px',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  unit: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    color: '#666',
    marginLeft: '3px',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#c0c0c0',
  },

  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid #1a1a1a',
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '70px 1fr 50px',
    gap: '6px',
    alignItems: 'center',
  },
  barLabel: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '8px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#555',
  },
  barTrack: { height: '2px', background: '#181818', borderRadius: '1px', overflow: 'hidden' },
  barFill: { height: '100%', transition: 'width 600ms cubic-bezier(.2,.8,.2,1) 200ms' },
  barValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    color: '#a0a0a0',
    textAlign: 'right',
  },
};
