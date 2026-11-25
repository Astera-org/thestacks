import { expect, Page, test } from "@playwright/test";
import { PublicationPage } from "@/e2e/models/publication-page";
import { LoginPage } from "@/e2e/models/login-page";
import { authenticateTestUser, isTestUserConfigured } from "@/utils";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

/**
 * @param page - The page object.
 * @param paragraphIndex - The index of the paragraph to select.
 * @returns The text from the publication body at the given paragraph index.
 */
function getPublicationBodyText(page: Page, paragraphIndex: number) {
  return page.evaluate((idx) => {
    const body = document.getElementById("publication-body");
    if (!body) return "";

    const paragraphs = body.querySelectorAll("p");
    if (paragraphs.length === 0) return "";

    return paragraphs[idx].textContent ?? "";
  }, paragraphIndex);
}

test.describe(
  "inline comment creation (authenticated)",
  { tag: "@shared-fixture" },
  () => {
    // Skip all tests in this describe block if credentials are not set.
    test.skip(
      !isTestUserConfigured(),
      "Skipping create comment tests: test user credentials are not configured.",
    );

    // Publication page object.
    let publicationPage: PublicationPage;

    // Store IDs of created comments for cleanup.
    let createdCommentIds: number[] = [];

    // Before each test, log in and navigate to the publication.
    test.beforeEach(async ({ page }) => {
      // Reset the comment IDs for each test.
      createdCommentIds = [];

      // Log in.
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login();

      // Navigate to the publication.
      publicationPage = new PublicationPage(page, TEST_PUBLICATION_SLUG);
      await publicationPage.goto();
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

    test("selecting text shows bubble menu above selection", async ({
      page,
    }) => {
      // Select text and verify the bubble menu comment button appears.
      const firstParagraphText = await getPublicationBodyText(page, 0);
      const textToSelect = firstParagraphText.slice(0, 60);

      await publicationPage.selectTextInBody(textToSelect);
      await expect(publicationPage.bubbleMenuCommentButton).toBeVisible();

      // Clear the selection and verify the bubble menu disappears.
      await page.click("#publication-body", { position: { x: 0, y: 0 } });
      await expect(publicationPage.bubbleMenuCommentButton).not.toBeVisible();
    });

    test("comment button in bubble menu is disabled for multi-paragraph selection", async ({
      page,
    }) => {
      // Programmatically select across two paragraphs.
      await page.evaluate(() => {
        const body = document.getElementById("publication-body");
        if (!body) return;

        const paragraphs = body.querySelectorAll("p");
        if (paragraphs.length < 2) return;

        // Walk to the first non-empty text node in each paragraph rather
        // than assuming `firstChild` is one: comment-anchor-wrapper spans
        // from existing inline comments can split a paragraph's leading
        // text into an empty text node followed by wrapped text.
        function firstNonEmptyTextNode(el: Element): Text | null {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode() as Text | null;
          while (node && node.length === 0) {
            node = walker.nextNode() as Text | null;
          }
          return node;
        }

        const startNode = firstNonEmptyTextNode(paragraphs[0]);
        const endNode = firstNonEmptyTextNode(paragraphs[1]);
        if (!startNode || !endNode) {
          throw new Error(
            "Could not find a non-empty text node in paragraph 0 or 1 to build a cross-paragraph selection",
          );
        }

        const range = document.createRange();
        range.setStart(startNode, 0);
        range.setEnd(endNode, Math.min(10, endNode.length));

        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        selection.addRange(range);
      });

      // Verify the comment button is visible but disabled.
      const commentButton = publicationPage.bubbleMenuCommentButton;
      await expect(commentButton).toBeVisible();
      await expect(commentButton).toBeDisabled();

      // Hover and verify the disabled-reason tooltip is shown.
      await commentButton.hover();
      await expect(
        page.getByText(
          "inline comments can only be added to text in the same paragraph",
          { exact: false },
        ),
      ).toBeVisible();
    });

    test("clicking comment button in bubble menu opens inline comment sheet with anchor quote", async ({
      page,
    }) => {
      // Select text and click the comment button in the bubble menu.
      const firstParagraphText = await getPublicationBodyText(page, 0);
      const textToSelect = firstParagraphText.slice(0, 120);

      await publicationPage.selectTextInBody(textToSelect);
      await publicationPage.bubbleMenuCommentButton.click();

      // Verify the sheet is visible and contains the selected text.
      const sheet = publicationPage.inlineCommentSheet;
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(textToSelect);

      // Verify the anchor quote blockquote displays the selected text.
      const blockquote = sheet.locator("blockquote").first();
      await expect(blockquote).toBeVisible();
      await expect(blockquote).toContainText(textToSelect);

      // Verify the comment editor is visible and empty.
      const editor = publicationPage.newInlineCommentThreadEditor;
      await expect(editor).toBeVisible();
      await expect(editor).toBeEmpty();
    });

    test("can submit inline comment and it appears in the sheet", async ({
      page,
    }) => {
      test.slow();

      // Select text and click the comment button in the bubble menu.
      const secondParagraphText = await getPublicationBodyText(page, 1);
      const textToSelect = secondParagraphText.slice(0, 120);

      await publicationPage.selectTextInBody(textToSelect);
      await publicationPage.bubbleMenuCommentButton.click();
      await publicationPage.inlineCommentSheet.waitFor({ state: "visible" });

      // Type the comment text into the editor.
      const commentText = "This is my inline comment.";
      const editor = publicationPage.newInlineCommentThreadEditor;
      await editor.fill(commentText);

      // Submit the comment.
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().includes("/api/comments/publication/") &&
          r.request().method() === "POST",
      );
      await publicationPage.inlineCommentSheet
        .getByRole("button", { name: "Submit" })
        .click();
      const response = await responsePromise;
      const { comment_id: commentId } = await response.json();

      // Verify the comment appears in the sheet.
      const comment = publicationPage.getComment(commentId, { inSheet: true });
      await expect(comment).toBeVisible();
      await expect(comment).toContainText(commentText);
      createdCommentIds.push(commentId);
    });

    test("can reply to an inline comment thread in the sheet", async ({
      page,
    }) => {
      test.slow();

      // Create an inline comment and reload to persist it.
      const secondParagraphText = await getPublicationBodyText(page, 1);
      const textToSelect = secondParagraphText.slice(120, 240);

      const commentText = "Thread root comment for reply test.";
      const commentId = await publicationPage.createInlineComment(
        textToSelect,
        commentText,
      );
      createdCommentIds.push(commentId);

      // Reload and open the inline comment sheet via the bubble button.
      await publicationPage.reload();
      const bubble =
        await publicationPage.getInlineCommentBubbleButtonForComment(commentId);
      await bubble.click();

      const sheet = publicationPage.inlineCommentSheet;
      await expect(sheet).toBeVisible();

      // Click the "Reply" button to open the reply editor.
      const rootComment = publicationPage.getComment(commentId, {
        inSheet: true,
      });
      await publicationPage.clickReplyToCommentButton(commentId, {
        inSheet: true,
      });

      // Type the reply text into the reply editor.
      const replyEditor = rootComment.locator(".ProseMirror").first();
      const replyText = "This is my reply to the thread.";
      await replyEditor.fill(replyText);

      // Submit the reply and capture the response.
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().includes("/api/comments/publication/") &&
          r.request().method() === "POST",
      );
      await rootComment.getByRole("button", { name: "Submit" }).click();
      const response = await responsePromise;
      const { comment_id: replyId } = await response.json();
      createdCommentIds.push(replyId);

      // Expand the replies section and verify the reply appears.
      const toggleReplies = rootComment.getByTestId("toggle-replies-button");
      await expect(toggleReplies).toBeVisible();
      await toggleReplies.click();

      const reply = sheet.locator(`[data-comment-id="${replyId}"]`);
      await expect(reply).toBeVisible();
      await expect(reply).toContainText(replyText);
    });

    test("can withdraw an inline comment from the sheet", async ({ page }) => {
      test.slow();
      // Create an inline comment and reload to persist it.
      const firstParagraphText = await getPublicationBodyText(page, 0);
      const textToSelect = firstParagraphText.slice(120, 240);

      const commentText = "Comment to be withdrawn.";
      const commentId = await publicationPage.createInlineComment(
        textToSelect,
        commentText,
      );
      createdCommentIds.push(commentId);

      // Reload and open the inline comment sheet via the bubble button.
      await publicationPage.reload();
      const bubble =
        await publicationPage.getInlineCommentBubbleButtonForComment(commentId);
      await bubble.click();

      const sheet = publicationPage.inlineCommentSheet;
      await expect(sheet).toBeVisible();

      // Withdraw the comment via the menu and confirmation dialog.
      await publicationPage.withdrawComment(commentId, { inSheet: true });

      // Already withdrawn: afterEach would get a 403 re-withdrawing it, so
      // drop it from the cleanup list now that this test has handled it.
      createdCommentIds = createdCommentIds.filter((id) => id !== commentId);

      // Verify the comment shows the withdrawal notice in place of its body.
      const comment = sheet.locator(`[data-comment-id="${commentId}"]`);
      await expect(
        comment.getByText("Comment has been withdrawn by the author"),
      ).toBeVisible();
      await expect(comment).not.toContainText(commentText);

      // Reload and verify the withdrawal persists.
      await page.reload({ waitUntil: "networkidle" });
      const bubbleAfterReload =
        await publicationPage.getInlineCommentBubbleButtonForComment(commentId);
      await bubbleAfterReload.click();
      const commentAfterReload = publicationPage.inlineCommentSheet.locator(
        `[data-comment-id="${commentId}"]`,
      );
      await expect(
        commentAfterReload.getByText(
          "Comment has been withdrawn by the author",
        ),
      ).toBeVisible();
    });

    test("can create a new thread on the same anchor text selection from the sheet", async ({
      page,
    }) => {
      test.slow();

      // Create an inline comment and reload to persist it.
      const firstParagraphText = await getPublicationBodyText(page, 2);
      const textToSelect = firstParagraphText.slice(0, 60);

      const firstCommentText = "First thread on this anchor.";
      const commentId = await publicationPage.createInlineComment(
        textToSelect,
        firstCommentText,
      );
      createdCommentIds.push(commentId);

      // Reload and open the inline comment sheet via the bubble button.
      await publicationPage.reload();
      const bubble =
        await publicationPage.getInlineCommentBubbleButtonForComment(commentId);
      await bubble.click();

      const sheet = publicationPage.inlineCommentSheet;
      await expect(sheet).toBeVisible();

      // Click "New thread" to start a second thread on the same anchor.
      await sheet.getByRole("button", { name: /new thread/i }).click();

      // Type and submit the new thread comment.
      const newThreadText = "Second thread on the same anchor.";
      const newThreadEditor = sheet.locator(".ProseMirror").first();
      await newThreadEditor.fill(newThreadText);

      const responsePromise = page.waitForResponse(
        (r) =>
          r.url().includes("/api/comments/publication/") &&
          r.request().method() === "POST",
      );
      await sheet.getByRole("button", { name: "Submit" }).click();
      const response = await responsePromise;
      const { comment_id: newCommentId } = await response.json();

      // Verify both threads are visible with correct text.
      const firstThread = sheet.locator(`[data-comment-id="${commentId}"]`);
      const secondThread = sheet.locator(`[data-comment-id="${newCommentId}"]`);
      await expect(firstThread).toBeVisible();
      await expect(secondThread).toBeVisible();
      await expect(firstThread).toContainText(firstCommentText);
      await expect(secondThread).toContainText(newThreadText);

      createdCommentIds.push(newCommentId);
    });
  },
);
