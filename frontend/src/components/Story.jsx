import EvidenceStrip from './EvidenceStrip.jsx';
import { colorFor } from '../data/driverColors.js';

export default function Story({
  seasons,
  season,
  question,
  visible,
  variant,
  mentions,
  mentionedRounds,
}) {
  const d = seasons[season];
  const isAnswer = variant === 'answer-first';
  const styles = isAnswer ? answerStyles : storyStyles;
  const showMentions = mentions && mentions.length > 0;

  return (
    <section
      style={{
        ...styles.wrap,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(10px)',
        transition: 'opacity 500ms ease 100ms, transform 500ms ease 100ms',
      }}
    >
      <div style={styles.inner}>
        <div style={styles.eyebrow}>
          <span style={styles.rule} />
          <span style={styles.eyebrowText}>
            {isAnswer ? `Answer · ${season}` : `The story · ${season}`}
          </span>
          {d.storyMeta && (
            <span style={styles.modelTag}>
              {d.storyMeta.model}
              {d.storyMeta.fallback && ' · fallback'}
            </span>
          )}
        </div>
        {question && question.trim() && (
          <div style={styles.questionBanner}>
            <span style={styles.questionLabel}>You asked</span>
            <span style={styles.questionText}>{question}</span>
          </div>
        )}
        {d.story.map((para, i) => (
          <p
            key={i}
            style={{
              ...styles.p,
              ...(i < d.story.length - 1 ? { marginBottom: '24px' } : {}),
            }}
          >
            {para}
          </p>
        ))}

        {showMentions && (
          <div style={styles.metaRow}>
            <div style={styles.metaCol}>
              <div style={styles.metaLabel}>Story focuses on</div>
              <div style={styles.chipRow}>
                {mentions.slice(0, 5).map((m) => (
                  <span key={m.code} style={styles.driverChip}>
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: colorFor(m.code),
                      marginRight: '6px',
                    }} />
                    {m.name || m.code}
                  </span>
                ))}
              </div>
            </div>
            {mentionedRounds && mentionedRounds.length > 0 && (
              <div style={styles.metaCol}>
                <div style={styles.metaLabel}>Races referenced</div>
                <div style={styles.chipRow}>
                  {mentionedRounds.slice(0, 4).map((r) => (
                    <span key={r} style={styles.roundChip}>R{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isAnswer && <EvidenceStrip seasons={seasons} season={season} />}
      </div>
    </section>
  );
}

const storyStyles = {
  wrap: { padding: '72px 40px', borderBottom: '1px solid #1c1c1c' },
  inner: { maxWidth: '720px', margin: '0 auto' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' },
  rule: { display: 'block', width: '24px', height: '2px', background: '#e8002d' },
  eyebrowText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#888',
  },
  modelTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    color: '#444',
    marginLeft: 'auto',
  },
  questionBanner: {
    background: '#111',
    border: '1px solid #1c1c1c',
    borderLeft: '2px solid #e8002d',
    padding: '10px 14px',
    marginBottom: '28px',
    display: 'flex',
    gap: '10px',
    alignItems: 'baseline',
  },
  questionLabel: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#e8002d',
    flexShrink: 0,
  },
  questionText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '13px',
    color: '#888',
    fontStyle: 'italic',
  },
  p: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '17px',
    lineHeight: 1.75,
    color: '#c0c0c0',
    textWrap: 'pretty',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '32px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #1c1c1c',
  },
  metaCol: { display: 'flex', flexDirection: 'column', gap: '8px' },
  metaLabel: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#666',
  },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  driverChip: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    background: '#111',
    border: '1px solid #2a2a2a',
    padding: '5px 10px',
    letterSpacing: '0.04em',
  },
  roundChip: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px',
    fontWeight: 700,
    color: '#e8002d',
    background: '#1a0a0d',
    border: '1px solid #2a0a13',
    padding: '5px 10px',
    letterSpacing: '0.04em',
  },
};

// Answer-first variant — used right after Run Pipeline. Larger, more prominent,
// with a red top accent so the user immediately knows this is the response to
// their question.
const answerStyles = {
  ...storyStyles,
  wrap: {
    padding: '64px 40px 72px',
    borderBottom: '1px solid #1c1c1c',
    background: 'linear-gradient(180deg, #131313 0%, #0f0f0f 100%)',
    borderTop: '2px solid #e8002d',
  },
  inner: { maxWidth: '960px', margin: '0 auto' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  questionBanner: {
    background: 'transparent',
    border: '1px solid #2a0a13',
    borderLeft: '3px solid #e8002d',
    padding: '14px 18px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  questionLabel: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#e8002d',
  },
  questionText: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '17px',
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  p: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '19px',
    lineHeight: 1.75,
    color: '#dcdcdc',
    textWrap: 'pretty',
  },
};
