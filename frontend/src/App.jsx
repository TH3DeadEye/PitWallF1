import React from 'react';
import AppHeader from './components/AppHeader.jsx';
import SeasonSelector from './components/SeasonSelector.jsx';
import QuestionInput from './components/QuestionInput.jsx';
import Hero from './components/Hero.jsx';
import Charts from './components/Charts.jsx';
import ChampionshipProgressionChart from './components/ChampionshipProgressionChart.jsx';
import CircuitMap from './components/CircuitMap.jsx';
import LapPositionsChart from './components/LapPositionsChart.jsx';
import RaceLevelControls from './components/RaceLevelControls.jsx';
import StatCallouts from './components/StatCallouts.jsx';
import Story from './components/Story.jsx';
import JsonViewer from './components/JsonViewer.jsx';
import { DECIDING_RACES } from './data/decidingRaces.js';
import { SEASONS, PIPELINE_STEPS } from './data/seasons.js';
import { mergeFindings, applySummary, applyStory } from './data/merge.js';
import { showLoading } from './loadingController.js';
import { api, ApiError } from './api.js';

const DEFAULT_SEASON = 2025;

export default function App() {
  const [seasons, setSeasons] = React.useState(SEASONS);
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [question, setQuestion] = React.useState('');
  const [answeredQuestion, setAnsweredQuestion] = React.useState('');
  const [contentVisible, setContentVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [seasonLoading, setSeasonLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [backendPayload, setBackendPayload] = React.useState(null);
  const [storyMentions, setStoryMentions] = React.useState([]);
  const [storyRounds, setStoryRounds] = React.useState([]);
  const [selectedRound, setSelectedRound] = React.useState(null);
  const [selectedDrivers, setSelectedDrivers] = React.useState([]);
  const storyRef = React.useRef(null);
  const heroRef = React.useRef(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const findings = await api.getFindings().catch(() => null);
        if (mounted && findings) {
          setSeasons((prev) => mergeFindings(findings) || prev);
        }
        await loadSeasonData(DEFAULT_SEASON, mounted);
      } finally {
        if (mounted) {
          setTimeout(() => setContentVisible(true), 200);
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSeasonData(yr, mounted = true) {
    setSeasonLoading(true);
    try {
      const [summary, story] = await Promise.all([
        api.getSummary(yr).catch(() => null),
        api.getDefaultStory(yr).catch(() => null),
      ]);
      if (!mounted) return;
      if (summary) setSeasons((prev) => applySummary(prev, summary));
      if (story) {
        setSeasons((prev) => applyStory(prev, yr, story));
        setStoryMentions(story.mentioned_drivers || []);
        setStoryRounds(story.mentioned_rounds || []);
      } else {
        setStoryMentions([]);
        setStoryRounds([]);
      }
    } catch {
      /* ignore — fall back to static */
    } finally {
      if (mounted) setSeasonLoading(false);
    }
  }

  // Whenever the season or the story's mentioned rounds change, reset the
  // selected race for the per-race charts. Story-mentioned round wins; if the
  // story doesn't mention any race, fall back to the editorial deciding round.
  React.useEffect(() => {
    const fromEditorial = DECIDING_RACES[season]?.round;
    setSelectedRound(fromEditorial || null);
  }, [season]);

  function handleSeasonChange(yr) {
    if (yr === season) return;
    setSeason(yr);
    setQuestion('');
    setAnsweredQuestion('');
    setBackendPayload(null);
    setStoryMentions([]);
    setStoryRounds([]);
    setSelectedDrivers([]);
    setContentVisible(false);
    loadSeasonData(yr).finally(() => {
      setTimeout(() => setContentVisible(true), 200);
    });
  }

  async function runPipeline() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setContentVisible(false);

    const ctxText = `${season} · ${question || seasons[season].angle}`;
    const stepLabels = PIPELINE_STEPS.map((fn) => fn(season));
    const loader = showLoading(ctxText, stepLabels);

    try {
      const result = await api.runPipeline(season, question, { forceStory: true });
      if (result?.findings) setSeasons((prev) => mergeFindings(result.findings) || prev);
      if (result?.summary) setSeasons((prev) => applySummary(prev, result.summary));
      if (result?.story) {
        setSeasons((prev) => applyStory(prev, season, result.story));
        setStoryMentions(result.story.mentioned_drivers || []);
        setStoryRounds(result.story.mentioned_rounds || []);
      }
      setBackendPayload(result);
      setAnsweredQuestion(question || '');
      loader.finish();
      setTimeout(() => {
        setIsLoading(false);
        setContentVisible(true);
        // After answering a question, the user wants the answer FIRST. Scroll
        // straight to the Story (which is now rendered above the charts) so the
        // narrative paragraph is the very next thing the user sees.
        const target = (question && question.trim() ? storyRef.current : heroRef.current);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 60,
            behavior: 'smooth',
          });
        }
      }, 300);
    } catch (err) {
      loader.cancel();
      setIsLoading(false);
      setContentVisible(true);
      setError(
        err instanceof ApiError
          ? `Backend error: ${err.message}`
          : 'Backend unreachable. Showing cached results.'
      );
    }
  }

  // When a question has been answered, render Story directly under the input
  // so the answer is the first thing visible. Charts + stats follow as
  // supporting evidence underneath.
  const hasAnsweredQuestion = Boolean(answeredQuestion && answeredQuestion.trim());

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      <AppHeader />
      <SeasonSelector
        seasons={seasons}
        selected={season}
        onSelect={handleSeasonChange}
        loading={seasonLoading}
      />
      <QuestionInput
        seasons={seasons}
        season={season}
        question={question}
        onChange={setQuestion}
        onRun={runPipeline}
        isLoading={isLoading}
      />

      {error && (
        <div style={errorStyle.bar}>
          <span style={errorStyle.dot} />
          <span style={errorStyle.text}>{error}</span>
          <button style={errorStyle.dismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Hero at the very top as requested */}
      <div ref={heroRef}>
        <Hero seasons={seasons} season={season} visible={contentVisible} />
      </div>

      {/* The Story is the centerpiece — always rendered near the top, not
          buried below charts. Variant switches to 'answer-first' the moment
          the user asks a question. The chip metadata under each story tells
          the reader which drivers and races it's about, and the same data
          drives the chart highlights below. */}
      <div ref={storyRef}>
        <Story
          seasons={seasons}
          season={season}
          question={hasAnsweredQuestion ? answeredQuestion : ''}
          visible={contentVisible}
          variant={hasAnsweredQuestion ? 'answer-first' : 'default'}
          mentions={storyMentions}
          mentionedRounds={storyRounds}
        />
      </div>

      {/* Stat Callouts moved above the Charts as requested */}
      <StatCallouts seasons={seasons} season={season} visible={contentVisible} />

      <Charts seasons={seasons} season={season} visible={contentVisible} />

      <section style={raceLevel.section}>
        <div style={raceLevel.heading}>
          <div style={raceLevel.kicker}>RACE-LEVEL ANALYSIS</div>
          <div style={raceLevel.title}>Drilling into the moments that decided the season</div>
          <div style={raceLevel.sub}>
            Pick any race, compare any drivers. The chips default to whoever
            the AI's story is talking about, so the charts always reinforce
            the narrative above.
          </div>
        </div>

        <RaceLevelControls
          season={season}
          selectedRound={selectedRound}
          selectedDrivers={selectedDrivers}
          storyMentions={storyMentions}
          onRoundChange={setSelectedRound}
          onDriversChange={setSelectedDrivers}
        />

        <ChampionshipProgressionChart season={season} visible={contentVisible} />
        <CircuitMap
          season={season}
          round={selectedRound}
          drivers={null}
          visible={contentVisible}
        />
        <LapPositionsChart
          season={season}
          round={selectedRound}
          selectedDrivers={selectedDrivers}
          visible={contentVisible}
        />
      </section>

      <JsonViewer
        seasons={seasons}
        season={season}
        question={question}
        visible={contentVisible}
        payloadOverride={backendPayload}
      />
    </div>
  );
}

const raceLevel = {
  section: {
    padding: '40px 40px 0 40px',
    background: '#0f0f0f',
  },
  heading: {
    maxWidth: '720px',
    marginBottom: '8px',
  },
  kicker: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.22em',
    color: '#ff1f3d',
    fontWeight: 700,
    marginBottom: '8px',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '28px',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.15,
    marginBottom: '8px',
  },
  sub: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: '13px',
    color: '#777',
    lineHeight: 1.5,
  },
};

const errorStyle = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 40px',
    background: '#1a0a0d',
    borderBottom: '1px solid #3a0a13',
  },
  dot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#e8002d',
  },
  text: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    color: '#c0a0a0',
    letterSpacing: '0.04em',
    flex: 1,
  },
  dismiss: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 6px',
  },
};
