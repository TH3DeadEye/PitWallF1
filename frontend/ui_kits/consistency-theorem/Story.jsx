// Story.jsx — Three-paragraph article body
// The Consistency Theorem Design System

const Story = ({ visible }) => {
  return (
    <section
      style={{
        ...storyStyles.section,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 600ms ease 100ms, transform 600ms ease 100ms",
      }}
    >
      <div style={storyStyles.inner}>
        <div style={storyStyles.eyebrow}>
          <span style={storyStyles.rule}></span>
          <span style={storyStyles.eyebrowText}>The story</span>
        </div>

        <p style={storyStyles.p}>
          The 2025 Formula 1 season will be remembered as the year a driver
          proved, conclusively, that mechanical advantage is not sufficient
          condition for a championship. Oscar Norris took his McLaren to the
          front of the grid in nine of the first twelve rounds. He converted
          seven of those poles to wins. By round nine, his points lead over
          second-placed Lando Verstappen stood at 47. The data, at that
          moment, pointed to an inevitable conclusion. The data was wrong —
          not in its measurement, but in what it failed to predict about the
          man holding the wheel.
        </p>

        <p style={storyStyles.p}>
          What followed constitutes a textbook study in what analysts now call
          the{" "}
          <em style={storyStyles.em}>
            consistency collapse
          </em>{" "}
          — a statistically measurable deterioration in finishing-position
          variance that correlates, across four decades of championship data,
          with drivers who begin managing a lead rather than hunting a title.
          Norris's standard deviation in finishing positions across the full
          season was{" "}
          <span style={storyStyles.datapoint}>0.89</span>. The eventual
          champion posted{" "}
          <span style={storyStyles.datapoint}>0.31</span>. That 0.58-sigma
          gap is the largest recorded between a season-long points leader and
          the eventual champion since the 2007 McLaren collapse. It does not
          implicate the car. It does not implicate the team. It implicates
          the decisions made when the championship was there to be taken.
        </p>

        <p style={storyStyles.p}>
          The points rate analysis is equally damning. In the eight races
          before Norris assumed the championship lead, he averaged{" "}
          <span style={storyStyles.datapoint}>16.2 points per round</span> —
          a pace that, sustained, would have delivered the title with three
          races to spare. In the sixteen races that followed, that rate fell
          to{" "}
          <span style={storyStyles.datapoint}>11.4</span>. No single
          mechanical failure accounts for the drop. No single qualifying
          disaster. The erosion was slow, systematic, and — viewed through
          the lens of historical championship data — entirely predictable.
          The Consistency Theorem does not judge Norris. It simply records
          what the numbers have always known: championships are not lost by
          the fastest driver. They are lost by the driver who stops racing
          and starts defending.
        </p>
      </div>
    </section>
  );
};

const storyStyles = {
  section: {
    padding: "80px 40px",
    borderBottom: "1px solid #1c1c1c",
  },
  inner: {
    maxWidth: "720px",
    margin: "0 auto",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "36px",
  },
  rule: {
    display: "block",
    width: "24px",
    height: "2px",
    background: "#e8002d",
  },
  eyebrowText: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#888",
  },
  p: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: "18px",
    lineHeight: 1.75,
    color: "#c0c0c0",
    marginBottom: "28px",
    textWrap: "pretty",
  },
  em: {
    color: "#fff",
    fontStyle: "italic",
  },
  datapoint: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "20px",
    color: "#ffffff",
    letterSpacing: "-0.01em",
  },
};

Object.assign(window, { Story });
