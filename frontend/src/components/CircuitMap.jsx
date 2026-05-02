import React from 'react';
import { api } from '../api.js';
import { colorFor } from '../data/driverColors.js';
import { DECIDING_RACES } from '../data/decidingRaces.js';

const ACCENT = '#ff1f3d';

const GEAR_COLORS = {
  0: '#444444',
  1: '#265973',
  2: '#bd5319',
  3: '#1c6b54',
  4: '#a43120',
  5: '#731630',
  6: '#1e3b6e',
  7: '#c5e11a',
  8: '#7b6b23'
};

export default function CircuitMap({ season, round, drivers, visible }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [hoverGear, setHoverGear] = React.useState(null);
  const [selectedDriverCode, setSelectedDriverCode] = React.useState(null);
  
  const [selectedLap, setSelectedLap] = React.useState('fastest');
  const [lapData, setLapData] = React.useState(null);
  const [lapLoading, setLapLoading] = React.useState(false);

  const decider = DECIDING_RACES[season];
  const effectiveRound = round ?? decider?.round;
  const driverKey = (drivers || []).join(',');

  // Fetch base track and all drivers' fastest laps
  React.useEffect(() => {
    if (!visible || !effectiveRound || season < 2018) return;
    setLoading(true);
    setError(null);
    setSelectedLap('fastest');
    setLapData(null);
    api.getCircuit(season, effectiveRound, drivers && drivers.length ? drivers : null)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [season, effectiveRound, driverKey, visible]);

  // Fetch specific lap telemetry when selectedLap changes
  React.useEffect(() => {
    if (!visible || season < 2018 || !selectedDriverCode || selectedLap === 'fastest') {
      setLapData(null);
      return;
    }
    setLapLoading(true);
    api.getLapTelemetry(season, effectiveRound, selectedDriverCode, selectedLap)
      .then(d => {
        setLapData(d);
        setLapLoading(false);
      })
      .catch(e => {
        console.error(e);
        // We do not set the main error here so the track doesn't disappear,
        // just ignore the lap data or show a small alert
        setLapLoading(false);
        setLapData(null);
      });
  }, [season, effectiveRound, selectedDriverCode, selectedLap, visible]);

  // If the user changes the driver, reset the lap to 'fastest'
  React.useEffect(() => {
    setSelectedLap('fastest');
    setLapData(null);
  }, [selectedDriverCode]);

  const VIEW_W = 800;
  const VIEW_H = 420;
  const PADDING = 30;

  let pathData = '';
  let driverPaths = [];
  let mainDriver = null;

  if (data?.track && data.track.length > 1 && data.bbox) {
    const { x_min, x_max, y_min, y_max } = data.bbox;
    const xRange = x_max - x_min || 1;
    const yRange = y_max - y_min || 1;
    const scale = Math.min((VIEW_W - PADDING * 2) / xRange, (VIEW_H - PADDING * 2) / yRange);
    const xOffset = (VIEW_W - xRange * scale) / 2;
    const yOffset = (VIEW_H - yRange * scale) / 2;

    const project = (px, py) => {
      const x = (px - x_min) * scale + xOffset;
      const y = VIEW_H - ((py - y_min) * scale + yOffset);
      return [x, y];
    };

    pathData = data.track
      .map((p, i) => {
        const [x, y] = project(p[0], p[1]);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

    if (data.drivers && data.drivers.length) {
      driverPaths = data.drivers.map((d, i) => {
        const segments = [];
        let currentGear = -1;
        let currentPath = [];

        (d.path || []).forEach((p) => {
          const [x, y] = project(p[0], p[1]);
          const gear = p.length > 2 ? p[2] : 0;
          if (gear !== currentGear) {
            if (currentPath.length > 0) {
              segments.push({ gear: currentGear, d: currentPath.join(' ') });
              currentPath = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
            } else {
              currentPath = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
            }
            currentGear = gear;
          } else {
            currentPath.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
          }
        });
        if (currentPath.length > 0) {
          segments.push({ gear: currentGear, d: currentPath.join(' ') });
        }

        return {
          ...d,
          color: colorFor(d.code, i),
          segments
        };
      });
      
      mainDriver = driverPaths.find(d => d.code === selectedDriverCode) || driverPaths[0];
      
      // Override with lapData if present
      if (selectedLap !== 'fastest' && lapData) {
        const lapSegments = [];
        let currentGear = -1;
        let currentPath = [];

        (lapData.path || []).forEach((p) => {
          const [x, y] = project(p[0], p[1]);
          const gear = p.length > 2 ? p[2] : 0;
          if (gear !== currentGear) {
            if (currentPath.length > 0) {
              lapSegments.push({ gear: currentGear, d: currentPath.join(' ') });
              currentPath = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
            } else {
              currentPath = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
            }
            currentGear = gear;
          } else {
            currentPath.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
          }
        });
        if (currentPath.length > 0) {
          lapSegments.push({ gear: currentGear, d: currentPath.join(' ') });
        }

        mainDriver = {
          ...mainDriver,
          segments: lapSegments,
          most_used_gear: lapData.most_used_gear,
          avg_gear: lapData.avg_gear,
          lap_number: lapData.lap_number
        };
      }
    }
  }

  // Ensure selectedDriverCode is initialized
  React.useEffect(() => {
    if (driverPaths.length > 0 && !selectedDriverCode) {
      setSelectedDriverCode(driverPaths[0].code);
    }
  }, [driverPaths, selectedDriverCode]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>RACE-LEVEL · CIRCUIT MAP</div>
          <div style={s.title}>
            {data?.race_name || decider?.name || `Round ${effectiveRound || '?'}`} · {season}
          </div>
          {data?.circuit_name && <div style={s.subtitle}>{data.circuit_name}</div>}
          
          {driverPaths.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                 value={selectedDriverCode || mainDriver?.code || ''} 
                 onChange={(e) => setSelectedDriverCode(e.target.value)}
                 style={s.driverSelect}
              >
                {driverPaths.map(d => (
                  <option key={d.code} value={d.code}>{d.name || d.code}</option>
                ))}
              </select>

              {mainDriver?.valid_laps && mainDriver.valid_laps.length > 0 && (
                <select
                  value={selectedLap}
                  onChange={(e) => setSelectedLap(e.target.value === 'fastest' ? 'fastest' : parseInt(e.target.value, 10))}
                  style={s.driverSelect}
                >
                  <option value="fastest">Fastest Lap</option>
                  {mainDriver.valid_laps.map(l => (
                    <option key={l} value={l}>Lap {l}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        
        {mainDriver && (
           <div style={s.gearLegend}>
             {Object.entries(GEAR_COLORS).map(([g, c]) => {
                if (g === '0') return null;
                return (
                  <div key={g} style={{...s.gearLegendItem, opacity: (hoverGear && hoverGear !== parseInt(g)) ? 0.3 : 1}}>
                    <span style={{...s.swatch, background: c}}/>
                    <span>GEAR {g}</span>
                  </div>
                );
             })}
           </div>
        )}
      </div>

      {season < 2018 && (
        <div style={s.empty}>
          Circuit telemetry isn't available before 2018. Pick a season from
          2018 onwards to see the track outline.
        </div>
      )}
      {error && <div style={s.empty}>Could not load circuit ({error})</div>}
      {!error && season >= 2018 && loading && (
        <div style={s.empty}>Loading circuit telemetry (first load can take ~10s)...</div>
      )}
      {!error && season >= 2018 && data?.error && (
        <div style={s.empty}>FastF1 fetch failed: {data.error}</div>
      )}

      {pathData && !loading && (
        <div style={s.canvasWrap}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {/* Outline base */}
            <path d={pathData} fill="none" stroke="#161616" strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" />
            
            {/* If no drivers, show plain track */}
            {!mainDriver && (
              <path d={pathData} fill="none" stroke="#2a2a2a" strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* Gear segments for the first selected driver */}
            {mainDriver && !lapLoading && mainDriver.segments.map((seg, idx) => (
              <path
                key={`base-${idx}`}
                d={seg.d}
                fill="none"
                stroke={GEAR_COLORS[seg.gear] || '#fff'}
                strokeWidth={(hoverGear && hoverGear === seg.gear) ? 8 : 4}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={(hoverGear && hoverGear !== seg.gear) ? 0.3 : 1}
                style={{ transition: 'all 0.2s ease-out' }}
              />
            ))}
            
            {/* Invisible hover overlay to make hovering easier */}
            {mainDriver && !lapLoading && mainDriver.segments.map((seg, idx) => (
              <path
                key={`hover-${idx}`}
                d={seg.d}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setHoverGear(seg.gear)}
                onMouseLeave={() => setHoverGear(null)}
                style={{ cursor: 'crosshair' }}
              />
            ))}
          </svg>

          {/* Current Gear Floating Overlay */}
          {mainDriver && !lapLoading && (
            <div style={s.currentGearBox}>
              <span style={s.cgLabel}>Current Gear:</span>
              <span style={{...s.cgValue, color: GEAR_COLORS[hoverGear] || '#fff'}}>
                {hoverGear || '-'}
              </span>
            </div>
          )}

          {lapLoading && (
            <div style={s.lapLoadingOverlay}>
               Fetching Lap {selectedLap} telemetry...
            </div>
          )}
        </div>
      )}

      {/* Fastlytics style stat cards at the bottom */}
      {mainDriver && !loading && !error && (
        <div style={s.dashboard}>
           <div style={s.dashCard}>
              <div style={s.dashLabel}>MOST USED</div>
              <div style={{...s.dashValue, color: GEAR_COLORS[mainDriver.most_used_gear] || '#fff'}}>
                Gear {mainDriver.most_used_gear || '-'}
              </div>
           </div>
           <div style={s.dashCard}>
              <div style={s.dashLabel}>AVG GEAR</div>
              <div style={s.dashValue}>{mainDriver.avg_gear || '-'}</div>
           </div>
           <div style={s.dashCard}>
              <div style={s.dashLabel}>LAP</div>
              <div style={s.dashValue}>{mainDriver.lap_number || 'Fastest'}</div>
           </div>
        </div>
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
    marginBottom: '8px',
  },
  driverSelect: {
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    fontFamily: "'Space Mono', monospace",
    fontSize: '12px',
    padding: '4px 8px',
    marginTop: '8px',
    cursor: 'pointer',
    outline: 'none',
  },
  gearLegend: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '4px',
    background: '#111',
    border: '1px solid #222',
    padding: '8px 12px',
  },
  gearLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Space Mono', monospace",
    fontSize: '10px',
    color: '#888',
    transition: 'opacity 0.2s',
    cursor: 'default',
  },
  swatch: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  empty: {
    color: '#444',
    fontFamily: 'Barlow, sans-serif',
    fontSize: '12px',
    letterSpacing: '0.05em',
    padding: '60px 0',
    textAlign: 'center',
  },
  canvasWrap: {
    position: 'relative',
    marginTop: '20px',
  },
  lapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: "'Space Mono', monospace",
    fontSize: '14px',
    zIndex: 10,
  },
  currentGearBox: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    background: '#050505',
    border: '1px solid #222',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderRadius: '4px',
  },
  cgLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '12px',
    color: '#aaa',
  },
  cgValue: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '24px',
    fontWeight: 'bold',
  },
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '32px',
    borderTop: '1px solid #1c1c1c',
    paddingTop: '20px',
  },
  dashCard: {
    background: '#0a0a0a',
    border: '1px solid #1c1c1c',
    padding: '16px',
  },
  dashLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '10px',
    color: '#666',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  dashValue: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '24px',
    color: '#fff',
    fontWeight: '700',
  }
};
