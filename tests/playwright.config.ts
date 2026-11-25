import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  // Preview deployments cold-start, so a first navigation can take much longer
  // than the 30s default without anything actually being wrong.
  timeout: 60_000,
  retries: process.env.CI ? 2 : 1,
  // Run tests in files in parallel.
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  // Keep CI entrypoints serial by default because tests tagged
  // "@shared-fixture" mutate a shared publication. The filtered
  // "test:isolated" script opts into parallelism with --workers=3.
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use. See https://playwright.dev/docs/test-reporters.
  reporter: "line",
  // Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
  use: {
    // Base URL is used in actions like `await page.goto('')`.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    // Cap navigations and actions below the test timeout so a hung one reports
    // the step that stalled instead of a bare "test timeout exceeded".
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer.
    trace: "on-first-retry",
    // Set HTTP headers to bypass Vercel deployment protection.
    // https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
    extraHTTPHeaders: {
      "x-vercel-protection-bypass":
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
      "x-vercel-set-bypass-cookie": "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  // In CI workflows, we use the Vercel preview deployment, so we don't need to start a local server.
  webServer: process.env.CI
    ? undefined
    : {
        // The local production server does not have a proxy to forward API requests to the backend,
        // so we use the development server instead.
        // TODO: Find a way to use the production server instead.
        command: "cd .. && cd frontend && pnpm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
});
