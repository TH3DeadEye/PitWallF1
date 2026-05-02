import React from 'react';
import Chart from 'chart.js/auto';
import { api } from '../api.js';
import { colorFor } from '../data/driverColors.js';
import { DECIDING_RACES } from '../data/decidingRaces.js';

const ACCENT = '#ff1f3d';

/**
 * Lap-by-lap position evolution for the championship-deciding race.
 *
 * X-axis: lap number. Y-axis: race position (P1 at top, inverted).
 * Champion + runner-up lines are highlighted; everyone else is dim grey
 * so the eye lands on the title fight.
 *
 * Positions data is loaded lazily from FastF1 on the backend, cached per
 * race in data/outputs/positions_{year}_{round}.json — first load may take
 * a few seconds for a cold race; subsequent loads are instant.
 */
export default function LapPositionsChart({ season, round, selectedDrivers, visible }) {
  const ref = React.useRef(null);
  const inst = React.useRef(null);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const decider = DECIDING_RACES[season];
  const effectiveRound = round ?? decider?.round;

  React.useEffect(() => {
    if (!visible || !effectiveRound || season < 2018) return;
    setData(null);
    setError(null);
    setLoading(true);
    api.getLapPositions(season, effectiveRound)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [season, effectiveRound, visible]);

  React.useEffect(() => {
    if (!visible || !data || !data.drivers?.length) return;
    if (data.error) return;

    const labels = Array.from({ length: data.total_laps }, (_, i) => `${i + 1}`);

    const isFiltered = Boolean(selectedDrivers && selectedDrivers.length);
    const datasets = data.drivers.map((d, i) => {
      const isChamp = d.is_champion;
      const isRu = d.is_runner_up;
      const isPicked = isFiltered && selectedDrivers.includes(d.code);
      const isHi = isFiltered ? isPicked : (isChamp || isRu);
      const color = colorFor(d.code, i);
      const alpha = isHi ? 1 : 0.18;
      const lineWidth = isHi ? 3 : 1;
      return {
        label: d.code,
        data: d.positions,
        borderColor: hexWithAlpha(color, alpha),
        backgroundColor: hexWithAlpha(color, 0),
        borderWidth: lineWidth,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.2,
        fill: false,
        spanGaps: true,
        order: isHi ? (isChamp ? 1 : 2) : 3 + i,
      };
    });

    const t = setTimeout(() => {
      if (inst.current) {
        inst.current.destroy();
        inst.current = null;
      }
      if (!ref.current) return;
      const ctx = ref.current.getContext('2d');
      inst.current = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1100, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false, axis: 'x' },
          onHover: (e, els) => {
            if (e.native) e.native.target.style.cursor = els.length ? 'pointer' : 'default';
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
              padding: { top: 10, bottom: 10, left: 12, right: 12 },
              cornerRadius: 0,
              displayColors: true,
              boxWidth: 8,
              boxHeight: 8,
              titleFont: { family: 'Barlow Condensed', size: 13, weight: '700' },
              bodyFont: { family: 'Barlow', size: 12, weight: '600' },
              callbacks: {
                title: (items) => `Lap ${items[0].label}`,
                label: (ctx) => {
                  const d = data.drivers[ctx.datasetIndex];
                  const flag = d.is_champion ? ' · CHAMP' : d.is_runner_up ? ' · R/U' : '';
                  return `${d.code}${flag}: P${ctx.parsed.y}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#161616' },
              ticks: {
                color: '#555',
                font: { family: 'Barlow', size: 9 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 12,
              },
              border: { color: '#1c1c1c' },
            },
            y: {
              reverse: true,
              min: 1,
              max: 20,
              grid: { color: '#161616' },
              ticks: {
                color: '#555',
                font: { family: 'Barlow', size: 9 },
                stepSize: 2,
                callback: (v) => `P${v}`,
              },
              border: { color: '#1c1c1c' },
              title: {
                display: true,
                text: 'Position',
                color: '#3a3a3a',
                font: { family: 'Barlow', size: 10 },
              },
            },
          },
        },
      });
    }, 50);

    return () => {
      clearTimeout(t);
      if (inst.current) {
        inst.current.destroy();
        inst.current = null;
      }
    };
    // selectedDrivers is part of dataset construction so re-run when it changes
  }, [data, visible, (selectedDrivers || []).join(',')]);

  React.useEffect(() => () => inst.current?.destroy(), []);

  const isFiltered = Boolean(selectedDrivers && selectedDrivers.length);
  const focused = data?.drivers
    ? (isFiltered
        ? data.drivers.filter((d) => selectedDrivers.includes(d.code))
        : data.drivers.filter((d) => d.is_champion || d.is_runner_up))
    : [];
  const raceLabel = data?.race_name
    || (decider && effectiveRound === decider.round ? decider.name : `Round ${effectiveRound}`);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>RACE-LEVEL · LAP-BY-LAP POSITIONS</div>
          <div style={s.title}>{raceLabel} · {season}</div>
        </div>
        {focused.length > 0 && (
          <div style={s.legend}>
            {focused.slice(0, 5).map((d) => (
              <span key={d.code} style={s.legendItem}>
                <span style={{ ...s.swatch, background: colorFor(d.code) }} />
                {d.code}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={s.canvasWrap}>
        {error && <div style={s.empty}>Could not load lap positions ({error})</div>}
        {!error && season < 2018 && (
          <div style={s.empty}>
            FastF1 telemetry is only available from 2018 onwards.
          </div>
        )}
        {!error && season >= 2018 && loading && (
          <div style={s.empty}>Loading lap-by-lap positions (first load can take ~5s)...</div>
        )}
        {!error && season >= 2018 && data?.error && (
          <div style={s.empty}>FastF1 fetch failed: {data.error}</div>
        )}
        <canvas
          ref={ref}
          style={{ display: error || loading || season < 2018 || data?.error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}

function hexWithAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const s = {
  container: {
    background: '#0a0a0a',
    border: '1px solid #1c1c1c',
    padding: '24px',
    margin: '20px 0 0 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '18px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  eyebrow: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.18em',
    color: ACCENT,
    fontWeight: 700,
    marginBottom: '4px',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '20px',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
  },
  legend: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap',
  },
  legendItem: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '11px',
    color: '#fff',
    letterSpacing: '0.08em',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  swatch: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  canvasWrap: {
    position: 'relative',
    height: '320px',
  },
  empty: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    color: '#444',
    fontFamily: 'Barlow, sans-serif',
    fontSize: '12px',
    letterSpacing: '0.05em',
    padding: '0 24px',
    textAlign: 'center',
  },
};
