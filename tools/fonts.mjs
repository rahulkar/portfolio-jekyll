// Subsets the two site typefaces to the Latin range the site uses, copies their
// OFL notices, and writes src/styles/_font-faces.scss with the web faces plus
// metric-matched local fallbacks (so the swap does not reflow the page).
//   npm run fonts
// Not part of `npm run build`; the outputs are committed. Any change to a font
// file must bump its -vN name here: the live site caches /assets/* for a year.
// Fallback metrics read Arial and Consolas from C:/Windows/Fonts (override with
// FALLBACK_FONT_DIR); Roboto comes from @capsizecss/metrics.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";
import opentype from "opentype.js";
import arialMetrics from "@capsizecss/metrics/arial";
import robotoMetrics from "@capsizecss/metrics/roboto";

const FAMILIES = [
  {
    name: "Instrument Sans",
    pkg: "@fontsource-variable/instrument-sans",
    file: /^instrument-sans-latin-wght-normal\.woff2$/,
    out: "instrument-sans-v1.woff2",
    license: "OFL-InstrumentSans.txt",
  },
  {
    name: "Fragment Mono",
    pkg: "@fontsource/fragment-mono",
    file: /^fragment-mono-latin-400-normal\.woff2$/,
    out: "fragment-mono-v1.woff2",
    license: "OFL-FragmentMono.txt",
  },
];

// Basic Latin, Latin-1 Supplement, dashes, curly quotes, bullet, ellipsis and
// the minus sign. Arrows are inline SVG, so they are not in the subset.
const RANGES = [
  [0x0020, 0x007e], [0x00a0, 0x00ff], [0x2013, 0x2014], [0x2018, 0x201d],
  [0x2022, 0x2022], [0x2026, 0x2026], [0x2212, 0x2212],
];
const TEXT = RANGES.map(([a, b]) => { let s = ""; for (let c = a; c <= b; c++) s += String.fromCodePoint(c); return s; }).join("");
const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0");
const UNICODE_RANGE = RANGES.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(", ");

const LEDE = "I take ambiguous problems to a working prototype in days, then to a platform your team can run without me.";
const NAME = "Rahul Kar";

const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const parse = (buf) => opentype.parse(toArrayBuffer(buf));
const pct = (n) => `${(n * 100).toFixed(2)}%`;

function source(fam) {
  const dir = join("node_modules", fam.pkg, "files");
  const files = readdirSync(dir);
  const hit = files.find((f) => fam.file.test(f));
  if (!hit) throw new Error(`${fam.pkg}: no file matches ${fam.file}. Present: ${files.join(", ")}`);
  return readFileSync(join(dir, hit));
}

function checkLicense(fam) {
  const text = readFileSync(join("node_modules", fam.pkg, "LICENSE"), "utf8");
  // Every OFL body defines the phrase "Reserved Font Name", so only the
  // copyright header (before the licence text) is checked.
  const header = text.split("This Font Software is licensed under the SIL Open Font License")[0];
  if (/with Reserved Font Name/i.test(header)) throw new Error(`${fam.name} declares a Reserved Font Name; a subset must be renamed`);
  writeFileSync(join("assets/fonts", fam.license), text);
}

// Vertical metrics in em, from OS/2 typo values when USE_TYPO_METRICS is set.
function vmetrics(font) {
  const os2 = font.tables.os2;
  const useTypo = os2 && (os2.fsSelection & 0x80);
  const upm = font.unitsPerEm;
  const asc = useTypo ? os2.sTypoAscender : font.tables.hhea.ascender;
  const desc = useTypo ? os2.sTypoDescender : font.tables.hhea.descender;
  const gap = useTypo ? os2.sTypoLineGap : font.tables.hhea.lineGap;
  return { asc: asc / upm, desc: Math.abs(desc) / upm, gap: gap / upm };
}

function fallbackFace(family, src, weight, size, web) {
  return `@font-face {
  font-family: "${family}";
  src: ${src.map((s) => `local("${s}")`).join(", ")};
  font-weight: ${weight};
  size-adjust: ${pct(size)};
  ascent-override: ${pct(web.asc / size)};
  descent-override: ${pct(web.desc / size)};
  line-gap-override: ${pct(web.gap / size)};
}`;
}

