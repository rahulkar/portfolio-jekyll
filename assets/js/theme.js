/* Applies a saved theme choice before first paint. Loaded synchronously from
   the same origin (the strict CSP forbids inline scripts); ~200 bytes. */
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
