import { injectAnchorsIntoDom } from "@/lib/comments/inlineCommentAnchors";
import type { Comment } from "@/types";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRevealCommentAnchor } from "./useRevealCommentAnchor";

const fox = {
  comment_id: 1,
  anchor_text: "quick brown fox",
  pre_text: "The ",
  post_text: " jumps"
} as Comment;

const dog = {
  comment_id: 2,
  anchor_text: "lazy dog",
  pre_text: "the ",
  post_text: "."
} as Comment;

/** Renders the body with anchors for `comments`. */
function anchorBody(comments: Comment[]) {
  const body = document.createElement("article");
  body.id = "publication-body";
  body.innerHTML = "<p>The quick brown fox jumps over the lazy dog.</p>";
  document.body.appendChild(body);
  injectAnchorsIntoDom(body, comments);
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  scrollIntoView.mockClear();
  document.body.innerHTML = "";
});

describe("useRevealCommentAnchor", () => {
  it("cancels a reveal still waiting for its anchor when the component unmounts", async () => {
    const { result, unmount } = renderHook(() => useRevealCommentAnchor());
    const revealing = result.current(fox.comment_id);

    unmount();
    // The anchor appears after the unmount, within the retry window
    anchorBody([fox]);

    expect(await revealing).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("cancels the previous reveal when another starts", async () => {
    const { result } = renderHook(() => useRevealCommentAnchor());
    const revealingFox = result.current(fox.comment_id);

    const revealingDog = result.current(dog.comment_id);
    anchorBody([fox, dog]);

    expect(await revealingFox).toBe(false);
    expect(await revealingDog).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.querySelector('[data-comment-ids~="2"]')
    );
  });

  it("cancels a reveal another component started when this one starts", async () => {
    const card = renderHook(() => useRevealCommentAnchor());
    const sheet = renderHook(() => useRevealCommentAnchor());
    const revealingFox = card.result.current(fox.comment_id);

    const revealingDog = sheet.result.current(dog.comment_id);
    anchorBody([fox, dog]);

    expect(await revealingFox).toBe(false);
    expect(await revealingDog).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.querySelector('[data-comment-ids~="2"]')
    );
  });

  it("doesn't cancel another component's reveal when it unmounts", async () => {
    const card = renderHook(() => useRevealCommentAnchor());
    const sheet = renderHook(() => useRevealCommentAnchor());
    void card.result.current(fox.comment_id);
    const revealingDog = sheet.result.current(dog.comment_id);

    card.unmount();
    anchorBody([fox, dog]);

    expect(await revealingDog).toBe(true);
  });
});
