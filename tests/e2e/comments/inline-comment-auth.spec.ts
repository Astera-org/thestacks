import { expect, test } from "@playwright/test";
import { PublicationPage } from "@/e2e/models/publication-page";
import { isTestUserConfigured } from "@/utils";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

test.describe("inline comment auth flow (unauthenticated)", () => {
  // Publication page object.
  let publicationPage: PublicationPage;

  // Before each test, navigate to the publication without logging in.
  test.beforeEach(async ({ page }) => {
    publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goto();
  });

  test("selecting text as guest still shows bubble menu", async () => {
    // Select text and verify the bubble menu comment button appears.
    await publicationPage.selectTextInBody("Purpose");
    await expect(publicationPage.bubbleMenuCommentButton).toBeVisible();
  });

  test("clicking bubble menu as guest opens auth modal", async () => {
    // Select text and click the comment button in the bubble menu.
    await publicationPage.selectTextInBody("Purpose");
    await publicationPage.bubbleMenuCommentButton.click();

    // Verify the auth modal appears with both login and sign-up tabs.
    await expect(publicationPage.authModal).toBeVisible();
    await expect(
      publicationPage.authModal.getByRole("tab", { name: "Log in" }),
    ).toBeVisible();
    await expect(
      publicationPage.authModal.getByRole("tab", { name: "Sign up" }),
    ).toBeVisible();
  });

  test("signing in via auth modal opens inline comment sheet", async () => {
    // Skip this test if credentials are not set.
    test.skip(
      !isTestUserConfigured(),
      "Skipping sign in test: test user credentials are not configured.",
    );

    // Select text and click the comment button to trigger the auth modal.
    await publicationPage.selectTextInBody("Purpose");
    await publicationPage.bubbleMenuCommentButton.click();

    // Fill in credentials and sign in.
    const modal = publicationPage.authModal;
    await modal
      .getByLabel("Username or Email")
      .fill(process.env.PLAYWRIGHT_TEST_USER_USERNAME!);
    await modal
      .getByLabel("Password", { exact: true })
      .fill(process.env.PLAYWRIGHT_TEST_USER_PASSWORD!);
    await modal.getByRole("button", { name: "Log in" }).click();

    // Verify the auth modal closes and the inline comment sheet opens.
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(publicationPage.inlineCommentSheet).toBeVisible();
  });

  test("can switch between sign-in and sign-up tabs in auth modal", async () => {
    // Select text and click the comment button to trigger the auth modal.
    await publicationPage.selectTextInBody("Purpose");
    await publicationPage.bubbleMenuCommentButton.click();

    // Switch to the "Sign up" tab and verify the create account heading appears.
    const modal = publicationPage.authModal;
    await modal.getByRole("tab", { name: "Sign up" }).click();
    await expect(
      publicationPage.authModal.getByRole("heading", {
        name: "Create Account",
      }),
    ).toBeVisible();

    // Switch back to the "Log in" tab and verify the username field appears.
    await modal.getByRole("tab", { name: "Log in" }).click();
    await expect(modal.getByLabel("Username or Email")).toBeVisible();
  });

  test("closing auth modal does not open the sheet", async () => {
    // Select text and click the comment button to trigger the auth modal.
    await publicationPage.selectTextInBody("Purpose");
    await publicationPage.bubbleMenuCommentButton.click();
    await expect(publicationPage.authModal).toBeVisible();

    // Close the auth modal via the X button.
    await publicationPage.authModal
      .getByRole("button", { name: "Close" })
      .click();

    // Verify the modal is dismissed and the inline comment sheet did not open.
    await expect(publicationPage.authModal).not.toBeVisible();
    await expect(publicationPage.inlineCommentSheet).not.toBeVisible();
  });
});
