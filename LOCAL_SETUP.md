# Local development

The site is a Jekyll build (GitHub Pages runs Jekyll 3.10 with jekyll-seo-tag,
jekyll-sitemap and jekyll-feed) with a small Node toolchain for the CSS, the
bundled JavaScript and the hand-drawn assets. Locally you run Jekyll 4.4; the
output is the same apart from the generator meta tag.

## Prerequisites

- Node.js 20+ and npm (CI uses Node 22)
- Ruby 3.1+ with the MSYS2 devkit (RubyInstaller "Ruby+Devkit"), then `gem install bundler`
- Python 3 (only for the lightweight static server in `npm run serve:light`)

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
npm run build          # sass + esbuild -> assets/css/main.css, assets/js/main.js
npm run check:csp      # lint markup and the bundle for CSP regressions
bundle exec jekyll build
npm run serve:light    # builds, then serves _site on http://127.0.0.1:4001
```

Open http://127.0.0.1:4001/ and http://127.0.0.1:4001/404.html. The strict
Content-Security-Policy meta tag blocks Jekyll's live-reload script, so do
browser checks (console must show no CSP violations) against this static
server, not `jekyll serve`. `npm run dev` still runs the sass/esbuild watchers
next to `jekyll serve --force_polling` for quick iteration without reload.

**Run `npm run build` before every commit.** CI rebuilds and fails if the
committed `assets/css/main.css` or `assets/js/main.js` differ from `src/`.

## Tests

The site tests itself with Playwright (`tests/site.spec.js`): console and CSP
cleanliness, no horizontal overflow, axe accessibility checks, keyboard paths,
the toggles and the lightbox, at phone and desktop widths, plus full-page
screenshots kept as CI artifacts. Lighthouse CI asserts accessibility and SEO
scores (`lighthouserc.json`). Locally:

```powershell
npx playwright install chromium     # once
bundle exec jekyll build
npm test                            # Playwright + axe against _site
npm run lhci                        # Lighthouse CI (reports in .lighthouseci/)
```

## Hand-drawn assets

| Script | What it does | When to run |
|---|---|---|
| `npm run sketch` | Pre-roughens the doodles into `_includes/sketch-defs.html` (`node tools/roughen.mjs icons` redraws the six generic stack icons) | after editing a doodle in `tools/roughen.mjs` |
| `npm run brand` | Renders `assets/icons/favicon-v2.svg`, the `.ico` files, `apple-touch-icon-v2.png` and `assets/og-sketch.png` | after changing the mark or the share card |
| `npm run fonts -- <Excalifont-Regular.woff2>` | Subsets Excalifont to Latin into `assets/fonts/excalifont.woff2` | only when the font file changes |
| `node tools/photo.mjs <photo.heic> <name> [maxWidth]` | Decodes a phone photo (HEIC too), strips metadata, writes `assets/img/<name>-{640,1280}.{webp,jpg}` for a taped-in polaroid | when adding a photo (keep the `.heic` source out of git; it is ignored) |
| `node tools/name.mjs [word]` | Converts the hero name to Excalifont glyph outlines (`_includes/name-paths.html`) so it can draw itself in | only if the name changes |

`npm run brand` also renders `assets/brand/linkedin-banner.png` (1584×396, left side kept
clear for the profile photo), `assets/brand/github-header.png` (1280×320) and
`assets/brand/email-signature.png` (600×200 at 2×), plus the pencil cursors. `npm run
sketch` writes a local-only `node_modules/.cache/brand/doodles-preview.html` with every
symbol on a grid; open it in a browser to check new doodles.

Content that is data rather than markup lives in `_data/`: `stack.yml` holds the four
stack tiers, their stickers and the tally-mark depth (1–5) shown on each.

## Writing a scribble

Scribbles are a Jekyll collection: one markdown file per piece under `_scribbles/`,
with `title`, `date` and a one-line `summary` in the front matter. The index at
`/scribbles/` lists them newest first, each gets its own page at `/scribbles/<name>/`,
and `/feed.xml` is their Atom feed (linked from every page's head). Liquid includes
work inside the markdown, so a polaroid is `{% include polaroid-6502.html id="..." %}`.

## Guard rails

- A **pre-commit hook** (installed by `npm install` via simple-git-hooks) runs the build
  and the CSP lint and stages the rebuilt bundles, so a stale `assets/js/main.js` can
  no longer be committed.
- CI validates the built HTML (`npm run validate:html`, config in `.htmlvalidate.json`),
  runs the Playwright suite and Lighthouse CI, then checks every link with lychee
  (LinkedIn is excluded because it blocks bots; absolute `www.rahulkar.com` links are
  remapped to `_site` so a page is checked against the build, not the not-yet-deployed
  live site). Dependabot also watches the GitHub Actions. To run the link check locally:
  `docker run --rm -v "$PWD/_site:/site:ro" -w /site lycheeverse/lychee:0.24.2 --root-dir /site --index-files index.html --remap 'https://www\.rahulkar\.com(/.*)? file:///site${1}' './**/*.html'`.

The runtime sketch layer lives in `src/js/sketch.js` (Rough.js frames,
underlines, highlighter) and `src/js/diagram.js` (the delivery loop). Any
element with `data-sketch="rect|rect-fill|highlight|underline|circle|squiggle"`
gets drawn; `data-seed` keeps the wobble stable across reloads.

## Fonts

Excalifont (display) and Nunito (body) are self-hosted Latin subsets under
`assets/fonts/` with their OFL notices beside them. Font files are immutable:
the live site caches `/assets/*` for a year, so rename on change (same for the
favicon and share image, hence the `-v2` names).

## Production notes

- The site is fronted by Cloudflare: purge the cache after deploying asset
  changes, then re-scrape the LinkedIn / X / Facebook card validators.
- Cloudflare Email Address Obfuscation rewrites the visible address after load
  and injects a same-origin script; this is allowed by the CSP.
- Cloudflare features that inject inline scripts (Rocket Loader, Mirage) must
  stay off; the CSP would block them.
- GitHub Pages publishes root `.md` files as pages, which is why
  `LOCAL_SETUP.md` and `LICENSE.txt` are excluded in `_config.yml`.

## Security headers (Cloudflare)

GitHub Pages cannot send custom response headers, so the Content-Security-Policy ships
as a `<meta>` tag. A meta policy cannot express `frame-ancestors` or reporting, and the
other hardening headers need the edge. In the Cloudflare dashboard, add a **Rules →
Transform Rules → Modify Response Header** rule for `www.rahulkar.com` that sets:

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

The page follows `prefers-color-scheme` (cream paper, or chalk on slate). The
moon/sun button in the bar stores an override in `localStorage`, which the tiny
synchronous `assets/js/theme.js` applies before first paint (same-origin, so the
CSP allows it). Dark tokens live in the `:root[data-theme="dark"]` block and
the matching media-query block in `src/styles/main.scss`; paper objects (notes,
cards, stickers, tape labels) keep their light inks in both schemes.
