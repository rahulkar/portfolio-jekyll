---
title: how this notebook is drawn
date: 2026-09-27
description: Plain HTML and CSS, a little JavaScript with Rough.js, a strict Content-Security-Policy, and nothing from a CDN.
feed_id: /scribbles/how-this-notebook-is-drawn
---
The page is plain HTML and CSS with a small amount of JavaScript that draws the wobbly frames at runtime using Rough.js. The doodles are drawn once at build time and shipped as static paths. Nothing loads from a CDN, and a strict Content-Security-Policy keeps it that way. The handwriting is Excalifont, the body text is Nunito, and it all builds with Jekyll on GitHub Pages.

The site tests itself: Playwright drives it at phone and desktop widths, axe checks accessibility, and Lighthouse keeps the scores honest on every push. The moon turns it into a chalkboard. If the drawing-in gets in the way, the wave button turns the motion down.

Why bother drawing a portfolio by hand? Because a sketch is honest about being unfinished, and so is every system I work on.
