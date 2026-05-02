export default function QuestionInput({ seasons, season, question, onChange, onRun, isLoading }) {
  const presets = seasons[season].presetQuestions;
  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <div style={s.label}>Ask a question about {season}</div>
        <div style={s.row}>
          <div style={s.inputWrap}>
            <input
              style={s.input}
              type="text"
              value={question}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. Why did the runner-up lose despite leading?"
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && onRun()}
            />
          </div>
          <button
            style={{ ...s.btn, ...(isLoading ? s.btnLoading : {}) }}
            onClick={onRun}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span style={s.spinner} />
                Running…
              </>
            ) : (
              'Run Pipeline'
            )}
          </button>
        </div>
        <div style={s.presets}>
          {presets.map((p, i) => (
            <button
              key={i}
              style={{ ...s.chip, ...(question === p ? s.chipActive : {}) }}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '28px 40px', borderBottom: '1px solid #1c1c1c', background: '#0a0a0a' },
  inner: { maxWidth: '1200px', margin: '0 auto' },
  label: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: '12px',
  },
  row: { display: 'flex', gap: '10px', marginBottom: '12px' },
  inputWrap: { flex: 1 },
  input: {
    width: '100%',
    height: '38px',
    background: '#111',
    border: '1px solid #222',
    borderRadius: '2px',
    padding: '0 14px',
    color: '#fff',
    fontFamily: "'Barlow', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 150ms ease',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    flexShrink: 0,
    fontFamily: "'Barlow', sans-serif",
    fontWeight: 600,
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: '#e8002d',
    color: '#fff',
    border: 'none',
    borderRadius: '2px',
    padding: '0 24px',
    height: '38px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnLoading: { background: '#a80020', cursor: 'wait', opacity: 0.8 },
  spinner: {
    display: 'inline-block',
    width: '11px',
    height: '11px',
    border: '2px solid rgba(255,255,255,0.25)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  presets: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  chip: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '11px',
    letterSpacing: '0.02em',
    background: 'transparent',
    color: '#555',
    border: '1px solid #1c1c1c',
    borderRadius: '2px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  },
  chipActive: { color: '#fff', borderColor: '#333', background: '#1a1a1a' },
};
