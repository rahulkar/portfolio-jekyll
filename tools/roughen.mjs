// Pre-roughen fixed-viewBox artwork with Rough.js at build time so the browser
// ships static <path> data (no runtime cost, no SVG filters).
//   node tools/roughen.mjs          -> writes _includes/sketch-defs.html
//   node tools/roughen.mjs icons    -> rewrites the 6 generic stack icons in place
// Not part of `npm run build`; outputs are committed.
import { readFileSync, writeFileSync } from "node:fs";
import rough from "roughjs/bundled/rough.esm.js";

const gen = rough.generator();
const S = (seed, extra = {}) => ({ roughness: 1.3, bowing: 1.5, seed, fixedDecimalPlaceDigits: 1, ...extra });
// Single-stroke variant for the large margin doodles (halves their path data).
const M = (seed, extra = {}) => S(seed, { disableMultiStroke: true, ...extra });

const star = (cx, cy, R, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return pts;
};

// Each doodle: viewBox + drawables. `dots` are filled points.
const doodles = {
  "d-arrow": { vb: "0 0 64 32", draw: () => [gen.line(4, 16, 56, 16, S(11)), gen.line(44, 6, 58, 16, S(12)), gen.line(44, 26, 58, 16, S(13))] },
  "d-arrow-curl": { vb: "0 0 48 48", draw: () => [gen.curve([[6, 40], [10, 18], [28, 8], [42, 20]], S(21, { bowing: 1 })), gen.line(42, 20, 31, 16, S(22)), gen.line(42, 20, 39, 31, S(23))] },
  "d-star": { vb: "0 0 40 40", draw: () => [gen.polygon(star(20, 20, 17, 7), S(31, { roughness: 1.1 }))] },
  "d-asterisk": { vb: "0 0 40 40", draw: () => [gen.line(20, 4, 20, 36, S(41)), gen.line(6, 12, 34, 28, S(42)), gen.line(6, 28, 34, 12, S(43))] },
  "d-check": { vb: "0 0 24 24", draw: () => [gen.path("M4 12 l5 5 L20 6", S(51, { roughness: 1 }))] },
  "d-x": { vb: "0 0 120 120", draw: () => [gen.line(12, 12, 108, 108, S(61, { roughness: 2.4, bowing: 3 })), gen.line(108, 12, 12, 108, S(62, { roughness: 2.4, bowing: 3 }))] },
  "d-envelope": { vb: "0 0 24 24", draw: () => [gen.rectangle(2, 4, 20, 16, S(71, { roughness: 0.9 })), gen.path("M2 7 L12 13 L22 7", S(72, { roughness: 0.9 }))] },
  "d-copy": { vb: "0 0 24 24", draw: () => [gen.rectangle(8, 8, 14, 14, S(81, { roughness: 0.9 })), gen.path("M4 16 V4 H16", S(82, { roughness: 0.9 }))] },
  "d-ext": { vb: "0 0 24 24", draw: () => [gen.line(7, 17, 17, 7, S(91, { roughness: 0.9 })), gen.path("M8 7 H17 V16", S(92, { roughness: 0.9 }))] },
  "d-clip": { vb: "0 0 26 64", draw: () => [gen.path("M18 10 v38 a6 6 0 0 1 -12 0 V16 a4 4 0 0 1 8 0 v30", S(101, { roughness: 0.8, bowing: 0.8 }))] },
  "d-coffee": { vb: "0 0 220 220", dp: 0, draw: () => [gen.ellipse(110, 110, 180, 168, S(111, { roughness: 2.6, bowing: 2, disableMultiStroke: true })), gen.ellipse(112, 108, 170, 158, S(112, { roughness: 2.2, bowing: 2, disableMultiStroke: true }))] },
  "d-rule": { vb: "0 0 600 16", draw: () => [gen.curve([[4, 8], [120, 6], [240, 10], [360, 6], [480, 10], [596, 8]], S(131, { roughness: 1.6, bowing: 1, disableMultiStroke: true }))] },
  "d-bonsai": {
    vb: "0 0 180 120",
    dp: 0,
    draw: () => [
      gen.path("M90 92c-4-14 2-24 0-38", M(201)),
      gen.path("M90 58c-16-2-28-10-34-22m34 18c14-4 24-12 30-26m-28 34c18 0 32 8 40 18m-42-14c-18 5-30 14-38 28", M(202)),
      gen.path("M54 36c10-14 24-10 36 18m30-26c16 8 12 24-28 34m40 18c-10 13-26 9-40-14M52 94c-8-13 8-25 38-28", M(203)),
      gen.path("M56 92h68l-8 16H64z", M(204)),
      gen.path("M70 108h40", M(205)),
    ],
  },
  "d-probe": {
    vb: "0 0 180 120",
    dp: 0,
    draw: () => [
      gen.circle(78, 58, 32, M(211)),
      gen.path("M78 42V24m0 52v22m-16-40H38m56 0h24", M(212)),
      gen.path("M116 58l34-18m-34 18l34 18", M(213)),
      gen.path("M150 40l10-5m-10 41l10 5", M(214)),
      gen.path("M50 58L28 42m22 16L28 74", M(215)),
      gen.path("M70 50h16m-16 8h16m-16 8h16", M(216)),
      gen.path("M94 34l12-10m-44 10L50 24", M(217)),
    ],
    dots: [[78, 58, 4]],
  },
  "d-sbc": {
    vb: "0 0 180 120",
    dp: 0,
    draw: () => [
      gen.rectangle(42, 26, 96, 68, M(221)),
      gen.rectangle(60, 44, 22, 18, M(222)),
      gen.rectangle(96, 40, 24, 26, M(223)),
      gen.circle(58, 82, 8, M(224)),
      gen.circle(122, 82, 8, M(225)),
      gen.path("M42 42H26m16 16H20m22 16H28m110-32h16m-16 16h22m-22 16h14", M(226)),
      gen.path("M68 26v-8m16 8v-8m16 8v-8m16 8v-8M68 102v-8m16 8v-8m16 8v-8m16 8v-8", M(227)),
      gen.path("M118 40l16-16m-6 4h10v10", M(228)),
    ],
  },
  "d-circuit": {
    vb: "0 0 320 280",
    dp: 0,
    draw: () => [
      gen.path("M10 40 H120 L150 70 H220 L240 50 H310", M(231, { roughness: 1 })),
      gen.path("M10 100 H80 L100 120 V180 L120 200 H260", M(232, { roughness: 1 })),
      gen.path("M10 160 H50 L70 140 H140", M(233, { roughness: 1 })),
      gen.path("M180 240 H260 L280 220 V100", M(234, { roughness: 1 })),
      gen.rectangle(140, 130, 40, 24, M(235)),
      gen.rectangle(230, 30, 30, 18, M(236)),
      gen.path("M148 154 v6 M156 154 v6 M164 154 v6 M172 154 v6", M(237)),
      gen.path("M236 48 v6 M244 48 v6 M252 48 v6", M(238)),
    ],
    dots: [[120, 40, 3], [220, 70, 3], [100, 120, 3], [260, 200, 3], [280, 100, 3]],
  },
};

