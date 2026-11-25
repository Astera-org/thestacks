import FigureLegend from "@/components/myst/FigureLegend";
import { findAnchorElement } from "@/lib/comments/commentThreadData";
import type { Comment } from "@/types";
import { render, waitFor } from "@testing-library/react";
import katex from "katex";
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectAnchorsIntoDom, unwrapAnchors } from "./inlineCommentAnchors";
import { revealCommentAnchor } from "./revealCommentAnchor";

const SENTENCE = "The quick brown fox jumps over the lazy dog.";
const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  document.body.innerHTML = "";
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

/** A comment on `text` from `start` to `end`, with the context a capture saves. */
function commentAt(id: number, text: string, start: number, end: number) {
  return {
    comment_id: id,
    anchor_text: text.slice(start, end),
    pre_text: text.slice(Math.max(0, start - 128), start),
    post_text: text.slice(end, end + 128)
  } as Comment;
}

function commentOn(id: number, phrase: string) {
  const start = SENTENCE.indexOf(phrase);
  return commentAt(id, SENTENCE, start, start + phrase.length);
}

function mountSentence() {
  const body = document.createElement("article");
  body.id = "publication-body";
  body.innerHTML = `<p>${SENTENCE}</p>`;
  document.body.appendChild(body);
  return body;
}

/** Each wrapper in page order, as [its text, its `data-comment-ids`]. */
const piecesIn = (root: Element) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(".comment-anchor-wrapper"),
    (w) => [w.textContent, w.dataset.commentIds]
  );

const piecesOf = (root: Element, id: number) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      `.comment-anchor-wrapper[data-comment-ids~="${id}"]`
    )
  );

const textOf = (root: Element, id: number) =>
  piecesOf(root, id)
    .map((w) => w.textContent)
    .join("");

