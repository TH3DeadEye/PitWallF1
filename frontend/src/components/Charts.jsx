import React from 'react';
import Chart from 'chart.js/auto';
import { SEASON_YEARS } from '../data/seasons.js';

// Selected season — bright accent + white border + subtle glow
const ACCENT = '#ff1f3d';
const ACCENT_DIM = '#5a0014';
const RUNNER_BRIGHT = '#d4d4d4';
const RUNNER_DIM = '#3a3a3a';
const HIGHLIGHT_BORDER = '#ffffff';

// Custom plugin: paints a soft red glow under the selected season's bars on chart 1
function glowPlugin(getSelectedIdx) {
  return {
    id: 'selectedGlow',
    beforeDatasetsDraw(chart) {
      const idx = getSelectedIdx();
      if (idx == null || idx < 0) return;
      const ctx = chart.ctx;
      const meta0 = chart.getDatasetMeta(0);
      const meta1 = chart.getDatasetMeta(1);
      const bar0 = meta0?.data?.[idx];
      const bar1 = meta1?.data?.[idx];
      if (!bar0 || !bar1) return;
      const xLeft = Math.min(bar0.x, bar1.x) - bar0.width / 2 - 8;
      const xRight = Math.max(bar0.x, bar1.x) + bar1.width / 2 + 8;
      const yTop = Math.min(bar0.y, bar1.y) - 6;
      const yBottom = chart.scales.y.getPixelForValue(0);
      ctx.save();
      const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
      grad.addColorStop(0, 'rgba(232, 0, 45, 0.10)');
      grad.addColorStop(1, 'rgba(232, 0, 45, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(xLeft, yTop, xRight - xLeft, yBottom - yTop);
      ctx.restore();
    },
  };
}

export default function Charts({ seasons, season, visible }) {
  const c1ref = React.useRef(null);
  const c2ref = React.useRef(null);
  const c1inst = React.useRef(null);
  const c2inst = React.useRef(null);
  const seasonRef = React.useRef(season);
  seasonRef.current = season;

  React.useEffect(() => {
    if (!visible) return;
    const d = seasons[season];
    const summary = d.summary || {};
    const seasonIdx = SEASON_YEARS.indexOf(season);

    const championColors = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? ACCENT : ACCENT_DIM
    );
    const runnerColors = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? RUNNER_BRIGHT : RUNNER_DIM
    );
    const championBorders = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? HIGHLIGHT_BORDER : 'transparent'
    );
    const runnerBorders = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? HIGHLIGHT_BORDER : 'transparent'
    );
    const championBorderWidths = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? 2.5 : 0
    );
    const runnerBorderWidths = SEASON_YEARS.map((_, i) =>
      i === seasonIdx ? 2.5 : 0
    );

    // Per-year tooltip metadata so hovering tells you who the bar belongs to
    const championMeta = SEASON_YEARS.map((y) => {
      const ss = seasons[y];
      return {
        name: ss?.champion || '—',
        constructor: ss?.constructor || '',
      };
    });
    const runnerMeta = SEASON_YEARS.map((y) => {
      const ss = seasons[y];
      return {
        name: ss?.runnerUp || '—',
      };
    });

    const labelsChart2 = d.chart2Rounds
      ? d.chart2Rounds.map((r) => `R${r}`)
      : d.chart2.map((_, i) => `R${i + 1}`);

    const leadInflection = d.leadRound || Math.ceil(d.chart2.length / 2);
    const colorsChart2 = d.chart2.map((_, i) =>
      i + 1 >= leadInflection ? RUNNER_BRIGHT : ACCENT
    );
    const bordersChart2 = d.chart2.map(() => 'transparent');

    const runnerName = summary.runner_up_name || d.runnerUp;
    const c2Avg = d.chart2.length
      ? d.chart2.reduce((a, b) => a + b, 0) / d.chart2.length
      : 0;

    const timer = setTimeout(() => {
      const baseOpts = (yLabel, tooltipCfg, interaction) => ({
        responsive: true,
        animation: { duration: 850, easing: 'easeOutQuart' },
        animations: {
          y: { from: (ctx) => (ctx.type === 'data' ? ctx.chart.scales.y.getPixelForValue(0) : undefined) },
          backgroundColor: { duration: 350, easing: 'easeOutQuart' },
          borderColor: { duration: 350, easing: 'easeOutQuart' },
          borderWidth: { duration: 350, easing: 'easeOutQuart' },
        },
        transitions: {
          active: { animation: { duration: 200 } },
        },
        interaction: interaction || { mode: 'nearest', intersect: true },
        onHover: (e, els) => {
          if (!e.native) return;
          e.native.target.style.cursor = els.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#0a0a0a',
            borderColor: ACCENT,
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#c0c0c0',
            footerColor: '#666',
            titleFont: { family: 'Barlow Condensed', size: 13, weight: '700' },
            bodyFont: { family: 'Barlow', size: 12, weight: '600' },
            footerFont: { family: 'Barlow', size: 10, weight: '400', style: 'italic' },
            padding: { top: 10, bottom: 10, left: 12, right: 12 },
            cornerRadius: 0,
            displayColors: false,
            caretSize: 6,
            ...tooltipCfg,
          },
        },
        scales: {
          x: {
            grid: { color: '#161616' },
            ticks: {
              color: (ctx) => (ctx.index === seasonIdx ? '#fff' : '#555'),
              font: (ctx) => ({
                family: 'Barlow',
                size: 10,
                weight: ctx.index === seasonIdx ? '700' : '400',
              }),
            },
            border: { color: '#1c1c1c' },
          },
          y: {
            grid: { color: '#161616' },
            ticks: { color: '#555', font: { family: 'Barlow', size: 10 } },
            border: { color: '#1c1c1c' },
            title: {
              display: true,
              text: yLabel,
              color: '#3a3a3a',
              font: { family: 'Barlow', size: 10 },
            },
            beginAtZero: true,
          },
        },
      });

      // Chart 1 — cross-season stddev with selected year highlighted
      const tooltip1 = {
        callbacks: {
          title: (items) => {
            const i = items[0].dataIndex;
            return `${SEASON_YEARS[i]} season`;
          },
          label: (ctx) => {
            const i = ctx.dataIndex;
            const isChampion = ctx.datasetIndex === 0;
            const meta = isChampion ? championMeta[i] : runnerMeta[i];
            const role = isChampion ? 'Champion' : 'Runner-up';
            const value = ctx.parsed.y;
            return `${role}: ${meta.name} — ${value?.toFixed?.(2)}σ`;
          },
          footer: (items) => {
            const i = items[0].dataIndex;
            const champ = championMeta[i];
            const runner = runnerMeta[i];
            const champVal = items.find((it) => it.datasetIndex === 0)?.parsed.y;
            const runnerVal = items.find((it) => it.datasetIndex === 1)?.parsed.y;
            if (typeof champVal === 'number' && typeof runnerVal === 'number') {
              const ratio = (Math.max(champVal, runnerVal) / Math.max(0.001, Math.min(champVal, runnerVal))).toFixed(1);
              return `${runner.name} variance ${ratio}× ${champ.name}`;
            }
            return '';
          },
        },
      };

      if (c1inst.current) {
        c1inst.current.data.datasets[0].data = d.chart1.champion;
        c1inst.current.data.datasets[0].backgroundColor = championColors;
        c1inst.current.data.datasets[0].borderColor = championBorders;
        c1inst.current.data.datasets[0].borderWidth = championBorderWidths;
        c1inst.current.data.datasets[1].data = d.chart1.runnerUp;
        c1inst.current.data.datasets[1].backgroundColor = runnerColors;
        c1inst.current.data.datasets[1].borderColor = runnerBorders;
        c1inst.current.data.datasets[1].borderWidth = runnerBorderWidths;
        c1inst.current.options.scales.x.ticks.color = (ctx) => (ctx.index === seasonIdx ? '#fff' : '#555');
        c1inst.current.options.scales.x.ticks.font = (ctx) => ({
          family: 'Barlow',
          size: 10,
          weight: ctx.index === seasonIdx ? '700' : '400',
        });
        c1inst.current.options.plugins.tooltip.callbacks = tooltip1.callbacks;
        c1inst.current.update();
      } else if (c1ref.current) {
        c1inst.current = new Chart(c1ref.current, {
          type: 'bar',
          plugins: [glowPlugin(() => SEASON_YEARS.indexOf(seasonRef.current))],
          data: {
            labels: SEASON_YEARS.map((y) => String(y)),
            datasets: [
              {
                label: 'Champion',
                data: d.chart1.champion,
                backgroundColor: championColors,
                borderColor: championBorders,
                borderWidth: championBorderWidths,
                borderRadius: 2,
                barPercentage: 0.6,
                hoverBackgroundColor: SEASON_YEARS.map((_, i) => (i === seasonIdx ? '#ff4459' : '#7a0019')),
              },
              {
                label: 'Runner-up',
                data: d.chart1.runnerUp,
                backgroundColor: runnerColors,
                borderColor: runnerBorders,
                borderWidth: runnerBorderWidths,
                borderRadius: 2,
                barPercentage: 0.6,
                hoverBackgroundColor: SEASON_YEARS.map((_, i) => (i === seasonIdx ? '#ffffff' : '#5a5a5a')),
              },
            ],
          },
          options: baseOpts('Std Dev (σ)', tooltip1, { mode: 'index', intersect: false, axis: 'x' }),
        });
      }

      // Chart 2 — runner-up's per-round points, split by lead inflection
      const tooltip2 = {
        callbacks: {
          title: (items) => {
            const label = items[0].label;
            return `${label} · ${runnerName}`;
          },
          label: (ctx) => {
            const pts = ctx.parsed.y;
            return `${pts} pts`;
          },
          footer: (items) => {
            const i = items[0].dataIndex;
            const round = i + 1;
            const before = round < leadInflection;
            const phase = leadInflection && d.leadRound
              ? (before ? `Before championship lead` : `After taking lead at R${leadInflection}`)
              : `Season average ${c2Avg.toFixed(1)} pts`;
            return phase;
          },
        },
      };

      if (c2inst.current) {
        c2inst.current.data.labels = labelsChart2;
        c2inst.current.data.datasets[0].data = d.chart2;
        c2inst.current.data.datasets[0].backgroundColor = colorsChart2;
        c2inst.current.data.datasets[0].borderColor = bordersChart2;
        c2inst.current.options.plugins.tooltip.callbacks = tooltip2.callbacks;
        c2inst.current.update();
      } else if (c2ref.current) {
        c2inst.current = new Chart(c2ref.current, {
          type: 'bar',
          data: {
            labels: labelsChart2,
            datasets: [
              {
                label: 'Points',
                data: d.chart2,
                backgroundColor: colorsChart2,
                borderColor: bordersChart2,
                borderWidth: 0,
                hoverBackgroundColor: d.chart2.map((_, i) =>
                  i + 1 >= leadInflection ? '#ffffff' : '#ff4459'
                ),
                hoverBorderColor: HIGHLIGHT_BORDER,
                hoverBorderWidth: 1,
                borderRadius: 2,
                barPercentage: 0.78,
              },
            ],
          },
          options: baseOpts('Points', tooltip2),
        });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [visible, season, seasons]);

  React.useEffect(
    () => () => {
      c1inst.current?.destroy();
      c2inst.current?.destroy();
      c1inst.current = null;
      c2inst.current = null;
    },
    []
  );

  const d = seasons[season];
  const usingRealRoundData = Boolean(d.chart2Rounds);

  return (
    <section
      style={{
        ...s.wrap,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease 150ms',
      }}
    >
      <div style={s.inner}>
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.cardTitle}>Finishing position std dev · cross-season</div>
            <div style={s.cardSub}>
              <strong style={s.subStrong}>{season}</strong> highlighted · hover any bar for driver + value
            </div>
            <div style={s.legend}>
              <span style={s.legItem}><span style={{ ...s.legDot, background: ACCENT, border: '1px solid #fff' }} />Champion ({season})</span>
              <span style={s.legItem}><span style={{ ...s.legDot, background: RUNNER_BRIGHT, border: '1px solid #fff' }} />Runner-up ({season})</span>
              <span style={s.legItem}><span style={{ ...s.legDot, background: ACCENT_DIM, opacity: 0.85 }} />Other seasons</span>
            </div>
            <canvas ref={c1ref} height={190} />
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>Points per race · {d.runnerUp} · {season}</div>
            <div style={s.cardSub}>
              {usingRealRoundData ? 'Real per-round points · ' : 'Indicative · '}
              {d.leadRound ? `inflection at R${d.leadRound}` : 'no lead-change recorded'}
            </div>
            <div style={s.legend}>
              <span style={s.legItem}><span style={{ ...s.legDot, background: ACCENT }} />Before lead</span>
              <span style={s.legItem}><span style={{ ...s.legDot, background: RUNNER_BRIGHT }} />After lead</span>
            </div>
            <canvas ref={c2ref} height={190} />
          </div>
        </div>
      </div>
    </section>
  );
}

const s = {
  wrap: { padding: '56px 40px', borderBottom: '1px solid #1c1c1c' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1px',
    background: '#1c1c1c',
    border: '1px solid #1c1c1c',
  },
  card: { background: '#0f0f0f', padding: '24px' },
  cardTitle: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: '3px',
  },
  cardSub: { fontFamily: "'Barlow', sans-serif", fontSize: '10px', color: '#5a5a5a', marginBottom: '10px' },
  subStrong: { color: '#fff', fontWeight: 700 },
  legend: { display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' },
  legItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  legDot: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '1px' },
};
