import type { Comment } from "@/types";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAnchorPositioning } from "./useAnchorPositioning";

const comment = {
  comment_id: 1,
  anchor_text: "quick brown fox",
  pre_text: "The ",
  post_text: " jumps"
} as Comment;

function mountBody(html: string) {
  const body = document.createElement("article");
  body.id = "publication-body";
  body.innerHTML = html;
  document.body.appendChild(body);
  return body;
}

describe("useAnchorPositioning", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("anchors comments in a body that replaces the placeholder", async () => {
    const body = mountBody('<div aria-busy="true"></div>');
    renderHook(() => useAnchorPositioning([comment], "/p/atlas", false));
    expect(body.querySelector("#anchor-1")).toBeNull();

    body.innerHTML = "<p>The quick brown fox jumps over the lazy dog.</p>";

    await waitFor(() =>
      expect(body.querySelector("#anchor-1")?.textContent).toBe(
        "quick brown fox"
      )
    );
  });

  it("leaves the anchors alone when content deeper in the body changes", async () => {
    const body = mountBody(
      "<p>The quick brown fox jumps over the lazy dog.</p><div></div>"
    );
    const comments = [comment];
    renderHook(() => useAnchorPositioning(comments, "/p/atlas", false));
    const anchor = body.querySelector("#anchor-1");
    expect(anchor).not.toBeNull();

    body.querySelector("div")!.append(document.createElement("span"));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(body.querySelector("#anchor-1")).toBe(anchor);
  });

  it("removes the anchors and stops observing on unmount", async () => {
    const body = mountBody(
      "<p>The quick brown fox jumps over the lazy dog.</p>"
    );
    const { unmount } = renderHook(() =>
      useAnchorPositioning([comment], "/p/atlas", false)
    );
    expect(body.querySelector("#anchor-1")).not.toBeNull();

    unmount();
    expect(body.querySelector(".comment-anchor-wrapper")).toBeNull();

    body.innerHTML = "<p>The quick brown fox jumps again.</p>";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(body.querySelector(".comment-anchor-wrapper")).toBeNull();
  });
});
