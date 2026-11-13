// Lights that follow the pointer, and buttons that lean toward it. The
// script writes numbers into custom properties and the stylesheet draws with
// them (_effects.scss); it sets no other style, which the CSP lint checks.
//
//   data-light   --mx, --my: where the pointer is over the element, as
//                fractions of its width and height (0 to 1).
//   data-magnet  --tx, --ty: how far to lean, in px, a quarter of the
//                pointer's offset from the element's centre, at most 8.
//
// With a mouse or trackpad the light follows the pointer. A finger or a pen
// does not hover, so there the light comes on under a press and fades after
// it (the class is-lit). Never under reduced motion.
export function initPointer(doc) {
  if (typeof window.matchMedia !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) follow(doc);
  press(doc);
}

function place(el, x, y) {
  var r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  el.style.setProperty("--mx", ((x - r.left) / r.width).toFixed(3));
  el.style.setProperty("--my", ((y - r.top) / r.height).toFixed(3));
}

function follow(doc) {
  var x = 0;
  var y = 0;
  var light = null;
  var magnet = null;
  var raf = 0;

  function lean(v) {
    return Math.max(-8, Math.min(8, v * 0.25)).toFixed(2);
  }

  function paint() {
    raf = 0;
    if (light) place(light, x, y);
    if (magnet) {
      var r = magnet.getBoundingClientRect();
      magnet.style.setProperty("--tx", lean(x - (r.left + r.width / 2)));
      magnet.style.setProperty("--ty", lean(y - (r.top + r.height / 2)));
    }
  }

  function rest(el) {
    el.style.setProperty("--tx", "0");
    el.style.setProperty("--ty", "0");
  }

  doc.addEventListener("pointermove", function (ev) {
    if (ev.pointerType && ev.pointerType !== "mouse") return;
    var t = ev.target && ev.target.closest ? ev.target : null;
    var m = t ? t.closest("[data-magnet]") : null;
    if (magnet && magnet !== m) rest(magnet);
    magnet = m;
    light = t ? t.closest("[data-light]") : null;
    x = ev.clientX;
    y = ev.clientY;
    if (!raf && (light || magnet)) raf = requestAnimationFrame(paint);
  }, { passive: true });

  doc.documentElement.addEventListener("pointerleave", function () {
    if (magnet) rest(magnet);
    magnet = null;
    light = null;
  });
}

function press(doc) {
  var lit = null;
  var on = 0;

  // The press ended. A tap lights for a moment even if it was over before
  // the light came on; a press that turned into a scroll just goes dark.
  function end(cancelled) {
    clearTimeout(on);
    var el = lit;
    lit = null;
    if (!el) return;
    if (cancelled) {
      el.classList.remove("is-lit");
      return;
    }
    el.classList.add("is-lit");
    setTimeout(function () { el.classList.remove("is-lit"); }, 320);
  }

  doc.addEventListener("pointerdown", function (ev) {
    if (!ev.pointerType || ev.pointerType === "mouse") return;
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-light]") : null;
    end(true);
    if (!el) return;
    place(el, ev.clientX, ev.clientY);
    lit = el;
    // A short wait, so a flick to scroll does not flash the card it starts on.
    on = setTimeout(function () { el.classList.add("is-lit"); }, 90);
  }, { passive: true });
  doc.addEventListener("pointerup", function () { end(false); }, { passive: true });
  doc.addEventListener("pointercancel", function () { end(true); }, { passive: true });
}
