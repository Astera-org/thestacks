import { APIRequestContext, type Page } from "@playwright/test";

/**
 * Waits for the network to go quiet, then gives up rather than failing.
 *
 * Nothing we assert on actually requires an idle network, but the client-side
 * fetches on a cold preview deployment regularly trail past the test timeout,
 * which turns `waitUntil: "networkidle"` into a flake. Waiting is still useful
 * as a proxy for hydration, so we keep it, bounded and non-fatal.
 */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {
    // Still busy. Locator assertions auto-wait for whatever the test needs.
  });
}

/**
 * Checks if test user credentials are configured.
 */
export function isTestUserConfigured() {
  return (
    process.env.PLAYWRIGHT_TEST_USER_USERNAME &&
    process.env.PLAYWRIGHT_TEST_USER_PASSWORD
  );
}

/**
 * Logs in with the test user credentials and stores the session cookie on the
 * provided request context.
 * Throws with an actionable message when credentials are missing or login fails.
 */
export async function authenticateTestUser(
  request: APIRequestContext,
): Promise<void> {
  if (!isTestUserConfigured()) {
    throw new Error(
      "Test user credentials not configured: set PLAYWRIGHT_TEST_USER_USERNAME and PLAYWRIGHT_TEST_USER_PASSWORD",
    );
  }

  const username = process.env.PLAYWRIGHT_TEST_USER_USERNAME!;
  const password = process.env.PLAYWRIGHT_TEST_USER_PASSWORD!;
  const origin = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Try email login first
  let response = await request.post("/api/auth2/sign-in/email", {
    data: { email: username, password },
    headers: { Origin: origin },
  });

  // If email fails, try username login
  if (!response.ok()) {
    response = await request.post("/api/auth2/sign-in/username", {
      data: { username, password },
      headers: { Origin: origin },
    });
  }

  if (!response.ok()) {
    throw new Error(
      `Login failed (${response.status()}): ${await response.text()}`,
    );
  }
}
