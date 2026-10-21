// The datum as a converter: point at the scale, drag along it, or focus it
// and use the arrow keys, to read any time of day in Kolkata in the
// visitor's own time. To assistive technology it is a slider; the probe is
// drawn in ink, so red still only ever means "now".
import { IST, hhmm, istNow, inKolkata } from "./clock.js";

var STEP = 15; // arrow keys
var SNAP = 5; // pointer
var MAX = 1435; // 23:55

function span(doc, className, text) {
  var el = doc.createElement("span");
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

function duration(m) {
  var h = Math.floor(m / 60);
  var r = m % 60;
  return (h ? h + " h" : "") + (h && r ? " " : "") + (r ? r + " min" : "");
}

export function initDatumProbe(doc) {
  var datum = doc.querySelector("[data-datum]");
  var scale = datum && datum.querySelector(".datum__scale");
  var note = datum && datum.querySelector(".datum__note");
  if (!scale || !note) return;
  var here = inKolkata();
  var value = -1;
  var hovering = false;
  var dragging = false;

  var track = doc.createElement("div");
  track.className = "datum__track";
  track.tabIndex = 0;
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", "Convert a time in Kolkata to your time");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(MAX));
  var line = span(doc, "datum__probe");
  var chip = span(doc, "datum__probe-time");
  line.appendChild(chip);
  track.appendChild(line);
  scale.appendChild(track);

  // The reading repeats the slider's value text, so it is hidden from
  // assistive technology; the hint only matters to pointer users.
  var reading = span(doc, "datum__reading");
  reading.setAttribute("aria-hidden", "true");
  var hint = span(doc, "datum__hint");
  hint.setAttribute("aria-hidden", "true");
  hint.appendChild(span(doc, "datum__hint-hover", "Hover to convert"));
  hint.appendChild(span(doc, "datum__hint-touch", "Drag to convert"));
  note.appendChild(reading);
  note.appendChild(hint);

  function nearest() {
    return Math.min(MAX, Math.round(istNow() / STEP) * STEP);
  }

  // Kolkata minutes -> the same instant on the visitor's clock, and how far
  // it is from now on today's Kolkata scale.
  function describe(m) {
    var d = { ist: hhmm(m), local: "", day: "", rel: "" };
    if (!here) {
      var l = m - IST - new Date().getTimezoneOffset();
      var shift = Math.floor(l / 1440);
      d.local = hhmm(((l % 1440) + 1440) % 1440);
      d.day = shift < 0 ? " the previous day" : shift > 0 ? " the next day" : "";
    }
    var diff = m - istNow();
    d.rel = diff === 0 ? "now" : diff > 0 ? "in " + duration(diff) : duration(-diff) + " ago";
    return d;
  }

  function sentence(d, sep) {
    return d.ist + " in Kolkata" + (d.local ? " is " + d.local + " your time" + d.day : "") + sep + d.rel;
  }

  function label(m) {
    var d = describe(m);
    track.setAttribute("aria-valuenow", String(m));
    track.setAttribute("aria-valuetext", sentence(d, ", "));
    return d;
  }

  function show(m) {
    value = Math.max(0, Math.min(MAX, m));
    var d = label(value);
    datum.style.setProperty("--probe", (value / 1440).toFixed(5));
    datum.classList.toggle("is-probe-start", value < 90);
    datum.classList.toggle("is-probe-end", value > 1350);
    // The now label steps aside only when the probe's chip would cover it.
    datum.classList.toggle("is-probe-near", Math.abs(value - istNow()) / 1440 * track.clientWidth < 72);
    chip.textContent = d.ist;
    reading.textContent = "";
    reading.appendChild(span(doc, "num", d.ist));
    if (d.local) {
      reading.appendChild(doc.createTextNode(" in Kolkata is "));
      reading.appendChild(span(doc, "num", d.local));
      reading.appendChild(doc.createTextNode(" your time" + d.day));
    } else {
      reading.appendChild(doc.createTextNode(" in Kolkata"));
    }
    reading.appendChild(span(doc, "datum__rel", " · " + d.rel));
    datum.classList.add("is-probing");
  }

  function hide() {
    datum.classList.remove("is-probing");
  }

  function fromX(x) {
    var r = track.getBoundingClientRect();
    return Math.round(((x - r.left) / r.width) * 1440 / SNAP) * SNAP;
  }

  track.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse" && !dragging) return;
    hovering = true;
    show(fromX(e.clientX));
  });
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") {
      dragging = true;
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    }
    show(fromX(e.clientX));
  });
  track.addEventListener("pointerup", function () { dragging = false; });
  track.addEventListener("pointercancel", function () { dragging = false; });
  track.addEventListener("pointerleave", function () {
    hovering = false;
    if (doc.activeElement !== track) hide();
  });
  // Keyboard focus starts at the quarter hour nearest to now; a click keeps
  // the time it landed on.
  track.addEventListener("focus", function () {
    if (!datum.classList.contains("is-probing")) show(nearest());
  });
  track.addEventListener("blur", function () {
    if (!hovering) hide();
  });
  track.addEventListener("keydown", function (e) {
    var m = value < 0 ? nearest() : value;
    var next = null;
    switch (e.key) {
      case "ArrowRight": case "ArrowUp": next = m + STEP; break;
      case "ArrowLeft": case "ArrowDown": next = m - STEP; break;
      case "PageUp": next = m + 60; break;
      case "PageDown": next = m - 60; break;
      case "Home": next = 0; break;
      case "End": next = MAX; break;
      case "Escape": hide(); return;
    }
    if (next === null) return;
    e.preventDefault();
    show(next);
  });

  label(nearest());
}
