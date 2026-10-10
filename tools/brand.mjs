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
function faviconSvg({ opaque = false } = {}) {
  const S = (seed, extra = {}) => ({ roughness: 1.4, bowing: 1.4, seed, fixedDecimalPlaceDigits: 1, ...extra });
  const border = paths([gen.rectangle(18, 18, 144, 144, S(1, { stroke: INK, strokeWidth: 7 }))]);
  const chevron = paths([
    gen.linearPath([[54, 56], [96, 90], [54, 124]], S(2, { stroke: BALLPOINT, strokeWidth: 13 })),
  ]);
  const dash = paths([gen.line(104, 124, 138, 124, S(3, { stroke: HL, strokeWidth: 15, disableMultiStroke: true }))]);
  const bg = opaque
    ? `<rect width="180" height="180" fill="${PAPER}"/>`
    : `<rect x="4" y="4" width="172" height="172" rx="38" fill="${PAPER}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="rahul kar">${bg}${dash}${border}${chevron}</svg>\n`;
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

async function main() {
  const fonts = await prepareFonts();

  // Favicon family.
  const svgRounded = faviconSvg();
  writeFileSync("assets/icons/favicon-v2.svg", svgRounded);
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
  console.log("brand assets written: favicon-v2.svg, favicon-v2.ico, favicon.ico, apple-touch-icon-v2.png, og-sketch.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
