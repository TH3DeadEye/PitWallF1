# The Consistency Theorem — UI Kit

A high-fidelity interactive mockup of the full web application.

## Design Width
1200px desktop primary. Mobile-responsive at 768px breakpoint.

## Files

| File | Purpose |
|---|---|
| `index.html` | Full interactive app mockup — loads all components |
| `Header.jsx` | App header: logotype + subtitle + Run Pipeline button |
| `Hero.jsx` | Hero lede paragraph with large editorial type |
| `Charts.jsx` | Side-by-side Chart.js bar + line charts |
| `Story.jsx` | Three-paragraph article body |
| `StatCallouts.jsx` | 3-column newspaper stat box row |
| `JsonViewer.jsx` | Collapsible raw JSON block |

## Usage

Open `index.html` in a browser. The "Run Pipeline" button triggers an animated loading sequence before revealing all content. The JSON section at the bottom is collapsed by default.

## Notes

- Charts use Chart.js 4.4 (CDN)
- Fonts from Google Fonts (Barlow Condensed, Libre Baskerville, JetBrains Mono)
- No framework dependencies — plain React via Babel standalone
- Designed to mirror a Streamlit single-page layout
