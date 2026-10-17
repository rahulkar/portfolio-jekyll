// Turn a phone photo (HEIC/JPEG/PNG) into web-ready, metadata-stripped
// WebP + JPEG renditions for photos on the site (plain figures).
//   node tools/photo.mjs <input> <name> [maxWidth=1280]
// Writes assets/img/<name>-{640,<maxWidth>}.{webp,jpg}.
// Not part of `npm run build`; outputs are committed. EXIF (including GPS)
// is dropped because sharp only keeps metadata when asked to.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";
import heicConvert from "heic-convert";

const [input, name, maxArg] = process.argv.slice(2);
if (!input || !name) {
  console.error("usage: node tools/photo.mjs <input> <name> [maxWidth]");
  process.exit(1);
}
const maxWidth = Number(maxArg) || 1280;

let source = readFileSync(input);
if (extname(input).toLowerCase() === ".heic" || extname(input).toLowerCase() === ".heif") {
  source = Buffer.from(await heicConvert({ buffer: source, format: "PNG" }));
}

const base = sharp(source).rotate();
const meta = await base.metadata();
console.log(`source: ${meta.width}x${meta.height}`);

mkdirSync("assets/img", { recursive: true });
const widths = [640, maxWidth].filter((w, i, a) => a.indexOf(w) === i);
for (const w of widths) {
  const resized = base.clone().resize({ width: w, withoutEnlargement: true });
  const webp = await resized.clone().webp({ quality: 72 }).toBuffer();
  writeFileSync(join("assets/img", `${name}-${w}.webp`), webp);
  const jpg = await resized.clone().jpeg({ quality: 76, mozjpeg: true }).toBuffer();
  writeFileSync(join("assets/img", `${name}-${w}.jpg`), jpg);
  console.log(`${name}-${w}: webp ${webp.length} B, jpg ${jpg.length} B`);
}

// A quick preview for the person running the script.
const previewPath = process.env.PHOTO_PREVIEW;
if (previewPath) {
  writeFileSync(previewPath, await base.clone().resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer());
  console.log(`preview -> ${previewPath}`);
}
