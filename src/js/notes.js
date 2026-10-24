// Notes pages only (/notes/ and each note), loaded after main.js: the topic
// filter, Copy link and the device's share sheet, the contents highlight, the
// photo viewer and Copy on code blocks. Each part is an addition: without the
// script the filter stays hidden, topic links land on the full list, the
// share links still work and photos open as files.
import { initTopics } from "./topics.js";
import { initShare } from "./share.js";
import { initToc } from "./toc.js";
import { initLightbox } from "./lightbox.js";
import { initCodeCopy } from "./code-copy.js";

function start() {
  initTopics(document);
  initShare(document);
  initToc(document);
  initLightbox(document);
  initCodeCopy(document);
}

if (document.readyState !== "loading") start();
else document.addEventListener("DOMContentLoaded", start);
