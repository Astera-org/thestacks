import { expect, Locator, type Page } from "@playwright/test";
import { settle } from "@/utils";

export class PublicationPage {
  private readonly publicationSlug: string;

  private readonly newCommentForm: Locator;
  private readonly newCommentEditor: Locator;
  private readonly newCommentSubmitButton: Locator;

  constructor(
    public readonly page: Page,
    publicationSlug: string,
  ) {
    // Publication slug.
    this.publicationSlug = publicationSlug;

    // New comment form elements.
    this.newCommentForm = this.page.getByTestId("new-comment-form");
    this.newCommentEditor = this.newCommentForm.locator(".ProseMirror").first();
    this.newCommentSubmitButton = this.newCommentForm.getByRole("button", {
      name: "Submit",
    });
  }

  /**
   * @returns The "Comment" button in the bubble menu element.
   */
  get bubbleMenuCommentButton() {
    return this.page.getByTestId("comment-bubble-menu-button").first();
  }

  /**
   * @returns The inline comment sheet element.
   */
  get inlineCommentSheet() {
    return this.page.getByTestId("inline-comment-sheet");
  }

  /**
   * @returns The auth modal element.
   */
  get authModal() {
    return this.page.getByTestId("auth-modal");
  }

  /**
   * @returns The navbar's "Log in" link.
   */
  get navbarLoginLink() {
    return this.page.locator("header").getByRole("link", { name: "Log in" });
  }

  /**
   * @returns The navbar's "Sign up" link.
   */
  get navbarSignUpLink() {
    return this.page.locator("header").getByRole("link", { name: "Sign up" });
  }

  /**
   * @returns The "Log in" link in the comment section's logged-out prompt.
   */
  get commentSectionLoginLink() {
    // The "comments" id is on the collapsible's toggle button; its content
    // (including this link) lives in the sibling "comments-content" region.
    return this.page
      .locator("#comments-content")
      .getByRole("link", { name: "Log in" });
  }

  /**
   * @returns The "sign up" link in the comment section's logged-out prompt.
   */
  get commentSectionSignUpLink() {
    return this.page
      .locator("#comments-content")
      .getByRole("link", { name: "sign up" });
  }

  /**
   * @returns The first comment editor in an inline comment thread sheet.
   */
  get newInlineCommentThreadEditor() {
    return this.inlineCommentSheet.locator(".ProseMirror").first();
  }

  /**
   * Gets the editor element for an existing comment by comment ID.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   * @returns The comment editor element.
   */
  getCommentEditor(commentId: number, options?: { inSheet?: boolean }) {
    const comment = this.getComment(commentId, options);
    return comment.locator(".ProseMirror").first();
  }

  /**
   * @param commentId - The ID of the comment.
   * @returns The inline comment bubble button element.
   */
  getInlineCommentBubbleButton(commentId: number) {
    return this.page.getByTestId(
      `toggle-inline-comment-sheet-button-${commentId}`,
    );
  }

  /**
   * Finds the bubble button for the paragraph group containing the given
   * comment. Unlike `getInlineCommentBubbleButton`, this resolves the correct
   * button even when the comment is not `threads[0]` in its group (e.g. when
   * other comments on the same anchor exist from parallel test runners).
   *
   * @param commentId - The ID of the comment.
   * @returns The bubble button locator.
   */
  async getInlineCommentBubbleButtonForComment(commentId: number) {
    const buttonTestId = await this.page.evaluate((id) => {
      const anchor = document.querySelector<HTMLElement>(
        `.comment-anchor-wrapper[data-comment-ids~="${id}"]`,
      );
      if (!anchor) return null;

      const firstId = anchor.dataset.commentIds?.split(" ")[0];
      return firstId ? `toggle-inline-comment-sheet-button-${firstId}` : null;
    }, commentId);

    if (!buttonTestId) {
      throw new Error(`No anchor wrapper found for comment ${commentId}`);
    }

    return this.page.getByTestId(buttonTestId);
  }

  /**
   * @param commentId - The ID of the comment.
   * @returns The anchor text element.
   */
  getCommentAnchorText(commentId: number) {
    return this.page.getByTestId(`comment-anchor-text-${commentId}`).first();
  }

  /**
   * Navigates to the publication page.
   *
   * @param suffix - Optional query string and/or hash to append (e.g.
   * `?page=2` or `#anchor`), for tests asserting it survives a redirect.
   */
  async goto(suffix = "") {
    await this.page.goto(`/publications/${this.publicationSlug}${suffix}`, {
      waitUntil: "domcontentloaded",
    });
    await this.waitUntilReady();
  }

