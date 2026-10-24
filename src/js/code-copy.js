// A Copy button on every code block in a note. The button is added here, so
// without the script there is none; the result is announced through one
// polite status line.
import { copyText } from "./copy-email.js";

export function initCodeCopy(doc) {
  var blocks = [].slice.call(doc.querySelectorAll(".note__body pre"));
  if (!blocks.length) return;
  var status = doc.createElement("p");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  doc.body.appendChild(status);

  blocks.forEach(function (pre) {
    // Rouge wraps a block in div.highlight; a bare <pre> gets a wrapper.
    var box = pre.parentNode;
    if (!box.classList.contains("highlight")) {
      box = doc.createElement("div");
      pre.parentNode.insertBefore(box, pre);
      box.appendChild(pre);
    }
    box.classList.add("code-block");
    var btn = doc.createElement("button");
    var reset = 0;
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      copyText(code.textContent.replace(/\n$/, "")).then(function () {
        btn.textContent = "Copied";
        status.textContent = "Code copied.";
      }, function () {
        if (window.getSelection) window.getSelection().selectAllChildren(code);
        btn.textContent = "Selected";
        status.textContent = "Copying was blocked. The code is selected; copy it from there.";
      });
      clearTimeout(reset);
      reset = setTimeout(function () {
        btn.textContent = "Copy";
        status.textContent = "";
      }, 2000);
    });
    box.appendChild(btn);
  });
}