describe("injectAnchorsIntoDom with overlapping comments", () => {
  it("wraps each of two overlapping comments, and unwraps to the text as it was", () => {
    const body = mountSentence();

    injectAnchorsIntoDom(body, [
      commentOn(1, "quick brown fox"),
      commentOn(2, "brown fox jumps")
    ]);

    expect(piecesIn(body)).toEqual([
      ["quick ", "1"],
      ["brown fox", "1 2"],
      [" jumps", "2"]
    ]);
    expect(textOf(body, 1)).toBe("quick brown fox");
    expect(textOf(body, 2)).toBe("brown fox jumps");
    expect(findAnchorElement(1)?.textContent).toBe("quick ");
    expect(findAnchorElement(2)?.textContent).toBe("brown fox");

    unwrapAnchors(body);
    const p = body.querySelector("p")!;
    expect(p.childNodes).toHaveLength(1);
    expect(p.textContent).toBe(SENTENCE);
  });

  it("wraps a comment inside another, listing the inner one first, and scrolls to each one's start", async () => {
    const body = mountSentence();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    injectAnchorsIntoDom(body, [
      commentOn(1, "quick brown fox jumps over"),
      commentOn(2, "brown fox")
    ]);

    expect(piecesIn(body)).toEqual([
      ["quick ", "1"],
      // Innermost first, so a tap on it opens comment 2
      ["brown fox", "2 1"],
      [" jumps over", "1"]
    ]);
    expect(textOf(body, 1)).toBe("quick brown fox jumps over");
    expect(await revealCommentAnchor(1)).toBe(true);
    expect(scrollIntoView.mock.contexts[0]).toHaveProperty(
      "textContent",
      "quick "
    );
  });

  it("finds the shared first piece of comments that start together", () => {
    const body = mountSentence();

    injectAnchorsIntoDom(body, [
      commentOn(1, "quick brown"),
      commentOn(2, "quick brown fox")
    ]);

    expect(piecesIn(body)).toEqual([
      ["quick brown", "1 2"],
      [" fox", "2"]
    ]);
    expect(findAnchorElement(1)?.textContent).toBe("quick brown");
    expect(findAnchorElement(2)?.textContent).toBe("quick brown");
  });

  it("splits a comment on a formula, found through its MathML, where a plain one overlaps it", () => {
    const body = document.createElement("article");
    body.id = "publication-body";
    body.innerHTML = `<p>Over the whole period the growth rate ${katex.renderToString(
      "r_t = \\frac{a_t}{b_t}",
      { throwOnError: false }
    )} rose, then fell sharply over the following weeks.</p>`;
    document.body.appendChild(body);
    const original = body.innerHTML;
    const shown = body.querySelector(".katex-html")!.textContent!;
    const tokens = Array.from(
      body.querySelectorAll(".katex-mathml *:not(annotation)"),
      (el) => (el.children.length === 0 ? el.textContent : null)
    ).filter((t): t is string => !!t);
    // An older anchor, as `sel.toString()` saved it, with the MathML's tokens:
    // only the MathML-aware locator finds it exactly
    const onFormula = {
      comment_id: 1,
      anchor_text: `the whole period the growth rate ${tokens.join("\n")}\n${shown}`,
      pre_text: "",
      post_text: ""
    } as Comment;
    const pastFormula = {
      comment_id: 2,
      anchor_text: `growth rate ${shown} rose, then fell`,
      pre_text: "Over the whole period the ",
      post_text: " sharply over the following weeks."
    } as Comment;

    injectAnchorsIntoDom(body, [onFormula, pastFormula]);

    // Zero-width spaces after the formula's last glyph aren't in comment 1
    const formula = shown.replace(/\u200b+$/, "");
    expect(textOf(body, 1)).toBe(`the whole period the growth rate ${formula}`);
    expect(textOf(body, 2)).toBe(pastFormula.anchor_text);
    // The shared piece, across the formula, lists the shorter comment 2 first
    const shared = Array.from(
      body.querySelectorAll<HTMLElement>(
        '.comment-anchor-wrapper[data-comment-ids="2 1"]'
      ),
      (w) => w.textContent
    ).join("");
    expect(shared).toBe(`growth rate ${formula}`);
    expect(
      body.querySelector(".katex-mathml .comment-anchor-wrapper")
    ).toBeNull();
    expect(findAnchorElement(1)?.textContent).toBe("the whole period the ");
    expect(findAnchorElement(2)?.textContent).toBe("growth rate ");

    unwrapAnchors(body);
    expect(body.innerHTML).toBe(original);
  });

  it("keeps a comment the legend shows in its cut copy, and one running past the cut in the hidden text", async () => {
    // Long enough to truncate (the limit is 375 characters at full width),
    // with no repeats, so each comment's text is found in one place
    const LEGEND = Array.from(
      { length: 20 },
      (_, i) => `Panel ${i + 1} shows sample ${i * 7 + 3} at day ${i + 2}.`
    ).join(" ");
    const view = render(
      <article id="publication-body">
        <figure>
          <FigureLegend className="figure-legend">
            <p>{LEGEND}</p>
          </FigureLegend>
        </figure>
      </article>
    );
    const body =
      view.container.querySelector<HTMLElement>("#publication-body")!;
    await waitFor(() =>
      expect(body.querySelector(".caption-read-all")).not.toBeNull()
    );
    // The cut copy shows the legend up to here, then "…"
    const cutPoint =
      body.querySelector(".legend-cut p")!.textContent!.length - 1;
    const shown = commentAt(1, LEGEND, cutPoint - 30, cutPoint - 5);
    const pastCut = commentAt(2, LEGEND, cutPoint - 15, cutPoint + 20);

    injectAnchorsIntoDom(body, [shown, pastCut]);

    expect(textOf(body, 1)).toBe(shown.anchor_text);
    expect(textOf(body, 2)).toBe(pastCut.anchor_text);
    expect(
      piecesOf(body, 1).every((w) => w.closest(".legend-cut") != null)
    ).toBe(true);
    expect(
      piecesOf(body, 2).every((w) => w.closest(".legend-rest") != null)
    ).toBe(true);
  });
});
