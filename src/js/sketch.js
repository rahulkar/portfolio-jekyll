// Runtime hand-drawn layer. For every [data-sketch] host we insert an
// aria-hidden <svg class="sk"> as the first child and fill it with Rough.js
// paths generated from the host's box. Only presentation attributes are
// written (CSP: style-src 'self'); colours come from the stylesheet.
import rough from "roughjs/bundled/rough.esm.js";

var SVG_NS = "http://www.w3.org/2000/svg";
var OUTSET = 6;
var gen = rough.generator();
var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
var hoverable = window.matchMedia("(hover: hover)");
var narrow = window.matchMedia("(max-width: 760px)");

function fnv1a(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 2147483646) + 1;
}

function seedFor(host) {
  if (host.dataset.skSeed) return Number(host.dataset.skSeed);
  var src = host.dataset.seed || (host.textContent || "").trim() || host.id || host.dataset.sketch || "sk";
  var seed = fnv1a(src);
  host.dataset.skSeed = String(seed);
  return seed;
}

function baseOpts(seed) {
  var mobile = narrow.matches;
  return {
    roughness: mobile ? 1.1 : 1.4,
    bowing: 1.2,
    strokeWidth: 1.8,
    seed: seed,
    disableMultiStroke: mobile,
    fixedDecimalPlaceDigits: 1
  };
}

// "x" marks a fill path; it is never written to the DOM.
function fillOpts(o, extra) {
  return Object.assign({}, o, { fill: "x", fillStyle: "hachure", stroke: "none" }, extra);
}

function shapes(kind, w, h, seed) {
  var o = baseOpts(seed);
  var P = OUTSET;
  var mid;
  switch (kind) {
    case "rect":
      return [gen.rectangle(P, P, w, h, o)];
    case "rect-fill":
      return [
        gen.rectangle(P + 1, P + 1, w - 2, h - 2, fillOpts(o, { hachureAngle: -41, hachureGap: 7, fillWeight: 4 })),
        gen.rectangle(P, P, w, h, o)
      ];
    case "highlight":
      return [gen.rectangle(P + 2, P + h * 0.12, w - 4, h * 0.84, fillOpts(o, { hachureAngle: -4, hachureGap: 9, fillWeight: 8, roughness: 1.6 }))];
    case "underline":
      mid = P + h + 1;
      return [gen.curve([[P, mid], [P + w * 0.25, mid + 2], [P + w * 0.5, mid - 1], [P + w * 0.75, mid + 2], [P + w, mid]], o)];
    case "circle":
      return [gen.ellipse(P + w / 2, P + h / 2, w + 16, h + 12, Object.assign({}, o, { roughness: 1.8 }))];
    case "squiggle":
      mid = P + h / 2;
      return [gen.curve([[P, mid], [P + w * 0.2, mid - 3], [P + w * 0.4, mid + 3], [P + w * 0.6, mid - 3], [P + w * 0.8, mid + 3], [P + w, mid]], o)];
    default:
      return [];
  }
}

function render(host) {
  var kind = host.dataset.sketch;
  if (!kind) return;
  var w = Math.round(host.offsetWidth);
  var h = Math.round(host.offsetHeight);
  if (!w || !h) return;
  var svg = host.querySelector(":scope > svg.sk");
  if (svg && host.dataset.skW === String(w) && host.dataset.skH === String(h) && !host.dataset.skDirty) return;
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "sk");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    host.insertBefore(svg, host.firstChild);
  }
  var W = w + OUTSET * 2;
  var H = h + OUTSET * 2;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));

  var seed = seedFor(host) + (Number(host.dataset.skBump) || 0);
  var frag = document.createDocumentFragment();
  var i = 0;
  shapes(kind, w, h, seed).forEach(function (drawable) {
    gen.toPaths(drawable).forEach(function (info) {
      var p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", info.d);
      p.setAttribute("pathLength", "1");
      p.setAttribute("stroke-width", String(info.strokeWidth));
      p.setAttribute("class", info.stroke === "x" ? "sk__fill" : "sk__stroke");
      p.style.setProperty("--i", String(i++));
      frag.appendChild(p);
    });
  });
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.appendChild(frag);

  host.dataset.skW = String(w);
  host.dataset.skH = String(h);
  delete host.dataset.skDirty;
  host.classList.add("is-sketched");
  if (!host.classList.contains("is-drawn")) {
    window.requestAnimationFrame(function () {
      host.classList.add("is-drawn");
    });
    if (reduced.matches) host.classList.add("is-settled");
    else window.setTimeout(function () { host.classList.add("is-settled"); }, 1100);
  }
}

var pending = [];
var rafId = 0;
var ro = null;

function flush() {
  rafId = 0;
  var batch = pending;
  pending = [];
  batch.forEach(render);
}

function queue(host) {
  if (pending.indexOf(host) === -1) pending.push(host);
  if (!rafId) rafId = window.requestAnimationFrame(flush);
}

function observe(host) {
  if (!("ResizeObserver" in window)) return;
  if (!ro) {
    ro = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { queue(entry.target); });
    });
  }
  ro.observe(host);
}

function markDirty(host) {
  if (host.classList.contains("is-sketched")) {
    host.dataset.skDirty = "1";
    queue(host);
  }
}

export function sketchNow(host, kind) {
  if (kind) host.dataset.sketch = kind;
  render(host);
  observe(host);
}

export function clearSketch(host) {
  var svg = host.querySelector(":scope > svg.sk");
  if (svg) svg.parentNode.removeChild(svg);
  host.classList.remove("is-sketched", "is-drawn", "is-settled");
  delete host.dataset.skW;
  delete host.dataset.skH;
  if (ro) ro.unobserve(host);
}

export function resketch(host) {
  host.dataset.skBump = String(((Number(host.dataset.skBump) || 0) + 1) % 3);
  host.dataset.skDirty = "1";
  render(host);
}

export function initSketch() {
  if (navigator.connection && navigator.connection.saveData) return;
  var hosts = Array.prototype.slice.call(document.querySelectorAll("[data-sketch]"));
  if (!hosts.length) return;

  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          sketchNow(entry.target);
        }
      });
    }, { rootMargin: "200px 0px" });
  }

  var started = false;
  var start = function () {
    if (started) return;
    started = true;
    hosts.forEach(function (host) {
      if (io) io.observe(host);
      else sketchNow(host);
    });
  };
  // Measure against the real fonts; never wait longer than 400 ms.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  window.setTimeout(start, 400);
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener("loadingdone", function () { hosts.forEach(markDirty); });
  }
  window.addEventListener("orientationchange", function () { hosts.forEach(markDirty); });

  if (hoverable.matches) {
    document.querySelectorAll(".btn[data-sketch], .contact__copy[data-sketch]").forEach(function (el) {
      var last = 0;
      el.addEventListener("mouseenter", function () {
        if (reduced.matches) return;
        var now = Date.now();
        if (now - last < 400) return;
        last = now;
        resketch(el);
      });
    });
  }
}
