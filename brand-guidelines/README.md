# The Stacks — Brand guidelines

A self-contained, deployable static implementation of the **Brand guidelines** page for
_The Stacks_ — an open-access scientific publishing platform owned and operated by the Astera Institute.

## Background

A static, dependency-free build: a single `index.html` (inline-styled markup plus one small
vanilla-JS `StacksGuide` class), the design-system token CSS, the brand assets, and a
downloadable brand/agent kit. No framework, no build step, no runtime.

The design-system token CSS (`fig-tokens.css` → `colors_and_type.css` → `styles.css`) is
linked directly and is the source of truth for every color, type, spacing, and radius value.

## Structure

```
The Stacks/
  index.html                 # the page — served at /
  assets/                    # logos, mark, favicon, avatar
  export/                    # Open Graph share image (SVG + PNG)
  kit/                       # brand + agent kit (docs + component library) — served for the kit downloads
  _ds/…/                     # the 3 design-system CSS files (tokens, semantic layer, entry)
```

Fonts (Newsreader, DM Sans, DM Mono) load from Google Fonts via the design-system CSS;
icons use the Material Symbols Rounded web font.

## Preview locally

```sh
python3 -m http.server 4173
# open http://localhost:4173
```

## Interactivity (all vanilla JS, in `index.html`)

- Sticky contents nav with scroll-spy; collapses to a "Contents" dropdown on mobile (≤860px)
- Interactive hero: treatment switch (Aurora / Meadow / Dusk / Dawn / Flat) + film-grain & motion toggles
- Color ramps + semantic colors built at runtime; click any swatch to copy its hex
- Logo light/dark stage toggle
- "Download brand kit" / "Download agent kit" — zipped client-side with JSZip

## Deploy — its own Vercel project

A standalone static site with `index.html` at the root, so it deploys as its **own Vercel
project** and serves at `/` — no `vercel.json`, no build step, no redirect.

**Option A — Vercel CLI (fastest):**

```sh
cd "The Stacks"
npx vercel          # first run: log in, create a NEW project (e.g. "the-stacks")
npx vercel --prod   # promote to production
```

When prompted, accept the defaults: framework preset **Other**, no build command,
output directory = the project root.

**Option B — Git + Vercel dashboard:**

```sh
cd "The Stacks"
git init && git add -A && git commit -m "The Stacks brand guidelines"
# push to a new GitHub repo, then in the Vercel dashboard:
# New Project → import that repo → Framework preset: Other → no build command → Deploy
```

**Social / Open Graph:** `index.html`'s `<head>` sets `og:url`, `og:image`, and the
canonical link to an absolute URL (currently `https://the-stacks-brand.vercel.app/`). If you
deploy to a different domain, update those three to match so link-preview unfurls resolve the
share image correctly.

> Size note: ~1 MB of the deploy is `kit/components/Components.bundle.js`, fetched only when a
> user clicks **Download agent kit** (zipped client-side from `kit/`). Fine as-is; only revisit
> if deploy size becomes a concern.

## Acknowledgement

See the [acknowledgements](https://docs.thestacks.org/thestacks/about/brand/#brand-acknowledgements) in The Stacks docs.

## Third-party

- **JSZip** 3.10.1 (MIT) — client-side kit zipping, loaded from unpkg.
- **Google Fonts** — Newsreader, DM Sans, DM Mono (OFL); **Material Symbols Rounded** (Apache-2.0).
- **Simple Icons** (CC0) — the brand/social marks in the iconography section are shown only as
  illustrative examples; each depicted mark belongs to its respective owner.

See `kit/brand-guidelines.md` for the full brand spec and `kit/CLAUDE.md` for the agent build brief.
