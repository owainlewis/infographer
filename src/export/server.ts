import { watch } from "fs";
import { resolve, join, extname } from "path";
import { readdir } from "fs/promises";
import { exportPng } from "./png";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const PORT = 3000;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

// Track connected WebSocket clients for live reload
const clients = new Set<any>();

// Inject live-reload script into HTML
function injectLiveReload(html: string): string {
  const script = `
<script>
(function() {
  const ws = new WebSocket('ws://' + location.host + '/__reload');
  ws.onmessage = function(e) {
    if (e.data === 'reload') location.reload();
  };
  ws.onclose = function() {
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>`;
  return html.replace("</body>", `${script}\n</body>`);
}

// ── Data helpers ─────────────────────────────────────────────

const LAYOUT_INFO: Record<string, { name: string; desc: string; grid: string }> = {
  bento:     { name: "Bento",      desc: "9 cards, asymmetric 3\u00d74 grid",    grid: "3\u00d74" },
  catalog:   { name: "Catalog",    desc: "6 equal cards, 3\u00d72 grid",         grid: "3\u00d72" },
  stack:     { name: "Stack",      desc: "5 full-width horizontal bands",    grid: "1\u00d75" },
};

async function getInfographicFiles(): Promise<string[]> {
  try {
    const entries = await readdir(join(PROJECT_ROOT, "infographics"));
    return entries.filter((f) => f.endsWith(".html")).sort();
  } catch {
    return [];
  }
}

async function getTemplateFiles(): Promise<{ layout: string; file: string }[]> {
  try {
    const entries = await readdir(join(PROJECT_ROOT, "templates"));
    return entries
      .filter((f) => f.startsWith("template-") && f.endsWith(".html"))
      .sort()
      .map((f) => ({
        layout: f.replace("template-", "").replace(".html", ""),
        file: f,
      }));
  } catch {
    return [];
  }
}

// ── SVG icons ────────────────────────────────────────────────

