// The footer's readout: a 16 x 2 character LCD like the one on the 6502
// board in the About photo, drawn on a canvas. It starts with what that
// display shows, then gives the time in Kolkata and what this page cost to
// load. The same two facts stay in the footer as text for screen readers,
// forced colours and print (see _effects.scss); the canvas is decoration.
// Clicking it switches between the two screens.
import { istNow, hhmm } from "./clock.js";
import { measure } from "./page-weight.js";

var COLS = 16;
var ROWS = 2;
var PITCH = 3;      // one dot and the gap after it, in CSS px
var DOT = 2;
var ADVANCE_X = 17; // five dots and the space between characters
var ADVANCE_Y = 27; // eight dots and the space between the rows
var PAD = 9;
var WIDTH = 287;
var HEIGHT = 68;

// 5 x 7 glyphs, one base-32 digit per row of dots, top row first. Only the
// characters the readout uses.
var GLYPHS = {
    " ": "0000000",
    "0": "ehjlphe",
    "1": "4c4444e",
    "2": "eh1248v",
    "3": "v2421he",
    "4": "26aiv22",
    "5": "vgu11he",
    "6": "68guhhe",
    "7": "v124888",
    "8": "ehhehhe",
    "9": "ehhf12c",
    "B": "uhhuhhu",
    "C": "ehggghe",
    "K": "hikokih",
    "S": "fgge11u",
    "a": "00e1fhf",
    "b": "ggmphhu",
    "c": "00egghe",
    "e": "00ehvge",
    "h": "ggmphhh",
    "k": "ggikoki",
    "l": "c44444e",
    "m": "00qllhh",
    "o": "00ehhhe",
    "q": "00djf11",
    "r": "00mpggg",
    "s": "00ege1u",
    "t": "88s8896",
    "u": "00hhhjd",
    "w": "00hhlla",
    ".": "00000cc",
    ":": "0cc0cc0"
};

function centre(text) {
  var gap = Math.max(0, COLS - text.length);
  var left = Math.floor(gap / 2);
  return new Array(left + 1).join(" ") + text + new Array(gap - left + 1).join(" ");
}

// The first of the candidates that fits on a row.
function fit(candidates) {
  for (var i = 0; i < candidates.length; i++) if (candidates[i].length <= COLS) return candidates[i];
  return candidates[candidates.length - 1].slice(0, COLS);
}

export function initLcd(doc) {
  var canvas = doc.querySelector("[data-lcd]");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var look = window.getComputedStyle(canvas);
  var bg = look.getPropertyValue("--lcd-bg").trim() || "#9CBF2A";
  var on = look.getPropertyValue("--lcd-on").trim() || "#1B2A0A";
  var off = look.getPropertyValue("--lcd-off").trim() || "rgba(27,42,10,0.1)";
  var still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var board = [centre("6502 SBC"), "www.rahulkar.com"];
  var weight = "";
  var showBoard = !still;
  var timer = 0;

  var dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function rows() {
    if (showBoard) return board;
    var time = hhmm(istNow());
    return ["Kolkata" + new Array(COLS - 7 - time.length + 1).join(" ") + time, weight];
  }

  function draw() {
    var text = rows();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var glyph = GLYPHS[(text[r] || "").charAt(c)] || GLYPHS[" "];
        for (var y = 0; y < 8; y++) {
          var bits = y < 7 ? parseInt(glyph.charAt(y), 32) : 0;
          for (var x = 0; x < 5; x++) {
            ctx.fillStyle = bits & (16 >> x) ? on : off;
            ctx.fillRect(PAD + c * ADVANCE_X + x * PITCH, PAD + r * ADVANCE_Y + y * PITCH, DOT, DOT);
          }
        }
      }
    }
  }

  // On the minute, like the datum's tick.
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { draw(); schedule(); }, 60000 - (Date.now() % 60000) + 40);
  }

  function weigh() {
    var w = measure();
    if (!w) return;
    var kb = w.bytes < 1024 ? w.bytes + "b" : Math.round(w.bytes / 1024) + "kb";
    weight = centre(fit([
      kb + " " + w.requests + "req " + w.ms + "ms",
      kb + " " + w.requests + "rq " + w.ms + "ms",
      kb + " " + w.ms + "ms",
      kb,
    ]));
    draw();
  }

  canvas.hidden = false;
  doc.documentElement.classList.add("has-lcd");
  draw();
  schedule();

  function loaded() {
    setTimeout(weigh, 0);
    // The board's own message holds for a moment, then the readings take over.
    if (showBoard) setTimeout(function () { showBoard = false; draw(); }, 2400);
  }
  if (doc.readyState === "complete") loaded();
  else window.addEventListener("load", loaded);

  canvas.addEventListener("click", function () {
    showBoard = !showBoard;
    draw();
  });
  doc.addEventListener("visibilitychange", function () {
    if (doc.hidden) clearTimeout(timer);
    else { draw(); schedule(); }
  });
}
