// Delivery-loop flowchart: four real HTML labels, boxed and connected with
// Rough.js arrows drawn into an overlay SVG; re-drawn when the figure resizes.
import rough from "roughjs/bundled/rough.esm.js";

var SVG_NS = "http://www.w3.org/2000/svg";
var gen = rough.generator();
var column = window.matchMedia("(max-width: 760px)");
var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function opts(seed, extra) {
  return Object.assign({ roughness: 1.3, bowing: 1.2, strokeWidth: 1.8, seed: seed, fixedDecimalPlaceDigits: 1 }, extra || {});
}

function arrowHead(x1, y1, x2, y2, seed) {
  var ang = Math.atan2(y2 - y1, x2 - x1);
  var len = 9;
  var a1 = ang + Math.PI * 0.8;
  var a2 = ang - Math.PI * 0.8;
  return [
    gen.line(x2, y2, x2 + Math.cos(a1) * len, y2 + Math.sin(a1) * len, opts(seed)),
    gen.line(x2, y2, x2 + Math.cos(a2) * len, y2 + Math.sin(a2) * len, opts(seed + 1))
  ];
}

export function initDiagram(fig) {
  if (!fig) return;
  var nodes = Array.prototype.slice.call(fig.querySelectorAll(".loop__node"));
  if (nodes.length < 2) return;
  var svg = fig.querySelector(":scope > svg.sk");
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "sk sk--diagram");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    fig.insertBefore(svg, fig.firstChild);
  }
  var lastW = 0;
  var lastH = 0;

  function draw() {
    var fr = fig.getBoundingClientRect();
    var W = Math.round(fr.width);
    var H = Math.round(fr.height);
    if (!W || !H) return;
    if (W === lastW && H === lastH) return;
    lastW = W;
    lastH = H;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", String(W));
    svg.setAttribute("height", String(H));

    var stacked = column.matches;
    var rects = nodes.map(function (n) {
      var r = n.getBoundingClientRect();
      return { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height };
    });
    var drawables = [];
    rects.forEach(function (r, i) {
      drawables.push(gen.rectangle(r.x - 4, r.y - 4, r.w + 8, r.h + 8, opts(7 + i)));
    });
    for (var i = 0; i < rects.length - 1; i++) {
      var a = rects[i];
      var b = rects[i + 1];
      var x1, y1, x2, y2;
      if (!stacked) { x1 = a.x + a.w + 7; y1 = a.y + a.h / 2; x2 = b.x - 7; y2 = b.y + b.h / 2; }
      else { x1 = a.x + a.w / 2; y1 = a.y + a.h + 7; x2 = b.x + b.w / 2; y2 = b.y - 7; }
      drawables.push(gen.line(x1, y1, x2, y2, opts(20 + i)));
      drawables.push.apply(drawables, arrowHead(x1, y1, x2, y2, 30 + i * 2));
    }
    var L = rects[rects.length - 1];
    var F = rects[0];
    if (!stacked) {
      var y = Math.max(L.y + L.h, F.y + F.h) + 36;
      var lx = L.x + L.w / 2;
      var fx = F.x + F.w / 2;
      drawables.push(gen.curve([[lx, L.y + L.h + 7], [lx + 4, y - 8], [lx, y], [(lx + fx) / 2, y + 6], [fx, y], [fx - 4, y - 8], [fx, F.y + F.h + 7]], opts(50)));
      drawables.push.apply(drawables, arrowHead(fx, y, fx, F.y + F.h + 7, 52));
    } else {
      var x = W - 44;
      var ly = L.y + L.h / 2;
      var fy = F.y + F.h / 2;
      drawables.push(gen.curve([[L.x + L.w + 7, ly], [x - 8, ly + 4], [x, ly], [x + 6, (ly + fy) / 2], [x, fy], [x - 8, fy - 4], [F.x + F.w + 7, fy]], opts(50)));
      drawables.push.apply(drawables, arrowHead(x, fy, F.x + F.w + 7, fy, 52));
    }

    var frag = document.createDocumentFragment();
    var idx = 0;
    drawables.forEach(function (d) {
      gen.toPaths(d).forEach(function (info) {
        var p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", info.d);
        p.setAttribute("pathLength", "1");
        p.setAttribute("stroke-width", String(info.strokeWidth));
        p.setAttribute("class", "sk__stroke");
        p.style.setProperty("--i", String(idx++));
        frag.appendChild(p);
      });
    });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(frag);
    fig.classList.add("is-sketched");
    if (!fig.classList.contains("is-drawn")) {
      window.requestAnimationFrame(function () { fig.classList.add("is-drawn"); });
      if (reduced.matches) fig.classList.add("is-settled");
      else window.setTimeout(function () { fig.classList.add("is-settled"); }, 2200);
    }
  }

  var raf = 0;
  var schedule = function () {
    if (raf) return;
    raf = window.requestAnimationFrame(function () { raf = 0; draw(); });
  };

  var start = function () {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { io.unobserve(fig); schedule(); }
        });
      }, { rootMargin: "200px 0px" });
      io.observe(fig);
    } else {
      schedule();
    }
    if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(fig);
    window.addEventListener("orientationchange", function () { lastW = 0; schedule(); });
  };
  var started = false;
  var go = function () { if (!started) { started = true; start(); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  window.setTimeout(go, 400);
}
