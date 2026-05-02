/**
 * Per-season stat card builder.
 *
 * Used by:
 *   - StatCallouts (the big "Key findings" section)
 *   - Story / EvidenceStrip (when the user asks a question, the answer is
 *     backed by 3 compact stat badges built from this same data)
 *
 * Card shape:
 *   {
 *     id, number, unit,
 *     numberAccent: bool,  // true = red, false = white
 *     tag,                 // "VARIANCE RATIO"
 *     title,               // "CONSISTENCY GAP"
 *     body: <ReactNode>,   // narrative paragraph w/ <strong>/<em>
 *     bars: [{ label, value, ratio, accent }]
 *   }
 */

const STRONG = { color: '#fff', fontWeight: 700 };
const EM = { color: '#7a7a7a', fontStyle: 'italic' };

export function buildCards(d, summary) {
  return [
    buildVarianceCard(d, summary),
    buildExecutionCard(d, summary),
    buildPositionCard(d, summary),
  ].filter(Boolean);
}

function buildVarianceCard(d, summary) {
  const runnerName = summary.runner_up_name || d.runnerUp;
  const championName = summary.champion_name || d.champion;
  const runnerStddev = numberOr(summary.runner_up_stddev, d.stats?.stddev);
  const championStddev = numberOr(summary.champion_stddev, d.stats?.championStddev);
  const totalRounds = summary.total_rounds || 24;

  const runnerHigher = runnerStddev > championStddev;
  const lo = Math.min(runnerStddev, championStddev);
  const hi = Math.max(runnerStddev, championStddev);
  const ratio = lo > 0 ? hi / lo : 1;
  const ratioStr = ratio.toFixed(1);

  if (runnerHigher) {
    return {
      id: 'variance',
      number: ratioStr,
      unit: 'x',
      numberAccent: true,
      tag: 'Variance ratio',
      title: 'Consistency gap',
      body: (
        <>
          {lastName(runnerName)}'s finishing-position variance was{' '}
          <strong style={STRONG}>{ratioStr} times higher</strong> than the champion's — same grid,
          same {totalRounds} races. <em style={EM}>The car was not the variable.</em>
        </>
      ),
      bars: [
        {
          label: `${shortName(championName)} σ`,
          value: championStddev.toFixed(2),
          ratio: championStddev / hi,
          accent: false,
        },
        {
          label: `${shortName(runnerName)} σ`,
          value: runnerStddev.toFixed(2),
          ratio: runnerStddev / hi,
          accent: true,
        },
      ],
    };
  }

  return {
    id: 'variance-inverted',
    number: ratioStr,
    unit: 'x',
    numberAccent: true,
    tag: 'Variance inversion',
    title: 'Theorem cracked',
    body: (
      <>
        The champion's finishing-position variance was{' '}
        <strong style={STRONG}>{ratioStr} times higher</strong> than {lastName(runnerName)}'s.{' '}
        <em style={EM}>The most consistent driver lost the title.</em>
      </>
    ),
    bars: [
      {
        label: `${shortName(runnerName)} σ`,
        value: runnerStddev.toFixed(2),
        ratio: runnerStddev / hi,
        accent: false,
      },
      {
        label: `${shortName(championName)} σ`,
        value: championStddev.toFixed(2),
        ratio: championStddev / hi,
        accent: true,
      },
    ],
  };
}

function buildExecutionCard(d, summary) {
  const runnerName = summary.runner_up_name || d.runnerUp;
  const championName = summary.champion_name || d.champion;
  const before = summary.before_ppg;
  const after = summary.after_ppg;
  const leadRound = summary.lead_round;

  if (typeof before === 'number' && typeof after === 'number' && typeof leadRound === 'number') {
    const delta = after - before;
    const pct = before > 0 ? Math.round((delta / before) * 100) : 0;
    const isCollapse = delta < 0;
    const hi = Math.max(before, after);
    return {
      id: 'collapse',
      number: pct >= 0 ? `+${pct}` : `${pct}`,
      unit: '%',
      numberAccent: false,
      tag: 'Points rate',
      title: isCollapse ? 'Scoring collapse' : 'Scoring surge',
      body: (
        <>
          The round {lastName(runnerName)} took the lead, points-per-race fell from{' '}
          <strong style={STRONG}>{before.toFixed(1)}</strong> to{' '}
          <strong style={STRONG}>{after.toFixed(1)}</strong>.{' '}
          <em style={EM}>Racing became defending — and defending became losing.</em>
        </>
      ),
      bars: [
        { label: 'Before lead', value: `${before.toFixed(1)} pts`, ratio: before / hi, accent: true },
        { label: 'After lead',  value: `${after.toFixed(1)} pts`,  ratio: after / hi,  accent: false },
      ],
    };
  }

  const runnerLap = summary.runner_up_lap_stddev;
  const championLap = summary.champion_lap_stddev;
  if (typeof runnerLap === 'number' && typeof championLap === 'number') {
    const diffMs = Math.abs(runnerLap - championLap) * 1000;
    const championBetter = championLap < runnerLap;
    const hi = Math.max(runnerLap, championLap);
    const tighterName = championBetter ? championName : runnerName;
    const looserName = championBetter ? runnerName : championName;
    return {
      id: 'telemetry',
      number: diffMs.toFixed(0),
      unit: 'ms',
      numberAccent: !championBetter,
      tag: 'Telemetry gap',
      title: championBetter ? 'Lap-time advantage' : 'Telemetry inversion',
      body: (
        <>
          {lastName(tighterName)}'s intra-stint lap variance was{' '}
          <strong style={STRONG}>{diffMs.toFixed(0)} ms tighter</strong> than{' '}
          {lastName(looserName)}'s.{' '}
          <em style={EM}>
            {championBetter
              ? 'Same car, different hands.'
              : 'The data says the runner-up was the steadier driver.'}
          </em>
        </>
      ),
      bars: [
        { label: shortName(championName), value: `${championLap.toFixed(3)}s`, ratio: championLap / hi, accent: !championBetter },
        { label: shortName(runnerName),   value: `${runnerLap.toFixed(3)}s`,   ratio: runnerLap / hi,   accent: championBetter },
      ],
    };
  }

  const championPts = summary.champion_points || 0;
  const runnerPts = summary.runner_up_points || 0;
  const margin = Math.abs(summary.final_margin_points || championPts - runnerPts);
  const hi = Math.max(championPts, runnerPts);
  return {
    id: 'margin',
    number: String(Math.round(margin)),
    unit: 'pts',
    numberAccent: false,
    tag: 'Final margin',
    title: 'Championship gap',
    body: (
      <>
        {lastName(championName)} won by <strong style={STRONG}>{Math.round(margin)} points</strong>.{' '}
        {lastName(runnerName)} finished on{' '}
        <strong style={STRONG}>{Math.round(runnerPts)}</strong> against{' '}
        <strong style={STRONG}>{Math.round(championPts)}</strong>.{' '}
        <em style={EM}>The thinnest stat the standings will admit.</em>
      </>
    ),
    bars: [
      { label: shortName(championName), value: `${Math.round(championPts)} pts`, ratio: hi > 0 ? championPts / hi : 0, accent: false },
      { label: shortName(runnerName),   value: `${Math.round(runnerPts)} pts`,   ratio: hi > 0 ? runnerPts / hi : 0,   accent: true },
    ],
  };
}

