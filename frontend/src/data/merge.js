import { SEASONS, SEASON_YEARS } from './seasons.js';

/**
 * Merge backend findings into the static SEASONS metadata.
 * Replaces stat values + chart 1 (cross-season stddev) with real numbers.
 * Chart 2 (per-round points) is replaced separately via applySummary().
 */
export function mergeFindings(findings) {
  if (!findings) return SEASONS;

  const merged = {};
  const championRow = SEASON_YEARS.map((y) => readSeasonValue(findings, 'metric_1', y, SEASONS[y].championCode));
  const runnerRow = SEASON_YEARS.map((y) => readSeasonValue(findings, 'metric_1', y, SEASONS[y].runnerUpCode));

  for (const yr of SEASON_YEARS) {
    const base = SEASONS[yr];
    const runnerStddev = readSeasonValue(findings, 'metric_1', yr, base.runnerUpCode);
    const championStddev = readSeasonValue(findings, 'metric_1', yr, base.championCode);
    const m2Driver = readM2Driver(findings, yr, base.runnerUpCode);

    const stats = { ...base.stats };
    if (typeof runnerStddev === 'number') stats.stddev = runnerStddev;
    if (typeof championStddev === 'number') stats.championStddev = championStddev;
    if (m2Driver) {
      if (typeof m2Driver.before_ppg === 'number') stats.pointsRateBefore = m2Driver.before_ppg;
      if (typeof m2Driver.after_ppg === 'number') stats.pointsRateAfter = m2Driver.after_ppg;
    }

    const chart1 = {
      champion: championRow.map((v) => (typeof v === 'number' ? v : null)),
      runnerUp: runnerRow.map((v) => (typeof v === 'number' ? v : null)),
    };

    const leadRound = typeof m2Driver?.lead_round === 'number' ? m2Driver.lead_round : base.leadRound;

    merged[yr] = {
      ...base,
      stats,
      chart1,
      leadRound,
    };
  }
  return merged;
}

/**
 * Apply a per-season summary (real points_per_round + lead_round + ppg numbers).
 */
export function applySummary(seasons, summary) {
  if (!summary || !summary.season) return seasons;
  const yr = summary.season;
  const base = seasons[yr] || SEASONS[yr];
  if (!base) return seasons;

  const stats = { ...base.stats };
  if (typeof summary.runner_up_stddev === 'number') stats.stddev = summary.runner_up_stddev;
  if (typeof summary.champion_stddev === 'number') stats.championStddev = summary.champion_stddev;
  if (typeof summary.before_ppg === 'number') stats.pointsRateBefore = summary.before_ppg;
  if (typeof summary.after_ppg === 'number') stats.pointsRateAfter = summary.after_ppg;
  if (typeof summary.rounds_led === 'number' && summary.rounds_led > 0) stats.roundsLed = summary.rounds_led;

  let chart2 = base.chart2;
  let chart2Rounds = null;
  if (Array.isArray(summary.points_per_round) && summary.points_per_round.length > 0) {
    chart2 = summary.points_per_round.map((r) => Number(r.points) || 0);
    chart2Rounds = summary.points_per_round.map((r) => r.round);
  }

  // If lead_round is missing, mark inflection at season midpoint so chart 2
  // still has a meaningful "before / after" split.
  let leadRound = base.leadRound;
  if (typeof summary.lead_round === 'number') leadRound = summary.lead_round;
  else if (chart2.length > 0) leadRound = Math.ceil(chart2.length / 2);

  return {
    ...seasons,
    [yr]: {
      ...base,
      stats,
      chart2,
      chart2Rounds,
      leadRound,
      summary,
    },
  };
}

/**
 * Apply per-season story override (from backend narrator).
 */
export function applyStory(seasons, season, story) {
  if (!story) return seasons;
  const para = Array.isArray(story) ? story : story.paragraphs || splitParagraphs(story);
  if (!para || !para.length) return seasons;
  return {
    ...seasons,
    [season]: { ...seasons[season], story: para, storyMeta: typeof story === 'object' ? story : null },
  };
}

function readSeasonValue(findings, metric, year, driverCode) {
  if (!driverCode) return null;
  const seasons = findings?.[metric]?.seasons || {};
  const sub = seasons[year] || seasons[String(year)];
  if (!sub) return null;
  const val = sub[driverCode];
  return typeof val === 'number' ? val : null;
}

function readM2Driver(findings, year, driverCode) {
  if (!driverCode) return null;
  const seasons = findings?.metric_2?.seasons || {};
  const sub = seasons[year] || seasons[String(year)];
  return sub?.[driverCode] || null;
}

function splitParagraphs(text) {
  if (typeof text !== 'string') return null;
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
