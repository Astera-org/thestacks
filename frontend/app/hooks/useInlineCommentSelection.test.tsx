import FigureLegend from "@/components/myst/FigureLegend";
import { injectAnchorsIntoDom } from "@/lib/comments/inlineCommentAnchors";
import type { Comment } from "@/types";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import katex from "katex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInlineCommentSelection } from "./useInlineCommentSelection";

const originalRect = Range.prototype.getBoundingClientRect;

beforeEach(() => {
  // jsdom has no CSS Custom Highlight API
  if (typeof CSS === "undefined") vi.stubGlobal("CSS", {});
});

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Range.prototype.getBoundingClientRect = originalRect;
  document.body.innerHTML = "";
});

/** jsdom lays nothing out, so gives a selection this size, `top` down. */
function stubSelectionRect(top = 0) {
  Range.prototype.getBoundingClientRect = () =>
    ({ width: 10, height: 10, top, left: 0 }) as DOMRect;
}

function select(range: Range) {
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

/** The hook once it has read `range`, selected, and shown the bubble menu. */
async function hookWith(range: Range) {
  select(range);
  const { result } = renderHook(() => useInlineCommentSelection());
  await waitFor(() => expect(result.current.selectionRect).not.toBeNull());
  return result;
}

/** Lets the hook's 150ms selection debounce run. */
const afterDebounce = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 200)));

/** Captures the current selection as the bubble menu's click does. */
function capture() {
  const { result } = renderHook(() => useInlineCommentSelection());
  let data: ReturnType<typeof result.current.captureAndStoreSelection> = null;
  act(() => {
    data = result.current.captureAndStoreSelection();
  });
  return data as ReturnType<typeof result.current.captureAndStoreSelection>;
}

/** The comment the publication page would create from captured data. */
function commentFrom(data: { anchor: string; pre: string; post: string }) {
  return {
    comment_id: 1,
    anchor_text: data.anchor,
    pre_text: data.pre,
    post_text: data.post
  } as Comment;
}

describe("useInlineCommentSelection capture", () => {
  it("keeps the rendered text either side, so a repeated phrase anchors where it was selected", () => {
    const body = document.createElement("article");
    body.id = "publication-body";
    body.innerHTML =
      "<p>In the first trial the colony growth rate fell.</p>" +
      "<p>In the second trial the <em>colony growth rate</em> rose.</p>";
    document.body.appendChild(body);
    const second = body.querySelector("em")!;
    const range = document.createRange();
    range.selectNodeContents(second);
    select(range);

    const data = capture()!;

    expect(data).toMatchObject({
      anchor: "colony growth rate",
      pre: "In the first trial the colony growth rate fell.In the second trial the ",
      post: " rose."
    });
    injectAnchorsIntoDom(body, [commentFrom(data)]);
    expect(body.querySelector(".comment-anchor-wrapper")?.closest("em")).toBe(
      second
    );
  });

  describe("in a truncated figure legend", () => {
    // Long enough to truncate (the limit is 375 characters at full width),
    // with the words around the cut repeated throughout
    const LEGEND =
      "Opening words here. " +
      "Alpha bravo charlie delta. ".repeat(20) +
      "Tail zulu end.";

    async function renderLegend() {
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
      const cut = body.querySelector(".legend-cut p")!.firstChild as Text;
      const toggle = body.querySelector(".caption-read-all")!;
      return { body, cut, toggle };
    }

    it("leaves out the ellipsis and the toggle label, and reads on into the hidden text", async () => {
      const { body, cut, toggle } = await renderLegend();
      expect(cut.data.endsWith("…")).toBe(true);
      const cutPoint = cut.data.length - 1;
      const start = cut.data.lastIndexOf(" ", cutPoint - 12) + 1;
      // From a few words before the cut, across the ellipsis, into "Read all"
      const range = document.createRange();
      range.setStart(cut, start);
      range.setEnd(toggle, toggle.childNodes.length);
      select(range);

      const data = capture()!;

      expect(data).toMatchObject({
        anchor: LEGEND.slice(start, cutPoint),
        pre: LEGEND.slice(Math.max(0, start - 128), start),
        post: LEGEND.slice(cutPoint, cutPoint + 128),
        // Its HTML would show the ellipsis and label, so the sheet shows `anchor`
        anchorHtml: null
      });
      injectAnchorsIntoDom(body, [commentFrom(data)]);
      const wrapper = body.querySelector(".comment-anchor-wrapper");
      expect(wrapper?.closest(".legend-cut")).not.toBeNull();
      expect(wrapper?.textContent).toBe(LEGEND.slice(start, cutPoint));
    });

    it("captures nothing when only the toggle label is selected", async () => {
      const { toggle } = await renderLegend();
      const range = document.createRange();
      range.selectNodeContents(toggle);
      select(range);

      expect(capture()).toBeNull();
    });

    it("shows no bubble menu when only the toggle label is selected, even on scroll", async () => {
      stubSelectionRect();
      const { body, toggle } = await renderLegend();
      const range = document.createRange();
      range.selectNodeContents(toggle);
      select(range);
      const { result } = renderHook(() => useInlineCommentSelection());

      await afterDebounce();
      expect(result.current.selectionRect).toBeNull();
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      expect(result.current.selectionRect).toBeNull();

      // Legend text, by contrast, shows it
      const text = document.createRange();
      text.selectNodeContents(body.querySelector(".legend-cut p")!);
      await hookWith(text);
    });
  });
});

