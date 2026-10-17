---
title: How this site is built
date: 2026-09-27
last_modified_at: 2026-10-17
description: Jekyll on GitHub Pages, two self-hosted fonts, a Content-Security-Policy and CI checks.
feed_id: /scribbles/how-this-notebook-is-drawn
---
- Jekyll, hosted on GitHub Pages behind Cloudflare.
- HTML templates and CSS compiled from Sass. About 4 KB of JavaScript for the theme switch, the Kolkata clock, the copy button and the 404 page.
- Instrument Sans and Fragment Mono (SIL Open Font License), subset to Latin and served from this domain.
- The Content-Security-Policy allows scripts only from this site and from Cloudflare (its Web Analytics beacon and email-address decoder).
- CI on every pull request and push to master: HTML validation, a link check, Playwright with axe at three screen sizes in light and dark, and Lighthouse.
