// A share card for each note (the og:image that LinkedIn, X and the rest
// show with a link): the note's title and summary set as outlines, its date,
// and its line drawing from _includes/art/ on a framed plate, in the datum
// colours. Run after adding a note or changing its title or summary:
//   npm run cards
// Each card is written to the path in the note's `image.path`, and notes
// without one are skipped. /assets/* is cached for a year, so a changed card
// needs a new name: bump the -vN in `image.path` first. Outputs are committed.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { loadFonts, layout, text, svg, render, BG, INK, INK2, INK3 } from "./brand.mjs";

const RULE = "#D6D4CD";
const INSET = "#ECEAE4";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The front matter keys a card needs: plain `key: value` lines, inline
// [a, b] lists, and the keys nested one level under `image:`.
function frontMatter(file) {
  const src = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const block = /^---\n([\s\S]*?)\n---/.exec(src);
  const data = {};
  let parent = null;
  for (const line of block ? block[1].split("\n") : []) {
    const m = /^(\s*)([\w-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[3].trim();
    if (/^".*"$|^'.*'$/.test(value)) value = value.slice(1, -1);
    else if (/^\[.*\]$/.test(value)) value = value.slice(1, -1).split(",").map((v) => v.trim()).filter(Boolean);
    if (m[1] && parent) data[parent][m[2]] = value;
    else if (value === "") data[(parent = m[2])] = {};
    else {
      data[m[2]] = value;
      parent = null;
    }
  }
  return data;
}

// Line breaks at word boundaries within `width`, balanced like CSS
// `text-wrap: balance`: the same number of lines, as even as they go. A
// number stays with the unit after it (60 MHz, 32 KB).
function wrap(font, str, size, width, tracking = 0) {
  const words = str.split(/\s+/).reduce((out, word) => {
    if (out.length && /^\d[\d.,]*$/.test(out[out.length - 1]) && /^[A-Za-zµ]{1,4}\b/.test(word)) out[out.length - 1] += ` ${word}`;
    else out.push(word);
    return out;
  }, []);
  const greedy = (w) => {
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && layout(font, next, size, tracking).width > w) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = greedy(width);
  for (let w = width - 8; lines.length > 1 && w > width / 2; w -= 8) {
    const tighter = greedy(w);
    if (tighter.length > lines.length) break;
    lines = tighter;
  }
  return lines;
}

// The note's drawing, styled for the renderer with the same classes as
// _art.scss. On the card its lines scale with it, so they read at the size
// the networks show a card.
const ART_STYLE = `<style>
.art{fill:none;stroke:${INK2};stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}
.art__key{stroke:${INK}}
.art__guide{stroke:${INK3};stroke-width:1}
.art__faint{stroke:${INK3};stroke-width:1;stroke-dasharray:3 3}
.art__columns{stroke:${RULE};stroke-width:1;stroke-dasharray:2 3}
.art__paper{fill:${BG}}
.art__fill,.art__glass{fill:${INSET}}
.art__ink{fill:${INK};stroke:none}
.art__notch{fill:${INSET};stroke:none}
.art__pins{stroke:${INK};stroke-width:1.75;stroke-linecap:butt}
.art__wire{stroke-width:2}
.art__holes{stroke:${INK3};stroke-width:2;stroke-linecap:butt;stroke-dasharray:2 6}
.art__holes--grid{stroke:${INK2};stroke-dasharray:2 5}
.art__holes--cells{stroke:${RULE};stroke-width:7;stroke-dasharray:2.5 1}
.art__holes--ticks{stroke-width:4;stroke-dasharray:1 8.5}
</style>`;

function art(name, x, y, w) {
  const file = `_includes/art/${name}.html`;
  if (!existsSync(file)) return "";
  const markup = readFileSync(file, "utf8").replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, "").trim();
  const view = /viewBox="0 0 (\d+) (\d+)"/.exec(markup);
  const h = view ? (w * Number(view[2])) / Number(view[1]) : (w * 4) / 7;
  return markup.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\swidth="[^"]*"/, ` x="${x}" y="${y.toFixed(1)}" width="${w}"`)
      .replace(/\sheight="[^"]*"/, ` height="${h.toFixed(1)}"`)
      .replace(/\s(aria-hidden|focusable)="[^"]*"/g, "")
  );
}

function card(f, note) {
  const [y, m, d] = String(note.date).split("-").map(Number);
  const date = `${d} ${MONTHS[m - 1]} ${y}`.toUpperCase();
  let body = text(f.mono, "www.rahulkar.com/notes", 80, 92, 18, INK3);
  body += `<rect x="80" y="122" width="1040" height="2" fill="${INK}"/>`;

  // Title and summary on the left; the drawing on a plate on the right.
  const width = note.art ? 560 : 1000;
  let size = 76;
  let title = wrap(f.s600, note.title, size, width, -0.03);
  if (title.length > 2) {
    size = 60;
    title = wrap(f.s600, note.title, size, width, -0.03).slice(0, 3);
  }
  let ty = 200 + size * 0.15;
  for (const line of title) {
    body += text(f.s600, line, 76, ty, size, INK, { tracking: -0.03 });
    ty += size * 1.04;
  }
  let dy = ty + 14;
  for (const line of wrap(f.s450, note.description || "", 27, width).slice(0, 4)) {
    body += text(f.s450, line, 80, dy, 27, INK2, { tracking: -0.005 });
    dy += 38;
  }
  body += text(f.mono, `RAHUL KAR · ${date}`, 80, 566, 17, INK3, { tracking: 0.06 });

  if (note.art) {
    body += `<rect x="700.75" y="170.75" width="418.5" height="298.5" fill="none" stroke="${RULE}" stroke-width="1.5"/>`;
    body += art(note.art, 730, 320 - 360 * (4 / 7) / 2, 360);
  }
  return svg(1200, 630, ART_STYLE + body);
}

async function main() {
  const notes = readdirSync("_notes")
    .filter((n) => n.endsWith(".md"))
    .map((n) => ({ file: `_notes/${n}`, ...frontMatter(`_notes/${n}`) }));
  // Subset the fonts to every character the cards set.
  const chars = [...new Set(notes.map((n) => `${n.title}${n.description}`).join(""))].filter((c) => c.charCodeAt(0) > 0x7e).join("");
  const f = await loadFonts(chars);
  for (const note of notes) {
    const out = note.image && note.image.path ? note.image.path.replace(/^\//, "") : "";
    if (!out) {
      console.log(`${note.file}: no image.path, skipped`);
      continue;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(card(f, note), 1200));
    console.log(`${note.file}: ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
