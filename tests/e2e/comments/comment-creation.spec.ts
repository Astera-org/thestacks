import { expect, test } from "@playwright/test";
import { authenticateTestUser, isTestUserConfigured } from "@/utils";
import { LoginPage } from "@/e2e/models/login-page";
import { PublicationPage } from "@/e2e/models/publication-page";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

// The full Lorem Ipsum text to be typed into the editor.
const LOREM_IPSUM_TEXT =
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

test.describe("can create comments", { tag: "@shared-fixture" }, () => {
  // Skip all tests in this describe block if credentials are not set.
  test.skip(
    !isTestUserConfigured(),
    "Skipping create comment tests: test user credentials are not configured.",
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
  });

  // Note: This test is NOT a duplicate of the `createComment` function.
  // It contains assertions during the creation process that should not
  // be included in the `createComment` function.
  test("can create and submit a comment", async ({ page }) => {
    // Step 1: Find and focus the comment editor.
    const commentEditor = page.locator(".ProseMirror").first();
    await expect(commentEditor).toBeVisible();
    await commentEditor.click();

    // Step 2: Type the text into the editor.
    await commentEditor.fill(LOREM_IPSUM_TEXT);

    // Step 3: Set up a listener to capture the created comment ID from the API response.
    const commentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/publication/") &&
        response.request().method() === "POST",
    );

    // Step 4: Submit the comment.
    await publicationPage.clickNewCommentSubmitButton();

    // Step 5: Wait for the API response and extract the comment ID.
    const response = await commentResponsePromise;
    const responseBody = await response.json();

    // Step 6: Verify the comment was created and appears in the list.
    const commentId = responseBody.comment_id;
    const newComment = publicationPage.getComment(commentId);
    await expect(newComment).toBeVisible();
    await expect(newComment).toContainText(LOREM_IPSUM_TEXT);
    await expect(commentEditor).toBeEmpty({ timeout: 10000 });

    // Step 7: Reload the page and verify comment content persists.
    const commentsLoaded = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await page.reload();
    await commentsLoaded;
    await expect(newComment).toBeVisible();
    await expect(newComment).toContainText(LOREM_IPSUM_TEXT);

    // Save comment ID for cleanup.
    createdCommentIds.push(commentId);
  });

  test("can reply to a comment", async ({ page }) => {
    // Step 1: Create a new comment.
    const commentId = await publicationPage.createComment(LOREM_IPSUM_TEXT);
    const comment = publicationPage.getComment(commentId);
    await expect(comment).toBeVisible();

    // Step 2: Click the "Reply" button under the comment.
    await publicationPage.clickReplyToCommentButton(commentId);
    const commentEditor = publicationPage.getCommentEditor(commentId);
    await expect(commentEditor).toBeVisible();
    await commentEditor.click();

    // Step 2: Type the reply text into the editor.
    const replyText = "Wow, what an incredible comment! I agree with you 100%.";
    await commentEditor.fill(replyText);

    // Step 3: Set up a listener to capture the comment ID from the API response.
    const commentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/publication/") &&
        response.request().method() === "POST",
    );

    // Step 4: Submit the reply.
    const reply = publicationPage.getComment(commentId);
    const submitButton = reply.getByRole("button", {
      name: "Submit",
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 5: Wait for the API response and extract the comment ID.
    const response = await commentResponsePromise;
    const responseBody = await response.json();

    // Step 6: Wait for the new comment to appear in the comment list.
    const replyId = responseBody.comment_id;
    await publicationPage.expandCommentReplies(commentId);
    const newComment = publicationPage.getComment(replyId);
    await expect(newComment).toBeVisible();
    await expect(newComment).toContainText(replyText);

    // Step 7: Reload the page and verify both the comment and reply persist.
    const commentsLoaded = page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await page.reload();
    await commentsLoaded;
    await publicationPage.expandCommentReplies(commentId);
    await expect(comment).toBeVisible();
    await expect(comment).toContainText(LOREM_IPSUM_TEXT);
    await expect(newComment).toBeVisible();
    await expect(newComment).toContainText(replyText);

    // Save comment IDs for cleanup.
    createdCommentIds.push(commentId, replyId);
  });
});
