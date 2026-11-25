import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Baselines are made, and compared pixel-exact in CI, in the pinned Playwright
// image on linux/amd64. Keep in sync with scripts/visual.sh.
const EXPECTED_IMAGE = "mcr.microsoft.com/playwright:v1.60.0-noble";

// Set by scripts/visual.sh for `test` on a dev machine, which may run the
// image's native build (arm64 on a Mac) and so renders slightly differently.
const tolerant = process.env.VISUAL_TOLERANT === "1" && !process.env.CI;

// How much a tolerant comparison allows. The per-pixel color threshold is
// scripts/compare-render.ts's, and absorbs the arm64 build's anti-aliasing on
// its own. The pixel allowance is a count, not compare-render's share of the
// page: 0.01% of a long desktop page hides a changed word. A change of size
// still fails.
const TOLERANT_THRESHOLD = 0.1;
const TOLERANT_MAX_DIFF_PIXELS = 100;

// The image records its own name and driver version at build time.
function imageInfo(): { dockerImageName?: string; driverVersion?: string } {
  try {
    return JSON.parse(readFileSync("/ms-playwright/.docker-info", "utf8"));
  } catch {
    return {};
  }
}
const info = imageInfo();
const playwrightVersion = createRequire(import.meta.url)(
  "@playwright/test/package.json",
).version;
const environmentProblems = [
  info.dockerImageName !== EXPECTED_IMAGE &&
    `image is ${info.dockerImageName ?? "unknown (no /ms-playwright/.docker-info)"}, not ${EXPECTED_IMAGE}`,
  // The image is multi-arch with the same name; baselines are amd64.
  !tolerant &&
    process.arch !== "x64" &&
    `architecture is ${process.arch}, not x64`,
  info.driverVersion !== playwrightVersion &&
    `installed Playwright ${playwrightVersion} doesn't match the image's ${info.driverVersion ?? "unknown"}`,
  process.env.PLAYWRIGHT_BROWSERS_PATH !== "/ms-playwright" &&
    "browsers aren't the image's (/ms-playwright)",
].filter(Boolean);
if (environmentProblems.length > 0) {
  throw new Error(
    "The visual suite only runs in the pinned Playwright container, on " +
      "linux/amd64 unless comparing on a dev machine. From tests/, run " +
      "`pnpm run test:visual` (or " +
      "`pnpm run test:visual:update` to rewrite baselines).\n- " +
      environmentProblems.join("\n- "),
  );
}

const PORT = 3000;
// The fixture server stands in for the backend (see visual/fixture-server.ts).
const FIXTURE_PORT = 4100;

export default defineConfig({
  testDir: "./visual",
  outputDir: "./visual-results/test-results",
  // No platform suffix: there is only one platform.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A retry would hide a flaky capture instead of reporting it.
  retries: 0,
  // Missing or changed baselines fail. scripts/visual.sh update overrides it.
  updateSnapshots: "none",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./visual-results/report", open: "never" }],
  ],
  expect: {
    toHaveScreenshot: {
      ...(tolerant
        ? {
            threshold: TOLERANT_THRESHOLD,
            maxDiffPixels: TOLERANT_MAX_DIFF_PIXELS,
          }
        : { threshold: 0, maxDiffPixels: 0 }),
      animations: "disabled",
      caret: "hide",
      scale: "css",
      stylePath: "./visual/screenshot.css",
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: "reduce" },
    timezoneId: "UTC",
    locale: "en-US",
    colorScheme: "light",
    // Requests from a service worker would bypass page.route.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `node visual/fixture-server.ts ${FIXTURE_PORT}`,
      port: FIXTURE_PORT,
      reuseExistingServer: false,
    },
    {
      // VITE_BACKEND_URL is compiled into the build, so the frontend is built
      // here, pointing its server render at the fixture server. The URL only
      // proves the server is up.
      command:
        "pnpm --filter the-stacks-frontend build && pnpm --filter the-stacks-frontend start",
      cwd: "..",
      url: `http://localhost:${PORT}/favicon.svg`,
      env: {
        PORT: String(PORT),
        VITE_BACKEND_URL: `http://127.0.0.1:${FIXTURE_PORT}`,
      },
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
