# Local development

The site is a Jekyll 4.4 build (with jekyll-seo-tag, jekyll-sitemap and
jekyll-feed) with a small Node toolchain for the CSS, the bundled JavaScript,
the fonts and the brand images. GitHub Actions builds it with the versions in
`Gemfile.lock`, tests it and deploys it to GitHub Pages (see Deploy below), so a
local build writes the same pages as the live site, apart from dates: CI builds
in UTC, a local build in your machine's time zone (set `TZ=UTC` to match).

## Prerequisites

- Node.js 22.22+ or 24.8+ and npm (CI uses Node 22)
- Ruby 3.2+ with the MSYS2 devkit (RubyInstaller "Ruby+Devkit"), then `gem install bundler`
- Python 3, only for the browser-pane `portfolio` launch config (`python -m http.server 4001` on `_site`); `npm run serve:light` uses `tools/serve.mjs` instead

## One-time setup

```powershell
npm install
bundle install
```

If `bundle install` has to compile native gems and fails, make sure the devkit
is installed (`ridk install` from the RubyInstaller prompt). As a last resort
Jekyll can run against the globally installed gems by bypassing Bundler:
`$env:JEKYLL_NO_BUNDLER_REQUIRE='true'; jekyll build`.

## Everyday loop

```powershell
npm run build          # sass + esbuild -> assets/css/main.css, assets/js/main.js, assets/js/orbit.js, assets/js/notes.js
npm run typecheck      # tsc over src/js/**/*.ts; checks types and emits nothing
npm run check:csp      # lint markup and scripts for CSP regressions, plus the accent guard
bundle exec jekyll build
npm run serve:light    # builds, then serves _site on http://127.0.0.1:4001
npm run verify         # build, lint, jekyll build, validate HTML, Playwright
```

Open http://127.0.0.1:4001/ and http://127.0.0.1:4001/404.html. The strict
Content-Security-Policy meta tag blocks Jekyll's live-reload script, so do
browser checks (console must show no CSP violations) against this static
server, not `jekyll serve`. `npm run dev` still runs the sass/esbuild watchers
next to `jekyll serve --force_polling` for quick iteration without reload.

**Run `npm run build` before every commit.** CI rebuilds and fails if the
committed `assets/css/main.css`, `assets/js/main.js`, `assets/js/orbit.js` or `assets/js/notes.js` differ from `src/`.

## Tests

The site tests itself with Playwright (`tests/site.spec.js`) at three sizes:
desktop (1440×900), phone (Pixel 7) and small (360×640). Every page is loaded in
light and dark and must have a clean console, no CSP violations, no horizontal
overflow and no style attribute other than the datum's `--now` (and `--probe`);
axe runs with colour contrast switched on, in both schemes. The rest covers the
datum and its converter (for a visitor in London, in Kolkata and with JavaScript
off), the hero and section order, the career scale, the parts key and its
callouts, the command menu (Ctrl+K, filtering, keyboard, the section, theme,
grid and copy commands, axe while open), the page-weight line, 44px targets, no
layout shift when the scripts run, the theme toggle, the ink focus ring, the
skip link, `prefers-contrast`, a scan proving red only appears on the tick and
the current nav item, the steps on `/how-i-work/` (what each produces, the
hand-off links and the chips they ring, one rail from 1280px) and its print
brief, which must fit one A4 page (saved as `how-i-work.pdf`), the notes (the
card grid closing every row at three widths, the topic filter and its address,
Back, unknown topics and topic links from a note, the facts and the contents
against the sections, the rail from 1024px and the section it marks, every
share link's address, Copy link with and without clipboard access, the photo
viewer with the keyboard and axe while open, the progress line, 44px targets
and the pages without JavaScript), the redirects, the feed IDs and topics, the
sitemap, the home page's JSON-LD and a note's share card, article tags and
breadcrumbs. Tests wait for `html.is-ready`, which `main.js` sets once
the fonts are in (or after a second); keep that contract if the script changes.
Lighthouse CI asserts accessibility and SEO scores (`lighthouserc.json`).

```powershell
npx playwright install chromium     # once
bundle exec jekyll build
npm test                            # Playwright + axe against _site
npm run lhci                        # Lighthouse CI (reports in .lighthouseci/)
```

Kaspersky injects a script into localhost pages, which skews Lighthouse and adds
a console error. For a local run against the preview, block it:
`npx lighthouse http://127.0.0.1:4001/ --preset=desktop --blocked-url-patterns="*kaspersky-labs.com*"`.