const SVG_HOME = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const SVG_GRID = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
const SVG_LAYOUT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`;
const SVG_SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const SVG_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

// ── Shared shell ─────────────────────────────────────────────

function shell(activePage: string, title: string, content: string, counts: { infographics: number; templates: number }, subtitle?: string): string {
  const nav = [
    { id: "home",          href: "/",              label: "Home",          icon: SVG_HOME },
    { id: "infographics",  href: "/infographics",  label: "Infographics",  icon: SVG_GRID, count: counts.infographics },
    { id: "templates",     href: "/templates",     label: "Templates",     icon: SVG_LAYOUT, count: counts.templates },
  ];

  const navItems = nav.map((n) => {
    const active = n.id === activePage ? " active" : "";
    const badge = n.count != null ? `<span class="nav-count">${n.count}</span>` : "";
    return `<a class="nav-item${active}" href="${n.href}">${n.icon}<span class="nav-label">${n.label}</span>${badge}</a>`;
  }).join("\n          ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — Infographer</title>
  <script>
    // Apply saved mode before paint to prevent flash
    (function() {
      var mode = localStorage.getItem('ig-mode') || 'light';
      document.documentElement.setAttribute('data-mode', mode);
    })();
  </script>
  <style>
    @font-face {
      font-family: 'Instrument Serif';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/instrument-serif-regular.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Instrument Serif';
      font-style: italic;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/instrument-serif-italic.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Libre Franklin';
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url('/fonts/libre-franklin-latin.woff2') format('woff2');
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sidebar-w: 260px;
      --font-display: 'Instrument Serif', Georgia, serif;
      --font-ui: 'Libre Franklin', -apple-system, BlinkMacSystemFont, sans-serif;
      --radius: 12px;
      --radius-sm: 8px;
      --radius-xs: 6px;
      --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      --transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── LIGHT MODE (default) ────────────────────── */
    [data-mode="light"] {
      --bg-app: #F5F4F1;
      --bg-sidebar: #FFFFFF;
      --bg-card: #FFFFFF;
      --bg-surface: #EDECEA;
      --bg-surface-hover: #E4E2DE;
      --bg-thumb: linear-gradient(135deg, #EDECEA 0%, #E4E2DE 100%);

      --border: #D8D5CE;
      --border-hover: #C4C0B8;
      --border-subtle: #E8E5DF;

      --text-primary: #151413;
      --text-secondary: #44413A;
      --text-muted: #7A766D;
      --text-faint: #ABA79E;

      --accent: #4338CA;
      --accent-hover: #3730A3;
      --accent-soft: rgba(67, 56, 202, 0.07);
      --accent-medium: rgba(67, 56, 202, 0.14);

      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05);
      --shadow-xl: 0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.07);

      --toggle-bg: var(--bg-surface);
      --toggle-active-bg: #FFFFFF;
      --toggle-active-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* ── DARK MODE ───────────────────────────────── */
    [data-mode="dark"] {
      --bg-app: #0C0C0F;
      --bg-sidebar: #111114;
      --bg-card: rgba(255,255,255,0.04);
      --bg-surface: rgba(255,255,255,0.06);
      --bg-surface-hover: rgba(255,255,255,0.09);
      --bg-thumb: linear-gradient(135deg, #16161A 0%, #111114 100%);

      --border: rgba(255,255,255,0.10);
      --border-hover: rgba(255,255,255,0.16);
      --border-subtle: rgba(255,255,255,0.06);

      --text-primary: #F0EFE9;
      --text-secondary: #B0ADA5;
      --text-muted: #706D65;
      --text-faint: #4A4842;

      --accent: #818CF8;
      --accent-hover: #A5B4FC;
      --accent-soft: rgba(129, 140, 248, 0.10);
      --accent-medium: rgba(129, 140, 248, 0.18);

      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow-md: 0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
      --shadow-xl: 0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);

      --toggle-bg: rgba(255,255,255,0.06);
      --toggle-active-bg: rgba(255,255,255,0.12);
      --toggle-active-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    body {
      font-family: var(--font-ui);
      background: var(--bg-app);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ── Sidebar ─────────────────────────────────── */
    .sidebar {
      width: var(--sidebar-w);
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      z-index: 50;
    }

    .sidebar-brand {
      padding: 32px 28px 28px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .sidebar-brand h1 {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 400;
      font-style: italic;
      letter-spacing: 0.01em;
      color: var(--text-primary);
      line-height: 1;
    }
    .sidebar-brand p {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .sidebar-nav {
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 500;
      transition: all var(--transition);
    }
    .nav-item:hover {
      background: var(--bg-surface);
      color: var(--text-secondary);
    }
    .nav-item.active {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .nav-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.4;
      transition: opacity var(--transition);
    }
    .nav-item:hover svg { opacity: 0.7; }
    .nav-item.active svg { opacity: 1; }
    .nav-label { flex: 1; }
    .nav-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-surface);
      padding: 2px 8px;
      border-radius: 100px;
      min-width: 24px;
      text-align: center;
    }
    .nav-item.active .nav-count {
      color: var(--accent);
      background: var(--accent-medium);
    }

    /* ── Mode toggle ─────────────────────────────── */
    .mode-toggle {
      display: flex;
      gap: 2px;
      padding: 3px;
      background: var(--toggle-bg);
      border-radius: 10px;
      margin: 0 14px 8px;
    }
    .mode-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      font-family: var(--font-ui);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
    }
    .mode-btn:hover {
      color: var(--text-secondary);
    }
    .mode-btn.active {
      background: var(--toggle-active-bg);
      color: var(--text-primary);
      box-shadow: var(--toggle-active-shadow);
    }
    .mode-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 16px 28px 20px;
      border-top: 1px solid var(--border-subtle);
    }
    .sidebar-cmd {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.7;
    }
    .sidebar-cmd code {
      font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 11px;
    }

    /* ── Main content ────────────────────────────── */
    .main {
      margin-left: var(--sidebar-w);
      flex: 1;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      padding: 48px 56px 0;
    }
    .page-title {
      font-family: var(--font-display);
      font-size: 36px;
      font-weight: 400;
      letter-spacing: 0.01em;
      color: var(--text-primary);
      line-height: 1.1;
    }
    .page-subtitle {
      font-size: 15px;
      color: var(--text-muted);
      margin-top: 6px;
      line-height: 1.5;
    }

    .page-content {
      padding: 32px 56px 56px;
      flex: 1;
    }

    /* ── Card grid (infographics + templates) ────── */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: all var(--transition-slow);
      box-shadow: var(--shadow-sm);
    }
    .card:hover {
      border-color: var(--border-hover);
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
    }
    .card:hover .card-label { color: var(--text-primary); }

    .thumb-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1080 / 1350;
      overflow: hidden;
      background: var(--bg-thumb);
    }
    .thumb-wrap iframe {
      position: absolute;
      top: 0; left: 0;
      width: 1080px;
      height: 1350px;
      transform-origin: 0 0;
      border: none;
      pointer-events: none;
    }

    .card-label {
      padding: 14px 18px;
      font-size: 14px;
      font-weight: 500;
      text-transform: capitalize;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-subtle);
      transition: color var(--transition);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Template cards ──────────────────────────── */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 24px;
    }

    .tpl-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      transition: all var(--transition);
      box-shadow: var(--shadow-sm);
    }
    .tpl-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-md);
    }

    .tpl-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .tpl-name {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 400;
      color: var(--text-primary);
    }
    .tpl-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 4px 12px;
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid var(--accent-medium);
    }
    .tpl-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .tpl-variants {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .tpl-thumb {
      display: block;
      text-decoration: none;
      color: inherit;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
      transition: all var(--transition);
      box-shadow: var(--shadow-sm);
    }
    .tpl-thumb:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
    }
    .tpl-thumb .thumb-wrap { aspect-ratio: 1080 / 1350; }
    .tpl-variant-label {
      display: block;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-top: 1px solid var(--border-subtle);
    }

    /* ── Home page ───────────────────────────────── */
    .home-hero {
      margin-bottom: 40px;
    }

    .home-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 28px;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition);
    }
    .stat-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--border-hover);
    }
    .stat-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .stat-value {
      font-family: var(--font-display);
      font-size: 48px;
      font-weight: 400;
      letter-spacing: 0.01em;
      color: var(--text-primary);
      line-height: 1;
    }
    .stat-value span { color: var(--accent); }

    .home-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 20px;
    }

    .recent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .quick-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 40px;
    }
    .quick-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-family: var(--font-ui);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all var(--transition);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
    }
    .quick-btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
      box-shadow: var(--shadow-md);
    }
    .quick-btn--accent {
      border-color: var(--accent);
      color: #fff;
      background: var(--accent);
      box-shadow: 0 2px 8px rgba(67, 56, 202, 0.25);
    }
    .quick-btn--accent:hover {
      background: var(--accent-hover);
      box-shadow: 0 4px 16px rgba(67, 56, 202, 0.30);
    }

    /* ── Empty state ─────────────────────────────── */
    .empty {
      color: var(--text-muted);
      font-size: 15px;
      padding: 80px 0;
      text-align: center;
      grid-column: 1 / -1;
      line-height: 1.6;
    }
    .empty code {
      font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
      font-size: 13px;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 3px 8px;
      border-radius: 5px;
    }

    /* ── Page enter animation ─────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .page-header {
      animation: fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    .page-content {
      animation: fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.06s both;
    }
    .card, .stat-card, .tpl-card, .quick-btn {
      animation: fadeUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    .card:nth-child(1), .stat-card:nth-child(1) { animation-delay: 0.08s; }
    .card:nth-child(2), .stat-card:nth-child(2) { animation-delay: 0.12s; }
    .card:nth-child(3), .stat-card:nth-child(3) { animation-delay: 0.16s; }
    .card:nth-child(4) { animation-delay: 0.20s; }
    .card:nth-child(5) { animation-delay: 0.24s; }
    .card:nth-child(6) { animation-delay: 0.28s; }
    .card:nth-child(7) { animation-delay: 0.32s; }
    .card:nth-child(8) { animation-delay: 0.36s; }

    /* ── Iframe scaler ───────────────────────────── */
    script { display: none; }
  </style>
  <script>
    function scaleIframes() {
      document.querySelectorAll('.thumb-wrap').forEach(function(wrap) {
        var iframe = wrap.querySelector('iframe');
        if (!iframe) return;
        var scale = wrap.clientWidth / 1080;
        iframe.style.transform = 'scale(' + scale + ')';
      });
    }
    window.addEventListener('load', scaleIframes);
    window.addEventListener('resize', scaleIframes);

    // Set infographic iframe themes to match current mode
    function syncIframeThemes() {
      var mode = document.documentElement.getAttribute('data-mode') || 'light';
      document.querySelectorAll('.thumb-wrap iframe').forEach(function(iframe) {
        try {
          var ig = iframe.contentDocument.querySelector('.infographic');
          if (ig) ig.setAttribute('data-theme', mode);
        } catch(e) {}
      });
    }

    // Sync after each iframe loads
    window.addEventListener('load', function() {
      syncIframeThemes();
      document.querySelectorAll('.thumb-wrap iframe').forEach(function(iframe) {
        iframe.addEventListener('load', syncIframeThemes);
      });
    });

    function setMode(mode) {
      document.documentElement.setAttribute('data-mode', mode);
      localStorage.setItem('ig-mode', mode);

      // Update toggle buttons
      document.querySelectorAll('.mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });

      // Switch all infographic iframes to matching theme
      syncIframeThemes();
    }
  </script>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <h1>Infographer</h1>
      <p>Design Studio</p>
    </div>
    <nav class="sidebar-nav">
      ${navItems}
    </nav>
    <div class="mode-toggle">
      <button class="mode-btn" data-mode="light" onclick="setMode('light')">${SVG_SUN} Light</button>
      <button class="mode-btn" data-mode="dark" onclick="setMode('dark')">${SVG_MOON} Dark</button>
    </div>
    <div class="sidebar-footer">
      <div class="sidebar-cmd">
        Create new:<br>
        <code>bun run new "Title"</code>
      </div>
    </div>
  </aside>
  <main class="main">
    <div class="page-header">
      <h2 class="page-title">${title}</h2>
      ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
    </div>
    <div class="page-content">
      ${content}
    </div>
  </main>
  <script>
    // Activate correct toggle button on load
    (function() {
      var mode = document.documentElement.getAttribute('data-mode') || 'light';
      document.querySelectorAll('.mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    })();
  </script>
</body>
</html>`;
}

