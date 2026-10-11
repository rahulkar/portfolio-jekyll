// Brand assets in the sketchbook style, rendered reproducibly with Node:
//   node tools/brand.mjs
// Writes assets/icons/favicon-v2.svg, assets/favicon-v2.ico, favicon.ico (root),
// assets/icons/apple-touch-icon-v2.png and assets/og-sketch.png. Versioned
// filenames are deliberate: the live site caches /assets/* for a year.
// Not part of `npm run build`; outputs are committed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import rough from "roughjs/bundled/rough.esm.js";
import subsetFont from "subset-font";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const gen = rough.generator();
const INK = "#2A2622";
const INK2 = "#4F4A44";
const INK3 = "#6B655D";
const PAPER = "#F8F3E7";
const BALLPOINT = "#1F4E9C";
const REDPEN = "#B03A2E";
const GREEN = "#1F6F48";
const HL = "#FFE766";
const NUNITO = "Nunito ExtraLight"; // family name baked into the Fontsource variable file

const paths = (drawables, attrs = "") =>
  drawables
    .flatMap((d) => gen.toPaths(d))
    .map((p) => {
      const isFill = p.fill !== "none" && p.stroke !== "none" && p.stroke !== INK && !attrs.includes("stroke=");
      return `<path d="${p.d}" fill="none" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${isFill ? "" : ""}${attrs}/>`;
    })
    .join("");

// resvg needs TTF/OTF: convert the shipped woff2 subsets (Nunito pinned to
// static weights) into a cache folder that is not committed.
async function prepareFonts() {
  const dir = join("node_modules", ".cache", "brand");
  mkdirSync(dir, { recursive: true });
  const exc = readFileSync("assets/fonts/excalifont.woff2");
  const nun = readFileSync("assets/fonts/nunito.woff2");
  const files = [];
  const write = async (name, buf, text, axes) => {
    const out = await subsetFont(buf, text, { targetFormat: "sfnt", variationAxes: axes, preserveNameIds: [0, 1, 2, 3, 4, 5, 6] });
    const file = join(dir, name);
    writeFileSync(file, out);
    files.push(file);
  };
  let latin = "";
  for (let c = 0x20; c < 0x7f; c++) latin += String.fromCharCode(c);
  latin += "·–—’→";
  await write("excalifont.ttf", exc, latin);
  // One bold instance only: every Nunito line on the card is 700/800, and the
  // Fontsource file bakes the family name "Nunito ExtraLight" into every
  // instance, so a second weight would be ambiguous to the renderer.
  await write("nunito-700.ttf", nun, latin, { wght: 700 });
  return files;
}

function render(svg, width, fontFiles) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: NUNITO },
  });
  return r.render().asPng();
}

