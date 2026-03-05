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
  bento:     { name: "Bento",      desc: "9 cards, asymmetric 3×4 grid",    grid: "3×4" },
  catalog:   { name: "Catalog",    desc: "6 equal cards, 3×2 grid",         grid: "3×2" },
  "3col":    { name: "Three-Col",  desc: "3 full-height columns",           grid: "3×1" },
  stack:     { name: "Stack",      desc: "5 full-width horizontal bands",    grid: "1×5" },
  editorial: { name: "Editorial",  desc: "Magazine-style mixed sections",    grid: "mixed" },
  dashboard: { name: "Dashboard",  desc: "7 cards, stat row + detail grid",   grid: "3×3" },
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

// ── Shared shell ─────────────────────────────────────────────

function shell(activePage: string, title: string, content: string, counts: { infographics: number; templates: number }): string {
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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sidebar-w: 240px;
      --bg-app: #09090b;
      --bg-sidebar: #0f0f11;
      --bg-card: #141416;
      --bg-card-hover: #1a1a1e;
      --bg-surface: #18181b;
      --border: #1f1f23;
      --border-hover: #2e2e33;
      --text-primary: #fafafa;
      --text-secondary: #a1a1aa;
      --text-muted: #52525b;
      --accent: #c15f3c;
      --accent-dim: rgba(193, 95, 60, 0.12);
      --radius: 10px;
      --radius-sm: 6px;
      --transition: 0.15s ease;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-app);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      -webkit-font-smoothing: antialiased;
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
      padding: 0;
      z-index: 50;
    }

    .sidebar-brand {
      padding: 24px 20px 20px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-brand h1 {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }
    .sidebar-brand h1 span { color: var(--accent); }
    .sidebar-brand p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .sidebar-nav {
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      transition: all var(--transition);
    }
    .nav-item:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: var(--accent-dim);
      color: var(--accent);
    }
    .nav-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.6;
    }
    .nav-item.active svg { opacity: 1; }
    .nav-label { flex: 1; }
    .nav-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-surface);
      padding: 1px 7px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }
    .nav-item.active .nav-count {
      color: var(--accent);
      background: rgba(193, 95, 60, 0.08);
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }
    .sidebar-cmd {
      font-size: 11px;
      font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .sidebar-cmd code {
      color: var(--accent);
      background: var(--accent-dim);
      padding: 1px 5px;
      border-radius: 3px;
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
      padding: 32px 40px 0;
    }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .page-subtitle {
      font-size: 14px;
      color: var(--text-muted);
    }

    .page-content {
      padding: 24px 40px 48px;
      flex: 1;
    }

    /* ── Card grid (infographics + templates) ────── */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .card:hover .card-label { color: var(--text-primary); }

    .thumb-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1080 / 1350;
      overflow: hidden;
      background: var(--bg-app);
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
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
      color: var(--text-secondary);
      border-top: 1px solid var(--border);
      transition: color var(--transition);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Template cards ──────────────────────────── */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }

    .tpl-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      transition: border-color var(--transition);
    }
    .tpl-card:hover { border-color: var(--border-hover); }

    .tpl-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .tpl-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .tpl-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      background: var(--accent-dim);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .tpl-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .tpl-variants {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .tpl-thumb {
      display: block;
      text-decoration: none;
      color: inherit;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
      transition: border-color var(--transition);
    }
    .tpl-thumb:hover { border-color: var(--accent); }
    .tpl-thumb .thumb-wrap { aspect-ratio: 1080 / 1350; }
    .tpl-variant-label {
      display: block;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-top: 1px solid var(--border);
    }

    /* ── Home page ───────────────────────────────── */
    .home-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }
    .stat-value span { color: var(--accent); }

    .home-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 12px;
    }

    .recent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .quick-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 32px;
    }
    .quick-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all var(--transition);
    }
    .quick-btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
      background: var(--bg-card-hover);
    }
    .quick-btn--accent {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-dim);
    }
    .quick-btn--accent:hover {
      background: rgba(193, 95, 60, 0.18);
      border-color: var(--accent);
      color: var(--accent);
    }

    /* ── Empty state ─────────────────────────────── */
    .empty {
      color: var(--text-muted);
      font-size: 14px;
      padding: 80px 0;
      text-align: center;
      grid-column: 1 / -1;
    }

    /* ── Utility ─────────────────────────────────── */
    .mb-32 { margin-bottom: 32px; }

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
  </script>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <h1>Infogra<span>.</span>pher</h1>
      <p>Dev Server</p>
    </div>
    <nav class="sidebar-nav">
      ${navItems}
    </nav>
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
    </div>
    <div class="page-content">
      ${content}
    </div>
  </main>