## Fonts and brand assets

| Script | What it does | When to run |
|---|---|---|
| `npm run fonts` | Subsets Instrument Sans and Fragment Mono (from their Fontsource packages) to Latin, writes `assets/fonts/*-v1.woff2` and their OFL notices, and generates `src/styles/_font-faces.scss` with metric-matched fallbacks. Reads Arial and Consolas from `C:\Windows\Fonts` (or `FALLBACK_FONT_DIR`); Roboto comes from `@capsizecss/metrics` | when a font package changes |
| `npm run brand` | Renders the favicon family (`favicon-vN.svg`, `.ico`, `apple-touch-icon-vN.png`, root `favicon.ico`), the share card `assets/og-vN.png`, and `assets/brand/linkedin-banner-vN.png` (1584×396, left side kept clear for the profile photo), `github-header-vN.png` (1280×320) and `email-signature-vN.png` (600×200 at 2×). Text is set as outlines; the datum is drawn without its red tick. Bump `V` at the top of `tools/brand.mjs` first, then the matching names in `_includes/head.html` and `_config.yml` | after changing the name, title or hero facts |
| `npm run icons` | Writes `_includes/icon.html` from the list in `tools/icons.mjs`: the site's own 14px icons plus the ones it uses from Lucide (ISC) and Tabler Icons (MIT), both installed as dev dependencies, and copies their licences to `assets/icons/`. Every icon line is 1.5px at any size (`vector-effect: non-scaling-stroke`); sizes are the default 0.875em, `icon--md` (18px) and `icon--lg` (24px) | when adding an icon (name it in `tools/icons.mjs`, then use `{% include icon.html name="..." %}`) |
| `npm run cards` | Renders each note's share card (the `og:image` the networks show with a link, 1200×630): its title and summary as outlines, its date and its drawing from `_includes/art/` on a framed plate, in the datum colours. Writes to the note's `image.path`; notes without one are skipped | after adding a note or changing its title, summary or drawing (bump the `-vN` in `image.path` first) |
| `node tools/photo.mjs <photo.heic> <name> [maxWidth]` | Decodes a phone photo (HEIC too), strips metadata, writes `assets/img/<name>-{640,1280}.{webp,jpg}` | when adding a photo (keep the `.heic` source out of git; it is ignored) |

Files under `/assets` are immutable: the live site caches them for a year, so
any change to a font, icon or image gets a new `-vN` name.

## Content

- `_data/capabilities.yml` holds the Background groups on the home page, in
  career order; they are drawn as a career scale, and the last one is marked
  "Now". It also feeds `knowsAbout` in the home page's JSON-LD.
- `_data/playbook.yml` holds the steps on `/how-i-work/`: each step's summary
  and what it usually produces, each output with an `icon`. An output's `next`
  names the step it feeds and is drawn as a link to that step; `gate` draws the
  go / no-go diamond on the rail after a step. Outputs are facts Rahul
  confirmed, so ask before adding one.
- Line drawings live in `_includes/art/`, one inline SVG each: the four steps
  (by step id), the notes (`art:` in a note's front matter: on its card, on its
  page beside the title from 1024px, and on its share card) and the 404 page. They draw with classes from
  `src/styles/_art.scss` (`art__key`, `art__guide`, `art__fill`, ...), never
  colours or `style`, so they follow the theme and the CSP, and they stay
  `aria-hidden`; print leaves them out. A note's `icon:` shows on its row in
  the home page's Notes list and in the command menu.
- `_data/fluent.yml` sets the six words of the About lead as icons. They are
  Rahul's own sentence, so keep the words and their order.
  The hover ring pairs hand-offs with steps by id (the `@each` list in
  `_pages.scss`), so a new step id goes in that list too.
- The 6502 photo (`_includes/figure-6502.html`) carries numbered callouts whose
  boxes are percentages of the 1280×838 photo (`.callout--*` in
  `_components.scss`). A new photo needs new boxes; passing `caption=` to the
  include gives a plain caption and no callouts.
- A Selected work section can be added later as a `_work` collection, the same
  way as `_notes`.

## Writing a note

