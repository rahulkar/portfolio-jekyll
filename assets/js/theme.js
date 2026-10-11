/* Applies saved theme and motion choices before first paint. Loaded
   synchronously from the same origin (the strict CSP forbids inline
   scripts); well under a kilobyte. */
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
    if (localStorage.getItem("motion") === "calm") document.documentElement.classList.add("is-calm");
  } catch (e) {}
})();
