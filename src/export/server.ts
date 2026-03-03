import { watch } from "fs";
import { resolve, join, extname } from "path";
import { readdir } from "fs/promises";

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

// Generate index page listing all infographics
async function generateIndex(): Promise<string> {
  const infographicsDir = join(PROJECT_ROOT, "infographics");
  let files: string[] = [];
  try {
    const entries = await readdir(infographicsDir);
    files = entries.filter((f) => f.endsWith(".html")).sort();
  } catch {
    // Directory may not exist yet
  }

  const links = files
    .map((f) => {
      const name = f.replace(".html", "").replace(/-/g, " ");
      return `<li><a href="/infographics/${f}">${name}</a></li>`;
    })
    .join("\n          ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Infographer — Dev Server</title>
  <style>
    body {
      font-family: Inter, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #e8e8e8;
      display: flex;
      justify-content: center;
      padding: 60px 20px;
      margin: 0;
    }
    .container {
      max-width: 600px;
      width: 100%;
    }
    h1 {
      font-size: 28px;
      font-weight: 300;
      margin-bottom: 8px;
    }
    h1 strong {
      font-weight: 600;
    }
    p {
      color: #666;
      font-size: 14px;
      margin-bottom: 32px;
    }
    ul {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    li a {
      display: block;
      padding: 16px 20px;
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 8px;
      color: #e8e8e8;
      text-decoration: none;
      text-transform: capitalize;
      font-size: 15px;
      transition: border-color 0.2s;
    }
    li a:hover {
      border-color: #3d3526;
    }
    .empty {
      color: #444;
      font-size: 14px;
      padding: 40px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><strong>Infographer</strong> Dev Server</h1>
    <p>Select an infographic to preview</p>
    ${files.length > 0 ? `<ul>${links}</ul>` : '<div class="empty">No infographics found in /infographics/</div>'}
  </div>
</body>
</html>`;
}

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // WebSocket upgrade for live reload
    if (pathname === "/__reload") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as any;
    }

    // Index page
    if (pathname === "/" || pathname === "/index.html") {
      const html = await generateIndex();
      return new Response(injectLiveReload(html), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve files from project root
    const filePath = join(PROJECT_ROOT, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = extname(pathname);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      if (ext === ".html") {
        const html = await file.text();
        return new Response(injectLiveReload(html), {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      clients.add(ws);
    },
    close(ws) {
      clients.delete(ws);
    },
    message() {
      // No incoming messages expected
    },
  },
});

// File watcher for live reload
function notifyReload() {
  for (const ws of clients) {
    try {
      ws.send("reload");
    } catch {
      clients.delete(ws);
    }
  }
}

// Watch design system, infographics, and fonts directories
const watchDirs = [
  join(PROJECT_ROOT, "src/design-system"),
  join(PROJECT_ROOT, "infographics"),
];

for (const dir of watchDirs) {
  try {
    watch(dir, { recursive: true }, (_event, _filename) => {
      notifyReload();
    });
  } catch {
    // Directory may not exist yet
  }
}

console.log(`\n  Infographer dev server running at:\n`);
console.log(`  → http://localhost:${PORT}\n`);
console.log(`  Watching for changes...\n`);