Notes are a Jekyll collection: one markdown file per piece under `_notes/`, with
`title`, `date`, a one-line `description` and, optionally, `last_modified_at`,
`icon` (from `_includes/icon.html`), `art` (a drawing in `_includes/art/`),
`topics` (a list, e.g. `[Retro computing, Silicon]`) and `image` (its share
card: `path`, `width`, `height` and `alt`; run `npm run cards` to draw it).
The index at `/notes/` lists them newest first and each gets its own page at
`/notes/<name>/`. Section headings are `##`: each links to itself, and with two
or more the note gets a numbered contents list. Liquid includes work inside the markdown, so a photo made
with `tools/photo.mjs` is
`{% include photo.html name="<name>" h="<height at 640 wide>" alt="..." caption="..." %}`
(add `max="960"` if it was made at that width, `class="figure--portrait"` for a
tall photo, and wrap two in `<div class="figure-row">` to set them side by
side). Keep the original photos out of git: `assets/img/vintage_silicon/` holds
the sources for `/notes/vintage-silicon/` and is ignored and excluded from the build.

`/feed.xml` is the hand-written Atom template in the repo root (jekyll-feed
skips paths that already exist and only writes `/feed/posts.xml`). It keeps the
entry IDs subscribers already hold: notes that used to live under `/scribbles/`
carry their old ID in `feed_id`. When a note moves, add a stub in `redirects/`
(`permalink` and `redirect_to`) and keep its old ID the same way.

## Notes pages

`/notes/` (`notes.html`) sets the notes as cards (`_includes/note-card.html`):
the drawing on a framed plate, date and reading time, title, summary and
topics. One card to a row on phones, two from 640px and three from 1024px; the
first card widens when the count would leave a row short (quantity queries in
`_notes.scss`), and a card that wide lays its drawing beside its text (a
container query). The topic filter above them, with a count per topic, needs
`notes.js`, so it starts hidden: a topic link narrows the grid in place and
keeps the choice in the address (`/notes/?topic=web`), so Back undoes it and a
topic link on a note lands on the filtered list. Without the script every note
shows.

A note (`_layouts/note.html`) opens with its facts (author, published, updated,
reading time at 220 words a minute, topics), then the drawing, a numbered
contents list built from the `##` headings at build time, the text, the share
links, the author, and links to the newer and older notes. From 1024px the
drawing sits beside the title, and the contents and share links stay beside the
text as it scrolls, with the section being read marked in ink. From 1280px the
title and text take the middle six columns (lines up to 36em), with the contents
and share links on the left and the drawing and facts on the right, so neither
side of the text stands empty; the share strip narrows its cells to stay on one
line there. A 2px ink line under the top edge shows how far down the page you
are; it is a CSS scroll-driven animation, so browsers without them simply do
not draw it.
Tables are wrapped so a wide one scrolls on its own.

The share links (LinkedIn, X, Bluesky, Hacker News, Reddit, WhatsApp, email)
are plain links to each network's own share page, so nothing loads from them
until a reader clicks; the link checker in CI skips them, as those pages turn
bots away. `notes.js` (`src/js/notes.js`, loaded only on notes pages) adds Copy
link (or, without clipboard access, the address selected in a field), Share,
which opens the device's share sheet where the browser has one, the topic
filter, the contents marker, a Copy button on code blocks, and the photo viewer:
a photo opens large in a `<dialog>` the layout renders, on the dark tokens in
either theme, with the arrow keys stepping through the note's photos. Without
the script, photos link to their files. Each note's head also carries
`article:modified_time`, `article:tag` and a `BreadcrumbList`, and the feed
lists its topics as categories.

## The datum

The hero's 24-hour scale is `_includes/datum.html`, `src/styles/_datum.scss` and
`src/js/clock.js`. IST is UTC + 330 minutes (India has no daylight saving). The
script places the red tick by writing the `--now` custom property through the
CSSOM, which `style-src 'self'` allows and the CSP lint checks for; the tick
jumps once a minute and nothing else on the site moves on its own. Without
JavaScript the scale still renders, and the tick, the time and the visitor's
own time stay hidden. Every other page shows
the Kolkata time as one line in the footer.

`src/js/datum-probe.js` lays a converter over the scale: hover, drag, or focus
it and use the arrow keys (15 minutes; Page Up/Down an hour; Home/End) to read
any Kolkata time in the visitor's own time, with the day it falls on. It is a
`role="slider"` whose value text carries the whole reading, and it writes
`--probe` the same way the clock writes `--now`. The probe is ink, never red.

Red means "now": `check:csp` fails if `var(--accent)` styles anything but the
tick and the current nav item, and a Playwright test scans every page for it.

## Command menu and layout grid