function buildPositionCard(d, summary) {
  const runnerName = summary.runner_up_name || d.runnerUp;
  const championName = summary.champion_name || d.champion;
  const totalRounds = summary.total_rounds || 24;
  const runnerLed = summary.runner_up_rounds_led || 0;

  if (runnerLed >= 3) {
    const trailing = totalRounds - runnerLed;
    const pct = Math.round((runnerLed / totalRounds) * 100);
    const hi = Math.max(runnerLed, trailing);
    return {
      id: 'leadership',
      number: String(runnerLed),
      unit: `/${totalRounds}`,
      numberAccent: false,
      tag: 'Rounds led',
      title: 'Leadership without title',
      body: (
        <>
          Led the championship for{' '}
          <strong style={STRONG}>{pct}% of the season</strong> — the longest sustained lead{' '}
          {lastName(runnerName)} held all year, without converting it into the trophy.
        </>
      ),
      bars: [
        { label: 'Rounds leading',  value: String(runnerLed), ratio: runnerLed / hi, accent: true },
        { label: 'Rounds trailing', value: String(trailing),  ratio: trailing / hi,  accent: false },
      ],
    };
  }

  const runnerWins = summary.runner_up_wins || 0;
  const championWins = summary.champion_wins || 0;
  if (championWins + runnerWins >= 3) {
    const hi = Math.max(championWins, runnerWins);
    return {
      id: 'wins',
      number: String(runnerWins),
      unit: ` / ${championWins + runnerWins}`,
      numberAccent: false,
      tag: 'Race wins',
      title: 'Wins without title',
      body: (
        <>
          {lastName(runnerName)} won{' '}
          <strong style={STRONG}>{runnerWins} race{runnerWins === 1 ? '' : 's'}</strong> against{' '}
          {lastName(championName)}'s{' '}
          <strong style={STRONG}>{championWins}</strong>.{' '}
          <em style={EM}>
            {runnerWins > championWins
              ? 'More wins, no championship — the consistency penalty in raw form.'
              : 'The win column told the story before the points table did.'}
          </em>
        </>
      ),
      bars: [
        { label: shortName(championName), value: `${championWins} wins`, ratio: hi > 0 ? championWins / hi : 0, accent: false },
        { label: shortName(runnerName),   value: `${runnerWins} wins`,   ratio: hi > 0 ? runnerWins / hi : 0,   accent: true },
      ],
    };
  }

  const podiums = summary.runner_up_podiums || 0;
  const championPodiums = summary.champion_podiums || 0;
  const hi = Math.max(podiums, championPodiums) || 1;
  return {
    id: 'podiums',
    number: String(podiums),
    unit: `/${totalRounds}`,
    numberAccent: false,
    tag: 'Podiums',
    title: 'Top-three rate',
    body: (
      <>
        {lastName(runnerName)} reached the podium in{' '}
        <strong style={STRONG}>{podiums} of {totalRounds} races</strong>, against{' '}
        {lastName(championName)}'s {championPodiums}.{' '}
        <em style={EM}>Podium presence is necessary, not sufficient.</em>
      </>
    ),
    bars: [
      { label: shortName(championName), value: String(championPodiums), ratio: championPodiums / hi, accent: false },
      { label: shortName(runnerName),   value: String(podiums),         ratio: podiums / hi,         accent: true },
    ],
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

function numberOr(v, fallback) {
  return typeof v === 'number' ? v : fallback;
}
export function lastName(full) {
  if (!full) return '';
  const parts = full.split(' ');
  return parts[parts.length - 1];
}
export function shortName(full) {
  if (!full) return '';
  const parts = full.split(' ');
  return parts[parts.length - 1].slice(0, 8).toUpperCase();
}
