/* Applies a saved light or dark choice before first paint. Loaded
   synchronously from the same origin (the strict CSP forbids inline
   scripts); well under a kilobyte. */
(function () {
  try {
    localStorage.removeItem("motion");
    var t = localStorage.getItem("theme");
    if (t !== "dark" && t !== "light") return;
    document.documentElement.setAttribute("data-theme", t);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", t === "dark" ? "#121211" : "#F6F5F1");
  } catch (e) {}
})();
