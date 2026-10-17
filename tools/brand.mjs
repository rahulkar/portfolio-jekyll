// Brand assets in the datum identity, rendered reproducibly with Node:
//   npm run brand
// Writes the v3 favicon family, the share card and the banners for LinkedIn,
// GitHub and the email signature. All text is set as outlines with
// opentype.js, so the renderer never has to match font names. Versioned
// filenames are deliberate: the live site caches /assets/* for a year.
// Not part of `npm run build`; outputs are committed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
import subsetFont from "subset-font";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

// Bump on any change to the output, then update the matching names in
// _includes/head.html and _config.yml: /assets/* is cached for a year.
const V = "v5";

const BG = "#F6F5F1";
const INK = "#161615";
const INK2 = "#4A4945";
const INK3 = "#6A6964";
const DARK_BG = "#121211";
const DARK_INK = "#ECEAE4";

const ROLE = "Enterprise Solution Architect & Technology Lead";
const YEARS = "11+ years in IT";
// The same facts as the home page hero.
const FACTS = [
  ["NOW", "Generative AI, AI agents and AI loops"],
  ["BEFORE", "Test automation, CI/CD, DevOps and cloud"],
];

const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

async function loadFonts() {
  const sans = readFileSync("assets/fonts/instrument-sans-v1.woff2");
  const mono = readFileSync("assets/fonts/fragment-mono-v1.woff2");
  let latin = "";
  for (let c = 0x20; c < 0x7f; c++) latin += String.fromCharCode(c);
  latin += "·–—’×";
  const instance = async (buf, axes) => {
    const opts = { targetFormat: "sfnt" };
    if (axes) opts.variationAxes = axes; // Fragment Mono is static: no axes
    return opentype.parse(toArrayBuffer(await subsetFont(buf, latin, opts)));
  };
  return {
    s600: await instance(sans, { wght: 600 }),
    s500: await instance(sans, { wght: 500 }),
    s450: await instance(sans, { wght: 450 }),
    mono: await instance(mono),
  };
}

// Lays out a string glyph by glyph (kerning plus optional tracking in em)
// and returns one <path>, along with its width.
function layout(font, str, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(str);
  const scale = size / font.unitsPerEm;
  const pos = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    pos.push(x);
    x += g.advanceWidth * scale + tracking * size;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { glyphs, pos, width: x - (glyphs.length ? tracking * size : 0) };
}

function text(font, str, x, y, size, fill, { tracking = 0, anchor = "start", cls = "" } = {}) {
  const l = layout(font, str, size, tracking);
  const x0 = anchor === "end" ? x - l.width : anchor === "middle" ? x - l.width / 2 : x;
  const d = l.glyphs.map((g, i) => g.getPath(x0 + l.pos[i], y, size).toPathData(2)).join("");
  return `<path${cls ? ` class="${cls}"` : ""} d="${d}" fill="${fill}"/>`;
}

// The datum without its red tick: a still image cannot know the time.
function datum(f, { x, w, labelY, lineY, marksY, labelSize = 15, markSize = 16, stroke = 1.5 }) {
  let out = text(f.mono, "KOLKATA · IST · UTC+05:30", x, labelY, labelSize, INK2, { tracking: 0.06 });
  out += `<rect x="${x}" y="${lineY}" width="${w}" height="${stroke}" fill="${INK3}"/>`;
  for (let h = 0; h <= 24; h++) {
    const tx = Math.min(x + (w * h) / 24, x + w - stroke);
    const len = h % 6 === 0 ? 12 : 6;
    out += `<rect x="${tx.toFixed(2)}" y="${lineY}" width="${stroke}" height="${len}" fill="${INK3}"/>`;
  }
  ["00", "06", "12", "18", "24"].forEach((label, i) => {
    const mx = x + (w * i * 6) / 24;
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
    out += text(f.mono, label, mx, marksY, markSize, INK3, { anchor });
  });
  return out;
}

const svg = (w, h, body, bg = BG) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;

const render = (markup, width) =>
  new Resvg(markup, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false } }).render().asPng();