/** KaTeX's markup for `tex`: its MathML (with the TeX source), then its rendering. */
function math(tex: string, displayMode = false) {
  return katex.renderToString(tex, { displayMode, throwOnError: false });
}

function mountBody(html: string) {
  const body = document.createElement("article");
  body.id = "publication-body";
  body.innerHTML = html;
  document.body.appendChild(body);
  return body;
}

function textNodesOf(el: Element) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push(n as Text);
  }
  return nodes;
}

describe("useInlineCommentSelection with KaTeX math", () => {
  it("captures a selection across formulas as the page shows it, and anchors it there", () => {
    const body = mountBody(
      `<p>Before ${math("x^2")} the rate ${math("r_t")} rose sharply.</p>`
    );
    const [first, second] = Array.from(
      body.querySelectorAll(".katex-html"),
      (el) => el.textContent!
    );
    // "Before ", formula, " the rate ", formula, " rose sharply."
    const p = body.querySelector("p")!;
    const range = document.createRange();
    range.setStart(p.childNodes[2], " the ".length);
    range.setEnd(p.childNodes[4], " rose".length);
    select(range);

    const data = capture()!;

    expect(data).toMatchObject({
      anchor: `rate ${second} rose`,
      pre: `Before ${first} the `,
      post: " sharply."
    });
    // The formulas' HTML is kept for the comment sheet
    expect(data.anchorHtml).toContain('class="katex"');
    injectAnchorsIntoDom(body, [commentFrom(data)]);
    const wrappers = Array.from(
      body.querySelectorAll(".comment-anchor-wrapper")
    );
    expect(wrappers.map((w) => w.textContent).join("")).toBe(data.anchor);
    expect(wrappers.some((w) => w.closest(".katex-mathml"))).toBe(false);
  });

  it("anchors a comment saved with a formula's MathML on the formula, not the text after it", () => {
    const body = mountBody(
      `<p>Over the whole period the growth rate ${math("r_t = \\frac{a_t}{b_t}")} rose, then fell sharply over the following weeks.</p>`
    );
    const shown = body.querySelector(".katex-html")!.textContent!;
    const tokens = textNodesOf(body.querySelector(".katex-mathml")!)
      .filter((node) => !node.parentElement!.closest("annotation"))
      .map((node) => node.data);
    // An older anchor, as `sel.toString()` saved it: 31+ chars of prose (enough
    // for a fuzzy match alone), MathML tokens on their own lines, no TeX source
    const legacyAnchor = `the whole period the growth rate ${tokens.join("\n")}\n${shown}`;
    expect(legacyAnchor).toContain("t\n=\n");
    expect(legacyAnchor).not.toContain("\\frac");

    injectAnchorsIntoDom(body, [
      commentFrom({ anchor: legacyAnchor, pre: "", post: "" })
    ]);

    const wrappers = Array.from(
      body.querySelectorAll(".comment-anchor-wrapper")
    );
    // Zero-width spaces after the last glyph are ignored, so not wrapped
    expect(wrappers.map((w) => w.textContent).join("")).toBe(
      `the whole period the growth rate ${shown.replace(/\u200b+$/, "")}`
    );
    expect(wrappers.some((w) => w.closest(".katex-mathml"))).toBe(false);
  });

  it("anchors a comment Chrome saved on a formula, with math-italic MathML tokens", () => {
    const body = mountBody(
      `<p>${math("\\text{predicted}(AA_1 - AA_2) = L_2(L_2(AA_1) + L_2(AA_2) - 2 \\cdot L_2(Gly) + L_2(\\text{Gly–Gly}))")}, which subtracts two free-glycine spectra.</p>`
    );
    // Verbatim from staging (comment 17749): MathML tokens, then the formula
    const anchor =
      "predicted\n(\n𝐴\n𝐴\n1\n−\n𝐴\n𝐴\n2\n)\n=\n𝐿\n2\n(\n𝐿\n2\n(\n𝐴\n𝐴\n1\n)\n+\n𝐿\n2\n(\n𝐴\n𝐴\n2\n)\n−\n2\n⋅\n𝐿\n2\n(\n𝐺\n𝑙\n𝑦\n)\n+\n𝐿\n2\n(\nGly–Gly\n)\n)\npredicted(AA1−AA2)=L2(L2(AA1)+L2(AA2)−2⋅L2(Gly)+L2(Gly–Gly))";

    injectAnchorsIntoDom(body, [
      {
        comment_id: 1,
        anchor_text: anchor,
        pre_text: null,
        post_text: null
      } as Comment
    ]);

    const wrappers = Array.from(
      body.querySelectorAll(".comment-anchor-wrapper")
    );
    expect(wrappers.map((w) => w.textContent).join("")).toBe(
      body.querySelector(".katex-html")!.textContent
    );
    expect(wrappers.some((w) => w.closest(".katex-mathml"))).toBe(false);
  });

  describe("validation", () => {
    beforeEach(() => stubSelectionRect());

    async function validationOf(range: Range) {
      return (await hookWith(range)).current.selectionValidation;
    }

    it("repositions the menu on scroll without reading the publication's text again", async () => {
      const body = mountBody("<p>The quick brown fox jumps.</p>");
      const range = document.createRange();
      range.selectNodeContents(body.querySelector("p")!);
      const result = await hookWith(range);
      // `collectText()` and `textNodesIn()` both walk the text this way
      const walkers = vi.spyOn(document, "createTreeWalker");
      stubSelectionRect(50);

      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      expect(result.current.selectionRect?.top).toBe(50);
      expect(walkers).not.toHaveBeenCalled();
    });

    it("hides the menu while a selection extended past the limit is validated", async () => {
      const body = mountBody(`<p>${"word ".repeat(300)}</p>`);
      const text = body.querySelector("p")!.firstChild as Text;
      const short = document.createRange();
      short.setStart(text, 0);
      short.setEnd(text, 9);
      const result = await hookWith(short);
      expect(result.current.selectionValidation.disabled).toBe(false);

      // Extended past the limit from the keyboard, then scrolled before the
      // debounce reads it
      const long = document.createRange();
      long.selectNodeContents(text);
      stubSelectionRect(50);
      act(() => {
        select(long);
        document.dispatchEvent(new Event("selectionchange"));
        window.dispatchEvent(new Event("scroll"));
      });
      expect(result.current.selectionRect).toBeNull();

      await afterDebounce();
      expect(result.current.selectionRect?.top).toBe(50);
      expect(result.current.selectionValidation).toEqual({
        disabled: true,
        reason: `${text.data.trim().length} / 1024 characters`
      });
    });

    const CROSSES_BLOCK = {
      disabled: true,
      reason:
        "Sorry, inline comments can only be added to text in the same paragraph."
    };

    /** A paragraph of `count` formulas, selected whole. */
    function formulasSelected(count: number) {
      const formulas = Array.from({ length: count }, (_, i) =>
        math(`\\alpha_{${i}}`)
      ).join(" ");
      const body = mountBody(`<p>${formulas}</p>`);
      const range = document.createRange();
      range.selectNodeContents(body.querySelector("p")!);
      const shown = Array.from(
        body.querySelectorAll(".katex-html"),
        (el) => el.textContent
      ).join(" ");
      return { range, shown };
    }

    it("measures the length without the formulas' MathML and TeX source", async () => {
      const { range, shown } = formulasSelected(80);
      // What the browser's selection reads is over the limit, what it shows isn't
      expect(range.toString().length).toBeGreaterThan(1024);
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.length).toBeLessThanOrEqual(1024);

      const result = await hookWith(range);

      expect(result.current.selectionValidation).toEqual({
        disabled: false,
        reason: null
      });
      let data: ReturnType<typeof result.current.captureAndStoreSelection> =
        null;
      act(() => {
        data = result.current.captureAndStoreSelection();
      });
      expect(data).toMatchObject({ anchor: shown });
    });

    it("rejects formulas whose shown text is over the limit", async () => {
      const { range, shown } = formulasSelected(300);
      expect(shown.length).toBeGreaterThan(1024);

      expect(await validationOf(range)).toEqual({
        disabled: true,
        reason: `${shown.length} / 1024 characters`
      });
    });

    it("rejects a selection from a paragraph into display math", async () => {
      // As MystRenderer renders, everything in one wrapper
      const body = mountBody(
        `<div><p>The energy is</p>${math("E = mc^2", true)}</div>`
      );
      const formula = textNodesOf(body.querySelector(".katex-html")!);
      const end = formula[formula.length - 1];
      const range = document.createRange();
      range.setStart(body.querySelector("p")!.firstChild!, 4);
      range.setEnd(end, end.length);

      expect(await validationOf(range)).toEqual(CROSSES_BLOCK);
    });

    it("allows a selection from a MyST equation's formula to its number", async () => {
      const body = mountBody(
        `<div class="mystmd-math"><div>${math("E = mc^2", true)}</div>` +
          `<span class="mystmd-equation-number">(1)</span></div>`
      );
      const [start] = textNodesOf(body.querySelector(".katex-html")!);
      const number = body.querySelector(".mystmd-equation-number")!.firstChild!;
      const range = document.createRange();
      range.setStart(start, 0);
      range.setEnd(number, 3);

      expect(await validationOf(range)).toEqual({
        disabled: false,
        reason: null
      });
    });
  });
});
