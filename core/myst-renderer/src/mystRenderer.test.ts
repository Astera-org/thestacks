import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import {
  Platform,
  mystToHtml,
  normalizeEmphasisUnderscores,
  rehypeFigureActionButtons,
  rehypeTableEdgeCells,
} from "./mystRenderer";

describe("rehypeFigureActionButtons", () => {
  const figureTree = (mediaStyle?: string) => ({
    type: "root",
    children: [
      {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "video",
            properties: mediaStyle ? { style: mediaStyle } : {},
            children: [],
          },
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: "caption" }],
          },
        ],
      },
    ],
  });

  const wrapperOf = (tree: any) => tree.children[0].children[0].properties;

  it("marks media given an explicit width with data-sized so the caption can track it", () => {
    const tree = figureTree(
      "width:min(calc(0.6 * var(--figure-max-w)), 100cqi)",
    );
    rehypeFigureActionButtons()(tree);
    const props = wrapperOf(tree);

    expect(props.className).toContain("figure-action-target");
    expect(props["data-media-type"]).toBe("video");
    expect(props["data-sized"]).toBe("true");
  });

  it("leaves full-width media (no explicit width) without data-sized", () => {
    const tree = figureTree();
    rehypeFigureActionButtons()(tree);
    const props = wrapperOf(tree);

    expect(props["data-media-type"]).toBe("video");
    expect(props["data-sized"]).toBeUndefined();
  });

  it("leaves width:100% media (e.g. iframes) without data-sized so it stays full-width", () => {
    const tree = figureTree("width:100%;aspect-ratio:16/9");
    rehypeFigureActionButtons()(tree);
    const props = wrapperOf(tree);

    expect(props["data-sized"]).toBeUndefined();
  });
});

