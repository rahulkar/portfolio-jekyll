---
title: How this site is built
date: 2026-09-27
last_modified_at: 2026-10-24
description: Jekyll on GitHub Pages, two self-hosted fonts, a Content-Security-Policy and CI checks.
feed_id: /scribbles/how-this-notebook-is-drawn
icon: code-xml
art: site
topics: [Web]
image:
  path: /assets/og/notes/how-this-site-is-built-v1.png
  width: 1200
  height: 630
  alt: "How this site is built, a note by Rahul Kar, with a line drawing of a browser window on a grid"
---
- Jekyll, hosted on GitHub Pages behind Cloudflare.
- HTML templates and CSS compiled from Sass. About 13 KB of JavaScript (5 KB compressed) for the theme switch, the Kolkata clock and its time converter, the copy button, the command menu (Ctrl+K), the layout grid overlay, the page-weight line in the footer and the 404 page.
- Notes load one more script, about 6 KB (2 KB compressed), for Copy link, the device's share sheet, the topic filter, the contents marker and the photo viewer. The share links are plain links that load nothing from the networks, the reading-progress line is a CSS scroll-driven animation, and a Node script draws each note's share card.
- The parts key under the 6502 photo highlights each chip with CSS alone (`:has()`), and pages change with cross-document view transitions.
- Instrument Sans and Fragment Mono (SIL Open Font License), subset to Latin and served from this domain.
- Icons from Lucide (ISC License) and Tabler Icons (MIT License), built into one include with the site's own icons, and line drawings as inline SVG. Both take their colours from the theme.
- The Content-Security-Policy allows scripts only from this site and from Cloudflare (its Web Analytics beacon and email-address decoder).
- CI on every pull request and push to master: HTML validation, a link check, Playwright with axe at three screen sizes in light and dark, and Lighthouse.
