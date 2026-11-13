// The colophon's page-weight line: what this page cost to load, read from
// the Navigation and Resource Timing APIs once the load event has run.
// Cross-origin files report no size without Timing-Allow-Origin, so the
// total is this site's own bytes; the count is every request.
function kb(bytes) {
  return bytes < 1024 ? bytes + " B" : Math.round(bytes / 1024) + " KB";
}

// This page's own bytes, the number of requests and the load time in ms, or
// null before the load event or without the timing APIs. Also read by the
// footer's LCD (lcd.js).
export function measure() {
  if (!window.performance || !performance.getEntriesByType) return null;
  var nav = performance.getEntriesByType("navigation")[0];
  if (!nav) return null;
  var files = [nav].concat(performance.getEntriesByType("resource"));
  var bytes = files.reduce(function (sum, f) { return sum + (f.encodedBodySize || 0); }, 0);
  return { bytes: bytes, requests: files.length, ms: Math.round(nav.loadEventStart || nav.domContentLoadedEventEnd) };
}

export function initPageWeight(doc) {
  var out = doc.querySelector("[data-page-weight]");
  if (!out || !window.performance || !performance.getEntriesByType) return;

  function report() {
    var w = measure();
    if (!w) return;
    out.textContent = "This page: " + kb(w.bytes) + ", " + w.requests + (w.requests === 1 ? " request" : " requests") + ", loaded in " + w.ms + " ms";
    out.hidden = false;
  }

  if (doc.readyState === "complete") setTimeout(report, 0);
  else window.addEventListener("load", function () { setTimeout(report, 0); });
}
