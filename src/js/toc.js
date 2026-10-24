// The contents list on a note marks the section being read
// (aria-current="location"): the last heading above the upper third of the
// window, or the last one once the page is scrolled to the end.
export function initToc(doc) {
  var toc = doc.querySelector("[data-toc]");
  if (!toc) return;
  var links = [].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var heads = links.map(function (a) { return doc.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); });
  var current = null;
  var queued = false;

  function update() {
    queued = false;
    var line = window.innerHeight / 3;
    var at = -1;
    heads.forEach(function (h, i) {
      if (h && h.getBoundingClientRect().top <= line) at = i;
    });
    var root = doc.documentElement;
    if (at >= 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2) at = heads.length - 1;
    var link = links[at] || null;
    if (link === current) return;
    if (current) current.removeAttribute("aria-current");
    if (link) link.setAttribute("aria-current", "location");
    current = link;
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}