// ---------------------------------------------------------------- favicon --
function faviconSvg({ opaque = false, darkStyle = false } = {}) {
  const S = (seed, extra = {}) => ({ roughness: 1.4, bowing: 1.4, seed, fixedDecimalPlaceDigits: 1, ...extra });
  const border = paths([gen.rectangle(18, 18, 144, 144, S(1, { stroke: INK, strokeWidth: 7 }))], ' class="ink"');
  const chevron = paths([
    gen.linearPath([[54, 56], [96, 90], [54, 124]], S(2, { stroke: BALLPOINT, strokeWidth: 13 })),
  ]);
  const dash = paths([gen.line(104, 124, 138, 124, S(3, { stroke: HL, strokeWidth: 15, disableMultiStroke: true }))]);
  const bg = opaque
    ? `<rect class="paper" width="180" height="180" fill="${PAPER}"/>`
    : `<rect class="paper" x="4" y="4" width="172" height="172" rx="38" fill="${PAPER}"/>`;
  // Browser tabs in dark mode get a slate tile; the raster renders stay light.
  const style = darkStyle
    ? "<style>@media (prefers-color-scheme: dark){.paper{fill:#1C2522}.ink{stroke:#F1EDE4}}</style>"
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="rahul kar">${style}${bg}${dash}${border}${chevron}</svg>\n`;
}

// --------------------------------------------------------------- og card --
function ogSvg(bonsaiInner) {
  const S = (seed, extra = {}) => ({ roughness: 1.3, bowing: 1.3, seed, fixedDecimalPlaceDigits: 1, ...extra });
  const frame = paths([gen.rectangle(44, 44, 1112, 542, S(11, { stroke: INK, strokeWidth: 3 }))]);
  // Highlighter scribble behind the name.
  const hl = paths([
    gen.rectangle(84, 196, 560, 86, S(12, { fill: HL, fillStyle: "hachure", hachureAngle: -4, hachureGap: 11, fillWeight: 11, stroke: "none", roughness: 1.6 })),
  ]);
  const stamp = paths([
    gen.rectangle(0, 0, 190, 58, S(13, { stroke: GREEN, strokeWidth: 3 })),
    gen.rectangle(6, 6, 178, 46, S(14, { stroke: GREEN, strokeWidth: 2 })),
  ]);
  const sticker = (x, y, w, label, seed) =>
    `<g transform="translate(${x} ${y}) rotate(${seed % 2 ? -1.5 : 1.2})"><rect x="0" y="0" width="${w}" height="54" rx="27" fill="#fff" stroke="#fff" stroke-width="5"/><rect x="0" y="3" width="${w}" height="54" rx="27" fill="rgba(42,38,34,.18)" style="" /><rect x="0" y="0" width="${w}" height="54" rx="27" fill="#fff"/><text x="${w / 2}" y="35" text-anchor="middle" font-family="${NUNITO}" font-weight="700" font-size="24" fill="${INK}">${label}</text></g>`;
  const tape = (x, y, rot) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})" opacity="0.75"><rect x="0" y="0" width="150" height="34" fill="rgba(255,214,120,.55)"/><rect x="0" y="0" width="150" height="34" fill="url(#tapeStripes)"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1.4" fill="rgba(42,38,34,.16)"/></pattern>
  <pattern id="tapeStripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="rgba(255,214,120,.35)"/></pattern>
</defs>
<rect width="1200" height="630" fill="${PAPER}"/>
<rect width="1200" height="630" fill="url(#dots)"/>
${frame}
${tape(40, 26, -8)}${tape(1010, 28, 7)}
${hl}
<text x="86" y="266" font-family="Excalifont" font-size="112" fill="${INK}">Rahul Kar</text>
<text x="88" y="330" font-family="${NUNITO}" font-weight="700" font-size="38" fill="${INK2}">Enterprise Solution Architect &amp; Technology Lead</text>
${sticker(88, 380, 236, "architecture", 1)}${sticker(344, 380, 160, "tooling", 2)}${sticker(524, 380, 214, "agentic AI", 3)}
<g transform="translate(880 376) rotate(-6)">${stamp}<text x="95" y="38" text-anchor="middle" font-family="${NUNITO}" font-weight="800" font-size="22" letter-spacing="3" fill="${GREEN}">11+ YEARS</text></g>
<text x="88" y="520" font-family="Excalifont" font-size="32" fill="${INK3}">11+ years · based in India · www.rahulkar.com</text>
<g transform="translate(880 440) scale(1.45)" fill="none" stroke="${GREEN}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">${bonsaiInner}</g>
</svg>`;
}

// ------------------------------------------------- wide cards and banners --
// One layout routine for the LinkedIn banner, the GitHub profile header and
// the email signature card: paper, dots, rough frame, highlighted name,
// title, sticker row, URL line and the bonsai at the right.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function wideSvg(o, bonsaiInner) {
  const S = (seed, extra = {}) => ({ roughness: 1.3, bowing: 1.3, seed, fixedDecimalPlaceDigits: 1, ...extra });
  const frame = paths([gen.rectangle(o.pad, o.pad, o.w - o.pad * 2, o.h - o.pad * 2, S(o.seed, { stroke: INK, strokeWidth: 3 }))]);
  const hlWidth = o.name.size * 2.95;
  const hl = paths([
    gen.rectangle(o.x - 4, o.name.y - o.name.size * 0.74, hlWidth, o.name.size * 0.86, S(o.seed + 1, { fill: HL, fillStyle: "hachure", hachureAngle: -4, hachureGap: o.name.size / 10, fillWeight: o.name.size / 10, stroke: "none", roughness: 1.6 })),
  ]);
  const sticker = (x, y, w, label, seed) =>
    `<g transform="translate(${x} ${y}) rotate(${seed % 2 ? -1.5 : 1.2})"><rect x="0" y="3" width="${w}" height="${o.stickerH}" rx="${o.stickerH / 2}" fill="rgba(42,38,34,.18)"/><rect x="0" y="0" width="${w}" height="${o.stickerH}" rx="${o.stickerH / 2}" fill="#fff" stroke="#fff" stroke-width="4"/><text x="${w / 2}" y="${o.stickerH * 0.66}" text-anchor="middle" font-family="${NUNITO}" font-weight="700" font-size="${o.stickerH * 0.44}" fill="${INK}">${label}</text></g>`;
  let stickers = "";
  if (o.stickers) {
    let x = o.x;
    for (const [i, [label, w]] of [["architecture", 5.2], ["tooling", 3.6], ["agentic AI", 4.6]].entries()) {
      const width = Math.round(w * o.stickerH);
      stickers += sticker(x, o.stickers.y, width, label, i + 1);
      x += width + o.stickerH * 0.45;
    }
  }
  const bonsai = bonsaiInner
    ? `<g transform="translate(${o.bonsai.x} ${o.bonsai.y}) scale(${o.bonsai.scale})" fill="none" stroke="${GREEN}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">${bonsaiInner}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.w}" height="${o.h}" viewBox="0 0 ${o.w} ${o.h}">
<defs><pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1.4" fill="rgba(42,38,34,.16)"/></pattern></defs>
<rect width="${o.w}" height="${o.h}" fill="${PAPER}"/><rect width="${o.w}" height="${o.h}" fill="url(#dots)"/>
${frame}${hl}
<text x="${o.x}" y="${o.name.y}" font-family="Excalifont" font-size="${o.name.size}" fill="${INK}">Rahul Kar</text>
<text x="${o.x + 2}" y="${o.title.y}" font-family="${NUNITO}" font-weight="700" font-size="${o.title.size}" fill="${INK2}">Enterprise Solution Architect &amp; Technology Lead</text>
${stickers}
<text x="${o.x + 2}" y="${o.url.y}" font-family="Excalifont" font-size="${o.url.size}" fill="${INK3}">${esc(o.url.text)}</text>
${bonsai}
</svg>`;
}

