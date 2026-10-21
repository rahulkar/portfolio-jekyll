// The layout grid: the page's own columns drawn over everything, opened from
// the command menu. The overlay uses the same .wrap, --cols and --gutter as
// the content, so what it shows is the grid the page is set on, and its
// readout is measured from the live layout. Esc hides it.
var overlay = null;
var spec = null;
var cols = null;
var frame = 0;

function measure() {
  frame = 0;
  if (!overlay || overlay.hidden) return;
  var s = getComputedStyle(cols);
  var n = s.gridTemplateColumns.split(" ").filter(Boolean).length;
  var gutter = Math.round(parseFloat(s.columnGap) || 0);
  var width = Math.round(cols.getBoundingClientRect().width);
  spec.textContent = n + " columns · " + gutter + "px gutters · " + width + "px wide";
}

function onResize() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function build(doc) {
  overlay = doc.createElement("div");
  overlay.className = "layout-grid";
  overlay.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  cols = doc.createElement("div");
  cols.className = "wrap layout-grid__cols";
  for (var i = 0; i < 12; i++) cols.appendChild(doc.createElement("span"));
  spec = doc.createElement("p");
  spec.className = "layout-grid__spec";
  overlay.appendChild(cols);
  overlay.appendChild(spec);
  doc.body.appendChild(overlay);
  window.addEventListener("resize", onResize);
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden && !doc.querySelector("dialog[open]")) setGrid(doc, false);
  });
}

export function gridShown() {
  return !!overlay && !overlay.hidden;
}

export function setGrid(doc, on) {
  if (!overlay) {
    if (!on) return;
    build(doc);
  }
  overlay.hidden = !on;
  doc.documentElement.classList.toggle("has-grid", on);
  if (on) measure();
}