// ── Page builders ────────────────────────────────────────────

async function buildHomePage(): Promise<string> {
  const files = await getInfographicFiles();
  const templates = await getTemplateFiles();
  const counts = { infographics: files.length, templates: templates.length };

  const recentFiles = files.slice(-6).reverse();
  const recentCards = recentFiles.map((f) => {
    const name = f.replace(".html", "").replace(/-/g, " ");
    return `<a class="card" href="/preview/${f}">
        <div class="thumb-wrap"><iframe src="/infographics/${f}" loading="lazy" scrolling="no" tabindex="-1"></iframe></div>
        <div class="card-label">${name}</div>
      </a>`;
  }).join("\n");

  const content = `
    <div class="home-hero">
      <div class="quick-actions">
        <a class="quick-btn quick-btn--accent" href="/infographics">Browse Infographics</a>
        <a class="quick-btn" href="/templates">Choose a Template</a>
      </div>
    </div>
    <div class="home-grid">
      <div class="stat-card">
        <div class="stat-label">Infographics</div>
        <div class="stat-value">${files.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Layouts</div>
        <div class="stat-value">${Object.keys(LAYOUT_INFO).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Themes</div>
        <div class="stat-value">2</div>
      </div>
    </div>
    ${recentFiles.length > 0 ? `
    <div class="home-section-title">Recent</div>
    <div class="recent-grid">${recentCards}</div>
    ` : ""}`;

  return shell("home", "Welcome back", content, counts, "Your infographic workspace");
}

