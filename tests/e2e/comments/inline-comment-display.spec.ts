import { expect, test } from "@playwright/test";
import { PublicationPage } from "@/e2e/models/publication-page";
import { LoginPage } from "@/e2e/models/login-page";
import { authenticateTestUser, isTestUserConfigured } from "@/utils";

// TODO: Create a test publication instead of using one that already exists.
const TEST_PUBLICATION_SLUG = "tardigrade-test";

test.describe(
  "inline comment display and interaction",
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

    // Text to select in the publication body.
    let textToSelect: string;

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

      // Get the first 60 characters of the second paragraph of the publication body.
      textToSelect = await publicationPage.page.evaluate(() => {
        const body = document.getElementById("publication-body");
        if (!body) return "";

        const paragraphs = body.querySelectorAll("p");
        if (paragraphs.length < 2) return "";

        return paragraphs[1].textContent?.slice(0, 60) ?? "";
      });
    });

    // After each test, withdraw all created comments.
    test.afterEach(async ({ request }) => {
      await authenticateTestUser(request);
      for (const commentId of createdCommentIds) {
        await request.patch(`/api/comments/${commentId}`, {
          data: { state: "WITHDRAWN" },
        });
      }
    });

    test("inline comments are rendered correctly", async ({ page }) => {
      // Inline comment bubble renders next to anchored text.
      const commentText = "This is my inline comment.";
      const commentId = await publicationPage.createInlineComment(
        textToSelect,
        commentText,
      );
      await publicationPage.reload();
      createdCommentIds.push(commentId);

      // Verify the inline comment bubble renders next to anchored text.
      const bubble = publicationPage.getInlineCommentBubbleButton(commentId);
      await expect(bubble).toBeVisible();
      await expect(bubble).toContainText(/\d+/);

      // Clicking a margin bubble opens the sheet with correct threads.
      await bubble.click();
      const sheet = publicationPage.inlineCommentSheet;
      await expect(sheet).toBeVisible();
      await expect(sheet.locator("blockquote").first()).toContainText(
        textToSelect,
      );
      await expect(sheet.locator("[data-comment-id]").first()).toContainText(
        commentText,
      );

      // Page remains scrollable while sheet is open on desktop.
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 10000);
      await page.waitForTimeout(500);
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(scrollAfter).toBeGreaterThan(scrollBefore);

      // Clicking anchor text blockquote in sheet scrolls to highlight in body.
      const blockquote = sheet.getByText(textToSelect).first();
      await blockquote.click();

      const anchor = page
        .locator(".comment-anchor-wrapper")
        .filter({ hasText: textToSelect })
        .first();
      await expect(anchor).toBeInViewport({ timeout: 3000 });

      // Closing sheet via overlay click removes highlight.
      await page.locator(".fixed.inset-0.bg-overlay\\/5").click();
      await expect(publicationPage.inlineCommentSheet).not.toBeVisible();
      const highlighted = page.locator(
        ".comment-anchor-wrapper.bg-highlight\\/70",
      );
      await expect(highlighted).toHaveCount(0);

      // Hovering an inline comment bubble highlights the rendered text.
      await bubble.hover();
      const highlight = page.locator(
        ".comment-anchor-wrapper.bg-highlight\\/70",
      );
      await expect(highlight.first()).toBeVisible();

      // The inline comment appears in the "Comments" section of the publication page
      // with the correct text and anchor text.
      await publicationPage.goToComments();

      const comment = publicationPage.getComment(commentId);
      await expect(comment).toBeVisible();
      await expect(comment).toContainText(commentText);

      const anchorText = publicationPage.getCommentAnchorText(commentId);
      await expect(anchorText).toBeVisible();
      await expect(anchorText).toContainText(textToSelect);
    });

    test("navigating to a comment in a collapsed caption expands it", async ({
      page,
    }) => {
      const legends = page.locator("#publication-body .figure-legend");
      const legendIndex = await legends.evaluateAll((elements) =>
        elements.findIndex((el) =>
          el.querySelector('.caption-read-all[aria-expanded="false"]'),
        ),
      );
      expect(legendIndex, "the publication has a truncated caption").not.toBe(
        -1,
      );
      const legend = legends.nth(legendIndex);

      // Comment on the end of the caption, which truncation hides.
      await legend.getByRole("button", { name: "Read all" }).click();
      const hiddenText = await legend.evaluate((el) => {
        const paragraphs = el.querySelectorAll("p");
        const block = paragraphs[paragraphs.length - 1] ?? el;
        return (block.textContent ?? "").trim().slice(-40).trim();
      });
      const commentId = await publicationPage.createInlineComment(
        hiddenText,
        "Comment in a collapsed caption.",
      );
      createdCommentIds.push(commentId);

      // After a reload the caption is collapsed again.
      await publicationPage.reload();
      const anchor = page.locator(
        `.comment-anchor-wrapper[data-comment-ids~="${commentId}"]`,
      );
      await expect(
        legend.getByRole("button", { name: "Read all" }),
      ).toBeVisible();
      // In the page, so find in page can match it, but hidden until found.
      await expect(anchor).toHaveCount(1);
      await expect(anchor).toBeHidden();

      // Clicking the comment's quoted text in the Comments section expands the
      // caption and scrolls to the highlight.
      await publicationPage.getCommentAnchorText(commentId).click();

      await expect(
        legend.getByRole("button", { name: "Collapse" }),
      ).toBeVisible();
      await expect(anchor.first()).toBeInViewport({ timeout: 3000 });

      // Collapsing it again hides the highlight rather than moving it to
      // similar text that's still shown, and the comment can be revealed again.
      await legend.getByRole("button", { name: "Collapse" }).click();
      await expect(
        legend.getByRole("button", { name: "Read all" }),
      ).toBeVisible();
      await expect(anchor).toBeHidden();

      await publicationPage.getCommentAnchorText(commentId).click();

      await expect(
        legend.getByRole("button", { name: "Collapse" }),
      ).toBeVisible();
      await expect(anchor.first()).toBeInViewport({ timeout: 3000 });
    });
  },
);
