import http from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOCKED = new Set([".git", ".vscode", "node_modules", "functions", "tests", "scripts", "docs", ".github"]);
const MIME = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"]
]);
const SAFE_EXTENSIONS = new Set(MIME.keys());

export function resolvePreviewPath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (decoded.includes("\\") || decoded.includes("\0")) return null;
  const segments = decoded.split("/").filter(Boolean);
  if (segments.some(part => part === "." || part === ".." || part.startsWith("." ) || BLOCKED.has(part.toLowerCase()))) return null;
  const relative = segments.length ? segments.join("/") : "index.html";
  const absolute = path.resolve(ROOT, relative);
  if (!absolute.startsWith(ROOT + path.sep) || !SAFE_EXTENSIONS.has(path.extname(absolute).toLowerCase())) return null;
  return absolute;
}

export function createPreviewServer() {
  return http.createServer(async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" }).end("Method not allowed");
      return;
    }
    const file = resolvePreviewPath(req.url || "/");
    if (!file) {
      res.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
      return;
    }
    try {
      const real = await fs.realpath(file);
      if (!real.startsWith(ROOT + path.sep)) throw new Error("Outside preview root");
      const stat = await fs.stat(real);
      if (!stat.isFile()) throw new Error("Not a file");
      res.writeHead(200, {
        "Content-Type": MIME.get(path.extname(real).toLowerCase()),
        "Content-Length": stat.size,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "no-store"
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(real).pipe(res);
    } catch {
      res.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portArg = process.argv.indexOf("--port");
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write("Invalid port.\n");
    process.exit(1);
  }
  const server = createPreviewServer();
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`Agency AI OS preview listening on http://127.0.0.1:${port}\n`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
