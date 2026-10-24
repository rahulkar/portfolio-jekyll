// The photo viewer on a note. A photo's link opens the large image in the
// <dialog> the note layout renders, instead of opening the file: the
// thumbnail shows at once and the largest WebP replaces it when it arrives.
// The arrow keys and buttons step through the note's photos, Esc closes, and
// focus goes back to the photo. Without the script the link opens the file.

// The widest candidate in the photo's WebP srcset, else the linked file.
function largest(link) {
  var source = link.querySelector('source[type="image/webp"]');
  var best = "";
  var width = 0;
  (source ? source.getAttribute("srcset") || "" : "").split(",").forEach(function (part) {
    var bits = part.trim().split(/\s+/);
    var w = parseInt(bits[1], 10) || 0;
    if (bits[0] && w > width) {
      width = w;
      best = bits[0];
    }
  });
  return best || link.getAttribute("href");
}

export function initLightbox(doc) {
  var dialog = doc.querySelector("[data-lightbox]");
  if (!dialog || typeof dialog.showModal !== "function") return;
  var links = [].slice.call(doc.querySelectorAll(".note__body .figure__link"));
  if (!links.length) return;
  var figure = dialog.querySelector("[data-lightbox-figure]");
  var count = dialog.querySelector("[data-lightbox-count]");
  var close = dialog.querySelector("[data-lightbox-close]");
  var steps = [].slice.call(dialog.querySelectorAll("[data-lightbox-step]"));
  var img = doc.createElement("img");
  var caption = doc.createElement("figcaption");
  var at = 0;
  var opener = null;
  img.className = "lightbox__img";
  img.decoding = "async";
  caption.className = "lightbox__caption";
  figure.appendChild(img);
  figure.appendChild(caption);
  if (links.length < 2) steps.forEach(function (b) { b.hidden = true; });

  function show(i) {
    at = (i + links.length) % links.length;
    var link = links[at];
    var thumb = link.querySelector("img");
    var cap = link.parentNode.querySelector("figcaption");
    var big = largest(link);
    img.alt = thumb ? thumb.alt : "";
    // The thumbnail's size attributes give the photo its shape before it loads.
    if (thumb) {
      img.setAttribute("width", thumb.getAttribute("width"));
      img.setAttribute("height", thumb.getAttribute("height"));
    }
    img.src = thumb ? thumb.currentSrc || thumb.src : big;
    var next = new Image();
    next.onload = function () {
      if (links[at] === link) img.src = big;
    };
    next.src = big;
    // A plain caption carries over; the parts key under the 6502 photo
    // matches callouts the viewer does not draw, so the alt text stands in.
    caption.textContent = cap && !cap.querySelector("ol, ul") ? cap.textContent.trim() : img.alt;
    count.textContent = at + 1 + " of " + links.length;
  }

  links.forEach(function (link, i) {
    link.addEventListener("click", function (e) {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      opener = link;
      show(i);
      dialog.showModal();
      close.focus();
    });
  });
  steps.forEach(function (b) {
    b.addEventListener("click", function () { show(at + Number(b.getAttribute("data-lightbox-step"))); });
  });
  close.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("keydown", function (e) {
    if (links.length < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      show(at + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      show(at - 1);
    }
  });
  // A click beside the photo (on the dialog or the empty figure) closes it.
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog || e.target === figure) dialog.close();
  });
  dialog.addEventListener("close", function () {
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  });
}
