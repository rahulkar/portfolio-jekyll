// Drawings that plot themselves (_art.scss). theme.js has already armed them
// before first paint by putting can-plot on <html>; this marks each drawing
// the first time a quarter of it is on screen, which starts its lines. It
// also tells theme.js's failsafe that the script arrived (is-plotting).
export function initPlot(doc) {
  var root = doc.documentElement;
  if (!root.classList.contains("can-plot") || !("IntersectionObserver" in window)) return;
  root.classList.add("is-plotting");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-drawn");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  [].forEach.call(doc.querySelectorAll(".art"), function (el) { io.observe(el); });
}
