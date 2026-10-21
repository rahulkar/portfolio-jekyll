// Copy-to-clipboard for the email address, announced through a polite
// status region. Falls back to the visible address if Cloudflare's email
// obfuscation has rewritten the data attribute.

// Resolves when the text is on the clipboard; rejects when there is no
// clipboard access or the browser refuses it.
export function copyText(text) {
  if (!navigator.clipboard || !navigator.clipboard.writeText) return Promise.reject(new Error("unavailable"));
  return navigator.clipboard.writeText(text);
}

export function initCopyEmail(buttons) {
  buttons.forEach(function (btn) {
    var box = btn.closest(".email");
    var label = btn.querySelector(".copy__label");
    var status = box ? box.querySelector("[data-copy-status]") : null;
    var link = box ? box.querySelector(".email__address") : null;
    var reset = 0;
    var announce = function (text) { if (status) status.textContent = text; };
    var show = function (text) {
      if (label) label.textContent = text;
      clearTimeout(reset);
      reset = setTimeout(function () {
        if (label) label.textContent = "Copy";
        announce("");
      }, text === "Copied" ? 2000 : 4000);
    };
    // Without clipboard access, select the address so Ctrl+C (or a long press) copies it.
    var fail = function (message) {
      if (link && window.getSelection) window.getSelection().selectAllChildren(link);
      show("Selected");
      announce(message);
    };

    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-copy-email") || "";
      if (email.indexOf("@") < 0 && link) email = link.textContent.trim();
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        fail("Copying is not available here. The address is selected; copy it from there.");
        return;
      }
      copyText(email).then(function () {
        show("Copied");
        announce("Email address copied.");
      }).catch(function () {
        fail("Copying was blocked. The address is selected; copy it from there.");
      });
    });
    btn.hidden = false;
  });
}
