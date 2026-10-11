// Minimal static server for the built site (used by the Playwright tests and
// `npm run serve:light`). Serves _site with the same routing GitHub Pages
// applies: directory index files and 404.html for unknown paths.
//   node tools/serve.mjs [port] [dir]
import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import { join, extname, normalize } from "node:path";

const port = Number(process.argv[2]) || 4173;
const root = process.argv[3] || "_site";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".vcf": "text/vcard",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = normalize(join(root, url));
  if (!file.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  let status = 200;
  if (!existsSync(file)) { file = join(root, "404.html"); status = 404; }
  res.writeHead(status, { "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
