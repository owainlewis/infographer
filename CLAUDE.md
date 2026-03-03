# Infographer — AI Authoring Guide

## Project Overview

HTML/CSS infographic system for LinkedIn. Produces 1080x1350 images via design system CSS + Puppeteer export.

## Commands

```bash
bun run dev                                    # Dev server at localhost:3000
bun run export infographics/foo.html --png     # Export 2x PNG (2160x2700)
bun run export infographics/foo.html --gif     # Export animated GIF (1080x1350)
bun run export infographics/foo.html --all     # Export both
```

## Creating an Infographic

1. Pick a layout from the bank below
2. Copy the closest existing infographic from `infographics/`
3. Replace the content (titles, body text, pills, etc.)
4. Preview at `http://localhost:3000/infographics/your-file.html`
5. Export when ready

## Spacing & Grid Principles

This system follows an **8px grid** with 4px sub-grid for fine control:

- **All spacing** (margin, padding, gap) must be multiples of 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
- **Line heights** must be multiples of 4px: `16, 20, 24, 28, 32, 40, 48`
- **Font sizes** can be any value, but must pair with a 4px-grid line height
- **Card padding**: 24px (generous internal breathing room)
- **Grid gaps**: 16px between cards, 40px between major sections
- **Canvas padding**: 60px horizontal, 48px vertical
- **White space is not empty** — it creates hierarchy and draws the eye

### Typography Hierarchy (contrast is everything)

| Role | Font | Size | Weight | Creates |
|---|---|---|---|---|
| Display title | Instrument Serif | 56px | Regular | Dominant anchor |
| Column/section heading | Instrument Serif | 36px | Regular | Section identity |
| Card title | Instrument Serif | 28px | Regular | Card prominence |
| Body text | Inter | 14px | Regular | Readable content |
| Section label | Inter | 11px | Medium, uppercase | Structure cue |
| Pill/tag | Inter | 11px | Medium | Metadata |
| Index number | Inter | 13px | Medium | Sequence cue |

The **key principle**: dramatic contrast between display (56px serif) and body (14px sans). This is what makes infographics read well at LinkedIn scale.

## Layout Bank

7 proven layout types, each with a reference infographic:

### 1. Comparison (`layout-comparison`)
**File:** `control-vs-data-plane.html`
Two-column grid with optional architecture diagram. Use for X vs Y, pros/cons, before/after.
```
┌─────────────────────────────────┐
│ Title            Legend          │
│ ┌──────┐ ⬥ ┌──────┐            │  ← diagram row
│ │      │   │      │            │
│ └──────┘   └──────┘            │
│ Column A     │  Column B       │  ← comparison columns
│ • list       │  • list         │
│ • list       │  • list         │
│ [pills]      │  [pills]       │
│ Footer                         │
└─────────────────────────────────┘
```

### 2. Catalog 3×2 (`layout-catalog`)
**File:** `api-architectural-styles.html`
Card grid for comparing 4-6 similar items. Use for "N types of X", style guides, tool comparisons.
```
┌─────────────────────────────────┐
│        Title (centered)         │
│ ┌────┐ ┌────┐ ┌────┐          │
│ │ 01 │ │ 02 │ │ 03 │          │
│ └────┘ └────┘ └────┘          │
│ ┌────┐ ┌────┐ ┌────┐          │
│ │ 04 │ │ 05 │ │ 06 │          │
│ └────┘ └────┘ └────┘          │
│ Footer                         │
└─────────────────────────────────┘
```

### 3. Sandwich (`layout-sandwich`)
**File:** `api-styles-sandwich.html`
Cards split by a centered title band. Same content as catalog, different visual rhythm.
```
┌─────────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐          │
│ │ 01 │ │ 02 │ │ 03 │          │
│ └────┘ └────┘ └────┘          │
│        Title (centered)         │
│ ┌────┐ ┌────┐ ┌────┐          │
│ │ 04 │ │ 05 │ │ 06 │          │
│ └────┘ └────┘ └────┘          │
│ Footer                         │
└─────────────────────────────────┘
```

### 4. Cheat Sheet (`layout-cheatsheet-2col`)
**File:** `docker-cheatsheet.html`
Dense 2-column reference grid. Sections with command→description rows. Use for CLI references, syntax guides, shortcuts.
```
┌─────────────────────────────────┐
│ Title                           │
│ Section A      │ Section B      │
│ cmd → desc     │ cmd → desc     │
│ cmd → desc     │ cmd → desc     │
│                │                │
│ Section C      │ Section D      │
│ cmd → desc     │ cmd → desc     │
│ Footer                         │
└─────────────────────────────────┘
```

