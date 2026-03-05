# Infographer Style Guide

Practical rules for producing LinkedIn infographics with fewer iterations. This document encodes the patterns that cause the most rework when violated.

**Read this before creating or editing any infographic.**

---

## 0. Typography Scale — THE LAW

7 sizes, 4 tiers. Major Third (×1.25) from 18px base. **Nothing smaller than 14px — EVER.**

```
Tier       Token              Size   Line-H  @51%     Role
────────   ──────────────     ────   ──────  ─────    ─────────────────────────
Display    --text-display     74px   80px    37.7px   Hero title
Display    --text-display-sm  56px   64px    28.6px   Two-line / subtitle title
Heading    --text-h2          28px   32px    14.3px   Card title
Heading    --text-sub         22px   28px    11.2px   Subtitle, intro accent
Body       --text-body        18px   28px     9.2px   Primary body text
Body       --text-body-sm     17px   24px     8.7px   Secondary body, items
Meta       --text-meta        14px   20px     7.1px   Labels, pills, badges
```

### Rules

1. **Every font-size MUST use a `var(--text-*)` token.** Never hardcode px values for readable text.
2. **14px is the floor.** If text needs to be smaller, it doesn't belong in the design.
3. **Decorative numbers** (listicle numbers, band numbers, stat callouts) are exempt — they're visual impact, not reading text. Hardcode their size with a comment: `/* Decorative — outside scale */`
4. **The 17px/18px pair** is for body text: 18px for primary reading, 17px for dense item lists.
5. **Don't invent sizes between tiers.** If 14px is too small and 17px is too big, use 17px.

### Why these sizes

```
14 × 1.25 = 17.5 → 18 (body)
18 × 1.25 = 22.5 → 22 (subtitle)
22 × 1.25 = 27.5 → 28 (card title)
74px = anchored to canvas proportion (6.85%)
17px = half-step between meta and body for dense content
```

---

## 1. Content Budgets Per Card Size

Every card has a fixed pixel budget. Content that exceeds it clips silently (`overflow: hidden`). Content that falls short creates dead space. The math below is based on the bento grid (4 equal rows).

### The Math

```
Grid height:    1222px (canvas 1350 - header 112 - header margin 16)
4 equal rows:   1126px ÷ 4 = ~281px per row (minus 8px gaps = ~275px usable)
Card padding:   32px total (16px top + 16px bottom)
Section label:  ~26px (14px text + ~12px margin)
Usable content: ~217px per single-row card
```

### Budget Table

| Card type | Grid span | Content height | At 18px/28px body | At 17px/24px items |
|---|---|---|---|---|
| 1-col, 1-row | 1×1 (~322×275px) | ~217px | 7 lines max | 9 items max |
| 2-col, 1-row | 2×1 (~652×275px) | ~217px | 7 lines max (wider, same height) | 9 items max |
| 1-col, 2-row | 1×2 (~322×558px) | ~500px | 17 lines max | 20 items max |
| 2-col, 2-row | 2×2 (~652×558px) | ~500px | 17 lines max | 20 items max |

### Practical Limits (with section label + content + pills)

| Card size | Max content |
|---|---|
| **Small (1×1)** | Section label + 3 items with label+body, OR section label + 5 single-line items |
| **Wide (2×1)** | Section label + bold lead paragraph + 3 bullet points + pills row |
| **Tall (1×2)** | Section label + 8 ranked items (badge + name + metric per row) |
| **Large (2×2)** | Section label + card-title + 3 items with label + 2-line body each |

**Rule: if you're unsure whether content fits, count the lines. Multiply by line-height. Add padding + label. Compare to the budget.**

---

## 2. Card Content Recipes

Six proven patterns for card interiors. Pick the recipe that matches your content, don't invent new structures.

### Recipe 1: Prose Card
Best for: introductions, explanations, "what is X"
```
Section label (accent)
Bold lead sentence (18px, strong)
• Bullet point with bold keyword
• Bullet point with bold keyword
• Bullet point with bold keyword
[pills row pushed to bottom with margin-top: auto]
```
CSS: `.card-body` for all text, `.pills` at bottom. No special layout needed.

### Recipe 2: Ranked List Card
Best for: "top N", leaderboards, popular items
```
Section label (accent)
[square badge 1] Name                metric
[square badge 2] Name                metric
[square badge 3] Name                metric
...
```
CSS: `.skill-list` + `.skill-item` (grid: badge | name | metric). Use `justify-content: space-between` on the list container — items distribute evenly across the card height.

Max items: 8 in a 2-row tall card. 4 in a 1-row card.

### Recipe 3: Phase/Flow Card
Best for: sequential processes (1→2→3), "how X works"
```
Section label (accent)
[circle 1] Title — inline description
[circle 2] Title — inline description
[circle 3] Title — inline description
```
CSS: `.phase-list` + `.phase-item` (grid: circle | text). Use circles (not squares) because this represents a flow. Use `justify-content: space-between` on the list.

Max phases: 3 in a 1-row card (with inline descriptions). 5 in a 2-row card.

**Pitfall: separate title + detail lines doubles the height per item. Inline the description with the title for compact cards.**

### Recipe 4: Label-Body Card
Best for: categories, install paths, "3 types of X"
```
Section label
ACCENT LABEL
Body description line

ACCENT LABEL
Body description line

ACCENT LABEL
Body description line
```
CSS: `.install-paths` or `.cat-rows` with `justify-content: space-between`. Each item has an accent uppercase label + body text below.

Max items: 3 in a 1-row card. No number badges needed — the labels carry the hierarchy.

