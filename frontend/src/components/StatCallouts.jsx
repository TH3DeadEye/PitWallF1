import { buildCards } from '../data/stats.jsx';

/**
 * Three big newspaper-style stat callouts.
 *
 * The actual per-season card data is computed in src/data/stats.jsx so the
 * EvidenceStrip inside Story can reuse the exact same numbers.
 */

const ACCENT = '#e8002d';

export default function StatCallouts({ seasons, season, visible }) {
  const d = seasons[season];
  const summary = d.summary || {};
  const cards = buildCards(d, summary);

  return (
    <section
      style={{
        ...s.wrap,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease 200ms',
      }}
    >
      <div style={s.inner}>
        <div style={s.eyebrow}>
          <span style={s.rule} />
          <span style={s.eyebrowText}>Key findings · {season}</span>
        </div>
        <div style={s.grid}>
          {cards.map((card, i) => (
            <article key={card.id} style={{ ...s.card, ...(i > 0 ? s.cardBorder : {}) }}>
              <header style={s.cardHead}>
                <div style={s.numWrap}>
                  <span style={{ ...s.number, color: card.numberAccent ? ACCENT : '#fff' }}>
                    {card.number}
                  </span>
                  {card.unit && <span style={s.unit}>{card.unit}</span>}
                </div>
                <span style={s.tag}>{card.tag}</span>
              </header>
              <h3 style={s.title}>{card.title}</h3>
              <p style={s.body}>{card.body}</p>
              <div style={s.bars}>
                {card.bars.map((bar, j) => (
                  <Bar key={j} {...bar} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bar({ label, value, ratio, accent }) {
  const pct = Math.max(4, Math.min(100, ratio * 100));
  return (
    <div style={s.barRow}>
      <span style={s.barLabel}>{label}</span>
      <div style={s.barTrack}>
        <div
          style={{
            ...s.barFill,
            width: `${pct}%`,
            background: accent ? ACCENT : '#444',
          }}
        />
      </div>
      <span style={s.barValue}>{value}</span>
    </div>
  );
}

const s = {
  wrap: { padding: '64px 40px', borderBottom: '1px solid #1c1c1c', background: '#0a0a0a' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  rule: { display: 'block', width: '24px', height: '2px', background: '#e8002d' },
  eyebrowText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#888',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    border: '1px solid #1c1c1c',
    background: '#0f0f0f',
  },
  card: {
    padding: '24px 26px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minHeight: '300px',
  },
  cardBorder: { borderLeft: '1px solid #1c1c1c' },

  cardHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
  },
  numWrap: { display: 'flex', alignItems: 'baseline' },
  number: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: '54px',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  unit: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '20px',
    color: '#666',
    marginLeft: '4px',
  },
  tag: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#888',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    padding: '4px 9px',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    marginTop: '4px',
  },

  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#fff',
    margin: 0,
  },
  body: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '14px',
    lineHeight: 1.55,
    color: '#9a9a9a',
    margin: 0,
    flex: 1,
  },

  bars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    paddingTop: '10px',
    borderTop: '1px solid #1c1c1c',
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '90px 1fr 60px',
    gap: '10px',
    alignItems: 'center',
  },
  barLabel: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#666',
  },
  barTrack: {
    height: '2px',
    background: '#1a1a1a',
    borderRadius: '1px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    transition: 'width 600ms cubic-bezier(.2,.8,.2,1) 200ms',
  },
  barValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    color: '#c0c0c0',
    textAlign: 'right',
  },
};
