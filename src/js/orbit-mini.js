// The footer's small orbit turns only while it is on screen: this marks it
// running then, and the CSS animation is paused otherwise. Without the script
// it stays still.
export function initOrbitMini(doc) {
  var el = doc.querySelector("[data-orbit-mini]");
  if (!el || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (entries) {
    el.classList.toggle("is-running", entries[0].isIntersecting);
  }).observe(el);
}