const sysDir = process.env.FALLBACK_FONT_DIR || "C:/Windows/Fonts";
const sysFont = (file) => {
  const p = join(sysDir, file);
  if (!existsSync(p)) throw new Error(`${p} is missing; set FALLBACK_FONT_DIR to a folder with ${file}`);
  return parse(readFileSync(p));
};

const faces = [];
let sansWeights = "400 700";

for (const fam of FAMILIES) {
  const input = source(fam);
  const sfnt = await subsetFont(input, TEXT, { targetFormat: "sfnt" });
  const axes = (parse(sfnt).tables.fvar?.axes) || [];
  const variationAxes = {};
  for (const a of axes) if (a.tag === "wdth") variationAxes.wdth = 100;
  const wght = axes.find((a) => a.tag === "wght");
  if (wght && fam.name === "Instrument Sans") sansWeights = `${wght.minValue} ${wght.maxValue}`;
  const opts = { targetFormat: "woff2", preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 7, 13, 14] };
  if (Object.keys(variationAxes).length) opts.variationAxes = variationAxes;
  const out = await subsetFont(input, TEXT, opts);
  writeFileSync(join("assets/fonts", fam.out), out);
  checkLicense(fam);
  console.log(`${fam.out}: ${input.length} -> ${out.length} bytes (axes: ${axes.map((a) => a.tag).join(",") || "none"})`);
  faces.push(`@font-face {
  font-family: "${fam.name}";
  src: url("/assets/fonts/${fam.out}") format("woff2");
  font-weight: ${fam.name === "Instrument Sans" ? sansWeights : 400};
  font-style: normal;
  font-display: swap;
  unicode-range: ${UNICODE_RANGE};
}`);
}

// Fallback metrics. Sizes compare the advance width of real copy.
const sansRaw = source(FAMILIES[0]);
const sans450 = parse(await subsetFont(sansRaw, TEXT, { targetFormat: "sfnt", variationAxes: { wght: 450 } }));
const sans600 = parse(await subsetFont(sansRaw, TEXT, { targetFormat: "sfnt", variationAxes: { wght: 600 } }));
const mono = parse(await subsetFont(source(FAMILIES[1]), TEXT, { targetFormat: "sfnt" }));
const arial = sysFont("arial.ttf");
const arialBold = sysFont("arialbd.ttf");
const consolas = sysFont("consola.ttf");

const adv = (font, s) => font.getAdvanceWidth(s, 1, { kerning: true });
const sizeArial = adv(sans450, LEDE) / adv(arial, LEDE);
const sizeArialBold = adv(sans600, NAME) / adv(arialBold, NAME);
const sizeRoboto = sizeArial * (arialMetrics.xWidthAvg / arialMetrics.unitsPerEm) / (robotoMetrics.xWidthAvg / robotoMetrics.unitsPerEm);
const monoAdvance = adv(mono, "0");
const sizeConsolas = monoAdvance / adv(consolas, "0");
// Menlo shares DejaVu Sans Mono's advance: 1233 / 2048 em.
const sizeMenlo = monoAdvance / (1233 / 2048);

const sansV = vmetrics(sans450);
const monoV = vmetrics(mono);
faces.push(
  fallbackFace("Instrument Sans Fallback", ["Arial", "ArialMT", "Liberation Sans"], "400 500", sizeArial, sansV),
  fallbackFace("Instrument Sans Fallback", ["Arial Bold", "Arial-BoldMT", "Liberation Sans Bold"], "600 700", sizeArialBold, sansV),
  fallbackFace("Instrument Sans Fallback Roboto", ["Roboto", "Roboto-Regular"], "400 700", sizeRoboto, sansV),
  fallbackFace("Fragment Mono Fallback", ["Consolas"], "400", sizeConsolas, monoV),
  fallbackFace("Fragment Mono Fallback Menlo", ["Menlo Regular", "Menlo-Regular", "DejaVu Sans Mono"], "400", sizeMenlo, monoV),
);

writeFileSync(
  "src/styles/_font-faces.scss",
  `// Generated by tools/fonts.mjs - do not edit by hand.\n\n${faces.join("\n\n")}\n`,
);
console.log(`fallback sizes: arial ${pct(sizeArial)}, arial bold ${pct(sizeArialBold)}, roboto ${pct(sizeRoboto)}, consolas ${pct(sizeConsolas)}, menlo ${pct(sizeMenlo)}`);
