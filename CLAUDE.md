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

## Templates

| Template | Best for |
|----------|----------|
| `bento` | General purpose, 9-card asymmetric grid |
| `catalog` | "6 types of X", equal 3×2 grid |
| `stack` | "N layers of X", full-width bands |
| `editorial` | Guides with tables, workflows, tips |
| `dashboard` | Data-driven, stat row + detail grid |

## Key Files

- `src/tw/app.css` — All design tokens, components, and theme colors (single source of truth)
- `src/tw/grid-areas.css` — Grid layout definitions
- `templates/` — Layout templates
- `src/export/` — Puppeteer export, dev server, scaffolding