</body>
</html>`;
}

// ── SVG icons ────────────────────────────────────────────────

const SVG_HOME = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const SVG_GRID = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
const SVG_LAYOUT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`;

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
    <div class="quick-actions">
      <a class="quick-btn quick-btn--accent" href="/infographics">Browse Infographics</a>
      <a class="quick-btn" href="/templates">Choose a Template</a>
    </div>
    <div class="home-grid">
      <div class="stat-card">
        <div class="stat-label">Infographics</div>
        <div class="stat-value">${files.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Layouts</div>
        <div class="stat-value">${Object.keys(groups).length}</div>
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

  return shell("home", "Home", content, counts);
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
      ${files.length > 0 ? cards : '<div class="empty">No infographics yet. Run <code>bun run new "Your Title"</code> to create one.</div>'}
    </div>`;

  return shell("infographics", "Infographics", content, counts);
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

  return shell("templates", "Templates", content, counts);
}

// ── Preview page (standalone, no sidebar) ────────────────────

function generatePreview(filename: string, dir: string = "infographics"): string {
  const backHref = dir === "templates" ? "/templates" : "/infographics";
  const backLabel = dir === "templates" ? "Templates" : "Infographics";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${filename.replace(".html", "").replace(/-/g, " ")} — Preview</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; height: 52px;
      background: #0f0f11;
      border-bottom: 1px solid #1f1f23;
      flex-shrink: 0;
    }
    .toolbar-left { display: flex; align-items: center; gap: 16px; }
    .back {
      display: inline-flex; align-items: center; gap: 6px;
      color: #52525b; text-decoration: none; font-size: 13px; font-weight: 500;
      transition: color 0.15s;
    }
    .back:hover { color: #fafafa; }
    .back svg { width: 14px; height: 14px; }
    .divider { width: 1px; height: 20px; background: #1f1f23; }
    .filename { font-size: 13px; font-weight: 600; color: #a1a1aa; }
    .toolbar-center { display: flex; align-items: center; gap: 16px; }
    .zoom-controls { display: flex; gap: 3px; }
    .zoom-btn, .theme-btn {
      padding: 5px 12px; border: 1px solid #1f1f23; border-radius: 6px;
      background: transparent; color: #52525b; font-family: inherit;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .zoom-btn:hover, .theme-btn:hover { border-color: #2e2e33; color: #a1a1aa; }
    .zoom-btn.active { border-color: #c15f3c; color: #c15f3c; background: rgba(193,95,60,0.06); }
    .theme-toggle { display: flex; gap: 3px; }
    .theme-btn.active { border-color: #c15f3c; color: #c15f3c; background: rgba(193,95,60,0.06); }
    .theme-btn svg { width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px; }
    .toolbar-right { display: flex; align-items: center; gap: 12px; }
    .raw-link {
      font-size: 12px; color: #52525b; text-decoration: none; font-weight: 500; transition: color 0.15s;
    }
    .raw-link:hover { color: #a1a1aa; }
    .download-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 14px; border-radius: 6px; border: 1px solid #c15f3c;
      background: rgba(193,95,60,0.1); color: #c15f3c;
      font-family: inherit; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; text-decoration: none;
    }
    .download-btn:hover { background: rgba(193,95,60,0.2); }
    .download-btn.loading { opacity: 0.5; pointer-events: none; }
    .download-btn svg { width: 14px; height: 14px; }
    .preview-area {
      flex: 1; display: flex; align-items: flex-start; justify-content: center;
      padding: 32px; overflow: auto;
      user-select: none;
      cursor: default;
    }
    .iframe-wrap { transform-origin: top center; transition: transform 0.2s ease; cursor: default; }
    .iframe-wrap iframe {
      width: 1080px; height: 1350px; border: none; display: block; border-radius: 6px;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5);
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
        PNG 2x
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
        var areaW = area.clientWidth - 64;
        var areaH = area.clientHeight - 64;
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

    // Theme toggle
    var themeBtns = document.querySelectorAll('.theme-btn');
    var iframe = document.querySelector('iframe');
    function syncThemeButtons() {
      try {
        var ig = iframe.contentDocument.querySelector('.infographic');
        var current = ig ? ig.getAttribute('data-theme') || 'dark' : 'dark';
        themeBtns.forEach(function(b) {
          b.classList.toggle('active', b.dataset.theme === current);
        });
      } catch(e) {}
    }
    iframe.addEventListener('load', syncThemeButtons);
    themeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        try {
          var ig = iframe.contentDocument.querySelector('.infographic');
          if (ig) ig.setAttribute('data-theme', btn.dataset.theme);
          themeBtns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        } catch(e) {}
      });
    });

    var dlBtn = document.getElementById('downloadBtn');
    if (dlBtn) {
      dlBtn.addEventListener('click', function(e) {
        dlBtn.classList.add('loading');
        dlBtn.textContent = 'Exporting…';
        // Let the default link navigation happen — browser will download the file
        // Reset button after a delay
        setTimeout(function() {
          dlBtn.classList.remove('loading');
          dlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> PNG 2x';
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
          const pngPath = await exportPng(`infographics/${filename}`);
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
console.log(`  → http://localhost:${PORT}\n`);
console.log(`  Watching for changes...\n`);
