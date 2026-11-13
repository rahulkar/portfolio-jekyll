// The home page's header sits over the dark stage from 1024px and wears the
// dark tokens there (see _effects.scss). Once the stage has scrolled out from
// under it, this marks the page so the header takes the page's own colours.
export function initStageHeader(root) {
  var stage = document.querySelector(".orbit-stage");
  if (!stage || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (entries) {
    root.classList.toggle("is-past-stage", !entries[0].isIntersecting);
  }, { rootMargin: "-64px 0px 0px 0px" }).observe(stage);
}
