import { expect, test } from "@playwright/test";
import { authenticateTestUser, isTestUserConfigured } from "@/utils";
import { LoginPage } from "../models/login-page";
import { PublicationPage } from "../models/publication-page";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

// The full Lorem Ipsum text to be typed into the editor.
const LOREM_IPSUM_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

test.describe("can edit comments", { tag: "@shared-fixture" }, () => {
  // Skip all tests in this describe block if credentials are not set.
  test.skip(
    !isTestUserConfigured(),
    "Skipping edit comment tests: test user credentials are not configured.",
  );

  // Publication page object.
  let publicationPage: PublicationPage;

  // Store IDs of created comments for cleanup.
  let createdCommentIds: number[] = [];

  // Before each test, log in and navigate to the comment section of a publication.
  test.beforeEach(async ({ page }) => {
    // Reset the comment IDs for each test.
    createdCommentIds = [];

    // Log in.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    // Navigate to the comment section of a publication.
    publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
    await publicationPage.goToComments();
  });

  // After each test, withdraw all created comments.
  test.afterEach(async ({ request }, testInfo) => {
    testInfo.setTimeout(15_000);
    await authenticateTestUser(request);
    for (const commentId of createdCommentIds) {
      await request.patch(`/api/comments/${commentId}`, {
        data: { state: "WITHDRAWN" },
      });
    }
    createdCommentIds = [];
  });

  test("can edit a comment", async ({ page }) => {
    // Step 1: Create a new comment.
    const commentId = await publicationPage.createComment(LOREM_IPSUM_TEXT);
    const comment = publicationPage.getComment(commentId);

    // Step 2: Click the "Edit" button in the comment menu.
    await publicationPage.clickEditCommentMenuOption(commentId);
    const commentEditor = publicationPage.getCommentEditor(commentId);
    await expect(commentEditor).toBeVisible();
    await expect(commentEditor).toContainText(LOREM_IPSUM_TEXT);

    // Step 3: Type the updated text into the editor.
    const updatedText = "This comment has been updated.";
    await commentEditor.fill(updatedText);

    // Step 4: Click the "Save" button, waiting for the edit mutation's PATCH
    // request and the resulting comment-list refetch to complete before
    // asserting on the updated content.
    const patchResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/comments/${commentId}`) &&
        r.request().method() === "PATCH",
    );
    const refetchResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await publicationPage.saveChangesToComment(commentId);
    const patchResponse = await patchResponsePromise;
    expect(
      patchResponse.ok(),
      `PATCH /comments/${commentId} failed: ${patchResponse.status()} ${await patchResponse.text()}`,
    ).toBeTruthy();
    await refetchResponsePromise;

    await expect(comment).toContainText(updatedText);
    await expect(comment).not.toContainText(LOREM_IPSUM_TEXT);
    await expect(comment).toBeVisible();

    // Step 5: Reload the page and verify the comment content persists.
    const commentsLoaded = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await page.reload();
    await commentsLoaded;
    await expect(comment).toBeVisible();
    await expect(comment).toContainText(updatedText);
    await expect(comment).not.toContainText(LOREM_IPSUM_TEXT);

    // Save comment ID for cleanup.
    createdCommentIds.push(commentId);
  });

  test("can edit a reply", async ({ page }) => {
    // Step 1: Create a new comment and reply to it.
    const commentId = await publicationPage.createComment(LOREM_IPSUM_TEXT);

    const replyText = "What an amazing comment. Thank you for sharing!";
    const replyId = await publicationPage.createComment(replyText, commentId);
    const reply = publicationPage.getComment(replyId);

    // Step 2: Click the "Edit" button in the reply comment menu.
    await publicationPage.clickEditCommentMenuOption(replyId);
    const replyEditor = publicationPage.getCommentEditor(replyId);
    await expect(replyEditor).toBeVisible();
    await expect(replyEditor).toContainText(replyText);

    // Step 3: Type the updated text into the editor.
    const updatedText = "This reply has been updated.";
    await replyEditor.fill(updatedText);

    // Step 4: Click the "Save" button, waiting for the edit mutation's PATCH
    // request and the resulting comment-list refetch to complete before
    // asserting on the updated content.
    const patchResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/comments/${replyId}`) &&
        r.request().method() === "PATCH",
    );
    const refetchResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await publicationPage.saveChangesToComment(replyId);
    const patchResponse = await patchResponsePromise;
    expect(
      patchResponse.ok(),
      `PATCH /comments/${replyId} failed: ${patchResponse.status()} ${await patchResponse.text()}`,
    ).toBeTruthy();
    await refetchResponsePromise;

    await expect(reply).toContainText(updatedText);
    await expect(reply).not.toContainText(replyText);
    await expect(reply).toBeVisible();

    // Step 5: Reload the page and verify the reply content persists.
    const commentsLoaded = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await page.reload();
    await commentsLoaded;
    await publicationPage.expandCommentReplies(commentId);
    await expect(reply).toBeVisible();
    await expect(reply).toContainText(updatedText);
    await expect(reply).not.toContainText(replyText);

    // Save comment IDs for cleanup.
    createdCommentIds.push(commentId, replyId);
  });

  test("withdrawing a comment keeps its replies visible", async ({ page }) => {
    // Step 1: Create a comment and a reply to it.
    const commentId = await publicationPage.createComment(LOREM_IPSUM_TEXT);
    const replyText = "This reply should stay visible after withdrawal.";
    const replyId = await publicationPage.createComment(replyText, commentId);

    const comment = publicationPage.getComment(commentId);
    const reply = publicationPage.getComment(replyId);

    // Step 2: Withdraw the root comment via the menu and confirmation dialog.
    await publicationPage.withdrawComment(commentId);

    // Already withdrawn: afterEach would get a 403 re-withdrawing it, so
    // drop it from the cleanup list now that this test has handled it.
    createdCommentIds = createdCommentIds.filter((id) => id !== commentId);

    // Step 3: Verify the withdrawal notice replaces the comment's body.
    await expect(
      comment.getByText("Comment has been withdrawn by the author"),
    ).toBeVisible();
    await expect(comment).not.toContainText(LOREM_IPSUM_TEXT);

    // Step 4: The reply should still render underneath the withdrawn comment.
    // (Replies are already expanded at this point: `createComment` expands
    // them as a side effect of creating the reply above.)
    await expect(reply).toBeVisible();
    await expect(reply).toContainText(replyText);

    // Step 5: Reload and verify both the withdrawal and the reply persist.
    const commentsLoaded = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await page.reload();
    await commentsLoaded;
    await expect(
      comment.getByText("Comment has been withdrawn by the author"),
    ).toBeVisible();
    await publicationPage.expandCommentReplies(commentId);
    await expect(reply).toBeVisible();
    await expect(reply).toContainText(replyText);

    // Save the reply ID for cleanup (the root comment is already withdrawn).
    createdCommentIds.push(replyId);
  });
});
