import React from 'react';

export default function Hero({ seasons, season, visible }) {
  const d = seasons[season];
  const firstWord = d.angle.split(' ')[0];
  const parts = d.hook.split(firstWord);

  return (
    <section
      style={{
        ...s.wrap,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    >
      <div style={s.inner}>
        <div style={s.eyebrow}>
          <span style={s.rule} />
          <span style={s.eyebrowText}>The finding · {season}</span>
        </div>
        <p style={s.lede}>
          {parts.map((part, i, arr) =>
            i < arr.length - 1 ? (
              <React.Fragment key={i}>
                {part}
                <span style={s.highlight}>{firstWord}</span>
              </React.Fragment>
            ) : (
              part
            )
          )}
        </p>
        <p style={s.sub}>{d.angle} — three computed metrics, one AI-generated story.</p>
      </div>
    </section>
  );
}

const s = {
  wrap: { padding: '72px 40px 64px', borderBottom: '1px solid #1c1c1c' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  rule: { display: 'block', width: '24px', height: '2px', background: '#e8002d' },
  eyebrowText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#888',
  },
  lede: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: 'clamp(24px, 3.5vw, 46px)',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    color: '#fff',
    maxWidth: '860px',
    textWrap: 'pretty',
    marginBottom: '20px',
  },
  highlight: { color: '#e8002d' },
  sub: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '17px',
    color: '#666',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
};