  /**
   * Navigates to the comments section of the publication page.
   */
  async goToComments() {
    await this.page.goto(`/publications/${this.publicationSlug}#comments`, {
      waitUntil: "domcontentloaded",
    });
    await this.waitUntilReady();
  }

  /**
   * Reloads the publication page and waits for the body to render again.
   */
  async reload() {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await this.waitUntilReady();
  }

  /**
   * Waits for the publication body to render. The `page.evaluate` helpers below
   * read the DOM directly and so don't auto-wait the way locators do.
   */
  async waitUntilReady() {
    await this.page
      .locator("#publication-body p")
      .first()
      .waitFor({ state: "visible" });
    await settle(this.page);
  }

  /**
   * Clicks the "Submit" button in the new comment form.
   */
  async clickNewCommentSubmitButton() {
    await this.newCommentSubmitButton.click();
  }

  /**
   * Creates a comment in the comment editor and returns the created comment ID.
   *
   * If a comment ID is provided, the comment will be replied to.
   *
   * @param text - The text to be typed into the editor.
   * @param commentId - The ID of the comment to reply to.
   * @returns The created comment ID.
   */
  async createComment(text: string, commentId?: number): Promise<number> {
    // Step 1: Find and focus the comment editor.
    let commentEditor = this.newCommentEditor;
    if (commentId) {
      await this.clickReplyToCommentButton(commentId);
      commentEditor = this.getCommentEditor(commentId);
    }
    await commentEditor.click();

    // Step 2: Type the text into the editor.
    await commentEditor.fill(text);

    // Step 3: Set up a listener to capture the created comment ID from the API response.
    const commentResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/publication/") &&
        response.request().method() === "POST",
    );

    // Step 4: Submit the comment.
    let submitButton = this.newCommentSubmitButton;
    if (commentId) {
      const comment = this.getComment(commentId);
      submitButton = comment.getByRole("button", {
        name: "Submit",
      });
    }
    await submitButton.click();

    // Step 5: Wait for the API response and extract the comment ID.
    const response = await commentResponsePromise;
    const responseBody = await response.json();

    // Step 6: Wait for the new comment to appear in the comment list.
    if (commentId) {
      await this.expandCommentReplies(commentId);
    }
    const newComment = this.getComment(responseBody.comment_id);
    await newComment.waitFor({ state: "visible" });

