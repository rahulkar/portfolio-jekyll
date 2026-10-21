// The command menu: Ctrl+K (Cmd+K on a Mac) or the header button opens a
// modal combobox over the commands rendered in _includes/command-menu.html.
// Typing filters them (every word has to appear in the label or its
// keywords), the arrow keys move, Enter runs. Matches are marked with <mark>
// elements built through the DOM, never from HTML strings.
import { copyText } from "./copy-email.js";
import { gridShown, setGrid } from "./grid-overlay.js";

export function initCommandMenu(doc) {
  var dialog = doc.getElementById("cmdk");
  var input = doc.getElementById("cmdk-input");
  if (!dialog || !input || typeof dialog.showModal !== "function") return;
  var trigger = doc.getElementById("cmdk-btn");
  var themeBtn = doc.getElementById("theme-btn");
  var list = dialog.querySelector(".cmdk__list");
  var empty = dialog.querySelector(".cmdk__empty");
  var status = dialog.querySelector("[data-cmdk-status]");
  var groups = [].slice.call(dialog.querySelectorAll(".cmdk__group"));
  var rows = [].slice.call(dialog.querySelectorAll('[role="option"]')).map(function (el) {
    var label = el.querySelector(".cmdk__label");
    var hint = el.querySelector(".cmdk__hint");
    return {
      el: el,
      label: label,
      text: label.textContent,
      hint: hint,
      hintText: hint ? hint.textContent : "",
      keys: (el.getAttribute("data-keys") || "").toLowerCase(),
    };
  });
  var shown = rows;
  var active = null;
  var opener = null;
  var timers = { say: 0, close: 0, hint: 0 };
  var mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");

  function rowFor(el) {
    for (var i = 0; i < rows.length; i++) if (rows[i].el === el) return rows[i];
    return null;
  }

  // Cloudflare's email obfuscation can rewrite the address in attributes;
  // the visible mailto link is decoded again after load.
  function email() {
    var copy = dialog.querySelector("[data-copy]");
    var v = copy ? copy.getAttribute("data-copy") || "" : "";
    if (v.indexOf("@") > 0) return v;
    var link = doc.querySelector('a[href^="mailto:"]');
    return link ? link.textContent.trim() : v;
  }

  function say(text) {
    clearTimeout(timers.say);
    status.textContent = text;
  }

  // Labels that describe state are rewritten before every search.
  function relabel() {
    rows.forEach(function (r) {
      var action = r.el.getAttribute("data-action");
      if (action === "theme") r.text = themeBtn && themeBtn.getAttribute("aria-pressed") === "true" ? "Switch to light theme" : "Switch to dark theme";
      if (action === "grid") r.text = gridShown() ? "Hide layout grid" : "Show layout grid";
    });
  }

  function paint(r, terms) {
    var text = r.text;
    var low = text.toLowerCase();
    var spans = [];
    terms.forEach(function (t) {
      var i = low.indexOf(t);
      if (i >= 0) spans.push([i, i + t.length]);
    });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    r.label.textContent = "";
    var at = 0;
    spans.forEach(function (s) {
      if (s[1] <= at) return;
      var from = Math.max(s[0], at);
      if (from > at) r.label.appendChild(doc.createTextNode(text.slice(at, from)));
      var mark = doc.createElement("mark");
      mark.textContent = text.slice(from, s[1]);
      r.label.appendChild(mark);
      at = s[1];
    });
    if (at < text.length) r.label.appendChild(doc.createTextNode(text.slice(at)));
  }

  function select(r, scroll) {
    if (active) active.el.setAttribute("aria-selected", "false");
    active = r;
    if (!r) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    r.el.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", r.el.id);
    if (scroll) r.el.scrollIntoView({ block: "nearest" });
  }

  function filter() {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = rows.filter(function (r) {
      var hay = r.text.toLowerCase() + " " + r.keys;
      var hit = terms.every(function (t) { return hay.indexOf(t) >= 0; });
      r.el.hidden = !hit;
      paint(r, hit ? terms : []);
      return hit;
    });
    groups.forEach(function (g) {
      var any = shown.some(function (r) { return g.contains(r.el); });
      var head = doc.getElementById(g.getAttribute("aria-labelledby"));
      g.hidden = !any;
      if (head) head.hidden = !any;
    });
    empty.hidden = shown.length > 0;
    input.setAttribute("aria-expanded", String(shown.length > 0));
    list.scrollTop = 0;
    select(shown[0] || null, false);
    // Counted once typing pauses, so a screen reader is not interrupted per key.
    clearTimeout(timers.say);
    timers.say = setTimeout(function () {
      status.textContent = !terms.length ? "" : shown.length === 1 ? "1 result" : shown.length ? shown.length + " results" : "No matches";
    }, 500);
  }

  function move(step) {
    if (!shown.length) return;
    var i = shown.indexOf(active);
    select(shown[(i + step + shown.length) % shown.length], true);
  }

  function flash(r, text) {
    if (!r.hint) return;
    clearTimeout(timers.hint);
    r.hint.textContent = text;
    timers.hint = setTimeout(function () { r.hint.textContent = r.hintText; }, 2000);
  }

  function run(r) {
    if (!r) return;
    var el = r.el;
    var action = el.getAttribute("data-action");
    var href = el.getAttribute("data-href");
    if (action === "theme") {
      if (themeBtn) themeBtn.click();
      relabel();
      filter();
      if (shown.indexOf(r) >= 0) select(r, false);
      say(themeBtn && themeBtn.getAttribute("aria-pressed") === "true" ? "Dark theme on." : "Light theme on.");
      return;
    }
    if (action === "grid") {
      close();
      setGrid(doc, !gridShown());
      return;
    }
    if (action === "copy") {
      var address = email();
      copyText(address).then(function () {
        flash(r, "Copied");
        say("Email address copied.");
        timers.close = setTimeout(close, 700);
      }, function () {
        flash(r, address);
        say("Copying was blocked. The address is " + address + ".");
      });
      return;
    }
    if (!href) return;
    close();
    if (el.hasAttribute("data-download")) {
      var a = doc.createElement("a");
      a.href = href;
      a.download = el.getAttribute("data-download");
      doc.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    if (href.indexOf("mailto:") === 0 && href.indexOf("@") < 0) href = "mailto:" + email() + "?subject=Hello";
    // A same-page #section only scrolls; anything else navigates.
    window.location.assign(href);
  }

  function open() {
    if (dialog.open) return;
    clearTimeout(timers.close);
    opener = doc.activeElement;
    relabel();
    input.value = "";
    filter();
    say("");
    dialog.showModal();
    input.focus();
  }

  function close() {
    clearTimeout(timers.close);
    if (dialog.open) dialog.close();
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); run(active); }
  });
  // Pointing selects; clicking runs. The input keeps focus throughout.
  list.addEventListener("mousedown", function (e) {
    if (e.target.closest('[role="option"]')) e.preventDefault();
  });
  list.addEventListener("mousemove", function (e) {
    var r = rowFor(e.target.closest('[role="option"]'));
    if (r && r !== active) select(r, false);
  });
  list.addEventListener("click", function (e) {
    run(rowFor(e.target.closest('[role="option"]')));
  });
  // A click on the backdrop lands on the dialog itself, outside the panel.
  // It closes only if the press began there too, so a selection dragged out
  // of the field, or the click that opened the menu, never closes it.
  var pressedOutside = false;
  dialog.addEventListener("pointerdown", function (e) {
    pressedOutside = e.target === dialog;
  });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog && pressedOutside) close();
    pressedOutside = false;
  });
  dialog.querySelector(".cmdk__close").addEventListener("click", close);
  dialog.addEventListener("close", function () {
    rows.forEach(function (r) { if (r.hint) r.hint.textContent = r.hintText; });
    if (opener && opener.focus && doc.activeElement !== opener && opener !== doc.body) opener.focus({ preventScroll: true });
    opener = null;
  });

  doc.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key || "").toLowerCase() === "k") {
      e.preventDefault();
      if (dialog.open) close();
      else open();
    }
  });

  if (trigger) {
    var keys = trigger.querySelector("[data-cmdk-keys]");
    if (keys) keys.textContent = mac ? "⌘K" : "Ctrl K";
    trigger.setAttribute("aria-keyshortcuts", mac ? "Meta+K" : "Control+K");
    trigger.addEventListener("click", open);
    trigger.hidden = false;
  }
}
