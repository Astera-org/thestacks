import type { CommentThread } from "@/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHighlightManagement } from "./useHighlightManagement";

const threadOf = (id: number) =>
  ({ root: { comment_id: id } }) as CommentThread;
const thread = threadOf(1);
// Stable across renders, as the component's memoized threads are
const sheetThreads = [thread];
const noThreads: CommentThread[] = [];

/** Renders a wrapper for comments `ids`, as anchor injection does. */
function mountAnchor(ids = "1") {
  const wrapper = document.createElement("span");
  wrapper.className = "comment-anchor-wrapper";
  wrapper.dataset.commentIds = ids;
  wrapper.textContent = "quick brown fox";
  document.body.appendChild(wrapper);
  return wrapper;
}

const noop = () => {};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useHighlightManagement", () => {
  it("forgets a hover when switching to mobile, so it isn't lit back on desktop", () => {
    const anchor = mountAnchor();
    const { result, rerender } = renderHook(
      ({ isMobile }) =>
        useHighlightManagement([], 0, isMobile, false, noThreads, noop),
      { initialProps: { isMobile: false } }
    );
    const lit = () => anchor.classList.contains("bg-highlight/70");

    act(() => result.current.toggleHighlightForThreads([thread], true));
    expect(lit()).toBe(true);

    // Mobile unmounts the bubble without a mouse leave
    rerender({ isMobile: true });
    rerender({ isMobile: false });

    expect(lit()).toBe(false);
  });

  it("highlights the open sheet's anchors again after they're re-injected", () => {
    const first = mountAnchor();
    const { rerender } = renderHook(
      ({ anchorVersion }) =>
        useHighlightManagement(
          [],
          anchorVersion,
          false,
          true,
          sheetThreads,
          noop
        ),
      { initialProps: { anchorVersion: 0 } }
    );
    expect(first.classList.contains("bg-highlight/70")).toBe(true);

    // Re-injection replaces the wrapper, as when a figure legend expands
    first.remove();
    const second = mountAnchor();
    rerender({ anchorVersion: 1 });

    expect(second.classList.contains("bg-highlight/70")).toBe(true);
  });

  it("keeps a piece two hovered comments share lit when one is unhovered", () => {
    const own = mountAnchor("1");
    const shared = mountAnchor("2 1");
    const { result } = renderHook(() =>
      useHighlightManagement([], 0, false, false, noThreads, noop)
    );

    act(() => {
      result.current.toggleHighlightForThreads([threadOf(1)], true);
      result.current.toggleHighlightForThreads([threadOf(2)], true);
    });
    act(() => result.current.toggleHighlightForThreads([threadOf(1)], false));

    expect(own.classList.contains("bg-highlight/70")).toBe(false);
    expect(shared.classList.contains("bg-highlight/70")).toBe(true);
  });

  it("keeps a hovered comment lit while its sheet is open, and clears it when the sheet closes", () => {
    const anchor = mountAnchor();
    const { result, rerender } = renderHook(
      ({ sheetOpen }) =>
        useHighlightManagement([], 0, false, sheetOpen, sheetThreads, noop),
      { initialProps: { sheetOpen: false } }
    );
    const lit = () => anchor.classList.contains("bg-highlight/70");

    act(() => result.current.toggleHighlightForThreads(sheetThreads, true));
    rerender({ sheetOpen: true });
    // The sheet's overlay ends the hover on the bubble
    act(() => result.current.toggleHighlightForThreads(sheetThreads, false));
    expect(lit()).toBe(true);

    rerender({ sheetOpen: false });
    expect(lit()).toBe(false);
  });
});
