/* Runs before first paint. Loaded synchronously from the same origin (the
   strict CSP forbids inline scripts); under two kilobytes.
   1. Applies a saved light or dark choice.
   2. Arms the drawings that plot themselves (see _art.scss and plot.js): they
      start hidden, which has to be decided before anything is painted. If
      main.js has not taken over within four seconds they are simply shown.
   3. Pairs a note with its card (or its row on the home page) for the page
      change between them (see _modes.scss): the one that matches the note
      gets is-vt, on the way out and, before the first frame, on the way back.
      Its drawing is marked is-still so it does not plot itself again. */
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

  var clicked = "";
  function pair(url) {
    var path;
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin) return;
      path = u.pathname;
    } catch (e) { return; }
    var items = document.querySelectorAll(".note-card, .row");
    for (var i = 0; i < items.length; i++) {
      var link = items[i].querySelector(".note-card__link, .row__link");
      var hit = !!link && new URL(link.href, location.href).pathname === path;
      items[i].classList.toggle("is-vt", hit);
      if (hit) {
        var art = items[i].querySelector(".art");
        if (art) art.classList.add("is-still");
      }
    }
  }
  try {
    document.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (a) clicked = a.href;
    }, true);
    window.addEventListener("pageswap", function (ev) {
      if (!ev.viewTransition) return;
      var to = ev.activation && ev.activation.entry ? ev.activation.entry.url : clicked;
      if (to) pair(to);
    });
    // On arrival the pairing is made whether or not a transition runs (the
    // browser may skip one); without a transition the class does nothing.
    window.addEventListener("pagereveal", function () {
      var nav = window.navigation && window.navigation.activation;
      var from = nav && nav.from ? nav.from.url : document.referrer;
      if (from) pair(from);
    });
  } catch (e) {}
})();
