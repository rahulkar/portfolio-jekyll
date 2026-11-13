// Lights that follow the pointer, and buttons that lean toward it. Only for
// a mouse or trackpad, and never under reduced motion. The script writes
// numbers into custom properties and the stylesheet draws with them
// (_effects.scss); it sets no other style, which the CSP lint checks.
//
//   data-light   --mx, --my: where the pointer is over the element, as
//                fractions of its width and height (0 to 1).
//   data-magnet  --tx, --ty: how far to lean, in px, a quarter of the
//                pointer's offset from the element's centre, at most 8.
export function initPointer(doc) {
  if (typeof window.matchMedia !== "function") return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    var r;
    if (light) {
      r = light.getBoundingClientRect();
      if (r.width && r.height) {
        light.style.setProperty("--mx", ((x - r.left) / r.width).toFixed(3));
        light.style.setProperty("--my", ((y - r.top) / r.height).toFixed(3));
      }
    }
    if (magnet) {
      r = magnet.getBoundingClientRect();
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
