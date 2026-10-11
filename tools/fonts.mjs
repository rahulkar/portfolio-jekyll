// One-off: subset the Excalifont woff2 to the Latin range the site uses.
// Usage: node tools/fonts.mjs <path/to/Excalifont-Regular.woff2>
// Not part of `npm run build`; the output is committed to assets/fonts/.
import { readFileSync, writeFileSync } from "node:fs";
import subsetFont from "subset-font";

const src = process.argv[2];
if (!src) {
  console.error("usage: node tools/fonts.mjs <Excalifont-Regular.woff2>");
  process.exit(1);
}

// Basic Latin, Latin-1 Supplement, dashes, curly quotes, bullet, ellipsis,
// arrows and the minus sign. Mirrors a pyftsubset --unicodes list.
const ranges = [
  [0x0020, 0x007e], [0x00a0, 0x00ff], [0x2013, 0x2014], [0x2018, 0x201d],
  [0x2022, 0x2022], [0x2026, 0x2026], [0x2190, 0x2193], [0x2212, 0x2212],
];
let text = "";
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);

const input = readFileSync(src);
const out = await subsetFont(input, text, {
  targetFormat: "woff2",
  // Keep copyright, family/style names, trademark, licence text and URL so the
  // OFL notice travels inside the file as well as in OFL-Excalifont.txt.
  preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 7, 13, 14],
});
writeFileSync("assets/fonts/excalifont.woff2", out);
console.log(`excalifont.woff2: ${input.length} -> ${out.length} bytes (${text.length} code points)`);
