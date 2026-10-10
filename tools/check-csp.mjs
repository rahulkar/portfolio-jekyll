// CSP regression lint. The site ships a strict Content-Security-Policy meta
// (no 'unsafe-inline', no CDNs), so anything below would silently break:
//   - style="" attributes or <style> blocks in markup
//   - inline <script> (anything without src, except JSON-LD data blocks)
//   - third-party script / stylesheet / font URLs
//   - a bundled library writing inline styles at runtime
// Exits 1 with file:line for every hit. Run via `npm run check:csp`.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_CSP =
  "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; " +
  "script-src 'self' static.cloudflareinsights.com; connect-src 'self' cloudflareinsights.com; " +
  "base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";

const markupFiles = [
  ...readdirSync("_includes").map((f) => join("_includes", f)),
  ...readdirSync("_layouts").map((f) => join("_layouts", f)),
  "index.html",
  "404.html",
  ...["_site/index.html", "_site/404.html"].filter(existsSync),
].filter((f) => f.endsWith(".html"));

const problems = [];
const report = (file, line, msg) => problems.push(`${file}:${line}: ${msg}`);

for (const file of markupFiles) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((text, i) => {
    const n = i + 1;
    if (/\sstyle\s*=\s*["']/i.test(text)) report(file, n, "inline style attribute");
    if (/<style\b/i.test(text)) report(file, n, "<style> block");
    for (const tag of text.matchAll(/<script\b[^>]*>/gi)) {
      const t = tag[0];
      if (!/\ssrc\s*=/i.test(t) && !/type\s*=\s*["']application\/ld\+json["']/i.test(t)) {
        report(file, n, "inline <script> without src");
      }
      if (/\ssrc\s*=\s*["']\s*(https?:)?\/\//i.test(t)) report(file, n, "third-party script src");
    }
    for (const tag of text.matchAll(/<link\b[^>]*>/gi)) {
      const t = tag[0];
      const isStyle = /rel\s*=\s*["']stylesheet["']/i.test(t);
      const isFont = /as\s*=\s*["']font["']/i.test(t);
      if ((isStyle || isFont) && /href\s*=\s*["']\s*(https?:)?\/\//i.test(t)) {
        report(file, n, "third-party stylesheet or font URL");
      }
    }
  });
}

// The policy itself must not drift.
const head = readFileSync("_includes/head.html", "utf8");
const cspMatch = head.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
if (!cspMatch) report("_includes/head.html", 0, "CSP meta tag missing");
else if (cspMatch[1] !== EXPECTED_CSP) report("_includes/head.html", 0, "CSP meta content changed; update EXPECTED_CSP deliberately if intended");

// Runtime: the bundle must never write inline styles.
const bundle = "assets/js/main.js";
if (existsSync(bundle)) {
  const js = readFileSync(bundle, "utf8");
  for (const pat of [/setAttribute\(\s*["']style["']/, /\.cssText\s*=/, /style=\?["']/]) {
    if (pat.test(js)) report(bundle, 1, `bundle contains ${pat}`);
  }
}

if (problems.length) {
  console.error("CSP lint failed:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`CSP lint passed (${markupFiles.length} markup files, bundle checked).`);