// ---------------------------------------------------------------- favicon --
function favicon(f, { dark = false } = {}) {
  const l = layout(f.s600, "RK", 96, -0.02);
  const mark = text(f.s600, "RK", 90 - l.width / 2, 90 + 96 * 0.35, 96, BG, { tracking: -0.02, cls: "mark" });
  // In a dark browser tab the tile turns light and the letters dark.
  const style = dark
    ? `<style>@media (prefers-color-scheme: dark){.tile{fill:${DARK_INK}}.mark{fill:${DARK_BG}}}</style>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="Rahul Kar">${style}<rect class="tile" width="180" height="180" fill="${INK}"/>${mark}</svg>\n`;
}

// --------------------------------------------------------------- og card --
function og(f) {
  let body = text(f.mono, "www.rahulkar.com", 80, 76, 18, INK3);
  body += text(f.s600, "Rahul Kar", 76, 222, 120, INK, { tracking: -0.04 });
  body += text(f.s500, `${ROLE} · ${YEARS}`, 80, 276, 30, INK2, { tracking: -0.01 });
  FACTS.forEach(([label, value], i) => {
    body += text(f.mono, label, 80, 352 + i * 52, 16, INK3, { tracking: 0.06 });
    body += text(f.s450, value, 210, 352 + i * 52, 32, INK, { tracking: -0.01 });
  });
  body += datum(f, { x: 80, w: 1040, labelY: 516, lineY: 548, marksY: 582 });
  return svg(1200, 630, body);
}

// ------------------------------------------------------ banners and cards --
function banner(f, o) {
  let body = text(f.s600, "Rahul Kar", o.x - o.name * 0.03, o.nameY, o.name, INK, { tracking: -0.04 });
  body += text(f.s500, `${ROLE} · ${YEARS}`, o.x, o.roleY, o.role, INK2, { tracking: -0.01 });
  if (o.datum) body += datum(f, { x: o.x, ...o.datum });
  if (o.line) body += text(f.mono, o.line.text, o.x, o.line.y, o.line.size, INK3);
  return svg(o.w, o.h, body);
}

async function main() {
  const f = await loadFonts();
  const cache = join("node_modules", ".cache", "brand");
  mkdirSync(cache, { recursive: true });
  mkdirSync("assets/brand", { recursive: true });

  // Favicon family: an ink tile with the initials.
  writeFileSync(`assets/icons/favicon-${V}.svg`, favicon(f, { dark: true }));
  const tile = favicon(f);
  const ico = await pngToIco([16, 32, 48].map((w) => render(tile, w)));
  writeFileSync(`assets/favicon-${V}.ico`, ico);
  writeFileSync("favicon.ico", ico);
  writeFileSync(`assets/icons/apple-touch-icon-${V}.png`, render(tile, 180));

  // Share card.
  const card = og(f);
  writeFileSync(join(cache, "og.svg"), card);
  writeFileSync(`assets/og-${V}.png`, render(card, 1200));

  // LinkedIn keeps the left 440 px clear for the profile photo overlay.
  writeFileSync(`assets/brand/linkedin-banner-${V}.png`, render(banner(f, {
    w: 1584, h: 396, x: 470, name: 84, nameY: 140, role: 26, roleY: 186,
    datum: { w: 1034, labelY: 252, lineY: 284, marksY: 314, labelSize: 14, markSize: 15 },
  }), 1584));
  writeFileSync(`assets/brand/github-header-${V}.png`, render(banner(f, {
    w: 1280, h: 320, x: 72, name: 76, nameY: 120, role: 24, roleY: 162,
    datum: { w: 1136, labelY: 222, lineY: 252, marksY: 280, labelSize: 13, markSize: 14 },
  }), 1280));
  writeFileSync(`assets/brand/email-signature-${V}.png`, render(banner(f, {
    w: 600, h: 200, x: 30, name: 40, nameY: 74, role: 16, roleY: 102,
    line: { text: "kar.rahul@pm.me · www.rahulkar.com", y: 146, size: 14 },
  }), 1200));

  console.log(`brand assets written (${V}): favicon (svg, ico, apple-touch), favicon.ico, og card, LinkedIn banner, GitHub header, email signature`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
