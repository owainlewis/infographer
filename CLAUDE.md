# Infographer — AI Authoring Guide

## Project Overview

HTML/CSS infographic system for LinkedIn. Produces 1080x1350 images via template CSS + Puppeteer export. Two themes (dark/light), 5 layout templates, locked 8px grid geometry.

## Commands

```bash
bun run dev                                    # Dev server at localhost:3000
bun run export infographics/foo.html --png     # Export 2x PNG (2160x2700)
bun run export infographics/foo.html --gif     # Export animated GIF (1080x1350)
bun run export infographics/foo.html --all     # Export both
```

## Creating an Infographic

1. Pick a template from `templates/` (bento, 3col, stack, catalog, editorial)
2. Pick a theme: `theme-dark.css` or `theme-light.css`
3. Copy the closest existing infographic from `infographics/`
4. Replace content (titles, body text, pills, cards)
5. Preview at `http://localhost:3000/infographics/your-file.html`
6. Export when ready

## Locked Geometry — DO NOT MODIFY

Every template shares this exact pixel budget on an 8px grid:

```
Canvas:    1080 × 1350px
Padding:   48px top, 48px sides, 0 bottom

VERTICAL:
  Header:    112px  (h1 56px + 8px gap + sub 24px + 24px margin)
  Grid:     1126px  (flex: 1, min-height: 0)
  Footer:     64px  (16px margin + 48px bar, flex-shrink: 0)
  Total:    48 + 112 + 1126 + 64 = 1350px

HORIZONTAL:
  Usable width: 1080 - 96 = 984px
  3 columns: 984 - 16 = 968px → ~322px each
  2 columns: 984 - 8  = 976px → 488px each
```

## Spacing & Grid Principles

8px grid with 4px sub-grid:

- **All spacing** (margin, padding, gap): multiples of 4px — `4, 8, 12, 16, 20, 24, 32, 40, 48`
- **Line heights**: multiples of 4px — `16, 18, 20, 24, 28, 32, 40, 48`
- **Card padding**: 16px
- **Grid gaps**: 8px between cards
- **Canvas padding**: 48px
- **Card border-radius**: 8px
- **White space is not empty** — it creates hierarchy

### Typography Hierarchy

Sizes proven at LinkedIn feed scale — readable at 50% zoom on a 27" monitor.

| Role | Font | Size | Line Height | Weight | Tracking |
|---|---|---|---|---|---|
| Display title | Libre Franklin | 74px | 80px | 800 | -0.03em |
| Card title | Libre Franklin | 28px | 32px | 800 | -0.02em |
| Phase title | Libre Franklin | 17px | 24px | 800 | — |
| Section label | Libre Franklin | 14px | 16px | 800 uppercase | 0.08em |
| Body text | Libre Franklin | 18px | 28px | 400 | — |
| Body secondary | Libre Franklin | 17px | 24px | 400 | — |
| Item label | Libre Franklin | 17px | 24px | 800 | — |
| Pill/tag | Libre Franklin | 13px | 16px | 700 | — |
| Badge | Libre Franklin | 14px | 16px | 700 | — |
| Footer text | Libre Franklin | 15px | 20px | 600–700 | 0.08em |
| Download count | Libre Franklin | 15px | — | 700 | — |

Fonts: **Crimson Text** (serif, display accents only) + **Libre Franklin** (sans-serif, everything else).

## Themes

Two external theme files define all colors via CSS custom properties:

- `templates/theme-dark.css` — dark canvas, light text
- `templates/theme-light.css` — light canvas, dark text, dark footer

Switch theme by changing the `<link>` tag in the HTML `<head>`:
```html
<link rel="stylesheet" href="/templates/theme-light.css">
```

### Light Theme Token Values

```
Canvas:      #eeedeb (warm grey — cards pop against this)
Card:        #ffffff (white)
Raised:      #f5f5f0 (warm stone)
Warm:        #f7efe8 (cream — subtle terracotta tint)
Accent glow: rgba(193, 95, 60, 0.12)
Footer:      #1c1917 (stone-900, dark)

Borders:     #d6d3d1, #c4bfba, #c15f3c (accent)
Text:        #1c1917, #44403c, #57534e, #a8a29e
Accent:      #b5512e (terracotta)
Shadow:      0 1px 4px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)
```

### Dark Theme Token Values

```
Canvas:      #0a0a0a
Card:        #111111
Raised:      #1a1a1a
Footer:      #111111

Borders:     #1e1e1e, #2a2a2a, #3d2520 (accent)
Text:        #e8e8e8, #a0a0a0, #666666, #444444
Accent:      #c15f3c (terracotta)
Shadow:      none
```

## Card Tint Palette — 5 Colored Backgrounds

Use `.card-tint--{name}` classes for visual variety. No two adjacent cards should share the same tint. All tints are visible on mobile but still professional.

| Class | Background | Border | Best for |
|---|---|---|---|
| `.card-tint--terracotta` | `#f5e0d4` | `#d4b8a6` | Intro cards, categories |
| `.card-tint--sage` | `#dce8de` | `#b5ccb8` | Popular items, build steps |
| `.card-tint--sky` | `#d8e4ee` | `#afc5d6` | Loading phases, partners |
| `.card-tint--sand` | `#f0e6ce` | `#d4c8a6` | Anatomy, file structures |
| `.card-tint--lavender` | `#e2dced` | `#c4b8d4` | Install paths, how-to |

