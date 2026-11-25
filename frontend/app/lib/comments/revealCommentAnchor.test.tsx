import FigureLegend from "@/components/myst/FigureLegend";
import { useAnchorPositioning } from "@/hooks/useAnchorPositioning";
import { findBubbleTarget } from "@/lib/comments/commentThreadData";
import { injectAnchorsIntoDom } from "@/lib/comments/inlineCommentAnchors";
import type { Comment } from "@/types";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revealCommentAnchor } from "./revealCommentAnchor";

// Long enough to truncate (the limit is 375 characters at full width)
const LEGEND =
  "Opening words here. " +
  "Alpha bravo charlie delta. ".repeat(20) +
  "Tail zulu end.";

const visibleComment = {
  comment_id: 1,
  anchor_text: "Opening words",
  pre_text: "",
  post_text: " here."
} as Comment;

const hiddenComment = {
  comment_id: 2,
  anchor_text: "Tail zulu end",
  pre_text: "charlie delta. ",
  post_text: "."
} as Comment;

// Text followed by an element, so React keeps the text in its own node, as
// it does for most captions. Split through the `split` prop, as MyST figures
// are.
function Paragraph({ text }: { text: string }) {
  return (
    <p>
      {text}
      <em> Scale bar.</em>
    </p>
  );
}

function AstLegend() {
  return (
    <FigureLegend
      className="figure-legend"
      split={(maxChars) => ({
        head: null,
        cut: <Paragraph text={`${LEGEND.slice(0, maxChars)}…`} />,
        rest: <Paragraph text={LEGEND} />
      })}
    >
      <Paragraph text={LEGEND} />
    </FigureLegend>
  );
}

// One paragraph per panel, split through the default ReactNode split, as
// Google Docs figures are. At this figure width it shows "(D) Variance…",
// so (C)'s "sensitivity PCA" stays visible while (D)'s is hidden.
const PANELS = [
  "(A–B) PCA of ELM sensitivity values from 8,000 validation set samples from the 30C growth environment with strain fitness (A) and parental ancestry fraction (B) overlaid.",
  "(C) Variance in fitness captured by PC1 and PC2 of each environment-specific sensitivity PCA.",
  "(D) Variance in parental ancestry fraction captured by PC1 and PC2 of each environment-specific sensitivity PCA."
];

function PanelsLegend() {
  return (
    <>
      {/* The width format mystRenderer writes, set as an attribute because
          jsdom's CSS parser drops it */}
      <img
        alt=""
        ref={(img) =>
          img?.setAttribute(
            "style",
            "width: min(calc(0.92 * var(--figure-max-w)), 100cqi)"
          )
        }
      />
      <FigureLegend className="figure-legend">
        {PANELS.map((panel) => (
          <p key={panel}>{panel}</p>
        ))}
      </FigureLegend>
    </>
  );
}

function Page({
  comments,
  legend
}: {
  comments: Comment[];
  legend: ReactNode;
}) {
  useAnchorPositioning(comments, "/p/atlas", false);
  return (
    <article id="publication-body">
      <figure>{legend}</figure>
    </article>
  );
}

/** Renders the page, then loads the comments once the legend has truncated. */
async function renderPage(comments: Comment[], legend: ReactNode) {
  const view = render(<Page comments={[]} legend={legend} />);
  const legendEl = view.container.querySelector<HTMLElement>(".figure-legend")!;
  await waitFor(() =>
    expect(legendEl.querySelector(".caption-read-all")).not.toBeNull()
  );
  view.rerender(<Page comments={comments} legend={legend} />);
  await nextFrames();
  return { legend: legendEl };
}

