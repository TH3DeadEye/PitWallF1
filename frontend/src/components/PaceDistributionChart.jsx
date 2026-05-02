import React from 'react';
import { api } from '../api.js';
import { colorFor } from '../data/driverColors.js';
import { DECIDING_RACES } from '../data/decidingRaces.js';

const ACCENT = '#ff1f3d';

/**
 * Custom SVG box-and-whisker chart for the championship-deciding race.
 * Shows lap-time distribution per driver: median (line), IQR (box), min/max
 * (whiskers). The champion + runner-up boxes are highlighted; everyone else
 * is dimmed so the eye lands on the variance comparison that matters.
 *
 * Lap-time-lower-is-faster, so the y-axis is INVERTED (faster laps render at
 * the top of the chart, slower at the bottom). This matches the racing-driver
 * mental model.
 */
export default function PaceDistributionChart({ season, round, selectedDrivers, visible }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const decider = DECIDING_RACES[season];
  const effectiveRound = round ?? decider?.round;

  React.useEffect(() => {
    if (!visible || !effectiveRound) return;
    setData(null);
    setError(null);
    api.getRacePace(season, effectiveRound)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [season, effectiveRound, visible]);

  const allDrivers = data?.drivers ?? [];
  // If the user has explicitly picked drivers, render only those (in chip order).
  // Otherwise keep the existing top-by-median ordering for the full grid view.
  const drivers = (selectedDrivers && selectedDrivers.length)
    ? allDrivers
        .filter((d) => selectedDrivers.includes(d.code))
        .sort((a, b) => selectedDrivers.indexOf(a.code) - selectedDrivers.indexOf(b.code))
    : allDrivers;
  const isFiltered = Boolean(selectedDrivers && selectedDrivers.length);
  const hasData = drivers.length > 0;

  const PADDING = { top: 30, right: 24, bottom: 40, left: 56 };
  const CHART_W = 720;
  const CHART_H = 340;
  const innerW = CHART_W - PADDING.left - PADDING.right;
  const innerH = CHART_H - PADDING.top - PADDING.bottom;

  const allMins = drivers.map((d) => d.min);
  const allMaxes = drivers.map((d) => d.max);
  const yMin = allMins.length ? Math.min(...allMins) - 0.3 : 0;
  const yMax = allMaxes.length ? Math.max(...allMaxes) + 0.3 : 1;
  const yRange = yMax - yMin || 1;
  const yScale = (val) => PADDING.top + ((val - yMin) / yRange) * innerH;

  const colWidth = drivers.length ? innerW / drivers.length : innerW;
  const boxWidth = Math.min(36, colWidth * 0.55);

  const yTicks = [];
  if (yRange > 0) {
    const step = yRange > 5 ? 1 : 0.5;
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
      yTicks.push(v);
    }
  }

  // Selected drivers (when a chip filter is active) are always highlighted.
  // Otherwise fall back to the dossier flags (champion + runner-up).
  const isHighlightedFn = (d) =>
    isFiltered ? selectedDrivers.includes(d.code) : (d.is_champion || d.is_runner_up);

  const focused = isFiltered
    ? drivers
    : drivers.filter((d) => d.is_champion || d.is_runner_up);

  const raceLabel = data?.race_name
    || (decider && effectiveRound === decider.round ? decider.name : `Round ${effectiveRound}`);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>RACE-LEVEL · LAP-TIME DISTRIBUTION</div>
          <div style={s.title}>{raceLabel} · {season}</div>
          {decider && effectiveRound === decider.round && (
            <div style={s.subtitle}>{decider.why}</div>
          )}
        </div>
        {hasData && focused.length > 0 && (
          <div style={s.callout}>
            {focused.slice(0, 5).map((d) => (
              <div key={d.code} style={s.calloutRow}>
                <span style={{ ...s.swatch, background: colorFor(d.code) }} />
                <span style={s.calloutCode}>{d.code}</span>
                <span style={s.calloutVal}>σ {d.stddev}s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={s.empty}>Could not load race pace ({error})</div>}
      {!error && !hasData && (
        <div style={s.empty}>
          {season < 2018
            ? 'Telemetry-grade lap data only available for 2018 onwards.'
            : 'Loading race-pace distribution...'}
        </div>
      )}

      {hasData && (
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PADDING.left}
                x2={CHART_W - PADDING.right}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="#161616"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={yScale(v) + 3}
                fontFamily="Barlow"
                fontSize={9}
                fill="#555"
                textAnchor="end"
              >
                {v.toFixed(1)}s
              </text>
            </g>
          ))}

          <text
            x={12}
            y={PADDING.top + innerH / 2}
            fontFamily="Barlow"
            fontSize={9}
            fill="#3a3a3a"
            textAnchor="middle"
            transform={`rotate(-90 12 ${PADDING.top + innerH / 2})`}
          >
            Lap time (faster ↑)
          </text>

          {drivers.map((d, i) => {
            const cx = PADDING.left + colWidth * (i + 0.5);
            const isHighlighted = isHighlightedFn(d);
            const color = colorFor(d.code, i);
            const opacity = isHighlighted ? 1 : 0.35;
            const yMedian = yScale(d.median);
            const yQ1 = yScale(d.q1);
            const yQ3 = yScale(d.q3);
            const yMin_ = yScale(d.min);
            const yMax_ = yScale(d.max);
            const boxTop = Math.min(yQ1, yQ3);
            const boxHeight = Math.abs(yQ3 - yQ1);

            return (
              <g key={d.code} opacity={opacity}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={yMin_}
                  y2={yMax_}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <line
                  x1={cx - boxWidth / 4}
                  x2={cx + boxWidth / 4}
                  y1={yMin_}
                  y2={yMin_}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <line
                  x1={cx - boxWidth / 4}
                  x2={cx + boxWidth / 4}
                  y1={yMax_}
                  y2={yMax_}
                  stroke={color}
                  strokeWidth={1.5}
                />

                <rect
                  x={cx - boxWidth / 2}
                  y={boxTop}
                  width={boxWidth}
                  height={boxHeight || 1}
                  fill={color}
                  fillOpacity={0.25}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2 : 1}
                />

                <line
                  x1={cx - boxWidth / 2}
                  x2={cx + boxWidth / 2}
                  y1={yMedian}
                  y2={yMedian}
                  stroke={isHighlighted ? '#fff' : color}
                  strokeWidth={2.5}
                />

                <text
                  x={cx}
                  y={CHART_H - PADDING.bottom + 14}
                  fontFamily="Barlow Condensed"
                  fontSize={11}
                  fontWeight={isHighlighted ? 700 : 400}
                  fill={isHighlighted ? '#fff' : '#666'}
                  textAnchor="middle"
                >
                  {d.code}
                </text>
                <text
                  x={cx}
                  y={CHART_H - PADDING.bottom + 26}
                  fontFamily="Barlow"
                  fontSize={9}
                  fill={isHighlighted ? '#999' : '#3a3a3a'}
                  textAnchor="middle"
                >
                  σ{d.stddev}
                </text>

                <title>
                  {d.code} — median {d.median}s, σ {d.stddev}s, range {d.min}–{d.max}s, {d.n} laps
                </title>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
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
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
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
    fontStyle: 'italic',
  },
  callout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: '#0f0f0f',
    border: '1px solid #1c1c1c',
    padding: '8px 12px',
  },
  calloutRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'Barlow Condensed, sans-serif',
    fontSize: '12px',
    color: '#fff',
    letterSpacing: '0.05em',
  },
  swatch: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  calloutCode: {
    fontWeight: 700,
    minWidth: '28px',
  },
  calloutVal: {
    color: '#999',
    fontWeight: 600,
  },
  empty: {
    color: '#444',
    fontFamily: 'Barlow, sans-serif',
    fontSize: '12px',
    letterSpacing: '0.05em',
    padding: '60px 0',
    textAlign: 'center',
  },
};