async function buildInfographicsPage(): Promise<string> {
  const files = await getInfographicFiles();
  const templates = await getTemplateFiles();
  const counts = { infographics: files.length, templates: templates.length };

  const cards = files.map((f) => {
    const name = f.replace(".html", "").replace(/-/g, " ");
    return `<a class="card" href="/preview/${f}">
        <div class="thumb-wrap"><iframe src="/infographics/${f}" loading="lazy" scrolling="no" tabindex="-1"></iframe></div>
        <div class="card-label">${name}</div>
      </a>`;
  }).join("\n");

  const content = `
    <div class="card-grid">
      ${files.length > 0 ? cards : '<div class="empty">No infographics yet.<br>Run <code>bun run new "Your Title"</code> to create one.</div>'}
    </div>`;

  return shell("infographics", "Infographics", content, counts, `${files.length} designs in your collection`);
}

async function buildTemplatesPage(): Promise<string> {
  const files = await getInfographicFiles();
  const templates = await getTemplateFiles();
  const counts = { infographics: files.length, templates: templates.length };

  const templateCards = templates.map(({ layout, file }) => {
    const info = LAYOUT_INFO[layout] || { name: layout, desc: "", grid: "" };
    return `
      <div class="tpl-card">
        <div class="tpl-header">
          <span class="tpl-name">${info.name}</span>
          <span class="tpl-badge">${info.grid}</span>
        </div>
        <p class="tpl-desc">${info.desc}</p>
        <a class="tpl-thumb" href="/preview-template/${file}">
          <div class="thumb-wrap"><iframe src="/templates/${file}" loading="lazy" scrolling="no" tabindex="-1"></iframe></div>
        </a>
      </div>`;
  }).join("\n");

  const content = `
    <div class="template-grid">${templateCards}</div>`;

  return shell("templates", "Templates", content, counts, "Starting points for your next infographic");
}

