// The two share buttons that need a script, beside a note's plain share
// links: Copy link, and Share, which opens the device's own share sheet where
// the browser has one (navigator.share). Each starts hidden and shows only
// where it can work. Results are announced through the group's status line.
import { copyText } from "./copy-email.js";

export function initShare(doc) {
  var title = doc.querySelector("h1");
  var description = doc.querySelector('meta[name="description"]');

  [].forEach.call(doc.querySelectorAll(".share"), function (box) {
    var copy = box.querySelector("[data-copy-link]");
    var native = box.querySelector("[data-share-native]");
    var field = box.querySelector(".share__url");
    var status = box.querySelector("[data-share-status]");
    if (!copy) return;
    var url = copy.getAttribute("data-copy-link");
    var label = copy.querySelector(".share__button-label");
    var reset = 0;

    function say(text) {
      if (status) status.textContent = text;
    }

    function show(text) {
      label.textContent = text;
      clearTimeout(reset);
      reset = setTimeout(function () {
        label.textContent = "Copy link";
        say("");
      }, 2000);
    }

    copy.addEventListener("click", function () {
      copyText(url).then(function () {
        if (field) field.hidden = true;
        show("Copied");
        say("Link copied.");
      }, function () {
        // Without clipboard access, show the link selected, ready to copy.
        if (field) {
          field.hidden = false;
          field.focus();
          field.select();
        }
        show("Selected");
        say("Copying was blocked. The link is selected; copy it from there.");
      });
    });
    copy.hidden = false;

    if (native && typeof navigator.share === "function") {
      native.addEventListener("click", function () {
        var data = { title: title ? title.textContent.trim() : doc.title, url: url };
        if (description) data.text = description.getAttribute("content");
        // Closing the sheet without sharing rejects the promise; that is not an error.
        navigator.share(data).catch(function () {});
      });
      native.hidden = false;
    }
  });
}
