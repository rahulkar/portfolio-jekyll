/* Runs before first paint. Loaded synchronously from the same origin (the
   strict CSP forbids inline scripts); about a kilobyte.
   1. Applies a saved light or dark choice.
   2. Arms the drawings that plot themselves (see _art.scss and plot.js): they
      start hidden, which has to be decided before anything is painted. If
      main.js has not taken over within four seconds they are simply shown. */
(function () {
  var root = document.documentElement;
  try {
    localStorage.removeItem("motion");
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") {
      root.setAttribute("data-theme", t);
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", t === "dark" ? "#121211" : "#F6F5F1");
    }
  } catch (e) {}
  try {
    if (window.IntersectionObserver && window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("can-plot");
      setTimeout(function () {
        if (!root.classList.contains("is-plotting")) root.classList.remove("can-plot");
      }, 4000);
    }
  } catch (e) {}
})();
