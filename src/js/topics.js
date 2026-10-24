// The topic filter on /notes/. A topic link (in the filter, or on a card)
// narrows the grid to that topic's notes without leaving the page, and the
// address keeps the choice (?topic=), so Back undoes it and a topic link on a
// note lands on the filtered list. Cards leave the grid rather than hide, so
// its quantity queries count only the cards that are shown.

function topicOf(search) {
  var m = /[?&]topic=([^&#]*)/.exec(search || "");
  return m ? decodeURIComponent(m[1]) : "";
}

export function initTopics(doc) {
  var nav = doc.querySelector("[data-topics]");
  var grid = doc.querySelector("[data-note-grid]");
  if (!nav || !grid || !window.history || !history.pushState) return;
  var cards = [].slice.call(grid.children);
  var links = [].slice.call(nav.querySelectorAll("[data-topic]"));
  var status = nav.querySelector("[data-topics-status]");

  function apply(topic, announce) {
    var link = links.filter(function (a) { return a.getAttribute("data-topic") === topic; })[0];
    // An unknown topic shows everything.
    if (!link) {
      topic = "";
      link = links[0];
    }
    var shown = cards.filter(function (card) {
      return !topic || (" " + (card.getAttribute("data-topics") || "") + " ").indexOf(" " + topic + " ") >= 0;
    });
    cards.forEach(function (card) {
      if (shown.indexOf(card) < 0 && card.parentNode) card.remove();
    });
    shown.forEach(function (card) { grid.appendChild(card); });
    links.forEach(function (a) {
      if (a === link) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (announce && status) {
      var name = topic ? link.firstChild.textContent.trim() : "";
      status.textContent = (shown.length === 1 ? "1 note" : shown.length + " notes") + (name ? " on " + name : "");
    }
  }

  doc.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("main a[href]") : null;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.origin !== location.origin || a.pathname !== location.pathname) return;
    e.preventDefault();
    if (a.search !== location.search) history.pushState(null, "", a.pathname + a.search);
    apply(topicOf(a.search), true);
    // A topic picked further down the page brings the filter back into view.
    if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView();
  });
  window.addEventListener("popstate", function () { apply(topicOf(location.search), true); });

  apply(topicOf(location.search), false);
  nav.hidden = false;
}
