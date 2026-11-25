import { expect, Page, test } from "@playwright/test";
import { LoginPage } from "@/e2e/models/login-page";
import { PublicationPage } from "@/e2e/models/publication-page";
import { isTestUserConfigured } from "@/utils";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

/**
 * Logs in with the test user and asserts the post-login redirect landed on
 * `expectedUrl`.
 */
async function loginAndExpectRedirect(page: Page, expectedUrl: string) {
  const loginPage = new LoginPage(page);
  await loginPage.login(expectedUrl);
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("login redirects back to the originating page", () => {
  // Skip all tests in this describe block if credentials are not set.
  test.skip(
    !isTestUserConfigured(),
    "Skipping login redirect tests: test user credentials are not configured.",
  );

  test("logging in from the navbar returns to the originating publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goto();

    await publicationPage.navbarLoginLink.click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}`,
    );
  });

  test("logging in from the comment section returns to the originating publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goToComments();

    await publicationPage.commentSectionLoginLink.click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}#comments`,
    );
  });

  test("switching from the signup tab to the login tab preserves the origin publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goto();

    // Start from "Sign up" in the navbar, then switch to the "Log in" tab.
    await publicationPage.navbarSignUpLink.click();
    await page.waitForURL("/register");
    await page.getByRole("tab", { name: "Log in" }).click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}`,
    );
  });

  test("switching from the signup tab (opened from the comment section) to the login tab preserves the origin publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goToComments();

    // Start from "sign up" in the comment section, then switch to the "Log in" tab.
    await publicationPage.commentSectionSignUpLink.click();
    await page.waitForURL("/register");
    await page.getByRole("tab", { name: "Log in" }).click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}#comments`,
    );
  });

  test("direct access to /login without an origin redirects to home", async ({
    page,
  }) => {
    await page.goto("/login");

    // `login()` defaults to expecting "/", which is what should happen when
    // there's no preserved origin to return to.
    await loginAndExpectRedirect(page, "/");
  });

  test("logging in preserves the query string of the originating publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goto("?foobar=1");

    await publicationPage.navbarLoginLink.click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}?foobar=1`,
    );
  });

  test("logging in preserves the hash of the originating publication", async ({
    page,
  }) => {
    const publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goto("#some-anchor");

    await publicationPage.navbarLoginLink.click();
    await page.waitForURL("/login");

    await loginAndExpectRedirect(
      page,
      `/publications/${TEST_PUBLICATION_SLUG}#some-anchor`,
    );
  });
});
