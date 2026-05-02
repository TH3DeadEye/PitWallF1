import React from 'react';

const KEY_RENAMES = {
  metric_1: 'finishing_position_stddev',
  metric_2: 'points_per_race_before_vs_after_lead',
  metric_3: 'intra_stint_laptime_stddev_seconds',
  correlation: 'pearson_r_vs_final_wdc_rank',
};

function humanizePayload(obj) {
  if (Array.isArray(obj)) return obj.map(humanizePayload);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[KEY_RENAMES[k] || k] = humanizePayload(v);
    }
    return out;
  }
  return obj;
}

function buildDisplayPayload(season, payload, d, question) {
  if (!payload) {
    const s2 = d.stats;
    return {
      season,
      driver: d.runnerUp,
      constructor: d.constructor,
      question: question || null,
      angle: d.angle,
      runner_up_finishing_stddev: s2.stddev,
      champion_finishing_stddev: s2.championStddev,
      stddev_delta: +(s2.stddev - s2.championStddev).toFixed(2),
      points_rate_before_lead: s2.pointsRateBefore,
      points_rate_after_lead: s2.pointsRateAfter,
      points_rate_delta: +(s2.pointsRateAfter - s2.pointsRateBefore).toFixed(1),
      rounds_led: s2.roundsLed,
      lead_round: d.leadRound,
    };
  }

  // Strip findings down to the current season's slice + correlation, so the
  // viewer doesn't get dwarfed by 8 seasons of data.
  const trimmed = {
    ...payload,
    findings: payload.findings
      ? {
          finishing_position_stddev_for_season:
            payload.findings.metric_1?.seasons?.[season] ||
            payload.findings.metric_1?.seasons?.[String(season)] ||
            null,
          points_per_race_delta_for_season:
            payload.findings.metric_2?.seasons?.[season] ||
            payload.findings.metric_2?.seasons?.[String(season)] ||
            null,
          intra_stint_laptime_stddev_for_season:
            payload.findings.metric_3?.seasons?.[season] ||
            payload.findings.metric_3?.seasons?.[String(season)] ||
            null,
          pearson_r_vs_final_wdc_rank: payload.findings.correlation,
        }
      : undefined,
  };
  // Trim per-round points to a count + first/last so the JSON stays scannable
  if (trimmed.summary?.points_per_round) {
    const ppr = trimmed.summary.points_per_round;
    trimmed.summary = {
      ...trimmed.summary,
      points_per_round_count: ppr.length,
      points_per_round_first_three: ppr.slice(0, 3),
      points_per_round_last_three: ppr.slice(-3),
    };
    delete trimmed.summary.points_per_round;
  }
  return humanizePayload(trimmed);
}

export default function JsonViewer({ seasons, season, question, visible, payloadOverride }) {
  const [open, setOpen] = React.useState(false);
  const d = seasons[season];
  const payload = buildDisplayPayload(season, payloadOverride, d, question);

  return (
    <section
      style={{
        ...s.wrap,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease 300ms',
      }}
    >
      <div style={s.inner}>
        <div
          style={s.header}
          onClick={() => setOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        >
          <div style={s.left}>
            <span style={s.title}>Raw Pipeline Output</span>
            <span style={s.badge}>JSON</span>
            <span style={s.count}>
              {Object.keys(payload).length} keys · {season}
            </span>
          </div>
          <span style={{ ...s.chevron, transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
        {open && (
          <div style={s.body}>
            <pre style={s.pre}>
              {JSON.stringify(payload, null, 2)
                .split('\n')
                .map((line, i) => {
                  const ci = line.indexOf(':');
                  if (ci > -1) {
                    return (
                      <span key={i}>
                        <span style={s.key}>{line.slice(0, ci + 1)}</span>
                        <span style={s.val}>{line.slice(ci + 1)}</span>
                        {'\n'}
                      </span>
                    );
                  }
                  return <span key={i} style={s.brace}>{line + '\n'}</span>;
                })}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

const s = {
  wrap: { padding: '40px 40px 80px' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 16px',
    background: '#0d0d0d',
    border: '1px solid #1a1a1a',
    cursor: 'pointer',
    userSelect: 'none',
  },
  left: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#888',
  },
  badge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    background: '#1a1a1a',
    color: '#444',
    padding: '2px 7px',
    borderRadius: '2px',
  },
  count: { fontFamily: "'Barlow', sans-serif", fontSize: '10px', color: '#3a3a3a' },
  chevron: {
    fontSize: '9px',
    color: '#444',
    display: 'inline-block',
    transition: 'transform 200ms ease',
  },
  body: {
    background: '#080808',
    border: '1px solid #1a1a1a',
    borderTop: 'none',
    padding: '20px',
    overflowX: 'auto',
  },
  pre: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    lineHeight: 1.75,
    margin: 0,
    whiteSpace: 'pre',
  },
  key: { color: '#e8002d' },
  val: { color: '#c0c0c0' },
  brace: { color: '#3a3a3a' },
};
