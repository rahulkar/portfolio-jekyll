import { initSketch, sketchNow, clearSketch } from "./sketch.js";
import { initDiagram } from "./diagram.js";

document.addEventListener("DOMContentLoaded", function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var prefersReducedMotion = reduced.matches;
  var root = document.documentElement;

  // Hand-drawn layer (Rough.js) and the delivery-loop figure.
  initSketch();
  initDiagram(document.getElementById("delivery-loop"));

  // Hero / bar doodles draw in once the real fonts are on screen.
  var ready = function () { root.classList.add("is-ready"); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
  window.setTimeout(ready, 600);

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  // Pen-reveal of the index-card lines (profile card, 404 note).
  var cardLines = document.querySelectorAll(".card__body .ln");
  if (cardLines.length && !prefersReducedMotion) {
    cardLines.forEach(function (ln) {
      ln.classList.add("is-typing");
    });
    cardLines.forEach(function (ln, i) {
      window.setTimeout(function () {
        ln.classList.remove("is-typing");
        ln.classList.add("has-typed");
      }, 130 * i + 260);
    });
  }

  // Scroll-spy: annotate the brand and circle the active nav word.
  var brandSeg = document.getElementById("brand-seg");
  var navLinks = document.querySelectorAll(".bar__nav a");
  var spyTargets = ["top", "about", "stack", "connect"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (spyTargets.length && "IntersectionObserver" in window) {
    var setActiveSection = function (id) {
      if (brandSeg) {
        brandSeg.textContent = id === "top" ? "" : "→ " + id;
        brandSeg.classList.toggle("is-active", id !== "top");
      }
      navLinks.forEach(function (a) {
        var active = a.getAttribute("href") === "#" + id;
        var was = a.classList.contains("is-active");
        a.classList.toggle("is-active", active);
        if (active && !was) sketchNow(a, "circle");
        else if (!active && was) clearSketch(a);
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    spyTargets.forEach(function (el) {
      spy.observe(el);
    });
  }

  // Where/when note: real India time plus a playful guess at what is going on.
  var clock = document.getElementById("local-time");
  var stateLabel = document.getElementById("local-state");
  var whenNote = document.querySelector(".note--when");
  var fmt = null;
  var hourFmt = null;
  try {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" });
  } catch (e) { fmt = null; hourFmt = null; }
  var STATES = {
    asleep: "probably asleep",
    coffee: "probably on coffee",
    desk: "probably at the desk",
    tinkering: "probably tinkering"
  };
  var tick = function () {
    var d = new Date();
    var text = fmt ? fmt.format(d) : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    var hour = hourFmt ? parseInt(hourFmt.format(d), 10) : d.getHours();
    if (isNaN(hour)) hour = d.getHours();
    var key = hour < 6 ? "asleep" : hour < 9 ? "coffee" : hour < 19 ? "desk" : "tinkering";
    if (clock) {
      clock.textContent = text;
      clock.setAttribute("datetime", text);
    }
    if (stateLabel) stateLabel.textContent = STATES[key];
    if (whenNote) whenNote.setAttribute("data-state", key);
  };
  tick();
  window.setInterval(tick, 30000);

  var menuBtn = document.getElementById("menu-btn");
  var sheet = document.getElementById("menu-sheet");
  if (menuBtn && sheet) {
    var sheetLinks = sheet.querySelectorAll("a");

    var toggleMenu = function (open) {
      var isOpen = typeof open === "boolean" ? open : !sheet.classList.contains("is-open");
      sheet.classList.toggle("is-open", isOpen);
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      sheet.setAttribute("aria-hidden", String(!isOpen));
      if (isOpen) {
        if (sheetLinks.length) sheetLinks[0].focus();
      } else if (sheet.contains(document.activeElement)) {
        // Restore focus to the trigger when closing from within the sheet.
        menuBtn.focus();
      }
    };

    menuBtn.addEventListener("click", function () {
      toggleMenu();
    });

    sheetLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        toggleMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        toggleMenu(false);
        return;
      }
      // Trap Tab within the open menu (cycle: button -> links -> button).
      if (event.key === "Tab" && sheet.classList.contains("is-open")) {
        var items = [menuBtn].concat(Array.prototype.slice.call(sheetLinks));
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Ctrl/Cmd+K jumps to connect. (The bare "c" shortcut was removed: it
  // could not be disabled or remapped, which fails WCAG 2.1.4.)
  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var isEditable = target && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    );
    if (isEditable) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      var commandTarget = document.getElementById("connect");
      if (commandTarget) commandTarget.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  });

  var copyButtons = document.querySelectorAll("[data-copy-email]");
  copyButtons.forEach(function (btn) {
    var label = btn.querySelector(".contact__copy__text");
    var box = btn.closest(".contact__email");
    var status = box ? box.querySelector("[role=\"status\"]") : null;
    var resetTimer = null;
    var announce = function (text) {
      if (status) status.textContent = text;
    };
    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-copy-email");
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        announce("Copying is not available here. Select the address to copy it.");
        return;
      }
      navigator.clipboard.writeText(email).then(function () {
        btn.classList.add("is-copied");
        if (box) box.classList.add("is-copied");
        if (label) label.textContent = "copied";
        announce("Email address copied.");
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(function () {
          btn.classList.remove("is-copied");
          if (box) box.classList.remove("is-copied");
          if (label) label.textContent = "copy";
          announce("");
        }, 1600);
      }).catch(function () {
        announce("Copying was blocked. Select the address to copy it.");
      });
    });
  });

  // Theme toggle: OS preference by default, a manual choice persists and is
  // applied before paint by /assets/js/theme.js.
  var themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    var themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    var isDark = function () {
      var t = root.getAttribute("data-theme");
      return t === "dark" || (t !== "light" && darkQuery.matches);
    };
    var reflectTheme = function () {
      themeBtn.setAttribute("aria-pressed", String(isDark()));
    };
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      themeMetas.forEach(function (m) { m.setAttribute("content", next === "dark" ? "#1C2522" : "#F8F3E7"); });
      reflectTheme();
    });
    if (darkQuery.addEventListener) darkQuery.addEventListener("change", reflectTheme);
    reflectTheme();
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // 404 page: surface the path that failed to resolve (CSP-safe, no inline JS).
  var errPath = document.getElementById("err-path");
  if (errPath) errPath.textContent = window.location.pathname;

  // Pencil line across the top that tracks reading progress.
  var progress = document.getElementById("scroll-progress");
  if (progress && !prefersReducedMotion) {
    var progressRaf = 0;
    var paint = function () {
      progressRaf = 0;
      var max = root.scrollHeight - window.innerHeight;
      // scaleX is compositor-only; animating width would force layout.
      progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
    };
    var schedulePaint = function () {
      if (!progressRaf) progressRaf = window.requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", schedulePaint, { passive: true });
    paint();
  }

  // Pencil scribble trail: fine pointers only, never under reduced motion.
  if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    var trail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    trail.setAttribute("class", "trail");
    trail.setAttribute("aria-hidden", "true");
    trail.setAttribute("focusable", "false");
    var trailPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trail.appendChild(trailPath);
    document.body.appendChild(trail);
    var points = [];
    var trailRaf = 0;
    var drawTrail = function () {
      trailRaf = 0;
      var now = Date.now();
      points = points.filter(function (p) { return now - p.t < 480; });
      if (points.length < 2) {
        trailPath.setAttribute("d", "");
        return;
      }
      var d = "M" + points[0].x + " " + points[0].y;
      for (var i = 1; i < points.length - 1; i++) {
        var cx = (points[i].x + points[i + 1].x) / 2;
        var cy = (points[i].y + points[i + 1].y) / 2;
        d += " Q" + points[i].x + " " + points[i].y + " " + cx + " " + cy;
      }
      trailPath.setAttribute("d", d);
      trailRaf = window.requestAnimationFrame(drawTrail);
    };
    window.addEventListener("pointermove", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      points.push({ x: event.clientX, y: event.clientY, t: Date.now() });
      if (points.length > 24) points.shift();
      if (!trailRaf) trailRaf = window.requestAnimationFrame(drawTrail);
    }, { passive: true });
  }
});
