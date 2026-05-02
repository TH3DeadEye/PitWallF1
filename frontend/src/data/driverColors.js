/**
 * Per-driver brand colors for the championship-progression and lap-positions
 * charts. Ideally these would be team colors keyed by (year, driver) so they
 * track team changes across seasons (e.g. NOR is McLaren orange every year,
 * VER is Red Bull blue), but for the seasons we cover the driver→team mapping
 * is stable enough that a single per-driver lookup gives the right colour.
 *
 * Defaults to a neutral grey for any code not in the map.
 *
 * Colors approximate official Pantone-ish brand colors so the chart instantly
 * reads as "Mercedes silver", "Ferrari red", "McLaren papaya", etc.
 */
export const DRIVER_COLORS = {
  // Mercedes (2014-2024)
  HAM: '#00D2BE', // Mercedes teal (career-defining)
  ROS: '#bcbcbc', // Mercedes silver (Rosberg's sub-color)
  BOT: '#9DBDDB', // Mercedes light blue
  RUS: '#0090FF', // Mercedes blue (Russell)

  // Red Bull (2014-2025)
  VER: '#3671C6', // Red Bull blue
  RIC: '#fdc500', // RB yellow (Ricciardo era)
  PER: '#dd2f7a', // Pink/magenta
  GAS: '#7d6e83',
  ALB: '#005FFF',

  // Ferrari (2014-2025)
  VET: '#DC0000', // Ferrari red
  RAI: '#9c0707', // Ferrari deep red (Raikkonen)
  LEC: '#F91536', // Ferrari bright red (Leclerc)
  SAI: '#ff8a8a', // Ferrari salmon (Sainz)

  // McLaren (2014-2025)
  ALO: '#FF8700', // McLaren papaya (legacy + Aston later)
  BUT: '#ff5e00',
  NOR: '#FF8000', // McLaren papaya (Norris)
  PIA: '#ffb35c', // McLaren lighter papaya (Piastri)

  // Williams
  MAS: '#005AFF',
  BOT_WIL: '#0082FA',

  // Force India / Racing Point / Aston Martin
  HUL: '#52E252',
  PER_FI: '#F596C8',
  STR: '#006F62',

  // Renault / Alpine
  OCO: '#0090FF',

  // Sauber / Alfa
  GIO: '#900000',

  // AlphaTauri / RB
  KVY: '#469BFF',
  TSU: '#5E8FAA',

  // Haas
  GRO: '#787878',
  MAG: '#B6BABD',
};

export const TEAM_COLORS = {
  Mercedes: '#00D2BE',
  'Red Bull': '#3671C6',
  Ferrari: '#DC0000',
  McLaren: '#FF8000',
  Williams: '#005AFF',
  'Force India': '#F596C8',
  'Racing Point': '#F596C8',
  'Aston Martin': '#006F62',
  Renault: '#FFF500',
  Alpine: '#0090FF',
  Sauber: '#900000',
  'Alfa Romeo': '#900000',
  Toro_Rosso: '#469BFF',
  AlphaTauri: '#5E8FAA',
  Haas: '#B6BABD',
};

const FALLBACK_PALETTE = [
  '#7a7a7a', '#5a5a5a', '#9a9a9a', '#4a4a4a', '#6a6a6a',
];

export function colorFor(driverCode, fallbackIndex = 0) {
  if (DRIVER_COLORS[driverCode]) return DRIVER_COLORS[driverCode];
  return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}
