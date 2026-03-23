# Infographer

HTML/CSS infographic system for LinkedIn. Produces 1080×1350 static PNG images (2x at 2160×2700) via Puppeteer. Tailwind CSS v4.

## Commands

```bash
bun run dev                                      # Dev server + Tailwind watch
bun run export infographics/foo.html             # Export 2x PNG
bun run new "Title" --layout bento --theme dark  # Scaffold new infographic
```

## Workflow

1. `bun run new "Your Title" --layout bento --theme dark`
2. Replace placeholder content (`<!-- REPLACE: -->` comments)
3. Preview at `localhost:3000/infographics/your-file.html`
4. Export when ready

## Hard Constraints

- Canvas is **1080×1350px with `overflow: hidden`** — no scroll. If content overflows, reduce it.
- **14px minimum font size** — nothing smaller renders well on LinkedIn mobile.
- **No footers** — never add a footer bar to infographics. The full canvas is for content.
- **No subtitles** — they end up too small to read on LinkedIn. Use one strong title instead.

## Typography Rules (Mandatory)

These sizes are standardized across all templates. **Do not use `--text-body-sm` (17px) or `--text-meta` (14px) for readable content.** Reserve 14px only for non-essential labels (badges, uppercase section markers, number indices).

| Role | Token | Size | When to use |
|------|-------|------|-------------|
| Title | `--text-display` | 74px | Default title size. One line preferred. |
| Title (long) | `--text-display-sm` | 56px | Only if title wraps badly at 74px. |
| Card heading | `--text-h2` | 28px | Card titles, column headers. |
| Body text | `--text-body` | 18px | **All readable text** — descriptions, paragraphs, list items. |
| Labels only | `--text-meta` | 14px | Uppercase labels, badges, indices. **Never for sentences.** |

**Key rule:** If a human needs to read it as a sentence, it must be `--text-body` (18px). If it's a structural label (like "WHAT IT IS" or a number badge), `--text-meta` (14px) is acceptable.

## Templates

| Template | Best for |
|----------|----------|
| `bento` | General purpose, 9-card asymmetric grid |
| `catalog` | "6 types of X", equal 3×2 grid |
| `stack` | "N layers of X", full-width bands |
| `reference` | "N things about X", 3×3 structured cards |
| `versus` | Side-by-side comparison, two columns |
| `datavis` | Diagram + three detail columns |

## Key Files

- `src/tw/app.css` — All design tokens, components, and theme colors (single source of truth)
- `src/tw/grid-areas.css` — Grid layout definitions
- `templates/` — Layout templates
- `src/export/` — Puppeteer export, dev server, scaffolding
