import React from 'react';
import { api } from '../api.js';
import { colorFor } from '../data/driverColors.js';

const ACCENT = '#ff1f3d';

/**
 * Controls for the Race-level Analysis section.
 *
 * - Race dropdown (defaults to championship-deciding race)
 * - Driver chip multi-selector (defaults to whatever the AI's story mentioned;
 *   falls back to the top 3 finishers if there's no story yet)
 *
 * Bubbles selection up to App via the onChange callback so all three race-level
 * charts (pace, positions, circuit) stay in sync.
 */
export default function RaceLevelControls({
  season,
  selectedRound,
  selectedDrivers,
  storyMentions,
  onRoundChange,
  onDriversChange,
}) {
  const [races, setRaces] = React.useState([]);
  const [drivers, setDrivers] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getSeasonRaces(season).catch(() => ({ races: [] })),
      api.getSeasonDrivers(season).catch(() => ({ drivers: [] })),
    ]).then(([r, d]) => {
      if (!mounted) return;
      setRaces(r.races || []);
      setDrivers(d.drivers || []);
    });
    return () => { mounted = false; };
  }, [season]);

  // Whenever the AI mentions a new set of drivers, sync them into the chips
  // unless the user has already explicitly picked something different.
  const lastSyncedRef = React.useRef('');
  React.useEffect(() => {
    if (!storyMentions || !storyMentions.length) return;
    const codes = storyMentions.map((d) => d.code).filter(Boolean);
    const key = codes.join(',');
    if (key && key !== lastSyncedRef.current) {
      lastSyncedRef.current = key;
      onDriversChange(codes.slice(0, 4));
    }
  }, [storyMentions, onDriversChange]);

  function toggleDriver(code) {
    const set = new Set(selectedDrivers || []);
    if (set.has(code)) set.delete(code);
    else if (set.size < 5) set.add(code);
    onDriversChange(Array.from(set));
  }

  return (
    <div style={s.bar}>
      <div style={s.group}>
        <label style={s.label}>RACE (ROUND)</label>
        <select
          value={selectedRound || ''}
          onChange={(e) => onRoundChange(parseInt(e.target.value, 10))}
          style={s.select}
        >
          {races.map((r) => (
            <option key={r.round} value={r.round}>
              R{r.round} · {r.race_name}
            </option>
          ))}
        </select>
      </div>

      <div style={s.group}>
        <label style={s.label}>Compare drivers</label>
        <div style={s.chips}>
          {drivers.slice(0, 14).map((d) => {
            const active = (selectedDrivers || []).includes(d.code);
            const color = colorFor(d.code);
            return (
              <button
                key={d.code}
                onClick={() => toggleDriver(d.code)}
                style={{
                  ...s.chip,
                  background: active ? color : 'transparent',
                  borderColor: active ? color : '#2a2a2a',
                  color: active ? '#000' : '#aaa',
                  fontWeight: active ? 700 : 500,
                }}
                title={`${d.name} · ${d.team || ''}`}
              >
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: color,
                  marginRight: '6px',
                  border: active ? '1px solid #000' : 'none',
                }} />
                {d.code}
              </button>
            );
          })}
        </div>
        <div style={s.hint}>
          Up to 5 · {(selectedDrivers || []).length}/5 selected
        </div>
      </div>
    </div>
  );
}

const s = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '32px',
    alignItems: 'flex-start',
    background: '#0a0a0a',
    border: '1px solid #1c1c1c',
    padding: '20px 24px',
    margin: '20px 0 0 0',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '0',
    flex: '1 1 auto',
  },
  label: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.18em',
    color: ACCENT,
    fontWeight: 700,
  },
  select: {
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    color: '#fff',
    fontFamily: 'Barlow, sans-serif',
    fontSize: '13px',
    padding: '8px 12px',
    cursor: 'pointer',
    minWidth: '260px',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px',
    letterSpacing: '0.05em',
    padding: '6px 10px',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    display: 'inline-flex',
    alignItems: 'center',
  },
  hint: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: '10px',
    color: '#666',
  },
};
