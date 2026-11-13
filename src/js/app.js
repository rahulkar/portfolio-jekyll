import { initClock } from "./clock.js";
import { initDatumProbe } from "./datum-probe.js";
import { initThemeToggle } from "./theme-toggle.js";
import { initCopyEmail } from "./copy-email.js";
import { initCommandMenu } from "./command-menu.js";
import { initPageWeight } from "./page-weight.js";
import { initStageHeader } from "./stage-header.js";
import { initOrbitMini } from "./orbit-mini.js";
import { initPointer } from "./pointer.js";
import { initPlot } from "./plot.js";
import { initLcd } from "./lcd.js";
import { initMotion } from "./motion.js";

function start() {
  var root = document.documentElement;
  initThemeToggle(document.getElementById("theme-btn"));
  initClock(document);
  initDatumProbe(document);
  initCopyEmail(document.querySelectorAll("[data-copy-email]"));
  // Before the command menu reads its commands: under reduced motion the
  // pause command is taken out.
  initMotion(document);
  initCommandMenu(document);
  initPageWeight(document);
  initStageHeader(root);
  initOrbitMini(document);
  initPointer(document);
  initPlot(document);
  initLcd(document);

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
