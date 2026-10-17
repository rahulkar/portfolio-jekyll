import { initClock } from "./clock.js";
import { initThemeToggle } from "./theme-toggle.js";
import { initCopyEmail } from "./copy-email.js";

function start() {
  var root = document.documentElement;
  initThemeToggle(document.getElementById("theme-btn"));
  initClock(document);
  initCopyEmail(document.querySelectorAll("[data-copy-email]"));

  // 404: show the path that failed to resolve (as text, never as HTML).
  var path = document.getElementById("err-path");
  if (path) {
    path.textContent = window.location.pathname;
    var meta = document.getElementById("err-meta");
    if (meta) meta.hidden = false;
  }

  // Ready signal for the tests: the fonts are in, or a second has passed.
  var done = function () { root.classList.add("is-ready"); };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1000); })]).then(done);
  } else {
    done();
  }
}

if (document.readyState !== "loading") start();
else document.addEventListener("DOMContentLoaded", start);
