// CSP regression lint. The site ships a strict Content-Security-Policy meta
// (no 'unsafe-inline', no CDNs), so anything below would silently break:
//   - style="" attributes, <style> blocks, inline event handlers, javascript: URLs
//   - inline <script> (anything without src, except JSON-LD data blocks)
//   - third-party script / stylesheet / font / image / media URLs
//   - remote url() or @import in the compiled CSS
//   - a bundled library writing inline styles or HTML strings at runtime
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
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// Run a regex over the whole file (tags may span lines) and report each hit.
function scan(file, text, pattern, msg, filter) {
  for (const m of text.matchAll(pattern)) {
    if (filter && !filter(m)) continue;
    report(file, lineOf(text, m.index), msg);
  }
}

const REMOTE = /^\s*(https?:)?\/\//i;
const attr = (tag, name) => {
  const r = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return r ? r[1] : null;
};

for (const file of markupFiles) {
  const text = readFileSync(file, "utf8");
  scan(file, text, /\sstyle\s*=\s*["']/gi, "inline style attribute");
  scan(file, text, /<style\b/gi, "<style> block");
  scan(file, text, /\son[a-z]+\s*=\s*["']/gi, "inline event handler attribute");
  scan(file, text, /\b(href|src)\s*=\s*["']\s*javascript:/gi, "javascript: URL");
  scan(file, text, /<script\b[^>]*>/gi, "inline <script> without src", (m) => {
    const t = m[0];
    return !/\ssrc\s*=/i.test(t) && !/type\s*=\s*["']application\/ld\+json["']/i.test(t);
  });
  scan(file, text, /<script\b[^>]*>/gi, "third-party script src", (m) => REMOTE.test(attr(m[0], "src") || ""));
  scan(file, text, /<link\b[^>]*>/gi, "third-party stylesheet or font URL", (m) => {
    const t = m[0];
    const isStyle = /rel\s*=\s*["']stylesheet["']/i.test(t);
    const isFont = /as\s*=\s*["']font["']/i.test(t);
    return (isStyle || isFont) && REMOTE.test(attr(t, "href") || "");
  });
  scan(file, text, /<(img|use|image|source|video|audio|iframe|object|embed)\b[^>]*>/gi, "third-party media or embed URL", (m) => {
    const t = m[0];
    return REMOTE.test(attr(t, "src") || "") || REMOTE.test(attr(t, "href") || "") || REMOTE.test(attr(t, "poster") || "");
  });
}

// The policy itself must not drift.
const head = readFileSync("_includes/head.html", "utf8");
const cspMatch = head.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
if (!cspMatch) report("_includes/head.html", 0, "CSP meta tag missing");
else if (cspMatch[1] !== EXPECTED_CSP) report("_includes/head.html", 0, "CSP meta content changed; update EXPECTED_CSP deliberately if intended");

// Compiled CSS: fonts, images and imports must be same-origin or data:.
if (existsSync("assets/css")) {
  for (const f of readdirSync("assets/css").filter((n) => n.endsWith(".css"))) {
    const file = join("assets/css", f);
    const css = readFileSync(file, "utf8");
    scan(file, css, /@import\b/gi, "@import in stylesheet");
    scan(file, css, /url\(\s*["']?\s*(https?:)?\/\//gi, "remote url() in stylesheet");
  }
}

// Runtime: the bundle must never write inline styles or raw HTML strings.
const bundle = "assets/js/main.js";
if (existsSync(bundle)) {
  const js = readFileSync(bundle, "utf8");
  const patterns = [
    [/setAttribute\(\s*["'`]style["'`]/, 'setAttribute("style")'],
    [/\.cssText\s*\+?=/, "cssText assignment"],
    [/style\s*=\s*\\?["']/, "inline style inside an HTML string"],
    [/\b(innerHTML|outerHTML|insertAdjacentHTML)\b|document\.write\b/, "HTML string injection"],
  ];
  for (const [pat, label] of patterns) {
    const m = js.match(pat);
    if (m) report(bundle, lineOf(js, m.index), `bundle contains ${label}`);
  }
}

if (problems.length) {
  console.error("CSP lint failed:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`CSP lint passed (${markupFiles.length} markup files, compiled CSS and bundle checked).`);