/** Lets an injection scheduled for the next frame run. */
async function nextFrames() {
  for (let i = 0; i < 2; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

const detailsComment = {
  comment_id: 3,
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

/** Whether `el` is in the part of a truncated legend that's hidden. */
const isHidden = (el: Element | null) =>
  el?.closest('.legend-rest[hidden="until-found"]') != null;

const anchorFor = (comment: Comment) =>
  document.querySelector<HTMLElement>(
    `.comment-anchor-wrapper[data-comment-ids~="${comment.comment_id}"]`
  );

const scrollIntoView = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  scrollIntoView.mockClear();
  document.body.innerHTML = "";
});

describe("comment anchors in figure legends", () => {
  it("keeps the legend's text intact when an anchored legend expands", async () => {
    const view = render(
      <Page comments={[visibleComment]} legend={<AstLegend />} />
    );
    const legend = view.container.querySelector<HTMLElement>(".figure-legend")!;
    await waitFor(() => expect(anchorFor(visibleComment)).not.toBeNull());
    expect(legend.contains(anchorFor(visibleComment))).toBe(true);

    fireEvent.click(legend.querySelector(".caption-read-all")!);

    await waitFor(() =>
      expect(legend.querySelector("p")?.textContent).toBe(
        `${LEGEND} Scale bar.`
      )
    );
  });

  it("keeps the hidden text in the page, for find in page", async () => {
    const { legend } = await renderPage([], <AstLegend />);

    const rest = legend.querySelector(".legend-rest");
    expect(rest?.getAttribute("hidden")).toBe("until-found");
    expect(rest?.textContent).toBe(`${LEGEND} Scale bar.`);
  });

  it("expands the legend when find in page reveals its hidden text", async () => {
    const { legend } = await renderPage([], <AstLegend />);
    const rest = legend.querySelector(".legend-rest")!;

    // What find in page does on a match in hidden="until-found" text
    rest.removeAttribute("hidden");
    fireEvent(rest, new Event("beforematch", { bubbles: true }));

    await waitFor(() =>
      expect(
        legend.querySelector(".caption-read-all")?.getAttribute("aria-expanded")
      ).toBe("true")
    );
    expect(legend.querySelector(".legend-cut")).toBeNull();
    expect(rest.hasAttribute("hidden")).toBe(false);
  });

  it("anchors a comment in the hidden text, out of sight", async () => {
    const { legend } = await renderPage([hiddenComment], <AstLegend />);

    expect(anchorFor(hiddenComment)?.textContent).toBe("Tail zulu end");
    expect(isHidden(anchorFor(hiddenComment))).toBe(true);

    fireEvent.click(legend.querySelector(".caption-read-all")!);

    await waitFor(() => expect(isHidden(anchorFor(hiddenComment))).toBe(false));
    expect(anchorFor(hiddenComment)?.textContent).toBe("Tail zulu end");
  });

  it("anchors a comment in the shown start of a truncated legend where it's shown", async () => {
    const comment = { ...visibleComment, post_text: "" } as Comment;
    const { legend } = await renderPage([comment], <AstLegend />);

    const anchor = anchorFor(comment);
    expect(anchor?.textContent).toBe("Opening words");
    expect(anchor?.closest(".legend-cut")).not.toBeNull();
    expect(legend.querySelectorAll(".comment-anchor-wrapper")).toHaveLength(1);
  });

  it("anchors a comment running past the cut in the hidden text", async () => {
    // (D) is cut to "(D) Variance…", so this runs past what the copy shows
    const comment = {
      comment_id: 7,
      anchor_text: "Variance in parental",
      pre_text: "(D) ",
      post_text: ""
    } as Comment;
    const { legend } = await renderPage([comment], <PanelsLegend />);
    expect(legend.querySelector(".legend-cut")?.textContent).toBe(
      "(D) Variance…"
    );

    expect(anchorFor(comment)?.textContent).toBe("Variance in parental");
    expect(isHidden(anchorFor(comment))).toBe(true);
  });

  it("lines a hidden comment's bubble up with Read all, and a shown one's with its text", async () => {
    const shown = { ...visibleComment, post_text: "" } as Comment;
    const { legend } = await renderPage([hiddenComment, shown], <AstLegend />);

    expect(findBubbleTarget(anchorFor(hiddenComment)!)).toBe(
      legend.querySelector(".caption-read-all")
    );
    expect(findBubbleTarget(anchorFor(shown)!)).toBe(anchorFor(shown));
  });

  it("anchors comments on panels before the cut where they're shown", async () => {
    const comment = {
      comment_id: 8,
      anchor_text: "strain fitness (A)",
      pre_text: "",
      post_text: ""
    } as Comment;
    await renderPage([comment], <PanelsLegend />);

    expect(anchorFor(comment)).not.toBeNull();
    expect(isHidden(anchorFor(comment))).toBe(false);
    expect(anchorFor(comment)?.closest(".legend-cut")).toBeNull();
  });

  it("doesn't attach a comment on hidden text to a lookalike that's shown", async () => {
    // (A–B)'s "parental ancestry fraction (B)" is close enough for the
    // fuzzy match when (D)'s text isn't counted
    const comment = {
      comment_id: 4,
      anchor_text: "parental ancestry fraction captured",
      pre_text: "",
      post_text: ""
    } as Comment;
    const { legend } = await renderPage([comment], <PanelsLegend />);
    expect(legend.querySelector(".legend-cut")?.textContent).toBe(
      "(D) Variance…"
    );

    expect(isHidden(anchorFor(comment))).toBe(true);
    expect(anchorFor(comment)?.closest("p")?.textContent).toMatch(/^\(D\)/);
  });

  it("doesn't attach a comment on a hidden repeat of shown text to the shown copy", async () => {
    // A comment on (D)'s "sensitivity PCA", which (C) also ends with
    const comment = {
      comment_id: 5,
      anchor_text: "sensitivity PCA",
      pre_text:
        "(D) Variance in parental ancestry fraction captured by PC1 and PC2 of each environment-specific ",
      post_text: "."
    } as Comment;
    await renderPage([comment], <PanelsLegend />);

    expect(isHidden(anchorFor(comment))).toBe(true);

    expect(await revealCommentAnchor(comment.comment_id)).toBe(true);
    expect(anchorFor(comment)?.closest("p")?.textContent).toMatch(/^\(D\)/);
  });
});

describe("revealCommentAnchor", () => {
  it("expands the truncated legend hiding the comment and scrolls it to center", async () => {
    const { legend } = await renderPage([hiddenComment], <AstLegend />);
    expect(isHidden(anchorFor(hiddenComment))).toBe(true);

    // Not inside act(), which would hold the legend's expansion until the
    // reveal, which waits on it, had finished
    expect(await revealCommentAnchor(hiddenComment.comment_id)).toBe(true);

    expect(
      legend.querySelector(".caption-read-all")?.getAttribute("aria-expanded")
    ).toBe("true");
    const anchor = anchorFor(hiddenComment);
    expect(anchor?.textContent).toBe("Tail zulu end");
    expect(isHidden(anchor)).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(anchor);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center"
    });
  });

  it("waits for the legend hiding the comment to appear, as on a deep link's first render", async () => {
    // Started before the body renders, like a deep link whose comments load
    // first; the comments then arrive with the body, before it truncates
    const revealing = revealCommentAnchor(hiddenComment.comment_id);
    const view = render(
      <Page comments={[hiddenComment]} legend={<AstLegend />} />
    );
    const legend = view.container.querySelector<HTMLElement>(".figure-legend")!;

    expect(await revealing).toBe(true);
    expect(
      legend.querySelector(".caption-read-all")?.getAttribute("aria-expanded")
    ).toBe("true");
    expect(scrollIntoView.mock.contexts[0]).toBe(anchorFor(hiddenComment));
  });

  it("reveals the comment again after the legend is collapsed by hand", async () => {
    const comment = {
      comment_id: 6,
      anchor_text: "parental ancestry fraction captured",
      pre_text: "",
      post_text: ""
    } as Comment;
    const { legend } = await renderPage([comment], <PanelsLegend />);
    expect(await revealCommentAnchor(comment.comment_id)).toBe(true);

    fireEvent.click(legend.querySelector(".caption-read-all")!);
    await nextFrames();
    expect(legend.querySelector(".legend-cut")?.textContent).toBe(
      "(D) Variance…"
    );
    expect(isHidden(anchorFor(comment))).toBe(true);

    expect(await revealCommentAnchor(comment.comment_id)).toBe(true);
    expect(anchorFor(comment)?.closest("p")?.textContent).toMatch(/^\(D\)/);
  });

  it("stops waiting for the anchor when the signal aborts", async () => {
    const controller = new AbortController();
    const revealing = revealCommentAnchor(
      detailsComment.comment_id,
      controller.signal
    );

    controller.abort();
    // The anchor appears after the abort, within the retry window
    injectAnchorsIntoDom(mountBody("<p>The quick brown fox jumps.</p>"), [
      detailsComment
    ]);

    expect(await revealing).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("doesn't expand a legend that appears after the signal aborts", async () => {
    const controller = new AbortController();
    let outcome: boolean | undefined;
    void revealCommentAnchor(hiddenComment.comment_id, controller.signal).then(
      (revealed) => (outcome = revealed)
    );

    controller.abort();
    // The legend hiding the comment appears within the retry window
    const { legend } = await renderPage([hiddenComment], <AstLegend />);

    // Settled by the abort: a reveal still retrying would be pending until
    // its next attempt, and with none left, nothing can expand the legend
    expect(outcome).toBe(false);
    expect(
      legend.querySelector(".caption-read-all")?.getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("doesn't open a <details> when the signal aborts after the anchor is found", async () => {
    const body = mountBody(
      "<details><summary>Methods</summary><p>The quick brown fox jumps.</p></details>"
    );
    HTMLElement.prototype.getAnimations = () => [];
    injectAnchorsIntoDom(body, [detailsComment]);
    const controller = new AbortController();

    // The anchor is found on the first, synchronous attempt; the abort lands
    // before the reveal resumes
    const revealing = revealCommentAnchor(
      detailsComment.comment_id,
      controller.signal
    );
    controller.abort();

    expect(await revealing).toBe(false);
    expect(body.querySelector("details")?.open).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("doesn't expand a legend when the signal aborts after the legend is found", async () => {
    const { legend } = await renderPage([hiddenComment], <AstLegend />);
    const controller = new AbortController();

    const revealing = revealCommentAnchor(
      hiddenComment.comment_id,
      controller.signal
    );
    controller.abort();

    expect(await revealing).toBe(false);
    // Lets an expansion, had one been requested, render
    await nextFrames();
    expect(
      legend.querySelector(".caption-read-all")?.getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("doesn't start when the signal has already aborted", async () => {
    injectAnchorsIntoDom(mountBody("<p>The quick brown fox jumps.</p>"), [
      detailsComment
    ]);

    expect(
      await revealCommentAnchor(detailsComment.comment_id, AbortSignal.abort())
    ).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("doesn't scroll an anchor removed while its section opens", async () => {
    const body = mountBody(
      "<details><summary>Methods</summary><p>The quick brown fox jumps.</p></details>"
    );
    injectAnchorsIntoDom(body, [detailsComment]);
    let finishOpening = () => {};
    const opening = new Promise<void>((resolve) => (finishOpening = resolve));
    HTMLElement.prototype.getAnimations = () =>
      [{ finished: opening }] as unknown as Animation[];

    const revealing = revealCommentAnchor(detailsComment.comment_id);
    body.remove();
    finishOpening();

    expect(await revealing).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("opens a collapsed <details> holding the comment before scrolling", async () => {
    const body = mountBody(
      "<details><summary>Methods</summary><p>The quick brown fox jumps.</p></details>"
    );
    // jsdom has no Web Animations API
    HTMLElement.prototype.getAnimations = () => [];
    injectAnchorsIntoDom(body, [detailsComment]);

    expect(await revealCommentAnchor(detailsComment.comment_id)).toBe(true);

    expect(body.querySelector("details")?.open).toBe(true);
    expect(scrollIntoView.mock.contexts[0]).toBe(anchorFor(detailsComment));
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center"
    });
  });
});
