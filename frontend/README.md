# The Consistency Theorem — Design System

## Overview

**The Consistency Theorem** is a data journalism web application that tells the story of why Oscar Norris lost the 2025 F1 World Championship despite having the statistically faster car. The app is built in Streamlit but this design system provides a high-fidelity HTML mockup and component library for use in design work and prototyping.

The product lives at the intersection of sports data analysis and long-form journalism — closer to a **FiveThirtyEight feature** or **The Athletic deep-dive** than a dashboard or analytics tool. The story is the product. The data serves the narrative.

### Sources

- **Design Brief**: Provided inline (no Figma, no codebase). All foundations derived from brief + editorial design direction.
- **Fonts**: Google Fonts substitutes (see ICONOGRAPHY note). Target fonts: `Libre Baskerville` (editorial body), `Barlow Condensed` (display/header), `JetBrains Mono` (data/code).
- **No external icon library used** — see ICONOGRAPHY section.

---

## CONTENT FUNDAMENTALS

### Voice & Tone

- **Publication style**: The Athletic meets FiveThirtyEight. Authoritative, unsentimental, data-backed. Not cheerleading, not hot-takes.
- **Register**: Third person for subjects ("Norris", "the championship"). First-person plural avoided. No "I".
- **Sentence structure**: Short declarative sentences for impact. Long sentences to build tension. Mix them.
- **Numbers**: Always numerically formatted (e.g. "17 races", "2.4 points per race"). Never spelled out in stat callouts.
- **Casing**: Title case for the app name only. Sentence case everywhere else — headlines, subheads, labels.
- **Emoji**: Never. Zero emoji anywhere.
- **Exclamation marks**: Never.
- **Headlines**: Hit like newspaper front pages. Blunt. Factual. Devastating when needed.
- **Lead paragraph (hero)**: Designed to stop the reader cold. Establishes the thesis in one paragraph. No fluff, no setup.

### Sample copy voice:

> "Norris led the constructors' standings for 14 consecutive rounds. He did not win the championship. The data tells you exactly why."

> "A 0.31-point standard deviation separates a champion from a nearly-man. Norris posted 0.89."

---

## VISUAL FOUNDATIONS

### Color System

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0f0f0f` | Page background |
| `--bg-surface` | `#1a1a1a` | Card / section backgrounds |
| `--bg-elevated` | `#222222` | Elevated surfaces, hovers |
| `--accent` | `#e8002d` | F1 red — CTAs, highlights, champion data |
| `--accent-dim` | `#a80020` | Pressed/hover state for accent |
| `--fg-primary` | `#ffffff` | Primary text |
| `--fg-secondary` | `#c0c0c0` | Body text, paragraphs |
| `--fg-muted` | `#888888` | Labels, captions, metadata |
| `--fg-faint` | `#444444` | Borders, dividers, runner-up chart bars |
| `--chart-champion` | `#e8002d` | Champion data series |
| `--chart-runner` | `#444444` | Runner-up data series |

### Typography

- **Display / Hero**: `Barlow Condensed`, weight 700–800, uppercase tracking. Used for app name, stat callout numbers.
- **Editorial / Body**: `Libre Baskerville`, weight 400/700. Used for all story text — the spine of the product.
- **UI / Label**: `Barlow`, weight 400–600. Used for labels, buttons, nav, captions.
- **Data / Mono**: `JetBrains Mono`, weight 400. Used for JSON, inline data references.

### Backgrounds

- Solid `#0f0f0f` base. No gradients on backgrounds.
- Subtle noise texture overlay (3% opacity) for depth on hero sections.
- Section dividers are thin `1px solid #222` rules — never heavier.
- No images, no illustrations. The data and typography carry all visual weight.

### Animation

- Entry animations: fade-in + translateY(12px) → 0, duration 400ms, `ease-out`.
- No bounce, no spring physics on UI elements.
- Chart bars animate on load: height 0 → final, 600ms, staggered 40ms per bar.
- Button hover: background darken, 150ms ease.
- Loading state steps: sequential fade-in, 600ms per step.
- No looping animations except the loading spinner.

### Hover States

- Interactive text: color shifts from `--fg-muted` → `--fg-primary`.
- Buttons: background `--accent` → `--accent-dim`. No scale.
- Cards/surfaces: background `--bg-surface` → `--bg-elevated`.
- Links in body text: underline always visible, color `--accent` on hover.

### Press States

- Buttons: slight scale(0.97) + darker background.
- No color inversion.

### Spacing System

- Base unit: `8px`.
- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.
- Section vertical padding: `96px` top/bottom.
- Content max-width: `860px` (article), `1200px` (full layout).
- Chart container: max `560px` each side-by-side, `1160px` combined.

### Corner Radii

- Buttons: `2px` — sharp, editorial, not bubbly.
- Stat cards: `0px` — flush.
- Chart containers: `0px` — data is raw.
- Code/JSON blocks: `4px`.

### Shadows

- No box shadows on cards — borders and background contrast do the work.
- Subtle `0 0 0 1px #222` border on surfaces instead.
- Text shadows: none.

### Layout

- Single-column scrolling page. No sidebar. No tabs.
- Header: `100%` width, fixed height, low visual weight.
- Hero: full-width, `min-height: 40vh`.
- Charts: side-by-side grid on desktop, stacked on mobile (`< 768px`).
- Story: centered, max-width `860px`, `margin: 0 auto`.
- Stat callouts: 3-column grid on desktop, 1-col on mobile.

### Imagery

- No photography.
- No illustrations.
- Data charts are the only visual elements beyond type.
- All visual hierarchy achieved through type size, weight, and color contrast alone.

---

## ICONOGRAPHY

No icon system is used. The design is intentionally icon-free — consistent with The Athletic's editorial approach where text carries all semantic meaning. The one exception is a minimal chevron (›) for the collapsible JSON section, rendered in Unicode (`›` / `▼`).

**Assets**: No icon fonts or SVG sprites. No external icon CDN linked.

**Logo**: The app name "The Consistency Theorem" is logotyped in `Barlow Condensed` weight 700, uppercase, with the `theorem` portion in `--accent` red. No separate logomark.

---

## FILE INDEX

```
README.md                      ← This file
SKILL.md                       ← Agent skill definition
colors_and_type.css            ← CSS custom properties: colors + typography
assets/                        ← Brand assets (fonts referenced via Google Fonts)
preview/
  colors-base.html             ← Base color palette swatches
  colors-semantic.html         ← Semantic color tokens
  type-scale.html              ← Typography scale specimen
  type-editorial.html          ← Editorial / body type specimen
  spacing-tokens.html          ← Spacing + radius tokens
  components-buttons.html      ← Button states
  components-stat-card.html    ← Stat callout card
  components-chart.html        ← Chart component example
  components-loading.html      ← Loading state steps
  components-json.html         ← Collapsible JSON block
  brand-logotype.html          ← Logotype specimen
ui_kits/
  consistency-theorem/
    README.md                  ← UI kit guide
    index.html                 ← Full app mockup (interactive)
    Header.jsx                 ← App header component
    Hero.jsx                   ← Hero paragraph component
    Charts.jsx                 ← Two-chart layout
    Story.jsx                  ← Article body component
    StatCallouts.jsx           ← Stat box row
    JsonViewer.jsx             ← Collapsible raw JSON
```
