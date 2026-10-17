// Light/dark toggle. The OS preference is the default; a manual choice
// persists and is applied before first paint by /assets/js/theme.js.
export function initThemeToggle(btn) {
  if (!btn) return;
  var root = document.documentElement;
  var dark = window.matchMedia("(prefers-color-scheme: dark)");
  var metas = document.querySelectorAll('meta[name="theme-color"]');

  function isDark() {
    var t = root.getAttribute("data-theme");
    return t === "dark" || (t !== "light" && dark.matches);
  }
  // Two frames without transitions, so the swap does not animate every colour.
  function freeze() {
    root.classList.add("theme-switching");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove("theme-switching"); });
    });
  }
  function reflect() { btn.setAttribute("aria-pressed", String(isDark())); }

  btn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    freeze();
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    metas.forEach(function (m) { m.setAttribute("content", next === "dark" ? "#121211" : "#F6F5F1"); });
    reflect();
  });
  if (dark.addEventListener) dark.addEventListener("change", function () { freeze(); reflect(); });
  btn.hidden = false;
  reflect();
}