### Recipe 5: Split Panel Card
Best for: two related topics in one wide card (2-col span)
```
┌─────────────────┬─────────────────┐
│ Section label    │ Section label   │
│ Badge grid or    │ Big stat (52px) │
│ content          │ Body text       │
│                  │ • Bullet        │
└─────────────────┴─────────────────┘
```
CSS: `.split-panel` (grid: 1fr 1fr, 16px gap). Right half gets `.split-divider` (border-left). Each half is independently laid out.

### Recipe 6: Anatomy/Icon Card
Best for: file structures, component breakdowns, "inside X"
```
Card title (28px)
[square icon] Label (bold)
              Description line

[square icon] Label (bold)
              Description line

[square icon] Label (bold)
              Description line
```
CSS: `.anatomy-list` + `.anatomy-item` (grid: icon | text). Icons are 32px squares with a single letter. Use `justify-content: space-between` on the list.

---

## 3. Flex Distribution Rules

The #1 cause of empty space is `justify-content: space-between` on a container with too few items. The #1 cause of overflow is too many items in a fixed-height card.

### When to use `space-between`
- Container has **3+ items** that should fill the card height evenly
- The card is at least 1 row tall
- Items have enough content to look balanced when spread

### When NOT to use `space-between`
- Container has **1-2 items** — they'll float to top and bottom with a huge gap
- Items are very short (single word) — gaps will dwarf the content

### Alternative: fixed gap
```css
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;        /* Fixed gap, content clusters at top */
}
```
Use fixed gap when items are sparse and you'd rather have dead space at the bottom than between items.

### Always set `flex: 1`
Every content container inside a card should have `flex: 1` so it stretches to fill the card height. Without this, the container collapses to its content height and the card has dead space at the bottom.

```css
.my-list {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;              /* ← This is critical */
}
```

---

## 4. Number Badge Rules

Two shapes. One rule: **pick ONE shape per card.**

| Shape | Class | Use for | Sizes |
|---|---|---|---|
| Circle | `.num-circle` | Sequential flows (1→2→3) | 36px |
| Square | `.num-square--md`, `--sm` | Ranked lists, steps | 32px, 28px |

Both use: `background: var(--accent)`, `color: #fff`, `font-weight: 800`.

### When to use badges
- Ranked lists (1–8 skills) → squares
- Sequential phases (1→2→3 loading) → circles
- Build/install steps (1–4) → squares

### When NOT to use badges
- Category labels (Documents, Workflow, MCP) → use accent text labels instead
- Install paths (Personal, Project, Registry) → use accent text labels instead
- If the number doesn't add information, don't add a badge

**Rule: if stripping the numbers would lose meaning, use badges. If the items have descriptive labels that stand alone, skip the badges.**

---

## 5. Card Tint Distribution

5 tints available: terracotta, sage, sky, sand, lavender.

### Adjacency rule
No two cards sharing an edge should have the same tint. In the bento grid:

```
┌────────────┬──────┐
│  A (2col)  │  B   │   A touches B, C, D
├────────────┼──────┤   B touches A, D
│  C (2col)  │  D   │   C touches A, D, E, F
├──────┬─────┤  D   │   D touches A, B, C, E, F, G, I
│  E   │  F  │      │   E touches C, D, F, G
├──────┴─────┼──────┤   F touches C, D, E, G
│  G (2col)  │  I   │   G touches D, E, F, I
└────────────┴──────┘   I touches D, G
```

### Proven distribution (agent-skills-light)
```
A: terracotta    B: sky         (A≠B ✓)
C: sand          D: sage        (C≠A,D ✓  D≠A,B,C ✓)
E: lavender      F: terracotta  (E≠C,D,F ✓  F≠C,D,E ✓)
G: sky           I: sage        (G≠D,E,F,I ✓  I≠D,G ✓)
```

---

## 6. Pre-Export Checklist

Run through this **every time** before `bun run export`:

### Content
- [ ] Every card has a section label OR card title (never both, never neither)
- [ ] No card has more content than its budget allows (see Section 1)
- [ ] Bold keywords (`<strong>`) appear every 1-2 lines for scan points
- [ ] No paragraphs longer than 3 lines — use bullets instead

### Layout
- [ ] No card content is clipped (check narrow 1-col cards especially)
- [ ] All spacing values are multiples of 4px
- [ ] `flex: 1` is set on every content container inside a card
- [ ] `min-height: 0` is set on `.grid`

### Visual
- [ ] No two adjacent cards share the same tint color
- [ ] Number badges use the correct shape (circles for flow, squares for lists)
- [ ] Pills/badges are visible (not clipped by card overflow)
- [ ] Card tint backgrounds are clearly distinguishable (not too subtle)

### Export
- [ ] PNG exported at 2x (2160×2700)
- [ ] Text readable at 50% zoom (simulates mobile LinkedIn feed)
- [ ] Colored backgrounds distinguishable at 50% zoom

---

## 7. Common Pitfalls

### "Huge empty space in a card"
Either: (a) `space-between` on too few items, or (b) content is too short for the card height. Fix: add more content, increase text size, use fixed `gap` instead of `space-between`, or redistribute content across cards.

### "Text overflows the card"
The card has `overflow: hidden`. Content that's too tall gets clipped at the bottom. Fix: count lines against the budget table, trim content, or use smaller text for that specific card.

### "Card B always overflows"
Card B is a 1-col, 1-row card (~322×275px) — the smallest in the bento grid. With a section label, you have ~217px for content. At 17px/24px line-height, that's ~9 lines. Three phases with separate title + detail = ~12 lines. Fix: inline descriptions with titles.

### "The infographic looks flat / no color"
All cards are the same background. Fix: apply card tints from the 5-color palette. Aim for 3-4 different tints per infographic.

### "Numbers look weird"
Using circles where squares belong (or vice versa), or using badges where text labels suffice. Fix: circles = flows only, squares = ranked lists, no badges = categories/labels.
