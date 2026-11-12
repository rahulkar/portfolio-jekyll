// Foil cards: a photo marked figure--foil tilts toward the pointer and a
// sheen moves across it. For a mouse or trackpad only, never under reduced
// motion. Writes --rx and --ry (degrees) and --mx and --my (0 to 1) on the
// photo's link; _effects.scss does the drawing. A click still opens the photo.
export function initTilt(doc) {
  if (typeof window.matchMedia !== "function") return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  [].forEach.call(doc.querySelectorAll(".figure--foil .figure__link"), function (card) {
    var raf = 0;
    var x = 0;
    var y = 0;
    card.setAttribute("data-tilt", "");

    function paint() {
      raf = 0;
      var r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var mx = Math.max(0, Math.min(1, (x - r.left) / r.width));
      var my = Math.max(0, Math.min(1, (y - r.top) / r.height));
      card.style.setProperty("--mx", mx.toFixed(3));
      card.style.setProperty("--my", my.toFixed(3));
      card.style.setProperty("--rx", ((0.5 - my) * 9).toFixed(2));
      card.style.setProperty("--ry", ((mx - 0.5) * 11).toFixed(2));
    }

    card.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      x = ev.clientX;
      y = ev.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });

    card.addEventListener("pointerleave", function () {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      card.style.setProperty("--rx", "0");
      card.style.setProperty("--ry", "0");
    });
  });
}