Ctrl+K (Cmd+K on a Mac), or the search button in the header, opens
`_includes/command-menu.html`: a `<dialog>` holding a combobox over a listbox
of every page, note and home-page section, a few actions (copy the email
address, switch theme, show the layout grid, download the vCard) and the
profiles. The commands are rendered by Liquid, so a new note shows up without
touching the script; `src/js/command-menu.js` filters them (every typed word
must appear in the label or its `data-keys`), marks the matches with `<mark>`
elements built through the DOM, and runs them. Without JavaScript the button
stays hidden and the dialog never opens.

The layout grid (`src/js/grid-overlay.js`) draws `.wrap` with the live `--cols`
and `--gutter` over the page, so it shows the grid the content is set on, and
measures it for the readout in the corner. Esc hides it.

Pages change with a cross-document view transition (`@view-transition` in
`_modes.scss`): the header holds still, the page cross-fades and settles 8px.
It is off under `prefers-reduced-motion`.

## Guard rails

- A **pre-commit hook** (installed by `npm install` via simple-git-hooks) runs the build,
  the typecheck and the CSP lint, and stages the rebuilt bundles, so a stale
  `assets/js/main.js` or `assets/js/orbit.js` can no longer be committed.
- CI validates the built HTML (`npm run validate:html`, config in `.htmlvalidate.json`),
  runs the Playwright suite and Lighthouse CI, then checks every link with lychee
  (LinkedIn is excluded because it blocks bots; absolute `www.rahulkar.com` links are
  remapped to `_site` so a page is checked against the build, not the not-yet-deployed
  live site). Dependabot also watches the GitHub Actions. To run the link check locally:
  `docker run --rm -v "$PWD/_site:/site:ro" -w /site lycheeverse/lychee:0.24.2 --root-dir /site --index-files index.html --remap 'https://www\.rahulkar\.com(/.*)? file:///site${1}' './**/*.html'`.

## Deploy

The **Verify and deploy site** workflow (`.github/workflows/build-assets.yml`) runs on
every pull request and push to master. On master, once the bundle check and every site
check have passed, it uploads that `_site` and the `deploy` job publishes it to GitHub
Pages; pull requests only verify. This needs **Settings → Pages → Build and deployment
→ Source** set to **GitHub Actions**. The custom domain is kept on that settings page
(the `CNAME` file is not used by this kind of deploy). To deploy again without a new
commit, open the workflow in the Actions tab and use **Run workflow** on master.

## Production notes

- The site is fronted by Cloudflare: purge the cache after deploying (the root
  `favicon.ico` keeps its name), then re-scrape the LinkedIn / X / Facebook card
  validators. Upload the v5 LinkedIn banner, GitHub header and email signature by hand,
  and delete the old sketch-style `assets/brand/email-signature.png` once the mail
  signature points at `email-signature-v5.png` (it is kept only for that link).
- Cloudflare Email Address Obfuscation rewrites the visible address after load
  and injects a same-origin script; this is allowed by the CSP, and the copy
  button falls back to the visible address.
- Cloudflare features that inject inline scripts (Rocket Loader, Mirage) must
  stay off; the CSP would block them.
- `LOCAL_SETUP.md` and `LICENSE.txt` are excluded in `_config.yml`, so they are
  not published with the site.

## Security headers (Cloudflare)

GitHub Pages cannot send custom response headers, so the Content-Security-Policy ships
as a `<meta>` tag (`_includes/csp.html`, shared by every layout). A meta policy cannot
express `frame-ancestors` or reporting, and the other hardening headers need the edge.
In the Cloudflare dashboard, add a **Rules → Transform Rules → Modify Response Header**
rule for `www.rahulkar.com` that sets:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self' static.cloudflareinsights.com; connect-src 'self' cloudflareinsights.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Keep the header policy identical to the meta policy (plus `frame-ancestors`), otherwise
the stricter of the two wins and something will silently stop working. Rocket Loader,
Mirage and other script-injecting features must stay off. `/.well-known/security.txt`
is published from the repo and expires yearly; bump the date when it does.

## Colour schemes

The page follows `prefers-color-scheme`: warm ink on off-white, or a warm
near-black. The theme button in the header stores an override in `localStorage`,
which the tiny synchronous `assets/js/theme.js` applies before first paint
(same-origin, so the CSP allows it). The tokens live in `src/styles/_mixins.scss`
(`light-tokens`, `dark-tokens`) and are applied in `_tokens.scss`; while the theme
switches, `.theme-switching` turns transitions off for two frames. `prefers-contrast:
more` lifts the faintest ink, and forced-colours mode keeps the tick visible.
