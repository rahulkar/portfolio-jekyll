// Notes pages only (/notes/ and each note), loaded after main.js: the topic
// filter, Copy link and the device's share sheet, the contents highlight, the
// photo viewer, Copy on code blocks and the tilt on foil photos. Each part is an addition: without the
// script the filter stays hidden, topic links land on the full list, the
// share links still work and photos open as files.
import { initTopics } from "./topics.js";
import { initShare } from "./share.js";
import { initToc } from "./toc.js";
import { initLightbox } from "./lightbox.js";
import { initCodeCopy } from "./code-copy.js";
import { initTilt } from "./tilt.js";

function start() {
  initTopics(document);
  initShare(document);
  initToc(document);
  initLightbox(document);
  initCodeCopy(document);
  initTilt(document);
}

if (document.readyState !== "loading") start();
else document.addEventListener("DOMContentLoaded", start);
