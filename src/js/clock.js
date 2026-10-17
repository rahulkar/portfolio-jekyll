// The Kolkata clock: fills every <time data-ist>, places the datum's now-tick
// through the --now custom property (a CSSOM write, which style-src 'self'
// allows) and, for visitors elsewhere, shows their own time next to it.
var IST = 330; // minutes east of UTC; India has no daylight saving

function pad(n) { return (n < 10 ? "0" : "") + n; }
function hhmm(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
function zone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; }
}

export function initClock(doc) {
  var datum = doc.querySelector("[data-datum]");
  var readouts = doc.querySelectorAll("time[data-ist]");
  if (!readouts.length && !datum) return;
  var localWrap = doc.querySelector(".datum__local");
  var localTime = doc.querySelector("[data-local]");
  var z = zone();
  var inKolkata = z === "Asia/Kolkata" || z === "Asia/Calcutta";
  var timer = 0;

  function paint() {
    var now = Date.now();
    var m = (Math.floor(now / 60000) + IST) % 1440;
    var t = hhmm(m);
    readouts.forEach(function (el) {
      el.textContent = t;
      el.setAttribute("datetime", t);
    });
    if (datum) {
      var f = m / 1440;
      datum.style.setProperty("--now", f.toFixed(5));
      datum.classList.toggle("is-late", f > 0.8);
    }
    if (localWrap && localTime) {
      var d = new Date(now);
      var lt = hhmm(d.getHours() * 60 + d.getMinutes());
      localTime.textContent = lt;
      localWrap.hidden = inKolkata || lt === t;
    }
  }

  // Jump on the minute, like a station clock; pause while the tab is hidden.
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { paint(); schedule(); }, 60000 - (Date.now() % 60000) + 20);
  }

  paint();
  doc.querySelectorAll("[data-clock]").forEach(function (el) { el.hidden = false; });
  // One frame after unhiding, so the opacity transition has a starting style.
  if (datum) requestAnimationFrame(function () {
    requestAnimationFrame(function () { datum.classList.add("is-live"); });
  });
  schedule();
  doc.addEventListener("visibilitychange", function () {
    if (doc.hidden) clearTimeout(timer);
    else { paint(); schedule(); }
  });
}
