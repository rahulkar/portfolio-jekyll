// The orbit's pause control. The hero's orbit and the small one in the footer
// run by themselves, so the visitor gets a way to stop them (WCAG 2.2.2): a
// button on the home page's hero, the footer's orbit itself on every page (a
// button lies over it), and a command in the command menu. The choice is kept in
// localStorage ("orbit" = "paused") and applied before first paint by
// theme.js as the class motion-paused on <html>; the stylesheet pauses the
// footer's orbit from that class, and orbit.js hears the "motionchange" event.
// Under reduced motion nothing runs, so the controls never show.
export function motionPaused(doc) {
  return doc.documentElement.classList.contains("motion-paused");
}

function reflect(doc) {
  var paused = motionPaused(doc);
  [].forEach.call(doc.querySelectorAll("[data-motion-label]"), function (label) {
    label.textContent = paused ? "Play orbit" : "Pause orbit";
  });
}

export function setMotion(doc, paused) {
  doc.documentElement.classList.toggle("motion-paused", paused);
  try {
    if (paused) localStorage.setItem("orbit", "paused");
    else localStorage.removeItem("orbit");
  } catch (e) {}
  reflect(doc);
  doc.dispatchEvent(new CustomEvent("motionchange"));
}

export function initMotion(doc) {
  var still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var command = doc.getElementById("cmdk-motion");
  if (still) {
    // Nothing to pause: the command goes, and the buttons stay hidden.
    if (command) command.remove();
    return;
  }
  reflect(doc);
  [].forEach.call(doc.querySelectorAll("[data-motion-toggle]"), function (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      setMotion(doc, !motionPaused(doc));
    });
  });
}