// A small pencil for the custom cursor (hotspot at the tip, bottom-left).
function pencilSvg(tipColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M12 20 L26 6" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M12 20 L26 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M4 28 L8 17 L15 24 Z" fill="${tipColor}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 28 L6 23 L9 26 Z" fill="${INK}"/><path d="M24 4 L28 8" stroke="${HL}" stroke-width="5" stroke-linecap="round"/></svg>`;
}

async function main() {
  const fonts = await prepareFonts();

  // Cursors (32 px, hotspot 2,30 in CSS).
  mkdirSync("assets/brand", { recursive: true });
  writeFileSync("assets/icons/cursor-pencil.png", render(pencilSvg("#E8C27A"), 32, fonts));
  writeFileSync("assets/icons/cursor-pencil-point.png", render(pencilSvg(BALLPOINT), 32, fonts));

  // Favicon family.
  const svgRounded = faviconSvg();
  writeFileSync("assets/icons/favicon-v2.svg", faviconSvg({ darkStyle: true }));
  const icoPngs = [16, 32, 48].map((w) => render(svgRounded, w, fonts));
  const ico = await pngToIco(icoPngs);
  writeFileSync("assets/favicon-v2.ico", ico);
  writeFileSync("favicon.ico", ico);
  writeFileSync("assets/icons/apple-touch-icon-v2.png", render(faviconSvg({ opaque: true }), 180, fonts));

  // Share card: reuse the pre-roughened bonsai symbol.
  const defs = readFileSync("_includes/sketch-defs.html", "utf8");
  const m = defs.match(/<symbol id="d-bonsai"[^>]*>([\s\S]*?)<\/symbol>/);
  const bonsai = m ? m[1].replace(/ pathLength="1"/g, "") : "";
  const og = ogSvg(bonsai);
  writeFileSync(join("node_modules", ".cache", "brand", "og.svg"), og);
  writeFileSync("assets/og-sketch.png", render(og, 1200, fonts));

  // Same look for other channels. LinkedIn keeps the left 440 px clear for the
  // profile photo overlay; GitHub centres; the signature is a compact card.
  const linkedin = wideSvg({ w: 1584, h: 396, pad: 28, seed: 21, x: 470, name: { y: 168, size: 92 }, title: { y: 214, size: 30 }, stickers: { y: 246 }, stickerH: 44, url: { y: 338, size: 26, text: "11+ years · Kolkata, India · www.rahulkar.com" }, bonsai: { x: 1300, y: 210, scale: 1.3 } }, bonsai);
  writeFileSync("assets/brand/linkedin-banner.png", render(linkedin, 1584, fonts));
  const github = wideSvg({ w: 1280, h: 320, pad: 24, seed: 31, x: 72, name: { y: 132, size: 84 }, title: { y: 176, size: 28 }, stickers: { y: 206 }, stickerH: 42, url: { y: 286, size: 24, text: "engineer & tinkerer · www.rahulkar.com" }, bonsai: { x: 1030, y: 150, scale: 1.2 } }, bonsai);
  writeFileSync("assets/brand/github-header.png", render(github, 1280, fonts));
  const signature = wideSvg({ w: 600, h: 200, pad: 10, seed: 41, x: 30, name: { y: 78, size: 50 }, title: { y: 108, size: 17 }, stickers: null, stickerH: 0, url: { y: 160, size: 19, text: "kar.rahul@pm.me · www.rahulkar.com" }, bonsai: { x: 470, y: 60, scale: 0.62 } }, bonsai);
  writeFileSync("assets/brand/email-signature.png", render(signature, 1200, fonts));
  console.log("brand assets written: favicons, og-sketch.png, cursors, linkedin-banner.png, github-header.png, email-signature.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
