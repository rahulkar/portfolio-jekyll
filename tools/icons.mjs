// Writes _includes/icon.html: the site's own icons, drawn here on a 14px grid,
// plus the ones the site uses from two icon packs, Lucide (ISC) and Tabler
// Icons (MIT), which share a 24px grid with round caps. Every line is set at
// 1.5px; `svg.icon *` keeps it there at any size (non-scaling strokes), so the
// packs and the site's own icons read as one set.
//
// Add an icon: put its name and source in PACK below, run `npm run icons`, and
// use it as {% include icon.html name="..." class="icon--md" %}. Only the
// icons listed here reach the page; the packs stay in node_modules.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

const OWN = {
  arrow: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M1 7h11M8 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  external: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M4 10l6-6M5 4h5v5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  theme: '<svg class="icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.75a7.25 7.25 0 0 0 0 14.5z" fill="currentColor"/></svg>',
  search: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.25 9.25l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  page: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M2.75 1.75h5.5l3 3v7.5h-8.5zM5 7.25h4M5 9.75h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  note: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M1.75 3h10.5M1.75 7h10.5M1.75 11h6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  hash: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M5.5 1.5l-1 11M9.5 1.5l-1 11M2 4.75h10.5M1.5 9.25H12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  mail: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M1.75 3h10.5v8H1.75zM1.75 3.5L7 7.75l5.25-4.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  copy: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M4.75 4.75h7.5v7.5h-7.5zM1.75 9.25v-7.5h7.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  grid: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M1.75 1.75h10.5v10.5H1.75zM5.25 1.75v10.5M8.75 1.75v10.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  download: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M7 1.5v8M3.5 6L7 9.5 10.5 6M2 12.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  code: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M4.5 3.5L1 7l3.5 3.5M9.5 3.5L13 7l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>',
  feed: '<svg class="icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M2.5 2.25a9.25 9.25 0 0 1 9.25 9.25M2.5 6.25a5.25 5.25 0 0 1 5.25 5.25" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="3.25" cy="10.75" r="1.25" fill="currentColor"/></svg>',
};

// Name on the site: "pack:icon" (a bare icon name means Lucide).
const PACK = {
  // How I work: what each step produces (_data/playbook.yml)
  "file-text": "file-text",
  network: "network",
  "triangle-alert": "triangle-alert",
  "list-checks": "list-checks",
  "flask-conical": "flask-conical",
  calculator: "calculator",
  split: "split",
  workflow: "workflow",
  milestone: "milestone",
  infinity: "infinity",
  "book-open-text": "book-open-text",
  // Home: the Background groups (_data/capabilities.yml) and the About line
  "badge-check": "badge-check",
  "cloud-cog": "cloud-cog",
  blocks: "blocks",
  bot: "bot",
  terminal: "square-terminal",
  cpu: "cpu",
  bitcoin: "bitcoin",
  megaphone: "megaphone",
  "circuit-board": "circuit-board",
  orbit: "orbit",
  // Notes (the `icon` in each note's front matter)
  microchip: "microchip",
  "code-xml": "code-xml",
  // Notes: share, back to top and the photo viewer
  link: "link",
  share: "share",
  "arrow-up": "arrow-up",
  close: "x",
  "brand-x": "tabler:brand-x",
  bluesky: "tabler:brand-bluesky",
  "hacker-news": "tabler:brand-ycombinator",
  reddit: "tabler:brand-reddit",
  whatsapp: "tabler:brand-whatsapp",
  // Profiles
  github: "tabler:brand-github",
  linkedin: "tabler:brand-linkedin",
  award: "award",
  contact: "contact",
};

const FILES = {
  lucide: (id) => `node_modules/lucide-static/icons/${id}.svg`,
  tabler: (id) => `node_modules/@tabler/icons/icons/outline/${id}.svg`,
};

// The drawing inside a pack's <svg>: comments, the wrapper, Tabler's
// invisible 24px frame and the indentation go.
function drawing(file) {
  return readFileSync(file, "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, "")
    .replace(/\s*\n\s*/g, "")
    .replace(/\s+\/>/g, "/>")
    .trim();
}

const CLASS = '{% if include.class %} {{ include.class }}{% endif %}';
const lines = [];
for (const [name, svg] of Object.entries(OWN)) {
  lines.push(`{%- when "${name}" -%}${svg.replace('class="icon"', `class="icon${CLASS}"`)}`);
}
for (const [name, source] of Object.entries(PACK)) {
  const [pack, id] = source.includes(":") ? source.split(":") : ["lucide", source];
  const inner = drawing(FILES[pack](id));
  if (!inner || /<(script|style|foreignObject)\b|\son[a-z]+=|style=/i.test(inner)) throw new Error(`${source}: empty or unsafe drawing`);
  lines.push(`{%- when "${name}" -%}<svg class="icon${CLASS}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`);
}

const header = "{%- comment -%} Generated by tools/icons.mjs - do not edit by hand. The site's own icons are on a 14px grid; the rest come from Lucide (ISC) and Tabler Icons (MIT), licences in /assets/icons/. Pass name, and optionally class: icon--md (18px) or icon--lg (24px). {%- endcomment -%}";
writeFileSync("_includes/icon.html", [header, "{%- case include.name -%}", ...lines, "{%- endcase %}", ""].join("\n"));

mkdirSync("assets/icons", { recursive: true });
copyFileSync("node_modules/lucide-static/LICENSE", "assets/icons/LICENSE-lucide.txt");
copyFileSync("node_modules/@tabler/icons/LICENSE", "assets/icons/LICENSE-tabler.txt");
console.log(`Wrote _includes/icon.html: ${Object.keys(OWN).length} own icons and ${Object.keys(PACK).length} from the packs.`);