    return responseBody.comment_id;
  }

  /**
   * Creates an inline comment in the inline comment sheet.
   *
   * @param anchorText - The text of the anchor that the comment is attached to.
   * @param text - The text to be typed into the editor.
   */
  async createInlineComment(anchorText: string, text: string) {
    // Step 1: Select the text of the anchor that the comment is attached to,
    // and click the comment button in the bubble menu.
    await this.selectTextInBody(anchorText);
    await this.bubbleMenuCommentButton.click();
    await this.inlineCommentSheet.waitFor({ state: "visible" });

    // Step 2: Type the text into the editor.
    const editor = this.newInlineCommentThreadEditor;
    await editor.fill(text);

    // Step 3: Submit the comment.
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/publication/") &&
        response.request().method() === "POST",
    );
    await this.inlineCommentSheet
      .getByRole("button", { name: "Submit" })
      .click();

    // Step 4: Wait for the API response and extract the comment ID.
    const response = await responsePromise;
    const { comment_id } = await response.json();

    // Step 5: Wait for the new comment to appear in the inline comment sheet.
    const newComment = this.getComment(comment_id, { inSheet: true });
    await newComment.waitFor({ state: "visible" });

    return comment_id;
  }

  /**
   * Gets the comment element by comment ID.
   *
   * @param commentId - The ID of the comment.
   * @param options - When `inSheet` is true, scopes the lookup to the inline comment sheet.
   * @returns The comment element.
   */
  getComment(commentId: number, options?: { inSheet?: boolean }) {
    const locatorExpression = `[data-comment-id="${commentId}"]`;
    const root = options?.inSheet ? this.inlineCommentSheet : this.page;
    return root.locator(locatorExpression);
  }

  /**
   * Clicks the "Reply" button under the given comment.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async clickReplyToCommentButton(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    const comment = this.getComment(commentId, options);
    await comment.getByRole("button", { name: "Reply" }).click();
  }

  /**
   * Expands the replies of the given comment.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async expandCommentReplies(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    const comment = this.getComment(commentId, options);
    await comment.getByTestId("toggle-replies-button").click();
  }

  /**
   * Clicks the comment menu button by comment ID.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async clickCommentMenuButton(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    const comment = this.getComment(commentId, options);
    await comment.getByTestId("comment-menu-button").first().click();
  }

  /**
   * Clicks the "Edit" option in the comment menu.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async clickEditCommentMenuOption(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    await this.clickCommentMenuButton(commentId, options);
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
  }

  /**
   * Clicks the "Submit" button in the comment editor for the given comment.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async saveChangesToComment(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    const comment = this.getComment(commentId, options);
    await comment.getByRole("button", { name: "Save" }).click();
  }

  /**
   * Clicks the "Withdraw" option in the comment menu.
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async clickWithdrawCommentMenuOption(
    commentId: number,
    options?: { inSheet?: boolean },
  ) {
    await this.clickCommentMenuButton(commentId, options);
    await this.page.getByRole("menuitem", { name: "Withdraw" }).click();
  }

  /**
   * Withdraws a comment by comment ID, confirming via the withdrawal dialog
   * (which requires typing "WITHDRAW" into a confirmation field).
   *
   * @param commentId - The ID of the comment.
   * @param options - Optional scope for the comment lookup.
   */
  async withdrawComment(commentId: number, options?: { inSheet?: boolean }) {
    await this.clickWithdrawCommentMenuOption(commentId, options);

    // Confirm withdrawal.
    const dialog = this.page
      .getByRole("dialog")
      .filter({ hasText: "Withdraw this comment?" });
    await dialog.getByPlaceholder("Type WITHDRAW to confirm").fill("WITHDRAW");

    // Wait for the withdrawal mutation's PATCH request and the resulting
    // comment-list refetch to complete so callers can rely on fresh state
    // being reflected in the UI as soon as this resolves.
    const patchResponsePromise = this.page.waitForResponse(
      (r) =>
        r.url().includes(`/api/comments/${commentId}`) &&
        r.request().method() === "PATCH",
    );
    const refetchResponsePromise = this.page.waitForResponse(
      (r) =>
        r.url().includes("/api/comments/publication/") &&
        r.request().method() === "GET",
    );
    await dialog.getByRole("button", { name: "Withdraw comment" }).click();

    const patchResponse = await patchResponsePromise;
    expect(
      patchResponse.ok(),
      `PATCH /comments/${commentId} failed: ${patchResponse.status()} ${await patchResponse.text()}`,
    ).toBeTruthy();
    await refetchResponsePromise;
  }

  /**
   * Select text inside #publication-body by finding a substring and
   * programmatically selecting it. Searches across text-node boundaries so
   * that anchor `<span>` wrappers injected by inline-comment rendering don't
   * prevent the substring from being found.
   */
  async selectTextInBody(text: string) {
    await this.page.evaluate((searchText) => {
      const body = document.getElementById("publication-body");
      if (!body) throw new Error("publication-body not found");

      const textNodes: Array<{ node: Text; offset: number }> = [];
      let totalLength = 0;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let n = walker.nextNode();
      while (n) {
        textNodes.push({ node: n as Text, offset: totalLength });
        totalLength += n.textContent?.length ?? 0;
        n = walker.nextNode();
      }

      const fullText = textNodes.map((t) => t.node.textContent).join("");
      const matchStart = fullText.indexOf(searchText);
      if (matchStart === -1) {
        throw new Error(`Text "${searchText}" not found in publication body`);
      }
      const matchEnd = matchStart + searchText.length;

      let startNode: Text | null = null;
      let startOffset = 0;
      let endNode: Text | null = null;
      let endOffset = 0;

      for (const entry of textNodes) {
        const nodeStart = entry.offset;
        const nodeEnd = nodeStart + (entry.node.textContent?.length ?? 0);

        if (!startNode && nodeEnd > matchStart) {
          startNode = entry.node;
          startOffset = matchStart - nodeStart;
        }
        if (nodeEnd >= matchEnd) {
          endNode = entry.node;
          endOffset = matchEnd - nodeStart;
          break;
        }
      }

      if (!startNode || !endNode) {
        throw new Error(`Could not map text "${searchText}" to DOM nodes`);
      }

      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    }, text);
  }
}
