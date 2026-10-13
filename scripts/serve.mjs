import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function serve(port = 4173) {
  const root = path.resolve("dist");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    ".xml": "application/xml",
    ".txt": "text/plain",
  };
  const server = http.createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    let status = 200;
    try {
      if ((await fs.stat(file)).isDirectory())
        file = path.join(file, "index.html");
      await fs.access(file);
    } catch {
      // Initial prerender requests need the app shell; unknown routes keep a real 404 status.
      status = pathname === "/guide" || pathname === "/guide/" ? 200 : 404;
      file =
        status === 200
          ? path.join(root, "index.html")
          : path.join(root, "404.html");
      try {
        await fs.access(file);
      } catch {
        file = path.join(root, "index.html");
      }
    }
    try {
      const body = await fs.readFile(file);
      res.writeHead(status, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const index = process.argv.indexOf("--port");
  const port = index < 0 ? 4173 : Number(process.argv[index + 1]);
  await serve(port);
  console.log(`Production preview: http://127.0.0.1:${port}`);
}
