import { expect, type Page, test } from "@playwright/test";
import { isTestUserConfigured } from "@/utils";
import { LoginPage } from "@/e2e/models/login-page";
import { SettingsPage } from "@/e2e/models/settings-page";

// Endpoint the "link" button posts to (Better Auth's generic-oauth plugin).
const ORCID_LINK_ENDPOINT = "**/api/auth2/oauth2/link";

// Endpoint `AuthProvider` fetches the full user profile from once the session resolves.
const CURRENT_USER_ENDPOINT = "**/api/auth/me";

// A stable, reserved domain (RFC 2606) used as a fake redirect target. The
// route below intercepts it too, so the test never makes a real network
// request to it or to ORCID.
const MOCK_ORCID_REDIRECT_URL = "https://example.com/mock-orcid-redirect";

/**
 * Overrides `orcid` on the `/auth/me` response so each test controls the
 * "linked" state directly, instead of depending on whatever state the shared
 * test account happens to be in.
 */
async function mockCurrentUserOrcid(page: Page, orcid: string | null) {
  await page.route(CURRENT_USER_ENDPOINT, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    // `/auth/me` is also hit while unauthenticated (e.g. `initAuthFromSession`
    // on the login page), which has no `user` field — leave those untouched.
    if (json.user) {
      json.user.orcid = orcid;
    }
    await route.fulfill({ response, json });
  });
}

/**
 * Mocks the given `orcid` value, logs in, and navigates to the profile view
 * of the account settings page.
 */
async function loginAndOpenProfileSettings(
  page: Page,
  settingsPage: SettingsPage,
  orcid: string | null,
) {
  await mockCurrentUserOrcid(page, orcid);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();

  await settingsPage.goto();
  await settingsPage.goToProfileView();
}

test.describe("ORCID linking", () => {
  // Skip all tests in this describe block if credentials are not set.
  test.skip(
    !isTestUserConfigured(),
    "Skipping ORCID linking tests: test user credentials are not configured.",
  );

  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
  });

  test("redirects to the URL returned by the link request", async ({
    page,
  }) => {
    await loginAndOpenProfileSettings(page, settingsPage, null);

    await expect(settingsPage.orcidButton).toHaveText("Link ORCID iD");
    await expect(settingsPage.orcidButton).toBeEnabled();

    // Mock the ORCID linking response instead of hitting the real backend/ORCID.
    await page.route(ORCID_LINK_ENDPOINT, async (route) => {
      await route.fulfill({
        json: { url: MOCK_ORCID_REDIRECT_URL, redirect: true },
      });
    });
    await page.route(MOCK_ORCID_REDIRECT_URL, async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: "<html><body>Mock ORCID redirect target.</body></html>",
      });
    });

    await settingsPage.orcidButton.click();
    await page.waitForURL(MOCK_ORCID_REDIRECT_URL);
  });

  test("shows an error toast and re-enables the button when linking fails", async ({
    page,
  }) => {
    await loginAndOpenProfileSettings(page, settingsPage, null);

    await page.route(ORCID_LINK_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 400,
        json: { message: "Mock ORCID link failure" },
      });
    });

    await settingsPage.orcidButton.click();

    await expect(page.getByText("Mock ORCID link failure")).toBeVisible();
    await expect(settingsPage.orcidButton).toBeEnabled();
    await expect(settingsPage.orcidButton).toHaveText("Link ORCID iD");
  });

  test("shows the linked iD as a link to the ORCID profile page", async ({
    page,
  }) => {
    const orcid = "0000-0001-2345-6789";
    await loginAndOpenProfileSettings(page, settingsPage, orcid);

    await expect(settingsPage.orcidButton).toHaveText(orcid);
    await expect(settingsPage.orcidButton).toHaveAttribute(
      "href",
      `https://orcid.org/${orcid}`,
    );
  });
});
