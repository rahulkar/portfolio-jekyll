document.addEventListener("DOMContentLoaded", function () {
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var allowParticles = !prefersReducedMotion && window.matchMedia("(min-width: 760px)").matches;

  var initParticles = function () {
    if (typeof particlesJS === "undefined") return;
    particlesJS("particles-js", {
      particles: {
        number: { value: 24, density: { enable: true, value_area: 1100 } },
        color: { value: ["#6ee7a0", "#e6e6e3"] },
        shape: { type: "circle" },
        opacity: {
          value: 0.25,
          random: true,
          anim: { enable: true, speed: 0.4, opacity_min: 0.04, sync: false }
        },
        size: { value: 1.6, random: true },
        line_linked: {
          enable: true,
          distance: 140,
          color: "#6ee7a0",
          opacity: 0.06,
          width: 1
        },
        move: {
          enable: true,
          speed: 0.45,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "grab" },
          onclick: { enable: false, mode: "push" },
          resize: true
        },
        modes: {
          grab: { distance: 180, line_linked: { opacity: 0.4 } },
          push: { particles_nb: 2 }
        }
      },
      retina_detect: true
    });
  };

  // Load the particles library only where it is actually used (desktop, motion
  // allowed). This keeps ~23 KB of JS off phones, where particles never render.
  if (allowParticles) {
    if (typeof particlesJS !== "undefined") {
      initParticles();
    } else {
      var pScript = document.createElement("script");
      pScript.src = "/assets/js/particles.min.js";
      pScript.defer = true;
      pScript.onload = initParticles;
      document.body.appendChild(pScript);
    }
  }

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

  // Terminal "typing" reveal — drives the latent CSS hooks (.is-typing/.has-typed).
  var termLines = document.querySelectorAll(".term__body .ln");
  if (termLines.length && !prefersReducedMotion) {
    termLines.forEach(function (ln) {
      ln.classList.add("is-typing");
    });
    termLines.forEach(function (ln, i) {
      window.setTimeout(function () {
        ln.classList.remove("is-typing");
        ln.classList.add("has-typed");
      }, 130 * i + 160);
    });
  }

  // Scroll-spy — reflect the active section in the brand segment + top-bar nav.
  var brandSeg = document.getElementById("brand-seg");
  var navLinks = document.querySelectorAll(".bar__nav a");
  var spyTargets = ["top", "about", "stack", "connect"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (spyTargets.length && "IntersectionObserver" in window) {
    var setActiveSection = function (id) {
      if (brandSeg) {
        brandSeg.textContent = id === "top" ? "" : "/" + id;
        brandSeg.classList.toggle("is-active", id !== "top");
      }
      navLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
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

  var clock = document.getElementById("local-time");
  var barClock = document.getElementById("bar-time");
  var tick = function () {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, "0");
    var m = String(d.getMinutes()).padStart(2, "0");
    if (clock) clock.textContent = h + ":" + m + " IST";
    if (barClock) barClock.textContent = h + ":" + m;
  };
  tick();
  window.setInterval(tick, 30000);

  var menuBtn = document.getElementById("menu-btn");
  var sheet = document.getElementById("menu-sheet");
  if (menuBtn && sheet) {
    var toggleMenu = function (open) {
      var isOpen = typeof open === "boolean" ? open : !sheet.classList.contains("is-open");
      sheet.classList.toggle("is-open", isOpen);
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      sheet.setAttribute("aria-hidden", String(!isOpen));
    };

    menuBtn.addEventListener("click", function () {
      toggleMenu();
    });

    sheet.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggleMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") toggleMenu(false);
    });
  }

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
      if (commandTarget) commandTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "c") {
      var contactTarget = document.getElementById("connect");
      if (contactTarget) contactTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  var copyButtons = document.querySelectorAll("[data-copy-email]");
  copyButtons.forEach(function (btn) {
    var label = btn.querySelector(".contact__copy__text");
    var box = btn.closest(".contact__email");
    var resetTimer = null;
    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-copy-email");
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(email).then(function () {
        btn.classList.add("is-copied");
        if (box) box.classList.add("is-copied");
        if (label) label.textContent = "copied";
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(function () {
          btn.classList.remove("is-copied");
          if (box) box.classList.remove("is-copied");
          if (label) label.textContent = "copy";
        }, 1600);
      }).catch(function () {});
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
