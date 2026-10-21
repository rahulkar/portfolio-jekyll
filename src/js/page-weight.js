// The colophon's page-weight line: what this page cost to load, read from
// the Navigation and Resource Timing APIs once the load event has run.
// Cross-origin files report no size without Timing-Allow-Origin, so the
// total is this site's own bytes; the count is every request.
function kb(bytes) {
  return bytes < 1024 ? bytes + " B" : Math.round(bytes / 1024) + " KB";
}

export function initPageWeight(doc) {
  var out = doc.querySelector("[data-page-weight]");
  if (!out || !window.performance || !performance.getEntriesByType) return;

  function report() {
    var nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return;
    var files = [nav].concat(performance.getEntriesByType("resource"));
    var bytes = files.reduce(function (sum, f) { return sum + (f.encodedBodySize || 0); }, 0);
    var ms = Math.round(nav.loadEventStart || nav.domContentLoadedEventEnd);
    out.textContent = "This page: " + kb(bytes) + ", " + files.length + (files.length === 1 ? " request" : " requests") + ", loaded in " + ms + " ms";
    out.hidden = false;
  }

  if (doc.readyState === "complete") setTimeout(report, 0);
  else window.addEventListener("load", function () { setTimeout(report, 0); });
}
