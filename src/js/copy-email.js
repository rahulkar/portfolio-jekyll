// Copy-to-clipboard for the email address, announced through a polite
// status region. Falls back to the visible address if Cloudflare's email
// obfuscation has rewritten the data attribute.
export function initCopyEmail(buttons) {
  buttons.forEach(function (btn) {
    var box = btn.closest(".email");
    var label = btn.querySelector(".copy__label");
    var status = box ? box.querySelector("[data-copy-status]") : null;
    var link = box ? box.querySelector(".email__address") : null;
    var reset = 0;
    var announce = function (text) { if (status) status.textContent = text; };

    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-copy-email") || "";
      if (email.indexOf("@") < 0 && link) email = link.textContent.trim();
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        announce("Copying is not available here. Select the address to copy it.");
        return;
      }
      navigator.clipboard.writeText(email).then(function () {
        if (label) label.textContent = "Copied";
        announce("Email address copied.");
        clearTimeout(reset);
        reset = setTimeout(function () {
          if (label) label.textContent = "Copy";
          announce("");
        }, 2000);
      }).catch(function () {
        announce("Copying was blocked. Select the address to copy it.");
      });
    });
    btn.hidden = false;
  });
}
