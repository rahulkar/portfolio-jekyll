// CSP regression lint. The site ships a strict Content-Security-Policy meta
// (no 'unsafe-inline', no CDNs), so anything below would silently break:
//   - style="" attributes, <style> blocks, inline event handlers, javascript: URLs
//   - inline <script> (anything without src, except JSON-LD data blocks)
//   - third-party script / stylesheet / font / image / media URLs
//   - remote url() or @import in the compiled CSS
//   - a bundled library writing inline styles or HTML strings at runtime
// Exits 1 with file:line for every hit. Run via `npm run check:csp`.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_CSP =
  "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; " +
  "script-src 'self' static.cloudflareinsights.com; connect-src 'self' cloudflareinsights.com; " +
  "base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";

// Every markup source plus the built site. Missing folders are skipped.
function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, exts);
    return exts.some((e) => name.endsWith(e)) ? [p] : [];
  });
}
const markupFiles = [
  ...walk("_includes", [".html"]),
  ...walk("_layouts", [".html"]),
  ...walk("_notes", [".html", ".md"]),
  ...walk("_scribbles", [".html", ".md"]),
  ...walk("redirects", [".html"]),
  ...readdirSync(".").filter((f) => f.endsWith(".html")),
  ...walk("_site", [".html"]),
];

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

// The policy itself must not drift. Every page includes it from csp.html.
const cspFile = "_includes/csp.html";
const cspMatch = existsSync(cspFile) && readFileSync(cspFile, "utf8").match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
if (!cspMatch) report(cspFile, 0, "CSP meta tag missing");
else if (cspMatch[1] !== EXPECTED_CSP) report(cspFile, 0, "CSP meta content changed; update EXPECTED_CSP deliberately if intended");
if (!readFileSync("_includes/head.html", "utf8").includes("{% include csp.html %}")) report("_includes/head.html", 0, "head does not include csp.html");

// Compiled CSS: fonts, images and imports must be same-origin or data:.
if (existsSync("assets/css")) {
  for (const f of readdirSync("assets/css").filter((n) => n.endsWith(".css"))) {
    const file = join("assets/css", f);
    const css = readFileSync(file, "utf8");
    scan(file, css, /@import\b/gi, "@import in stylesheet");
    scan(file, css, /url\(\s*["']?\s*(https?:)?\/\//gi, "remote url() in stylesheet");
  }
}

// Design guard: red means "now". The accent may only style the datum's tick
// and the current-page nav item, and its hex values may only define --accent.
const mainCss = "assets/css/main.css";
if (existsSync(mainCss)) {
  const css = readFileSync(mainCss, "utf8");
  const ALLOWED = /\.datum__tick|\.site-nav a\[aria-current/;
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!m[2].includes("var(--accent)")) continue;
    for (const sel of m[1].split(",")) {
      if (!ALLOWED.test(sel)) report(mainCss, 0, `accent used outside the now-tick and current nav: ${sel.trim()}`);
    }
  }
  for (const m of css.matchAll(/#(c42b1c|ee5a3f)\b/gi)) {
    const before = css.slice(Math.max(0, m.index - 12), m.index);
    if (!/--accent:\s*$/.test(before)) report(mainCss, 0, `accent hex ${m[0]} used outside an --accent declaration`);
  }
}

// Runtime: the scripts must never write inline styles or raw HTML strings.
for (const bundle of ["assets/js/main.js", "assets/js/theme.js"]) {
  if (!existsSync(bundle)) continue;
  const js = readFileSync(bundle, "utf8");
  const patterns = [
    [/setAttribute\(\s*["'`]style["'`]/, 'setAttribute("style")'],
    [/\.cssText\s*\+?=/, "cssText assignment"],
    [/\.style\.(?!setProperty\(\s*["'`]--)/, "inline style property (only custom properties via setProperty are allowed)"],
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
console.log(`CSP lint passed (${markupFiles.length} markup files, compiled CSS and scripts checked).`);
