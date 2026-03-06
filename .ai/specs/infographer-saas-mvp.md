# Infographer SaaS — MVP Spec

Personal tool for generating LinkedIn infographics through conversation. Like Loveable, but for infographics — you describe what you want, see it instantly, then talk to refine it.

## Product

### Core loop
1. User types: "Make an infographic about control plane vs data plane"
2. AI selects layout, writes copy within content budgets, generates HTML
3. Live preview renders in a side panel (1080x1350, pixel-accurate)
4. User says: "Make the traits section bigger" / "Add an SVG diagram" / "Try dark mode"
5. AI edits the HTML, preview hot-reloads
6. User clicks Export — gets a 2x PNG

### What makes it work
- The design system (tokens, typography, card recipes) IS the system prompt
- Content budgets prevent overflow — AI knows exactly how many lines fit per card
- Template patterns (bento, stack, catalog, editorial, comparison) give structure
- SVG diagrams are a differentiator no other infographic tool has
- The conversation IS the editor — no drag and drop, no property panels

## Architecture

```
infographer/
├── frontend/                    # Next.js 16 (App Router)
│   ├── src/app/
│   │   ├── page.tsx             # Main workspace
│   │   ├── api/
│   │   │   ├── generate/route.ts    # AI generation endpoint
│   │   │   ├── refine/route.ts      # AI refinement endpoint
│   │   │   └── export/route.ts      # PNG export endpoint
│   │   └── layout.tsx
│   ├── src/components/
│   │   ├── chat-panel.tsx       # Left: conversation thread
│   │   ├── preview-panel.tsx    # Right: live infographic preview
│   │   ├── message.tsx          # Chat message bubble
│   │   ├── export-button.tsx    # Download PNG
│   │   └── theme-toggle.tsx     # Dark/light switch
│   └── src/lib/
│       ├── ai.ts                # Claude API client
│       ├── export.ts            # Puppeteer export (reuse existing)
│       └── templates.ts         # Template registry + content budgets
├── design-system/               # Extracted from current project
│   ├── app.css                  # Tokens, components, themes
│   ├── grid-areas.css
│   └── fonts/
├── prompts/                     # System prompts for AI
│   ├── system.md                # Design system rules, content budgets
│   ├── generate.md              # Initial generation instructions
│   └── refine.md                # Iterative refinement instructions
└── package.json
```

### Why this shape
- **Single Next.js app** — no separate backend needed for a personal tool
- **API routes** handle AI calls and Puppeteer export server-side
- **No database** — projects are ephemeral or saved as local HTML files
- **No auth** — personal tool, runs locally or behind Vercel password protection
- **Design system is a separate directory** — shared between the AI prompts and the preview renderer

## UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  Infographer                              [Dark] [Export] │
├────────────────────┬─────────────────────────────────────┤
│                    │                                     │
│  Chat Panel        │  Preview Panel                      │
│  (400px)           │  (flex)                             │
│                    │                                     │
│  ┌──────────────┐  │  ┌─────────────────────────────┐   │
│  │ User msg     │  │  │                             │   │
│  └──────────────┘  │  │   Live infographic          │   │
│  ┌──────────────┐  │  │   (1080x1350 scaled         │   │
│  │ AI response  │  │  │    to fit viewport)          │   │
│  │ + thumbnail  │  │  │                             │   │
│  └──────────────┘  │  │                             │   │
│  ┌──────────────┐  │  │                             │   │
│  │ User msg     │  │  │                             │   │
│  └──────────────┘  │  │                             │   │
│  ┌──────────────┐  │  │                             │   │
│  │ AI response  │  │  │                             │   │
│  │ + thumbnail  │  │  └─────────────────────────────┘   │
│  └──────────────┘  │                                     │
│                    │                                     │
│  ┌──────────────┐  │                                     │
│  │ Type here... │  │                                     │
│  └──────────────┘  │                                     │
└────────────────────┴─────────────────────────────────────┘
```

## AI Strategy

### System prompt = design system
The entire style guide, content budgets, and template reference get injected as the system prompt. This is why the current design system documentation matters — it becomes the AI's constraints.

Key sections to include:
- Typography scale (7 sizes, hard floor at 14px)
- Content budgets per card size (lines, items, pixel math)
- Card recipes (prose, ranked list, phase flow, label-body, anatomy)
- Layout templates with when-to-use guidance
- SVG diagram conventions (tokens, styling, viewBox patterns)
- The "no footer" rule and other hard constraints

### Generation flow
1. User message → classify intent (new infographic vs refinement)
2. If new: select best template, generate full HTML with inline styles
3. If refinement: receive current HTML + user instruction, return edited HTML
4. All generation uses the Anthropic SDK with streaming

### What the AI outputs
Raw HTML that follows the design system. Same format as current infographic files:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="/design-system/out.css">
  <style>/* page-specific overrides */</style>
</head>
<body>
  <div class="infographic" data-theme="dark">
    <!-- content -->
  </div>
</body>
</html>
```

