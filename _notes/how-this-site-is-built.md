---
title: How this site is built
date: 2026-09-27
last_modified_at: 2026-10-24
description: Jekyll on GitHub Pages, two self-hosted fonts, a Content-Security-Policy and CI checks.
feed_id: /scribbles/how-this-notebook-is-drawn
icon: code-xml
art: site
---
- Jekyll, hosted on GitHub Pages behind Cloudflare.
- HTML templates and CSS compiled from Sass. About 13 KB of JavaScript (5 KB compressed) for the theme switch, the Kolkata clock and its time converter, the copy button, the command menu (Ctrl+K), the layout grid overlay, the page-weight line in the footer and the 404 page.
- The parts key under the 6502 photo highlights each chip with CSS alone (`:has()`), and pages change with cross-document view transitions.
- Instrument Sans and Fragment Mono (SIL Open Font License), subset to Latin and served from this domain.
- Icons from Lucide (ISC License) and Tabler Icons (MIT License), built into one include with the site's own icons, and line drawings as inline SVG. Both take their colours from the theme.
- The Content-Security-Policy allows scripts only from this site and from Cloudflare (its Web Analytics beacon and email-address decoder).
- CI on every pull request and push to master: HTML validation, a link check, Playwright with axe at three screen sizes in light and dark, and Lighthouse.