// ── Preview page (standalone, no sidebar) ────────────────────

function generatePreview(filename: string, dir: string = "infographics"): string {
  const backHref = dir === "templates" ? "/templates" : "/infographics";
  const backLabel = dir === "templates" ? "Templates" : "Infographics";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${filename.replace(".html", "").replace(/-/g, " ")} \u2014 Preview</title>
  <script>
    (function() {
      var mode = localStorage.getItem('ig-mode') || 'light';
      document.documentElement.setAttribute('data-mode', mode);
    })();
  </script>
  <style>
    @font-face {
      font-family: 'Libre Franklin';
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url('/fonts/libre-franklin-latin.woff2') format('woff2');
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    [data-mode="light"] {
      --preview-bg: #EDECEA;
      --preview-check: #E4E2DE;
      --toolbar-bg: rgba(255,255,255,0.88);
      --toolbar-border: #D8D5CE;
      --text-primary: #151413;
      --text-secondary: #44413A;
      --text-muted: #7A766D;
      --text-faint: #ABA79E;
      --control-bg: #EDECEA;
      --control-border: #D8D5CE;
      --control-active-bg: #FFFFFF;
      --control-active-shadow: 0 1px 3px rgba(0,0,0,0.1);
      --accent: #4338CA;
      --accent-hover: #3730A3;
      --divider-color: #D8D5CE;
      --iframe-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.12), 0 24px 64px rgba(0,0,0,0.08);
    }
    [data-mode="dark"] {
      --preview-bg: #0C0C0F;
      --preview-check: #16161A;
      --toolbar-bg: rgba(17,17,20,0.88);
      --toolbar-border: rgba(255,255,255,0.08);
      --text-primary: #F0EFE9;
      --text-secondary: #B0ADA5;
      --text-muted: #706D65;
      --text-faint: #4A4842;
      --control-bg: rgba(255,255,255,0.06);
      --control-border: rgba(255,255,255,0.08);
      --control-active-bg: rgba(255,255,255,0.12);
      --control-active-shadow: 0 1px 3px rgba(0,0,0,0.4);
      --accent: #818CF8;
      --accent-hover: #A5B4FC;
      --divider-color: rgba(255,255,255,0.08);
      --iframe-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.4);
    }

    body {
      font-family: 'Libre Franklin', -apple-system, sans-serif;
      background: var(--preview-bg);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; height: 52px;
      background: var(--toolbar-bg);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid var(--toolbar-border);
      flex-shrink: 0;
    }
    .toolbar-left { display: flex; align-items: center; gap: 14px; }
    .back {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500;
      transition: color 0.2s;
    }
    .back:hover { color: var(--text-primary); }
    .back svg { width: 14px; height: 14px; }
    .divider { width: 1px; height: 18px; background: var(--divider-color); }
    .filename {
      font-size: 13px; font-weight: 500; color: var(--text-muted);
      font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
    }
    .toolbar-center { display: flex; align-items: center; gap: 14px; }
    .zoom-controls, .theme-toggle {
      display: flex; gap: 2px;
      background: var(--control-bg);
      border-radius: 10px; padding: 3px;
      border: 1px solid var(--control-border);
    }
    .zoom-btn, .theme-btn {
      padding: 5px 14px; border: none; border-radius: 8px;
      background: transparent; color: var(--text-muted); font-family: inherit;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .zoom-btn:hover, .theme-btn:hover { color: var(--text-secondary); }
    .zoom-btn.active, .theme-btn.active {
      color: var(--text-primary);
      background: var(--control-active-bg);
      box-shadow: var(--control-active-shadow);
    }
    .theme-btn svg { width: 13px; height: 13px; vertical-align: -2px; margin-right: 4px; }
    .toolbar-right { display: flex; align-items: center; gap: 14px; }
    .raw-link {
      font-size: 13px; color: var(--text-muted); text-decoration: none; font-weight: 500;
      transition: color 0.2s;
    }
    .raw-link:hover { color: var(--text-secondary); }
    .download-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 18px; border-radius: 10px; border: none;
      background: var(--accent); color: #fff;
      font-family: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; text-decoration: none;
      box-shadow: 0 2px 8px rgba(67, 56, 202, 0.25);
    }
    .download-btn:hover {
      background: var(--accent-hover);
      box-shadow: 0 4px 16px rgba(67, 56, 202, 0.30);
    }
    .download-btn.loading { opacity: 0.5; pointer-events: none; }
    .download-btn svg { width: 14px; height: 14px; }
    .preview-area {
      flex: 1; display: flex; align-items: flex-start; justify-content: center;
      padding: 40px; overflow: auto;
      user-select: none;
      cursor: default;
      background-image:
        linear-gradient(45deg, var(--preview-check) 25%, transparent 25%),
        linear-gradient(-45deg, var(--preview-check) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--preview-check) 75%),
        linear-gradient(-45deg, transparent 75%, var(--preview-check) 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
      background-color: var(--preview-bg);
    }
    .iframe-wrap {
      transform-origin: top center;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
      animation: previewIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    @keyframes previewIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .iframe-wrap iframe {
      width: 1080px; height: 1350px; border: none; display: block;
      border-radius: 12px;
      box-shadow: var(--iframe-shadow);
      overflow: hidden;
      pointer-events: none;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-left">
      <a class="back" href="${backHref}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        ${backLabel}
      </a>
      <span class="divider"></span>
      <span class="filename">${filename}</span>
    </div>
    <div class="toolbar-center">
      <div class="theme-toggle">
        <button class="theme-btn" data-theme="dark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Dark</button>
        <button class="theme-btn" data-theme="light"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light</button>
      </div>
      <div class="zoom-controls">
        <button class="zoom-btn" data-zoom="0.5">50%</button>
        <button class="zoom-btn" data-zoom="0.75">75%</button>
        <button class="zoom-btn" data-zoom="1">100%</button>
        <button class="zoom-btn active" data-zoom="fit">Fit</button>
      </div>
    </div>
    <div class="toolbar-right">
      ${dir === "infographics" ? `<a class="download-btn" id="downloadBtn" href="/export/${filename}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export PNG
      </a>` : ""}
      <a class="raw-link" href="/${dir}/${filename}" target="_blank">Open raw &#8594;</a>
    </div>
  </div>
  <div class="preview-area">
    <div class="iframe-wrap">
      <iframe src="/${dir}/${filename}" scrolling="no"></iframe>
    </div>
  </div>
  <script>
  (function() {
    var ws = new WebSocket('ws://' + location.host + '/__reload');
    ws.onmessage = function(e) {
      if (e.data === 'reload') {
        var iframe = document.querySelector('iframe');
        if (iframe) iframe.src = iframe.src;
      }
    };
    ws.onclose = function() { setTimeout(function() { location.reload(); }, 1000); };

    var wrap = document.querySelector('.iframe-wrap');
    var area = document.querySelector('.preview-area');
    var btns = document.querySelectorAll('.zoom-btn');

    function setZoom(zoom) {
      btns.forEach(function(b) { b.classList.remove('active'); });
      if (zoom === 'fit') {
        var areaW = area.clientWidth - 80;
        var areaH = area.clientHeight - 80;
        zoom = Math.min(areaW / 1080, areaH / 1350, 1);
        document.querySelector('[data-zoom="fit"]').classList.add('active');
      } else {
        var btn = document.querySelector('[data-zoom="' + zoom + '"]');
        if (btn) btn.classList.add('active');
      }
      wrap.style.transform = 'scale(' + zoom + ')';
    }

    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var z = btn.dataset.zoom;
        setZoom(z === 'fit' ? 'fit' : parseFloat(z));
      });
    });

    setZoom('fit');
    window.addEventListener('resize', function() {
      if (document.querySelector('[data-zoom="fit"]').classList.contains('active')) setZoom('fit');
    });

    // Theme toggle — controls the infographic theme inside the iframe
    var themeBtns = document.querySelectorAll('.theme-btn');
    var iframe = document.querySelector('iframe');
    var dlBtn = document.getElementById('downloadBtn');

    function getInfographicTheme() {
      try {
        var ig = iframe.contentDocument.querySelector('.infographic');
        return ig ? ig.getAttribute('data-theme') || 'dark' : 'dark';
      } catch(e) { return 'dark'; }
    }

    function syncThemeButtons() {
      var current = getInfographicTheme();
      themeBtns.forEach(function(b) {
        b.classList.toggle('active', b.dataset.theme === current);
      });
    }

    function updateDownloadTheme(theme) {
      if (dlBtn) {
        dlBtn.href = '/export/${filename}?theme=' + theme;
      }
    }

    // On iframe load, set infographic theme to match the app mode
    iframe.addEventListener('load', function() {
      var appMode = document.documentElement.getAttribute('data-mode') || 'light';
      try {
        var ig = iframe.contentDocument.querySelector('.infographic');
        if (ig) ig.setAttribute('data-theme', appMode);
      } catch(e) {}
      syncThemeButtons();
      updateDownloadTheme(getInfographicTheme());
    });

    themeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var theme = btn.dataset.theme;
        try {
          var ig = iframe.contentDocument.querySelector('.infographic');
          if (ig) ig.setAttribute('data-theme', theme);
        } catch(e) {}
        themeBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateDownloadTheme(theme);

        // Also switch the preview page shell to match
        document.documentElement.setAttribute('data-mode', theme);
        localStorage.setItem('ig-mode', theme);
      });
    });

    if (dlBtn) {
      dlBtn.addEventListener('click', function(e) {
        dlBtn.classList.add('loading');
        dlBtn.textContent = 'Exporting\u2026';
        setTimeout(function() {
          dlBtn.classList.remove('loading');
          dlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export PNG';
        }, 8000);
      });
    }
  })();
  </script>
