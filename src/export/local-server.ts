import { resolve, join, extname } from "path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

/**
 * Starts a temporary local HTTP server for Puppeteer to load pages from.
 * Returns the server instance and base URL. Call server.stop() when done.
 */
export async function startLocalServer(port = 0): Promise<{
  server: ReturnType<typeof Bun.serve>;
  baseUrl: string;
}> {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const filePath = join(PROJECT_ROOT, url.pathname);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        const ext = extname(url.pathname);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Inject Ember theme CSS into HTML files so exports match dev preview
        if (ext === ".html") {
          let html = await file.text();
          const emberLink = `<link rel="stylesheet" href="/src/tw/themes-ember.css">`;
          const unifiedLink = `<link rel="stylesheet" href="/src/tw/themes-unified.css">`;
          html = html.replace("</head>", `${emberLink}\n${unifiedLink}\n</head>`);
          return new Response(html, {
            headers: { "Content-Type": contentType },
          });
        }

        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  const baseUrl = `http://localhost:${server.port}`;
  return { server, baseUrl };
}
