// The hero name, a glyph at a time. Each letter of [data-glyphs] is its own
// span, and the stylesheet sets its weight from --lift (0 to 1): the font's
// weight axis runs from the name's rest weight up to 700 (_effects.scss).
// This script writes --lift on the letters near the pointer, so they swell as
// it passes and ease back after it. With a mouse or trackpad the letters
// follow the pointer; a finger or pen lifts them while it presses on the
// name. Never under reduced motion. On a touch screen a wave also runs across
// the name as the page scrolls (CSS only).
export function initGlyphs(doc) {
  var host = doc.querySelector("[data-glyphs]");
  if (!host || typeof window.matchMedia !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var glyphs = [].slice.call(host.querySelectorAll(".glyph"));
  if (!glyphs.length) return;
  var lift = glyphs.map(function () { return 0; });
  var aim = glyphs.map(function () { return 0; });

  // How far the swell reaches, as a share of the font size: about one letter
  // either side of the pointer. And how quickly a letter follows: the time
  // constant of its easing, in ms.
  var REACH = 1.1;
  var EASE = 90;

  var x = 0;
  var y = 0;
  var mouse = false;    // a mouse is over the page
  var pressing = null;  // the finger or pen pressing on the name
  var raf = 0;
  var last = 0;

  // Where each letter wants to be: lifted by how close the pointer is to its
  // middle (vertical distance counts a little more), 0 out of reach.
  function measure() {
    var reach = (parseFloat(getComputedStyle(host).fontSize) || 100) * REACH;
    var near = pressing !== null;
    if (!near && mouse) {
      var box = host.getBoundingClientRect();
      near = x > box.left - reach && x < box.right + reach && y > box.top - reach && y < box.bottom + reach;
    }
    for (var i = 0; i < glyphs.length; i++) {
      if (!near) { aim[i] = 0; continue; }
      var r = glyphs[i].getBoundingClientRect();
      var dx = x - (r.left + r.width / 2);
      var dy = (y - (r.top + r.height / 2)) * 1.4;
      var t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / reach);
      aim[i] = t * t * (3 - 2 * t);
    }
  }

  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    measure();
    var k = 1 - Math.exp(-dt / EASE);
    var moving = false;
    for (var i = 0; i < glyphs.length; i++) {
      var next = lift[i] + (aim[i] - lift[i]) * k;
      if (Math.abs(aim[i] - next) < 0.004) next = aim[i];
      else moving = true;
      if (next === lift[i]) continue;
      lift[i] = next;
      // At rest the letter goes back to plain markup.
      if (next === 0) glyphs[i].removeAttribute("style");
      else glyphs[i].style.setProperty("--lift", next.toFixed(3));
    }
    // Keep going while a letter is still easing or a finger is down (it may
    // slide); a mouse wakes the loop again each time it moves.
    if (moving || pressing !== null) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    doc.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      mouse = true;
      x = ev.clientX;
      y = ev.clientY;
      wake();
    }, { passive: true });

    doc.documentElement.addEventListener("pointerleave", function () {
      mouse = false;
      wake();
    });
  }

  // A finger or pen: the letters under it lift while it presses, and follow
  // it along the line (the name takes only vertical panning, see the styles).
  function release(ev) {
    if (ev.pointerId !== pressing) return;
    pressing = null;
    wake();
  }

  host.addEventListener("pointerdown", function (ev) {
    if (ev.pointerType === "mouse") return;
    pressing = ev.pointerId;
    x = ev.clientX;
    y = ev.clientY;
    wake();
  });
  host.addEventListener("pointermove", function (ev) {
    if (ev.pointerId !== pressing) return;
    x = ev.clientX;
    y = ev.clientY;
  });
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("pointerleave", release);
}