### 5. Timeline (custom CSS)
**File:** `ci-cd-pipeline.html`
Vertical spine with numbered steps. Use for processes, pipelines, "how X works" sequences.
```
┌─────────────────────────────────┐
│ Title                           │
│  ① Source ─── TRIGGER           │
│  │  description + pills         │
│  ② Build ─── COMPILE            │
│  │  description + pills         │
│  ③ Test ──── VALIDATE           │
│  │  description + pills         │
│ Footer                         │
└─────────────────────────────────┘
```

### 6. Listicle (custom CSS)
**File:** `system-design-mistakes.html`
Numbered list with large accent numbers. Use for "Top N", mistakes, tips, principles.
```
┌─────────────────────────────────┐
│ Title                           │
│ 01  Bold title                  │
│     Description text            │
│ ─────────────────────────       │
│ 02  Bold title                  │
│     Description text            │
│ ─────────────────────────       │
│ ...                             │
│ Footer                         │
└─────────────────────────────────┘
```

### 7. Flowchart (custom CSS)
**File:** `how-https-works.html`
Sequential connected nodes. Use for protocols, request flows, architecture walkthroughs.
```
┌─────────────────────────────────┐
│ Title                           │
│   (Actor A)      (Actor B)      │
│ ┌───────────────────────┐       │
│ │ 1  Step title         │       │
│ │    description        │       │
│ └───────────────────────┘       │
│           ▼                     │
│ ┌───────────────────────┐       │
│ │ 2  Step title         │       │
│ └───────────────────────┘       │
│ Footer                         │
└─────────────────────────────────┘
```

## Design System — Component Vocabulary

Every infographic HTML file links to `/src/design-system/index.css` and uses these classes:

### Root
- `.infographic` — Root container, always `id="infographic"` for export

### Header
- `.ig-header` — Title + subtitle + legend area
- `.ig-header-row` — Flex row (title left, legend right)
- `.ig-title` — Display heading (Instrument Serif, 56px)
- `.ig-title .accent` — Accent-colored word (`#c8a55a`)
- `.ig-title i` — Italic word
- `.ig-subtitle` — Muted description line
- `.ig-legend` / `.ig-legend-item` — Legend bar with color swatches

### Content
- `.ig-section-label` — Uppercase muted label (e.g., "RESPONSIBILITIES")
- `.ig-card` — Bordered content card (24px padding)
- `.ig-card-index` — Muted number ("01")
- `.ig-card-title` — Card heading (Instrument Serif, 28px)
- `.ig-card-body` — Card paragraph text
- `.ig-card-highlight` — "Best for →" accent line (wrap keyword in `<strong>`)
- `.ig-list` — Diamond-bullet list (`<ul>` + `<li>`)
- `.ig-pill` / `.ig-pills` — Tag pills in flex-wrap container
- `.ig-pill--accent` — Accent-bordered pill
- `.ig-separator` — Horizontal rule

### Footer
- `.ig-footer` — Bottom bar (brand, insight, URL)
- `.ig-footer-brand` — Left: uppercase brand name
- `.ig-footer-insight` — Center: key takeaway (`<strong>` for accent keyword)
- `.ig-footer-url` — Right: URL
- `.ig-follow` — Center: "Follow for more" CTA

### Animations
- Add `.delay-1` through `.delay-10` to cards for sequential highlight
- PNG export: static. GIF export: `.animated` class added automatically.

## Token Values — NEVER Guess

```
Backgrounds: #0a0a0a, #111111, #1a1a1a, #0f0f0f
Borders:     #1e1e1e, #2a2a2a, #3d3526
Text:        #e8e8e8, #a0a0a0, #666666, #444444
Accent:      #c8a55a
```

All values are CSS custom properties in `tokens.css`. Use `var(--token-name)` in page-specific `<style>` overrides.

## File Structure

```
infographics/          ← Authored HTML files (one per infographic)
src/design-system/     ← CSS design system (tokens, components, layouts)
src/export/            ← Puppeteer PNG/GIF export + dev server
fonts/                 ← Self-hosted WOFF2 fonts
output/                ← Generated exports (gitignored)
examples/              ← Reference PNG images
```
