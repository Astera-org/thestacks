# Playwright E2E Tests

This directory contains end-to-end (E2E) tests for The Stacks written using [Playwright](https://playwright.dev/). The test configuration is defined in [`playwright.config.ts`](./playwright.config.ts).

## Environment setup

First, install all dependencies:

```sh
pnpm install
pnpm exec playwright install
```

For local development, you'll need the credentials for the test user set up in the staging environment (see [this section](#tests-that-require-user-authentication) for more details). These must be set in the `.env` file.

All environment variables can be pulled from the Vercel project using the [Vercel CLI](https://vercel.com/docs/cli):

```sh
vercel env pull
```

You can also manually copy and paste these from the Vercel project's Environment Variables page.

## Running tests

You can run tests using:

```sh
pnpm run test
```

This runs `test:isolated` (in parallel) followed by `test:shared-fixture` (with a single worker). Tests tagged `@shared-fixture` read/write a shared `tardigrade-test` publication and shared login, so they're kept serial to avoid racing each other — see [Tagging shared-state tests](#tagging-shared-state-tests) below.

By default, `pnpm run test` only runs tests using the Chromium browser. You can run tests on all browsers using:

```sh
pnpm run test:all
```

To run the tests in interactive mode with Playwright's [UI Mode](https://playwright.dev/docs/test-ui-mode), use:

```sh
pnpm run test:ui
```

## CI/CD

This repository has a [GitHub Actions workflow](../../.github/workflows/run-e2e-tests-on-preview-deployment.yml) for running our E2E test suite using Vercel preview deployments. It's triggered on every successful Vercel deployment. [This guide](https://vercel.com/kb/guide/how-can-i-run-end-to-end-tests-after-my-vercel-preview-deployment) was used as a reference to configure the workflow.

Since preview deployments are protected by Vercel's authentication, a protection bypass was set up to grant deployment access during test execution. This is a secret (configured within this GitHub repository) that's passed in the header of every request made during test execution. See [the documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) for more information.

In Vercel, the secret can be found in **Project Settings > Deployment Protection > Protection Bypass for Automation**.

In GitHub, this secret is configured at the repository level in **Settings > Security > Secrets and variables > Repository secrets**.

## Tagging shared-state tests

E2E tests should default to being safe to run in parallel. A test only needs special handling if it **mutates data on a fixture that other tests also read or mutate** — today, that means anything that creates/edits/deletes comments on the shared `tardigrade-test` publication (see the `TODO: Create a test publication instead of using one that already exists` comments in [`e2e/comments/`](./e2e/comments)).

If your new test falls into that category, tag its `test.describe` block with `@shared-fixture`:

```ts
test.describe("my new comment test", { tag: "@shared-fixture" }, () => {
  // ...
});
```

This routes it into `test:shared-fixture`, which runs with a single worker so it can't race another test mutating the same fixture. Everything else runs in parallel via `test:isolated` by default — no config changes needed as the suite grows.

The real fix for not having to think about this at all is closing out the `TODO`: give each test (or test file) its own publication created via the API in `beforeAll`/`beforeEach` instead of sharing `tardigrade-test`. Once tests don't share mutable fixtures, the tag (and the serial run) can be deleted entirely.

`@shared-fixture` is strictly about that data-mutation race and nothing else — the [performance benchmarks](#performance) are excluded from both `test:isolated` and `test:shared-fixture` via their own `@performance` tag, so don't add `@shared-fixture` to a performance spec expecting it to pick up the serialized-run guarantee described above; it won't, since `test:shared-fixture` never selects `@performance`-tagged tests.

## Tests that require user authentication

For actions that require user authentication, the Playwright tests use a dedicated test account in the staging environment.

Although setting up a dedicated sandboxed testing environment would be preferable, the development team has opted for this method to save time.

As a consequence, for local test executions, the username and password for the test account must be set in the `.env` file (along with the Vercel automation bypass secret):

```sh
# Playwright test user.
# If these environment variables are not set, any tests that require authentication will be skipped.
PLAYWRIGHT_TEST_USER_USERNAME=
PLAYWRIGHT_TEST_USER_PASSWORD=

# For testing against preview deployments from your local machine,
# you can find this bypass secret in Vercel Settings under
# Deployment Protection > Protection Bypass for Automation.
VERCEL_AUTOMATION_BYPASS_SECRET=
```

## Performance

Performance benchmarks are excluded from the default E2E run. Run them serially
in Chromium with:

```sh
pnpm run test:performance
```

The benchmark suite prints metrics to stdout and attaches one JSON artifact per
scenario. Configure its read-only publication fixtures in `.env`:

```sh
# General resize metrics and inline-comment breakpoint measurements.
PLAYWRIGHT_PERF_PUBLICATION_SLUG=tardigrade-test

# Expandable iframe figure with an aspect-ratio data attribute. Defaults to the
# general performance publication when omitted.
PLAYWRIGHT_PERF_LIGHTBOX_PUBLICATION_SLUG=
```

Fixture-specific scenarios skip with an explanation when the configured
publication does not contain the required inline-comment or aspect-ratio
iframe content.

The general resize benchmark records Chrome DevTools Protocol counters for
layouts, style recalculations, scripting, tasks, heap usage, DOM nodes, and
event listeners. The other scenarios assert deterministic visual/lifecycle
regressions while reporting their frame samples. Run the same command against
the baseline and candidate commits under matching machine and viewport
conditions, then compare the attached JSON metrics using medians across several
runs.

### Interpreting performance metrics

The CDP values are deltas (`after - before`) across the resize sequence, not
absolute page totals. Compare equivalent runs with the same Chrome version,
fixture, viewport, and machine.

| Metric                                             | What it measures                                          | Preferred result                                          |
| -------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `layoutCount`, `styleRecalculationCount`           | Browser layout and style passes                           | Lower for identical visual output                         |
| `layoutDurationMs`, `styleRecalculationDurationMs` | Time spent calculating layout and styles                  | Lower                                                     |
| `scriptDurationMs`, `taskDurationMs`               | JavaScript and overall renderer task time                 | Lower                                                     |
| `longAnimationFrameCount`, `longTaskCount`         | Responsiveness failures                                   | Zero or lower                                             |
| `heapUsedBytes`                                    | Heap change without forced garbage collection             | Stable across repeated runs; individual results are noisy |
| `nodeCount`, `eventListenerCount`                  | Change in retained DOM nodes and all JavaScript listeners | Near zero when the benchmark ends in the same UI state    |

A lower node or listener count is not inherently better: required UI can
legitimately add both, and detached nodes may remain until garbage collection.
Look for sustained, roughly linear growth over repeated cycles. A one-time
increase that plateaus is more likely lazy initialization or collection timing.
`eventListenerCount` includes every event type; use the dedicated resize-listener
lifecycle benchmark to diagnose the `window.resize` leak specifically.

The resize benchmark deliberately changes the viewport, so its observed layout
shift score is an A/B diagnostic and should not be compared with the normal CLS
threshold. Duration metrics are the primary optimization signal. Run each commit
10–20 times and compare median and p95 values; for heap, nodes, and listeners,
compare trends across several resize cycles rather than a single delta.

## Accessibility

Accessibility checks run [axe](https://github.com/dequelabs/axe-core) over
whole pages and fail on any violation. Like the performance benchmarks, they
are excluded from the default E2E run, via their own `@accessibility` tag. Run
them in Chromium with:

```sh
pnpm run test:accessibility
```

Each test attaches axe's full results as JSON, and its failure message lists
one line per violation with its impact, rule, count and an example selector.
The rule's help page (`helpUrl` in the JSON) explains how to fix it.

Configure the read-only publication fixtures in `.env`:

```sh
# A publication imported from Google Docs.
PLAYWRIGHT_A11Y_PUBLICATION_SLUG=tardigrade-test
```

To check a page on demand while you work, use the
[axe DevTools](https://www.deque.com/axe/devtools/) browser extension or a
Lighthouse accessibility audit in Chrome DevTools.

## Visual regression

`visual/` holds screenshot tests of pages from a production build of the
frontend: the pinned container runner, the config, a harness that isolates the
network and waits for a page to settle, and the publication spec.

The suite runs only inside the pinned Playwright image (Docker required); the
config refuses to run anywhere else. Baselines are made on linux/amd64, and CI
compares them there pixel-exact. On a dev machine:

- `test:visual` runs the image for the machine's architecture, natively, so on
  an Apple Silicon Mac it is arm64 rather than emulated amd64 (which is slow
  enough to time out and crash). It allows a small difference: a per-pixel
  color threshold of 0.1, as in `scripts/compare-render.ts`, and up to 100
  differing pixels. A change of page size still fails. A pass here doesn't
  guarantee CI passes, since CI allows no difference at all.
- `test:visual:update` stays on linux/amd64, pixel-exact, so the baselines it
  writes match CI. On an arm64 Mac it runs emulated, one test at a time.

```bash
pnpm run test:visual          # Compare against the committed baselines.
pnpm run test:visual:update   # Rewrite baselines that differ; commit the result.
pnpm run test:visual:report   # Open the last report (expected, actual, diff).
```

### Recorded publications

Pages are served from recorded API responses, not a live backend.
`visual/record-publication.ts` records what a logged-out visitor's page needs
(the publication with its contributors, its comments, the images its body
shows, and the contributors', orgs' and commenters' avatars) into
`visual/publications/<slug>/`. An avatar the backend doesn't have is recorded
as a 404, so replay shows the same initials the live page does:

```bash
THE_STACKS_API_URL=https://<host>/api node visual/record-publication.ts <slug>
```

It writes to a temporary folder and only replaces the existing recording once
everything succeeded, and it stores only the API's origin, never credentials.

`visual-test-1` and `visual-test-2` are recorded from the raven screenshot backend, which seeds them with synthetic users, orgs and comments. In the raven repo, see the `visual-fixtures` skill and `docs/screenshots/README.md`:

```bash
# in raven's docs/screenshots
pnpm backend:up && pnpm seed:visual-fixtures
# here, in tests/
THE_STACKS_API_URL=http://localhost:7005/api node visual/record-publication.ts visual-test-1
THE_STACKS_API_URL=http://localhost:7005/api node visual/record-publication.ts visual-test-2
```

A seeded publication's dates are whenever it was seeded, so the recorder rewrites them onto the fixed `TIMELINE` in `visual/recordings.ts`, keeping their order: the publication and its versions from `publishedAt`, then the comments a day apart. Ids are kept as recorded: they change with every seed, but stay consistent within a recording and aren't shown on the page.

Each recording's `recording.json` keeps when (`recordedAt`) and from which API origin
(`source`) it was taken, and re-recording rewrites both. The HTML report
(`pnpm run test:visual:report`) shows them on each test as "recorded".

`visual/fixture-server.ts` serves those files by request path. The config's
`webServer` starts it, then builds the frontend with `VITE_BACKEND_URL`
pointing at it (the URL is compiled into the build, so the build happens there,
not in `scripts/visual.sh`) and starts it. The harness answers the browser's own
`/api` GET requests (including avatars under `/api/files/`) from the same
recordings (`visual/recordings.ts`), gives the auth endpoints a logged-out 401,
and fails the test on any other `/api` request, so a page's new API call can't
pass unnoticed.

The tests themselves run offline (installing dependencies and re-vendoring do
use the network). Fonts are served from `visual/assets/` and KaTeX from the
installed `katex` package. Any other external request, redirect or WebSocket
fails the test with the URL. After changing the font link in
`frontend/app/root.tsx`, run `node visual/vendor-assets.ts` and commit the
result.

### What the publication spec captures

`visual/publication.spec.ts` runs once per recording at each viewport (desktop,
and mobile with touch emulation). For each, it:

- pins the clock to `TIMELINE.now`, so relative comment times ("3 days ago")
  don't drift;
- opens the comments panel and waits for the first comment, so a recording
  needs at least one comment;
- opens every collapsible (`<details>`, nested ones too) in the publication
  body, so the content behind them is compared as well. Collapsibles whose
  summary text is listed in `KEEP_CLOSED` at the top of the spec stay closed,
  so the closed state stays covered. The match is on the exact summary text,
  so renaming such a summary in a recording silently opens it;
- scrolls back to the top and takes a full-page screenshot, with iframes,
  videos and audio masked (embeds get blank local responses).

### Adding baselines for a new recording

Baselines are named `<slug>-<viewport>-comments.png` in
`visual/__screenshots__/`, so a new recording needs one per viewport
(`<slug>-desktop-comments.png` and `<slug>-mobile-comments.png`). A plain
`pnpm run test:visual` fails for a recording without them. To create them:

1. Run `pnpm run test:visual:update`. It writes missing baselines and rewrites
   ones that differ, so check that only the new recording's files changed.
2. Open `pnpm run test:visual:report` and look through the new screenshots: a
   baseline records whatever the page showed, broken or not.
3. Run `pnpm run test:visual` to confirm they match on a second run.
4. Commit the recording folder and both baselines together.

Renaming a recording renames its tests and baselines, so rename the PNGs along
with the folder.