</body>
</html>`;
}

// ── Server ───────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // WebSocket upgrade for live reload
    if (pathname === "/__reload") {
      const upgraded = server.upgrade(req);
      if (!upgraded) return new Response("WebSocket upgrade failed", { status: 400 });
      return undefined as any;
    }

    // ── App pages ──────────────────────────────────
    if (pathname === "/" || pathname === "/index.html") {
      const html = await buildHomePage();
      return new Response(injectLiveReload(html), { headers: { "Content-Type": "text/html" } });
    }

    if (pathname === "/infographics") {
      const html = await buildInfographicsPage();
      return new Response(injectLiveReload(html), { headers: { "Content-Type": "text/html" } });
    }

    if (pathname === "/templates") {
      const html = await buildTemplatesPage();
      return new Response(injectLiveReload(html), { headers: { "Content-Type": "text/html" } });
    }

    // ── Preview routes ─────────────────────────────
    const previewMatch = pathname.match(/^\/preview\/(.+\.html)$/);
    if (previewMatch) {
      const filename = previewMatch[1];
      const filePath = join(PROJECT_ROOT, "infographics", filename);
      if (await Bun.file(filePath).exists()) {
        return new Response(generatePreview(filename, "infographics"), { headers: { "Content-Type": "text/html" } });
      }
      return new Response("Infographic not found", { status: 404 });
    }

    const templatePreviewMatch = pathname.match(/^\/preview-template\/(.+\.html)$/);
    if (templatePreviewMatch) {
      const filename = templatePreviewMatch[1];
      const filePath = join(PROJECT_ROOT, "templates", filename);
      if (await Bun.file(filePath).exists()) {
        return new Response(generatePreview(filename, "templates"), { headers: { "Content-Type": "text/html" } });
      }
      return new Response("Template not found", { status: 404 });
    }

    // ── Export route (PNG download) ─────────────────
    const exportMatch = pathname.match(/^\/export\/(.+\.html)$/);
    if (exportMatch) {
      const filename = exportMatch[1];
      const htmlFile = join(PROJECT_ROOT, "infographics", filename);
      if (await Bun.file(htmlFile).exists()) {
        try {
          const theme = url.searchParams.get("theme") || undefined;
          const pngPath = await exportPng(`infographics/${filename}`, "output", theme);
          const pngFile = Bun.file(pngPath);
          const pngName = filename.replace(".html", "-2x.png");
          return new Response(pngFile, {
            headers: {
              "Content-Type": "image/png",
              "Content-Disposition": `attachment; filename="${pngName}"`,
            },
          });
        } catch (err: any) {
          return new Response(`Export failed: ${err.message}`, { status: 500 });
        }
      }
      return new Response("Infographic not found", { status: 404 });
    }

    // ── Static files from project root ─────────────
    const filePath = join(PROJECT_ROOT, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = extname(pathname);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      if (ext === ".html") {
        const html = await file.text();
        return new Response(injectLiveReload(html), { headers: { "Content-Type": "text/html" } });
      }

      return new Response(file, { headers: { "Content-Type": contentType } });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) { clients.add(ws); },
    close(ws) { clients.delete(ws); },
    message() {},
  },
});

// ── File watcher for live reload ─────────────────────────────

function notifyReload() {
  for (const ws of clients) {
    try { ws.send("reload"); } catch { clients.delete(ws); }
  }
}

const watchDirs = [
  join(PROJECT_ROOT, "src/design-system"),
  join(PROJECT_ROOT, "src/tw"),
  join(PROJECT_ROOT, "infographics"),
  join(PROJECT_ROOT, "templates"),
];

for (const dir of watchDirs) {
  try {
    watch(dir, { recursive: true }, () => notifyReload());
  } catch {}
}

console.log(`\n  Infographer dev server running at:\n`);
console.log(`  \u2192 http://localhost:${PORT}\n`);
console.log(`  Watching for changes...\n`);
