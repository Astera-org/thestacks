# Scripts

Useful scripts for The Stacks

## Setup

Copy the environment template and fill in the values:

```sh
cp .env.template .env
```

| Variable                          | Description                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Optional. Bypasses Vercel deployment protection for `compare-render` |

## `compare-render.ts`

Compares how a publication renders on a deployment (usually a local frontend, sometimes a Vercel preview) against production. It loads the publication page on both sites in headless Chromium and compares three regions of the page separately: the header (title, abstract, metadata), the body column (body, contributors, references) and the table of contents. Each region is compared three ways: normalized DOM, visible text, and a pixel diff of a screenshot.

Before rendering, it fetches `/publications/<slug>.json` from both sites and warns if the data differs. A local frontend usually talks to the staging backend, so differences may come from data rather than code. Comments (including the comment count in the table of contents), social posts, iframes and timestamps are excluded because they differ between backends and loads.

### Usage

```sh
pnpm exec playwright install chromium  # once
pnpm run compare-render localhost:3000 <slug>
pnpm run compare-render https://my-preview.vercel.app <slug> --version v2
```

| Option        | Default                 | Description                                                  |
| ------------- | ----------------------- | ------------------------------------------------------------ |
| `--version`   | latest                  | Publication version to compare, e.g. `v2`                    |
| `--prod`      | `https://thestacks.org` | Origin to compare against                                    |
| `--width`     | `1280`                  | Viewport width in pixels                                     |
| `--threshold` | `0.01`                  | Pixel mismatch percentage that counts as a visual difference |

The script reports one of three results:

- **Visual difference** (in any region, the pixel mismatch exceeds `--threshold` or the region changed size): prints `Result: renders differ` to stderr and exits with status 1.
- **DOM or text difference only:** prints a warning to stderr and exits 0, since markup changes often don't change what readers see.
- **No difference:** prints `Result: renders match` to stdout and exits 0.

Each run writes to a new folder, `data/<date>-render-comparison/<slug>/<time>/`, with the date and time in UTC. The slug folder is `<slug>-<version>` when `--version` is given. When the deployment isn't local, the slug folder sits inside a folder named after the first part of the deployment's domain name, e.g. `data/<date>-render-comparison/my-preview/<slug>/<time>/` for `my-preview.vercel.app`.

Artifacts are grouped by type, with one set of files per region (`header`, `body`, `sidebar`):

```
summary.json                  results for all regions
prod.json, deploy.json        publication data, only when it differs
html/<region>.prod.html       normalized DOM
html/<region>.deploy.html
html/<region>.diff            DOM diff
txt/<region>.prod.txt         visible text
txt/<region>.deploy.txt
txt/<region>.diff             text diff
png/<region>.prod.png         screenshot
png/<region>.deploy.png
png/<region>.diff.png         pixel diff
```

When fewer than 0.01% of a region's pixels differ, they are hard to find in `png/<region>.diff.png`, so the script also writes `png/<region>.detail-<n>.png` for up to 10 groups of nearby differing pixels, and lists the boxes under `mismatchBoxes` in `summary.json`. Each crop is zoomed and shows prod, deploy, and an overlay of the two. In the overlay, red is ink only on prod and cyan ink only on deploy, so a glyph shifted by a pixel shows a red edge on one side and a cyan edge on the other.

Each run writes them to a new folder, `data/<date>-render-comparison/<slug>/<time>/` (UTC, `HH-MM-SS`), which is gitignored. `summary.json` is written last, so a folder without it is from a run that didn't finish.

The Vite dev server renders a little differently from a production build. For pixel-accurate results, compare against a local production build (`pnpm run build && npm start` in `frontend/`). Set `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env` to compare against protected Vercel previews; it is never sent to localhost.