### Refinement context
Each refinement call sends:
- System prompt (design system)
- Current HTML
- Conversation history
- User's new instruction

The AI returns the full updated HTML. No diffs — just the complete file. This is simpler and avoids merge issues.

## Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | Next.js 16 + Bun | User's standard stack, API routes for server-side work |
| AI | Claude API (Anthropic SDK) | Best at following design constraints, streaming support |
| Model | claude-sonnet-4-6 | Fast enough for interactive use, good at HTML/CSS |
| Preview | iframe with srcdoc | Isolated rendering, same as current dev server |
| Export | Puppeteer (existing code) | Already proven, runs in API route |
| Styling | Tailwind v4 (for app UI) + design system CSS (for infographics) | Two separate CSS contexts |
| State | React state (useState/useReducer) | No persistence needed for MVP |
| Deploy | Vercel | Zero-config for Next.js, serverless Puppeteer via @sparticuz/chromium |

## MVP Scope

### In scope
- Chat interface with message history (per session)
- AI generates infographic HTML from description
- AI refines infographic based on follow-up messages
- Live preview panel with accurate rendering
- Dark/light theme toggle for preview
- PNG export at 2x resolution
- Streaming AI responses

### Out of scope (for now)
- User accounts / auth
- Saved projects / persistence
- Template gallery browser
- Drag and drop editing
- Multiple infographics per session
- Image/logo upload
- Collaboration
- Billing

## Key Risks

1. **AI output quality** — The AI might not consistently produce overflow-free layouts. Mitigation: strong system prompt with content budgets, validate output dimensions.

2. **Puppeteer on Vercel** — Serverless Puppeteer is finicky. Mitigation: use @sparticuz/chromium for serverless, or run export locally and deploy chat-only.

3. **Latency** — Full HTML generation takes 5-15s with Claude. Mitigation: stream the response, show preview updating progressively.

4. **Context window** — Long conversations + full HTML + system prompt could hit limits. Mitigation: only send last N messages + current HTML, not full history.

## Build Order

### Phase 1: Workspace shell
- Next.js app with split-pane layout (chat + preview)
- Static preview panel rendering an existing infographic HTML
- Design system CSS served as static files
- Theme toggle working

### Phase 2: AI generation
- Anthropic SDK integration in API route
- System prompt assembled from design system docs
- Generate endpoint: user message → full HTML
- Preview updates when HTML is returned
- Streaming response in chat panel

### Phase 3: Refinement loop
- Conversation history in React state
- Refine endpoint: current HTML + message → updated HTML
- Preview hot-reloads on each AI response

### Phase 4: Export
- Port existing Puppeteer export to API route
- Export button triggers server-side render
- Returns downloadable 2x PNG

### Phase 5: Polish
- Loading states and error handling
- Responsive layout
- Keyboard shortcuts (Cmd+Enter to send, Cmd+E to export)
- Welcome screen with example prompts