Aim for 3–4 tints per infographic. Distribute colors so the grid feels varied at a glance.

## Layout Templates

5 templates in `templates/`, each with dark and light variants:

### 1. Bento (`template-bento`)
9 cards, asymmetric 3×4 grid. The signature layout.
```
┌────────────┬──────┐
│  A (2col)  │  B   │
├────────────┼──┐   │
│  C (2col)  │ D│   │
├──────┬─────┤  │   │
│  E   │  F  │ D│   │
├──────┼─────┼──┴───┤
│  G   │  H  │  I   │
└──────┴─────┴──────┘
```

### 2. Catalog (`template-catalog`)
6 equal cards, 3×2 grid. Use for "6 types of X".
```
┌──────┬──────┬──────┐
│  01  │  02  │  03  │
├──────┼──────┼──────┤
│  04  │  05  │  06  │
└──────┴──────┴──────┘
```

### 3. Three-Column (`template-3col`)
3 full-height columns. Use for X vs Y vs Z.
```
┌──────────┬──────────┬──────────┐
│  Col A   │  Col B   │  Col C   │
└──────────┴──────────┴──────────┘
```

### 4. Stack (`template-stack`)
5 full-width horizontal bands. Use for "N layers of X".
```
┌─────────────────────────────────┐
│  Band 1                         │
├─────────────────────────────────┤
│  Band 2                         │
├─────────────────────────────────┤
│  ...                            │
└─────────────────────────────────┘
```

### 5. Editorial (`template-editorial`)
Magazine-style with hero section, sidebar tips, and workflow steps.

## Component Classes

### Header
- `.hd` — Header container (centered)
- `.hd h1` — Display title (Libre Franklin, 74px, 800, -0.03em)
- `.hd h1 .accent` — Accent-colored word

### Cards
- `.card` — Base card (16px padding, 8px radius, border, shadow)
- `.card-tint--{name}` — Colored backgrounds (terracotta, sage, sky, sand, lavender)
- `.card-a` through `.card-i` — Grid area assignments (bento layout)

### Typography
- `.card-title` — Card heading (28px, 800, -0.02em)
- `.card-body` — Primary body text (18px/28px, 400). Use `<strong>` for bold scan points.
- `.section-label` — Uppercase label (14px, 800, 0.08em tracking)
- `.section-label--accent` — Terracotta-colored label

### Number Badges
Two shapes for numbered items. Always accent background + white text.

- **Circles** (`.num-circle`) — Use for sequential flows (1→2→3 phases). 36px diameter.
- **Squares** (`.num-square`) — Use for ranked lists and steps. Rounded rectangle, 6px radius.
  - `.num-square--md` — 32px (skill ranks, category items)
  - `.num-square--sm` — 28px (build steps)
- **Square icons** (`.anatomy-icon`) — Letter-based icons (Y/M/F) for file type indicators. 32px.

Rule: pick ONE shape per card. Don't mix circles and squares in the same card.

### Pills & Badges
- `.pills` — Flex-wrap container (margin-top: auto pushes to card bottom)
- `.pill` — Tag pill (13px, 700, 8px/14px padding)
- `.pill--accent` — Terracotta-bordered pill with accent glow
- `.badge` — Larger badge for partner grids (14px, 700, 8px/14px padding)
- `.badge--primary` — Bold primary badge

### Footer
- `.footer-bar` — Dark bottom bar (48px, full width)
- `.footer-brand` — Left: uppercase brand name (15px, 700)
- `.footer-cta` — Center: call to action (15px). Use `<strong>` for accent keyword
- `.footer-url` — Right: URL (15px)

### Animations
- Add `.delay-1` through `.delay-8` to cards for sequential highlight
- PNG export: static. GIF export: `.animated` class added automatically.
- Use `filter: brightness()` for card-highlight so colored tints animate naturally

## Content Tips for LinkedIn

- **Bold text creates scan points** — readers scrolling fast will catch `<strong>` keywords
- **Use `justify-content: space-between`** on flex containers to fill cards evenly
- **Always add `min-height: 0`** to `.grid` to prevent footer clipping
- **Footer must always be visible** — verify after every content change
- **Cards have `overflow: hidden`** — content that exceeds the grid row is silently clipped
- **Subtitle should be bold** (600+) — it's the first thing read after the title
- **Contrast matters for the feed** — the light theme canvas is deliberately darker (#eeedeb not white) so cards pop at LinkedIn's compressed resolution

## File Structure

```
infographics/          ← Authored HTML files (one per infographic)
templates/             ← Layout templates + theme CSS files
  ├── template-bento.html / -light.html
  ├── template-catalog.html / -light.html
  ├── template-3col.html / -light.html
  ├── template-stack.html / -light.html
  ├── template-editorial.html / -light.html
  ├── theme-dark.css
  └── theme-light.css
src/design-system/     ← Base CSS (font-face declarations)
src/export/            ← Puppeteer PNG/GIF export + dev server
fonts/                 ← Self-hosted WOFF2 fonts (Crimson Text, Libre Franklin)
output/                ← Generated exports (gitignored)
```