describe("rehypeTableEdgeCells", () => {
  const edgesOf = (html: string) => {
    const tree = fromHtml(html, { fragment: true });
    rehypeTableEdgeCells()(tree);

    const edges = new Map<string, string[]>();
    visit(tree, "element", (node: any) => {
      if (node.tagName !== "td" && node.tagName !== "th") return;
      const text = (node.children || [])
        .map((c: any) => (c.type === "text" ? c.value : ""))
        .join("")
        .trim();
      edges.set(
        text,
        ((node.properties?.className || []) as string[]).filter((c) =>
          c.startsWith("table-edge-"),
        ),
      );
    });
    return edges;
  };

  it("opens the outer edges of a plain grid", () => {
    const edges = edgesOf(
      `<table><thead><tr><th>h1</th><th>h2</th></tr></thead>
       <tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>`,
    );

    expect(edges.get("h1")).toEqual(["table-edge-top", "table-edge-left"]);
    expect(edges.get("h2")).toEqual(["table-edge-top", "table-edge-right"]);
    expect(edges.get("a")).toEqual(["table-edge-left"]);
    expect(edges.get("c")).toEqual(["table-edge-bottom", "table-edge-left"]);
    expect(edges.get("d")).toEqual(["table-edge-bottom", "table-edge-right"]);
  });

  it("marks a cell that spans into the bottom row, though it sits in an earlier row", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td rowspan="2">span</td><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody></table>`,
    );

    expect(edges.get("span")).toContain("table-edge-bottom");
    expect(edges.get("b")).toContain("table-edge-bottom");
    expect(edges.get("b")).not.toContain("table-edge-left");
  });

  it("marks a cell that spans into the last column", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td>a</td><td colspan="2">wide</td></tr>
        <tr><td>b</td><td>c</td><td>d</td></tr>
      </tbody></table>`,
    );

    expect(edges.get("wide")).toEqual(["table-edge-top", "table-edge-right"]);
    expect(edges.get("c")).toEqual(["table-edge-bottom"]);
  });

  it("leaves a short row's last cell with its right border", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td>a</td><td>b</td><td>c</td></tr>
        <tr><td>d</td><td>e</td></tr>
      </tbody></table>`,
    );

    expect(edges.get("e")).toEqual(["table-edge-bottom"]);
  });

  it("keeps a row group's spans out of the next group", () => {
    const edges = edgesOf(
      `<table>
        <thead><tr><th rowspan="3">h</th><th>h2</th></tr></thead>
        <tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody>
      </table>`,
    );

    expect(edges.get("h")).not.toContain("table-edge-bottom");
    expect(edges.get("a")).toContain("table-edge-left");
    expect(edges.get("c")).toEqual(["table-edge-bottom", "table-edge-left"]);
  });

  it("treats rowspan=0 as running to the end of the row group", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td rowspan="0">tall</td><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody></table>`,
    );

    expect(edges.get("tall")).toContain("table-edge-bottom");
    expect(edges.get("b")).not.toContain("table-edge-left");
  });

  it("clamps oversized spans instead of walking a giant grid", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td rowspan="99999" colspan="99999">huge</td><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody></table>`,
    );

    expect(edges.get("huge")).toEqual([
      "table-edge-top",
      "table-edge-bottom",
      "table-edge-left",
    ]);
  });

  it("puts a tfoot written before the tbody on the bottom edge", () => {
    const edges = edgesOf(
      `<table>
        <tfoot><tr><td>foot</td></tr></tfoot>
        <tbody><tr><td>body</td></tr></tbody>
      </table>`,
    );

    expect(edges.get("foot")).toContain("table-edge-bottom");
    expect(edges.get("foot")).not.toContain("table-edge-top");
    expect(edges.get("body")).toContain("table-edge-top");
    expect(edges.get("body")).not.toContain("table-edge-bottom");
  });

  it("keeps nested table edges separate from the outer table", () => {
    const edges = edgesOf(
      `<table><tbody>
        <tr><td>outer<table><tbody><tr><td>inner</td></tr></tbody></table></td></tr>
      </tbody></table>`,
    );

    expect(edges.get("inner")).toEqual([
      "table-edge-top",
      "table-edge-bottom",
      "table-edge-left",
      "table-edge-right",
    ]);
  });
});

describe("normalizeEmphasisUnderscores", () => {
  it("switches to asterisks when a non-ASCII letter follows the span", () => {
    expect(normalizeEmphasisUnderscores("_dea2_\u0394 value")).toBe(
      "*dea2*\u0394 value",
    );
  });

  // Sentences from a Google Doc import where a match used to start at the
  // closing `_` of `_n_` and run across paragraphs to the `_` before `η`.
  it("does not start a match at the closing underscore of a span", () => {
    const myst =
      "Nulls were pooled by retained subspace signature (_n_, dimension), " +
      "with 60 null draws per signature.\n\n" +
      "We computed trait-wise clade _\u03b7_<sup>2</sup> for each phenotype " +
      "layer. For each trait, _\u03b7_<sup>2</sup> was the fraction.";
    expect(normalizeEmphasisUnderscores(myst)).toBe(myst);
  });

  it("does not match across lines", () => {
    const myst = "Signature (_n_, dimension)\n_\u03b7_ and _x_\u0394";
    expect(normalizeEmphasisUnderscores(myst)).toBe(
      "Signature (_n_, dimension)\n_\u03b7_ and *x*\u0394",
    );
  });

  it.each([
    ["a non-breaking space", "_S. cerevisiae_\u00a0isolates"],
    ["an em dash", "_K_\u2014the number of clades"],
    ["an ASCII letter", "_foo_bar"],
    ["a word before the opening underscore", "snake_case_\u0394"],
  ])("leaves the span alone before %s", (_, myst) => {
    expect(normalizeEmphasisUnderscores(myst)).toBe(myst);
  });
});

describe("mystToHtml", () => {
  it("keeps italics intact around later Greek-letter italics", () => {
    const html = mystToHtml({
      myst:
        "Pooled by signature (_n_, dimension).\n\n" +
        "Clade _\u03b7_<sup>2</sup> per layer; for each trait, _\u03b7_<sup>2</sup> was used.",
    });

    expect(html).toContain("(<em>n</em>, dimension)");
    expect(html.match(/<em>\u03b7<\/em><sup>2<\/sup>/g)).toHaveLength(2);
    expect(html).not.toMatch(/[_*]n[_*]|\*\u03b7|\u03b7_/);
  });

  describe("remarkDemathifyAccidents", () => {
    it.each(["$X$", "$\\mathrm H$"])("renders inline math: %s", (math) => {
      const html = mystToHtml({ myst: math });

      // Surrounding text is preserved before/after the math span.
      expect(html).toContain('<span class="katex">');
    });

    it("demathifies if there's trailing space between $...$", () => {
      const html = mystToHtml({ myst: "$20-40k vs. $200k" });

      // Output should not contain KaTeX-rendered math.
      expect(html).not.toMatch(/class="[^"]*\bkatex\b/);

      // Output should contain the literal dollar signs.
      expect(html).toContain("$20-40k vs. $200k");
    });
  });

  describe("rehypeStripIframeSrcDoc", () => {
    it("strips srcdoc from a raw-HTML iframe so it can't inject a script", () => {
      const html = mystToHtml({
        myst: '<iframe src="https://example.com" srcdoc="<script>alert(1)</script>"></iframe>',
      });

      expect(html).not.toContain("srcdoc");
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain('src="https://example.com"');
    });

    it("doesn't affect directive-authored iframes, which never set srcdoc", () => {
      const html = mystToHtml({
        myst: ':::iframe{src="https://example.com"}\n:::',
      });

      expect(html).toContain('src="https://example.com"');
      expect(html).not.toContain("srcdoc");
    });
  });

  describe("rehypeGistDataUriEmbed", () => {
    const GIST_URL =
      "https://gist.github.com/jasegehring/433c595236aff1c8c3b7bf4ee1daafab.js";

    it("renders a gist data:text/html iframe as a sandboxed srcdoc iframe", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script src="${GIST_URL}"></script>'}\n:::`,
      });

      expect(html).toContain("srcdoc=");
      expect(html).toContain(GIST_URL);
      expect(html).toContain('sandbox="allow-scripts"');
      expect(html).not.toContain("data:text/html");
      // No outer `src` attribute remains on the iframe itself (the `src=`
      // inside the decoded `<script src=...>` payload is HTML-entity
      // escaped, not a literal quote, so this only matches a real attribute).
      expect(html).not.toMatch(/\ssrc="/);
    });

    it("leaves a non-gist data:text/html iframe untouched (still neutralized elsewhere)", () => {
      const html = mystToHtml({
        myst: ":::iframe{src='data:text/html,<script>alert(1)</script>'}\n:::",
      });

      expect(html).toContain("data:text/html");
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });

    it("leaves a plain https iframe untouched", () => {
      const html = mystToHtml({
        myst: ':::iframe{src="https://example.com"}\n:::',
      });

      expect(html).toContain('src="https://example.com"');
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });

    it("rejects a lookalike host", () => {
      const html = mystToHtml({
        myst: ":::iframe{src='data:text/html,<script src=\"https://gist.github.com.evil.com/x.js\"></script>'}\n:::",
      });

      expect(html).not.toContain("srcdoc=");
      expect(html).toContain("data:text/html");
    });

    it("does not match a data-src attribute (not a real src)", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script data-src="${GIST_URL}"></script>'}\n:::`,
      });

      expect(html).toContain("data:text/html");
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });

    it("does not match a script tag inside an HTML comment", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<!-- <script src="${GIST_URL}"></script> -->'}\n:::`,
      });

      expect(html).toContain("data:text/html");
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });

    it("does not match a script tag with a non-executable type", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script type="application/json" src="${GIST_URL}"></script>'}\n:::`,
      });

      expect(html).toContain("data:text/html");
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });

    it("still matches an explicit classic-script type", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script type="text/javascript" src="${GIST_URL}"></script>'}\n:::`,
      });

      expect(html).toContain("srcdoc=");
      expect(html).toContain(GIST_URL);
    });

    it("scopes the single-scroller layout to single-file gists, leaving multi-file gists to the outer iframe's own scrollbar", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script src="${GIST_URL}"></script>'}\n:::`,
      });

      // Never applied unconditionally to `.gist-file`, so a multi-file gist
      // falls back to the browser's native overflow/scrollbar behavior.
      expect(html).toContain(":only-of-type");
      expect(html).not.toMatch(/\.gist-file\s*\{/);
    });

    it("keeps the html/body height chain unconditional so the single-file layout actually fills the frame", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script src="${GIST_URL}"></script>'}\n:::`,
      });

      // Proves the CSS text is present only; still needs a real browser
      // check to confirm the layout actually renders correctly.
      expect(html).toMatch(/html,\s*body\s*\{[^}]*height:\s*100%/);
    });

    it("decodes a base64-encoded gist data: URI", () => {
      const payload = Buffer.from(
        `<script src="${GIST_URL}"></script>`,
        "utf-8",
      ).toString("base64");
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html;base64,${payload}'}\n:::`,
      });

      expect(html).toContain("srcdoc=");
      expect(html).toContain(GIST_URL);
      expect(html).toContain('sandbox="allow-scripts"');
    });

    it("carries the author's <style> block into the srcdoc, after the renderer's own", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<style>.user-supplied-marker-xyz{color:red}</style><script src="${GIST_URL}"></script>'}\n:::`,
      });

      expect(html).toContain("user-supplied-marker-xyz");
      expect(html).toContain("srcdoc=");
      expect(html).toContain(GIST_URL);

      // Renderer CSS must come first so the author's rules, appended after,
      // win equal-specificity cascade conflicts per normal CSS rules.
      const rendererIdx = html.indexOf(":only-of-type");
      const authorIdx = html.indexOf("user-supplied-marker-xyz");
      expect(rendererIdx).toBeGreaterThan(-1);
      expect(authorIdx).toBeGreaterThan(rendererIdx);
    });

    it("does not rewrite the iframe on the print/PDF platform, since srcdoc has no loadable URL for page.goto", () => {
      const html = mystToHtml({
        myst: `:::iframe{src='data:text/html,<script src="${GIST_URL}"></script>'}\n:::`,
        platform: Platform.Print,
      });

      expect(html).toContain("data:text/html");
      expect(html).not.toContain("srcdoc=");
      expect(html).not.toContain("sandbox=");
    });
  });

  describe("rehypeFileDownload", () => {
    const fileMyst =
      ':::file{filename="tardi-data.gz" src="/uploads/tardi-data.gz"}\n:::';

    it("renders a working download button, not a reference badge", () => {
      const html = mystToHtml({ myst: fileMyst });

      // The download anchor must survive with its download attributes intact.
      expect(html).toContain(
        '<a href="/uploads/tardi-data.gz" download="tardi-data.gz"',
      );
      expect(html).toContain('class="file-download-btn"');

      // The icon-only download link must NOT be rewritten into a numbered
      // reference badge by rehypeReferenceLinks.
      expect(html).not.toContain("ref-link-wrapper");
      expect(html).not.toContain("ref-link-anchor");
    });
  });

  describe("applySizingAttrs", () => {
    it("emits width:100% for full-width images (not a figure-max-w calc)", () => {
      const html = mystToHtml({
        myst: ":::image{src=/img.png width=100%}\n:::",
      });

      expect(html).toContain('style="width:100%"');
      expect(html).not.toContain("--figure-max-w");
    });

    it("emits a figure-max-w calc for partial percentage widths", () => {
      const html = mystToHtml({
        myst: ":::image{src=/img.png width=60%}\n:::",
      });

      expect(html).toContain(
        'style="width:min(calc(0.6 * var(--figure-max-w)), 100cqi)"',
      );
    });

    it("renders images and videos when mediaAssets is null", () => {
      const html = mystToHtml({
        myst: ":::image{src=/img.png}\n:::\n\n:::video{src=/clip.mp4}\n:::",
        mediaAssets: null,
      });

      expect(html).toContain('src="/img.png"');
      expect(html).toContain('src="/clip.mp4"');
    });
  });

  describe("processFigure", () => {
    const figureTag = (figAttrs: string, child: string) =>
      mystToHtml({
        myst: `::::figure{${figAttrs}}\n${child}\n::::`,
      }).match(/<figure[^>]*>/)?.[0] ?? "";
    const iframe = (width: string) =>
      `:::iframe{src=https://example.com width=${width}}\n:::`;

    it.each(["align=left", "align=right", "align=center", ""])(
      "never sizes the figure itself (%s); it hugs its iframe",
      (attrs) => {
        expect(figureTag(attrs, iframe("50%"))).not.toContain("style=");
      },
    );

    it.each(["align=left", "align=right"])(
      "keeps a %s-floated figure floating when its iframe has a partial width",
      (attrs) => {
        expect(figureTag(attrs, iframe("50%"))).toMatch(/float-(left|right)/);
      },
    );

    it.each([
      ["align=left", iframe("100%")],
      ["align=right", iframe("100%")],
      ["align=right", ":::iframe{src=https://example.com}\n:::"],
    ])(
      "keeps a %s figure with a full-width iframe stacked",
      (attrs, child) => {
        expect(figureTag(attrs, child)).not.toMatch(/float-(left|right)/);
      },
    );

    it("still floats an image figure at width=100%", () => {
      expect(
        figureTag("align=right", ":::image{src=/img.png width=100%}\n:::"),
      ).toContain("float-right");
    });

    it("doesn't size a floated image figure, which hugs its image", () => {
      expect(
        figureTag("align=right", ":::image{src=/img.png width=50%}\n:::"),
      ).not.toContain("style=");
    });

    it("ignores a width set on the figure itself", () => {
      expect(
        figureTag(
          "align=right width=50%",
          ":::iframe{src=https://example.com}\n:::",
        ),
      ).not.toContain("style=");
    });
  });

  describe("processIframe", () => {
    const html = (attrs: string) =>
      mystToHtml({
        myst: `::::figure{${attrs}}\n:::iframe{src=https://example.com ${attrs}}\n:::\n:::figcaption\nCaption\n:::\n::::`,
      });
    const iframeTag = (attrs: string) =>
      html(attrs).match(/<iframe[^>]*>/)?.[0] ?? "";

    const isSized = (attrs: string) =>
      html(attrs).includes('data-sized="true"');

    it("fills its container when no width is set", () => {
      expect(iframeTag("")).toContain('style="width:100%"');
      expect(isSized("")).toBe(false);
    });

    it.each(["", "align=center", "align=left", "align=right"])(
      "sizes a percentage width like an image's (%s)",
      (attrs) => {
        expect(iframeTag(`width=50% ${attrs}`)).toContain(
          'style="width:min(calc(0.5 * var(--figure-max-w)), 100cqi)"',
        );
        expect(isSized(`width=50% ${attrs}`)).toBe(true);
      },
    );

    it("passes a length width through", () => {
      expect(iframeTag("width=400px")).toContain('style="width:400px"');
    });

    it("keeps width:100% full width, not sized", () => {
      expect(iframeTag("width=100%")).toContain('style="width:100%"');
      expect(isSized("width=100%")).toBe(false);
    });

    it("keeps the aspect ratio after the width", () => {
      expect(iframeTag("width=50% aspect-ratio=16/9")).toContain(
        "aspect-ratio:16/9",
      );
    });
  });

  describe("processVideo", () => {
    const videoTag = (attrs: string) =>
      mystToHtml({
        myst: `:::video{src=/v.mp4 ${attrs}}\n:::`,
      }).match(/<video[^>]*>/)?.[0] ?? "";

    it("always emits controls, muted and playsinline as bare attributes", () => {
      const tag = videoTag("");

      expect(tag).toMatch(/\scontrols[\s>]/);
      expect(tag).toMatch(/\smuted[\s>]/);
      expect(tag).toMatch(/\splaysinline[\s>]/);
      expect(tag).not.toMatch(/autoplay|loop/);
    });

    it.each(["autoplay loop", "autoplay=true loop=true"])(
      "turns on autoplay and loop for {%s}",
      (attrs) => {
        const tag = videoTag(attrs);

        expect(tag).toMatch(/\sautoplay[\s>]/);
        expect(tag).toMatch(/\sloop[\s>]/);
        expect(tag).not.toContain('="true"');
      },
    );

    it("omits autoplay and loop when set to false", () => {
      expect(videoTag("autoplay=false loop=false")).not.toMatch(
        /autoplay|loop/,
      );
    });
  });

  describe("rehypeTableRowGroups", () => {
    it("drops empty row groups and merges split bodies", () => {
      // The HTML parser repairs GDocs' misplaced <tbody> tag into an empty
      // row group, which breaks Firefox's collapsed table borders.
      const html = mystToHtml({
        myst: `:::figure{type=table}
<table><thead><tr><td>H</td></tr></thead><tbody></tbody><tbody><tr><td>A</td></tr></tbody><tbody><tr><td>B</td></tr></tbody></table>
:::`,
      });

      expect(html).not.toContain("<tbody></tbody>");
      expect((html.match(/<tbody>/g) || []).length).toBe(1);
      // Match on structure, not markup: other table plugins decorate cells.
      const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
      expect((tbody.match(/<tr\b/g) || []).length).toBe(2);
      expect(tbody).toMatch(/>A<[\s\S]*>B</);
    });
  });

  describe("processDetailsAndSummary", () => {
    it("gives a details with no summary a fallback toggle row", () => {
      const html = mystToHtml({ myst: ":::details\nHidden text.\n:::" });

      expect(html).toMatch(
        /<details><summary class="details-summary-fallback">Show more<\/summary><div class="details-content-border">/,
      );
      expect(html).toContain("<p>Hidden text.</p>");
    });

    it("keeps an authored summary and adds no fallback", () => {
      const html = mystToHtml({
        myst: "::::details\n:::summary\nLabel\n:::\nHidden text.\n::::",
      });

      expect(html).not.toContain("details-summary-fallback");
      expect((html.match(/<summary/g) || []).length).toBe(1);
    });
  });

  describe("rehypeMergeAdjacentLinks", () => {
    it("merges adjacent same-href links (split around an italic) into one anchor", () => {
      // prosemirror-markdown serializes a link wrapping an italic as several
      // adjacent same-url links; they must render as a single continuous link.
      const html = mystToHtml({
        myst: "[Rescuing ](https://x.com/a)[*Chlamydomonas*](https://x.com/a)[ motility](https://x.com/a)",
      });

      expect((html.match(/<a /g) || []).length).toBe(1);
      expect(html).toContain("Rescuing <em>Chlamydomonas</em> motility");
    });

    it("keeps links to different hrefs separate", () => {
      const html = mystToHtml({
        myst: "[one](https://x.com/a) [two](https://x.com/b)",
      });

      expect((html.match(/<a /g) || []).length).toBe(2);
    });
  });
});
