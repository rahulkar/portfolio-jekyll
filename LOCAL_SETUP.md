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

## Hand-drawn assets

| Script | What it does | When to run |
|---|---|---|
| `npm run sketch` | Pre-roughens the doodles into `_includes/sketch-defs.html` (`node tools/roughen.mjs icons` redraws the six generic stack icons) | after editing a doodle in `tools/roughen.mjs` |
| `npm run brand` | Renders `assets/icons/favicon-v2.svg`, the `.ico` files, `apple-touch-icon-v2.png` and `assets/og-sketch.png` | after changing the mark or the share card |
| `npm run fonts -- <Excalifont-Regular.woff2>` | Subsets Excalifont to Latin into `assets/fonts/excalifont.woff2` | only when the font file changes |
| `node tools/photo.mjs <photo.heic> <name> [maxWidth]` | Decodes a phone photo (HEIC too), strips metadata, writes `assets/img/<name>-{640,1280}.{webp,jpg}` for a taped-in polaroid | when adding a photo (keep the `.heic` source out of git; it is ignored) |

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

## Colour schemes

The page follows `prefers-color-scheme` (cream paper, or chalk on slate). The
moon/sun button in the bar stores an override in `localStorage`, which the tiny
synchronous `assets/js/theme.js` applies before first paint (same-origin, so the
CSP allows it). Dark tokens live in the `:root[data-theme="dark"]` block and
the matching media-query block in `src/styles/main.scss`; paper objects (notes,
cards, stickers, tape labels) keep their light inks in both schemes.
