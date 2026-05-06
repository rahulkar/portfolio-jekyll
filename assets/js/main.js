document.addEventListener("DOMContentLoaded", function () {
  if (typeof SweetScroll !== "undefined") {
    new SweetScroll({ duration: 800, easing: "easeOutQuart" });
  }

  if (typeof particlesJS !== "undefined") {
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

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var progress = document.getElementById("scroll-progress");
  if (progress && !prefersReducedMotion) {
    var updateProgress = function () {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop || document.body.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      var pct = height > 0 ? (scrolled / height) * 100 : 0;
      progress.style.width = pct + "%";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  var brandSeg = document.getElementById("brand-seg");
  var sectionEls = ["about", "stack", "connect"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (brandSeg && sectionEls.length && "IntersectionObserver" in window) {
    var setSeg = function (name) {
      if (!name) {
        brandSeg.textContent = "";
        brandSeg.classList.remove("is-active");
        return;
      }
      brandSeg.textContent = "/" + name;
      brandSeg.classList.add("is-active");
    };
    var sectionObserver = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (visible) setSeg(visible.target.id);
    }, { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    sectionEls.forEach(function (el) { sectionObserver.observe(el); });

    var top = document.getElementById("top");
    if (top) {
      var topObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) setSeg("");
        });
      }, { threshold: [0.4, 0.6] });
      topObserver.observe(top);
    }
  }

  var termBody = document.querySelector(".term__body");
  if (termBody && !prefersReducedMotion) {
    var lines = Array.prototype.slice.call(termBody.querySelectorAll(".ln"));
    if (lines.length) {
      lines.forEach(function (ln) { ln.classList.add("is-typing"); });
      var startTyping = function () {
        var delay = 0;
        lines.forEach(function (ln, i) {
          window.setTimeout(function () {
            ln.classList.remove("is-typing");
            ln.classList.add("has-typed");
          }, delay);
          delay += 110 + Math.min(ln.textContent.length, 60) * 6;
        });
      };
      window.setTimeout(startTyping, 320);
    }
  }
});