// toPaths() ignores fixedDecimalPlaceDigits and emits full doubles; round the
// coordinates ourselves (1 dp for icons, 0 dp for the large margin doodles).
const round = (d, dp) => d.replace(/-?\d+\.\d+/g, (m) => String(+(+m).toFixed(dp)));
const pathsOf = (drawables, dp = 1) =>
  drawables.flatMap((d) => gen.toPaths(d)).map((p) => `<path pathLength="1" d="${round(p.d, dp)}"/>`).join("");

function writeDefs() {
  const symbols = Object.entries(doodles).map(([id, def]) => {
    const dots = (def.dots || []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`).join("");
    return `  <symbol id="${id}" viewBox="${def.vb}">${pathsOf(def.draw(), def.dp)}${dots}</symbol>`;
  });
  const out = [
    "{% comment %}Generated by tools/roughen.mjs - do not edit by hand.{% endcomment %}",
    '<svg class="sk-defs" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">',
    "<defs>",
    ...symbols,
    "</defs>",
    "</svg>",
    "",
  ].join("\n");
  writeFileSync("_includes/sketch-defs.html", out);
  console.log(`sketch-defs.html: ${symbols.length} symbols, ${out.length} bytes`);
}

// Generic Lucide-style icons: parse primitives, roughen, bake ink + one accent.
const ICONS = {
  "solution-architecture": { accent: "#1F4E9C", accentIndex: 3 },
  "proof-of-concepts": { accent: "#B03A2E", accentIndex: 0 },
  "enterprise-delivery": { accent: "#1F6F48", accentIndex: 0 },
  "platform-strategy": { accent: "#1F4E9C", accentIndex: 1 },
  "roadmapping": { accent: "#1F4E9C", accentIndex: 1 },
  "llm": { accent: "#1F4E9C", accentIndex: 1 },
};

function roughenIcons() {
  let seed = 300;
  for (const [name, cfg] of Object.entries(ICONS)) {
    const file = `assets/icons/stack/${name}.svg`;
    const src = readFileSync(file, "utf8");
    const prims = [];
    for (const m of src.matchAll(/<(rect|circle|path)\b([^>]*)\/?>/g)) {
      const attr = (k) => {
        const r = m[2].match(new RegExp("\\b" + k + '="([^"]*)"'));
        return r ? r[1] : null;
      };
      const o = S(seed++, { roughness: 1.1, bowing: 1 });
      if (m[1] === "rect") {
        prims.push(gen.rectangle(+attr("x"), +attr("y"), +attr("width"), +attr("height"), o));
      } else if (m[1] === "circle") {
        const r = +attr("r");
        if (r < 1) prims.push({ dot: [+attr("cx"), +attr("cy"), r + 0.4] });
        else prims.push(gen.circle(+attr("cx"), +attr("cy"), r * 2, o));
      } else {
        prims.push(gen.path(attr("d"), o));
      }
    }
    const body = prims
      .map((p, i) => {
        if (p.dot) return `<circle cx="${p.dot[0]}" cy="${p.dot[1]}" r="${p.dot[2]}" fill="#2A2622" stroke="none"/>`;
        const stroke = i === cfg.accentIndex ? ` stroke="${cfg.accent}"` : "";
        return gen.toPaths(p).map((info) => `<path${stroke} d="${round(info.d, 1)}"/>`).join("");
      })
      .join("");
    const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2A2622" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
    writeFileSync(file, out);
    console.log(`${file}: ${out.length} bytes`);
  }
}

if (process.argv[2] === "icons") roughenIcons();
else writeDefs();
