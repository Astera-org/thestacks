import type { PublicationMdast } from "@/apiv1/mdast";
import type { Publication } from "@/types";
import sample from "@test/fixtures/mystmd/sample.v3.mdast.json";
import { fireEvent, render as renderClient } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import MystmdRenderer from "./MystmdRenderer";

const publication = {
  slug: "how-ravens-plan-ahead",
  references: [
    {
      url: "https://doi.org/10.1038/35106013",
      text: "Clayton & Dickinson (1998). Episodic-like memory."
    }
  ],
  mediaAssets: [
    {
      kind: "image",
      publicUrl: "https://media.example/raven.png",
      width: 1600,
      height: 900
    }
  ]
} as unknown as Publication;

function render(
  mdast: PublicationMdast = sample as PublicationMdast,
  isDraft = false
): HTMLElement {
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <MystmdRenderer
          isDraft={isDraft}
          mdast={mdast}
          publication={publication}
        />
      )
    }
  ]);
  const container = document.createElement("div");
  container.innerHTML = renderToString(<RouterProvider router={router} />);
  return container;
}

/** The sample's metadata with a body made of just `children`. */
function bodyOf(children: unknown[]): PublicationMdast {
  return {
    ...sample,
    tree: {
      type: "root",
      children: [{ type: "block", data: { part: "body" }, children }]
    }
  } as PublicationMdast;
}

describe("MystmdRenderer", () => {
  it("renders the Purpose heading before the abstract, then the body", () => {
    const html = render();
    const headings = [...html.querySelectorAll("h1, h2")].map((h) => [
      h.tagName,
      h.id,
      h.textContent
    ]);

    expect(headings).toEqual([
      ["H1", "purpose", "Purpose"],
      ["H1", "methods", "Methods"],
      ["H1", "", "Footnotes"]
    ]);
    expect(html.textContent).toContain("Ravens cache food for later");
  });

  it("labels the figure, table and code captions the Stacks way", () => {
    const labels = [...render().querySelectorAll(".caption-label")].map(
      (label) => label.textContent
    );

    expect(labels).toEqual(["Figure 1. ", "Program 1. ", "Table 1. "]);
  });

  it("gives an image figure the action target and both buttons", () => {
    const figure = render().querySelector("figure#fig-setup")!;

    expect(
      figure
        .querySelector(".figure-action-target")
        ?.getAttribute("data-media-type")
    ).toBe("image");
    expect(
      [...figure.querySelectorAll(".figure-action-btn")].map((b) =>
        b.getAttribute("aria-label")
      )
    ).toEqual(["Download", "Expand"]);
  });

  it("numbers citations, grouping adjacent ones into one badge", () => {
    const badges = [
      ...render().querySelectorAll(".ref-link-popover-label")
    ].map((badge) => badge.textContent);

    expect(badges).toEqual(["1", "2", "3", "4", "5–6"]);
  });

  it("renders math with KaTeX and numbers the equation", () => {
    const html = render();

    expect(html.querySelectorAll(".katex").length).toBe(2);
    expect(
      html.querySelector("#eq-energy .mystmd-equation-number")?.textContent
    ).toBe("(1)");
  });

  it("links cross-references and footnotes both ways", () => {
    const html = render();

    expect(
      [...html.querySelectorAll("a.cross-reference")].map((a) =>
        a.getAttribute("href")
      )
    ).toEqual(["#fig-setup", "#eq-energy"]);
    const reference = html.querySelector(".footnote-ref button")!;
    expect(reference.textContent).toBe("†1");
    expect(reference.getAttribute("aria-label")).toBe("Footnote 1");
    expect(html.querySelector("#fn-1")).not.toBeNull();
    expect(
      html.querySelector("#fn-1 .footnote-backref")?.getAttribute("href")
    ).toBe(`#${reference.id}`);
  });

  it("renders tabs, admonitions and highlighted code", () => {
    const html = render();

    expect(
      [...html.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    ).toEqual(["Summary", "Details"]);
    expect(html.querySelector("aside.info-box.admonition-note")).not.toBeNull();
    expect(
      html.querySelector("details.admonition-tip > summary")?.textContent
    ).toBe("Tip");
    expect(
      html.querySelector("code.language-python .hljs-built_in")
    ).not.toBeNull();
    expect(
      html.querySelector(".table-scroll-wrapper thead th")?.textContent
    ).toBe("Bird");
  });

  it("opens a dropdown admonition when its AST sets open", () => {
    expect(
      render().querySelector<HTMLDetailsElement>("details.admonition-tip")?.open
    ).toBe(false);

    const opened = JSON.parse(JSON.stringify(sample), (_key, value) =>
      value?.type === "admonition" && value.class === "dropdown"
        ? { ...value, open: true }
        : value
    ) as PublicationMdast;
    expect(
      render(opened).querySelector<HTMLDetailsElement>("details.admonition-tip")
        ?.open
    ).toBe(true);
  });

  it("gives labelled admonitions and dropdowns their cross-reference id", () => {
    const labelled = JSON.parse(JSON.stringify(sample), (_key, value) =>
      value?.type === "admonition"
        ? { ...value, html_id: `${value.kind}-box` }
        : value
    ) as PublicationMdast;
    const html = render(labelled);
    expect(html.querySelector("aside#note-box.admonition-note")).not.toBeNull();
    expect(html.querySelector("details#tip-box.admonition-tip")).not.toBeNull();

    const dropdown = {
      ...sample,
      tree: {
        type: "root",
        children: [
          {
            type: "block",
            data: { part: "body" },
            children: [
              {
                type: "details",
                identifier: "more",
                children: [
                  {
                    type: "summary",
                    children: [{ type: "text", value: "More" }]
                  },
                  {
                    type: "paragraph",
                    children: [{ type: "text", value: "Hidden" }]
                  }
                ]
              }
            ]
          }
        ]
      }
    } as PublicationMdast;
    expect(render(dropdown).querySelector("details#more")).not.toBeNull();
  });

  it("gives directly labelled code and images their cross-reference id", () => {
    const html = render(
      bodyOf([
        { type: "code", lang: "python", value: "x = 1", html_id: "code-test" },
        { type: "image", url: "/plot.png", html_id: "img-test" }
      ])
    );

    expect(html.querySelector("div#code-test.mystmd-code")).not.toBeNull();
    expect(html.querySelector("img#img-test")).not.toBeNull();
  });

  it("sizes a media asset's image to its aspect ratio unless given a height", () => {
    const url = "https://media.example/raven.png";
    const html = render(
      bodyOf([
        { type: "image", url, html_id: "ratio" },
        { type: "image", url, html_id: "tall", height: "200px" }
      ])
    );

    const ratio = html.querySelector<HTMLImageElement>("img#ratio")!;
    expect(ratio.style.aspectRatio).toBe("1600 / 900");
    expect(ratio.style.height).toBe("auto");
    expect(
      html.querySelector<HTMLImageElement>("img#tall")!.style.aspectRatio
    ).toBe("");
  });

  it("truncates a long figure legend behind Read all", () => {
    const sentence = "Ravens cached food in one of two trays. ";
    const mdast = bodyOf([
      {
        type: "container",
        kind: "figure",
        children: [
          { type: "image", url: "/a.png" },
          {
            type: "legend",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: sentence.repeat(20) }]
              }
            ]
          }
        ]
      }
    ]);
    const router = createMemoryRouter([
      {
        path: "/",
        element: <MystmdRenderer mdast={mdast} publication={publication} />
      }
    ]);
    const { container } = renderClient(<RouterProvider router={router} />);
    const legend = () => container.querySelector(".figure-legend")!;
    const button = () => legend().querySelector("button")!;

    const cut = () => legend().querySelector(".legend-cut");
    const rest = () => legend().querySelector(".legend-rest")!;

    expect(cut()?.textContent!.length).toBeLessThan(sentence.length * 10);
    expect(cut()?.textContent).toContain("\u2026");
    expect(button().getAttribute("aria-label")).toBe("Read all");
    // The rest stays in the page, hidden until found by find in page
    expect(rest().getAttribute("hidden")).toBe("until-found");
    expect(rest().textContent).toContain(sentence.repeat(20).trim());

    fireEvent.click(button());
    expect(cut()).toBeNull();
    expect(rest().hasAttribute("hidden")).toBe(false);
    expect(button().getAttribute("aria-label")).toBe("Collapse");
  });

  it("notes an unknown directive on drafts only", () => {
    expect(
      render(undefined, false).querySelector(".mystmd-unknown")
    ).toBeNull();
    expect(
      render(undefined, true).querySelector(".mystmd-unknown")?.textContent
    ).toContain("{foo}");
  });

  it("leaves raw HTML out rather than printing it", () => {
    const mdast = structuredClone(sample) as PublicationMdast;
    mdast.tree.children![1]!.children!.push({
      type: "html",
      value: '<iframe src="https://example.org"></iframe>',
      key: "raw"
    });

    const html = render(mdast);

    expect(html.textContent).not.toContain("<iframe");
    expect(html.querySelector("iframe")).toBeNull();
  });

  it("keeps document-relative links and images", () => {
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: "other-page",
              children: [{ type: "text", value: "next" }]
            }
          ]
        },
        { type: "image", url: "plot.png" }
      ])
    );

    expect(html.querySelector('a[href="other-page"]')?.textContent).toBe(
      "next"
    );
    expect(html.querySelector('img[src="plot.png"]')).not.toBeNull();
  });

  it("sizes images in pixels when the width has no unit", () => {
    const html = render(
      bodyOf([
        { type: "image", url: "/a.png", width: "300" },
        { type: "image", url: "/b.png", width: "50%" },
        { type: "image", url: "/c.png", width: "wide" }
      ])
    );
    const widths = [...html.querySelectorAll("img")].map(
      (img) => img.style.width
    );

    expect(widths).toEqual(["300px", "50%", ""]);
  });

  it("marks the action target of figures with a narrower explicit width", () => {
    const figure = (media: Record<string, unknown>) => ({
      type: "container",
      kind: "figure",
      children: [media, { type: "caption", children: [] }]
    });
    const html = render(
      bodyOf([
        figure({ type: "image", url: "/a.png", width: "50%" }),
        figure({ type: "image", url: "/b.png", width: "100%" }),
        figure({ type: "image", url: "/c.png" }),
        figure({ type: "iframe", src: "https://example.org", width: "300" })
      ])
    );
    const sized = [...html.querySelectorAll(".figure-action-target")].map(
      (target) => target.hasAttribute("data-sized")
    );

    expect(sized).toEqual([true, false, false, true]);
    expect(html.querySelector("img[data-sized]")).toBeNull();
  });

  it("refuses unsafe link URLs", () => {
    const mdast = structuredClone(sample) as PublicationMdast;
    mdast.tree.children![1]!.children!.push({
      type: "paragraph",
      key: "unsafe",
      children: [
        {
          type: "link",
          url: "javascript:alert(1)",
          key: "unsafe-link",
          children: [{ type: "text", value: "click", key: "unsafe-text" }]
        }
      ]
    });

    const html = render(mdast);

    expect(html.innerHTML).not.toContain("javascript:");
    expect(html.textContent).toContain("click");
  });

  it("leaves a citation with an unsafe URL unresolved", () => {
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          key: "p",
          children: [
            {
              type: "cite",
              label: "javascript:alert(1)",
              identifier: "javascript:alert(1)",
              enumerator: "1",
              key: "c"
            }
          ]
        }
      ])
    );

    expect(html.querySelector(".ref-link-popover-label")).toBeNull();
    expect(html.querySelector(".citation-error")).not.toBeNull();
    expect(html.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it("renders an epigraph as a quote with its attribution", () => {
    const html = render(
      bodyOf([
        {
          type: "container",
          kind: "quote",
          class: "epigraph",
          key: "q",
          children: [
            {
              type: "blockquote",
              key: "b",
              children: [
                {
                  type: "paragraph",
                  key: "p",
                  children: [{ type: "text", value: "Computing writ large." }]
                }
              ]
            },
            {
              type: "caption",
              key: "c",
              children: [
                {
                  type: "paragraph",
                  key: "cp",
                  children: [{ type: "text", value: "Chris Langton" }]
                }
              ]
            }
          ]
        }
      ])
    );

    const quote = html.querySelector("figure.mystmd-quote");
    expect(quote?.classList.contains("epigraph")).toBe(true);
    expect(quote?.querySelector("blockquote")?.textContent).toBe(
      "Computing writ large."
    );
    expect(quote?.querySelector(".mystmd-quote-attribution")?.textContent).toBe(
      "Chris Langton"
    );
    expect(quote?.querySelector(".figure-action-buttons")).toBeNull();
  });

  it("keeps only MyST's quote classes", () => {
    const html = render(
      bodyOf([
        {
          type: "container",
          kind: "quote",
          class: "pull-quote fixed inset-0",
          key: "q",
          children: [{ type: "blockquote", key: "b", children: [] }]
        }
      ])
    );

    expect(html.querySelector("figure.mystmd-quote")?.className).toBe(
      "mystmd-quote pull-quote"
    );
  });

  it("numbers a bibliography entry cited by key, with no link", () => {
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          key: "p",
          children: [
            {
              type: "cite",
              label: "mitchell2009",
              identifier: "mitchell2009",
              citationKey: "mitchell2009",
              citationText: "Mitchell M. (2009). Complexity.",
              enumerator: "3",
              key: "c"
            }
          ]
        }
      ])
    );

    expect(html.querySelector(".ref-link-popover-label")?.textContent).toBe(
      "3"
    );
    expect(html.querySelector(".citation-error")).toBeNull();
    expect(html.querySelector('a[href="mitchell2009"]')).toBeNull();
  });

  it("shows a bibliography entry's own text for its URL in the popover", () => {
    const mdast = bodyOf([
      {
        type: "paragraph",
        key: "p",
        children: [
          {
            type: "cite",
            label: "https://doi.org/10.1038/35106013",
            identifier: "https://doi.org/10.1038/35106013",
            citationKey: "clayton1998",
            citationText: "Clayton NS. (1998). Episodic-like memory. Nature.",
            enumerator: "1",
            key: "c"
          }
        ]
      }
    ]);
    const router = createMemoryRouter([
      {
        path: "/",
        element: <MystmdRenderer mdast={mdast} publication={publication} />
      }
    ]);
    const { baseElement, container } = renderClient(
      <RouterProvider router={router} />
    );

    fireEvent.click(container.querySelector(".ref-link-popover-trigger")!);

    expect(
      baseElement.querySelector(".ref-link-popover-content")?.textContent
    ).toContain("Clayton NS. (1998). Episodic-like memory. Nature.");
  });

  it("numbers a reference cited twice in a group once", () => {
    const cite = (key: string) => ({
      type: "cite",
      label: "https://doi.org/10.1038/35106013",
      identifier: "https://doi.org/10.1038/35106013",
      enumerator: "2",
      key
    });
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          key: "p",
          children: [
            { type: "citeGroup", key: "g", children: [cite("a"), cite("b")] }
          ]
        }
      ])
    );

    expect(html.querySelector(".ref-link-popover-label")?.textContent).toBe(
      "2"
    );
  });

  it("shows a footnote's text in a popover", () => {
    const mdast = bodyOf([
      {
        type: "paragraph",
        key: "p",
        children: [
          {
            type: "footnoteReference",
            identifier: "a",
            enumerator: "1",
            key: "ref"
          }
        ]
      },
      {
        type: "footnoteDefinition",
        identifier: "a",
        enumerator: "1",
        key: "def",
        children: [
          {
            type: "paragraph",
            key: "dp",
            children: [{ type: "text", value: "Not validated.", key: "t" }]
          }
        ]
      }
    ]);
    const router = createMemoryRouter([
      {
        path: "/",
        element: <MystmdRenderer mdast={mdast} publication={publication} />
      }
    ]);
    const { baseElement, container } = renderClient(
      <RouterProvider router={router} />
    );

    fireEvent.click(container.querySelector(".footnote-ref button")!);

    expect(baseElement.querySelector(".footnote-popover")?.textContent).toBe(
      "1Not validated."
    );
  });

  it("lists a footnote's references in its popover, not a second popover", () => {
    const mdast = bodyOf([
      {
        type: "paragraph",
        key: "p",
        children: [
          {
            type: "footnoteReference",
            identifier: "a",
            enumerator: "1",
            key: "ref"
          }
        ]
      },
      {
        type: "footnoteDefinition",
        identifier: "a",
        enumerator: "1",
        key: "def",
        children: [
          {
            type: "paragraph",
            key: "dp",
            children: [
              { type: "text", value: "See", key: "t" },
              {
                type: "cite",
                label: "https://doi.org/10.1038/35106013",
                identifier: "https://doi.org/10.1038/35106013",
                enumerator: "2",
                key: "c"
              }
            ]
          }
        ]
      }
    ]);
    const router = createMemoryRouter([
      {
        path: "/",
        element: <MystmdRenderer mdast={mdast} publication={publication} />
      }
    ]);
    const { baseElement, container } = renderClient(
      <RouterProvider router={router} />
    );

    fireEvent.click(container.querySelector(".footnote-ref button")!);

    const popover = baseElement.querySelector(".footnote-popover")!;
    expect(popover.querySelector(".ref-link-popover-trigger")).toBeNull();
    expect(popover.querySelector(".footnote-popover-cite")?.textContent).toBe(
      "2"
    );
    expect(
      popover.querySelector(".footnote-popover-references")?.textContent
    ).toBe(
      "2Clayton & Dickinson (1998). Episodic-like memory.https://doi.org/10.1038/35106013"
    );
    // The list at the end keeps the clickable badge.
    expect(
      container.querySelector(".mystmd-footnotes .ref-link-popover-trigger")
    ).not.toBeNull();
  });

  it("lists only referenced footnotes, numbered as in the text", () => {
    const definition = (identifier: string, enumerator?: string) => ({
      type: "footnoteDefinition",
      identifier,
      enumerator,
      key: `def-${identifier}`,
      children: [{ type: "text", value: `Note ${identifier}`, key: identifier }]
    });
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          key: "p",
          children: [
            {
              type: "footnoteReference",
              identifier: "used",
              enumerator: "1",
              key: "ref"
            }
          ]
        },
        definition("unused"),
        definition("used", "1")
      ])
    );

    const items = [...html.querySelectorAll(".mystmd-footnotes li")];
    expect(items.map((li) => [li.id, li.getAttribute("value")])).toEqual([
      ["fn-used", "1"]
    ]);
  });

  it("keeps the Purpose heading's id apart from a body heading's", () => {
    const mdast = structuredClone(sample) as PublicationMdast;
    mdast.tree.children![1]!.children!.unshift({
      type: "heading",
      depth: 2,
      html_id: "purpose",
      key: "body-purpose",
      children: [{ type: "text", value: "Purpose", key: "body-purpose-text" }]
    });

    const ids = [...render(mdast).querySelectorAll("h1, h2")].map((h) => h.id);

    expect(ids.slice(0, 2)).toEqual(["purpose-1", "purpose"]);
  });

  it("renders a MyST heading one level up, with # and ## both as h1", () => {
    const html = render(
      bodyOf(
        [1, 2, 3, 4].map((depth) => ({
          type: "heading",
          depth,
          identifier: `depth-${depth}`,
          children: [{ type: "text", value: `Depth ${depth}` }]
        }))
      )
    );

    const tags = [1, 2, 3, 4].map(
      (depth) => html.querySelector(`#depth-${depth}`)?.tagName
    );
    expect(tags).toEqual(["H1", "H1", "H2", "H3"]);
  });

  it("renders math with the macros of the document's math frontmatter", () => {
    const math = [
      {
        type: "paragraph",
        children: [{ type: "inlineMath", value: "\\vect{x}" }]
      }
    ];
    const withMacros = {
      ...bodyOf(math),
      frontmatter: { math: { "\\vect": { macro: "\\mathbf{#1}" } } }
    };

    const html = render(withMacros);
    expect(html.querySelector(".katex .mathbf")?.textContent).toBe("x");
    expect(html.querySelector(".katex-error")).toBeNull();
    expect(render(bodyOf(math)).querySelector(".katex .mathbf")).toBeNull();
  });

  it("numbers a multi-line equation once, not row by row", () => {
    const html = render(
      bodyOf([
        {
          type: "math",
          enumerator: "7",
          value: "\\begin{align}\n  a &= b \\\\\n  c &= d\n\\end{align}"
        }
      ])
    );

    expect(html.querySelector(".katex")).not.toBeNull();
    expect(html.querySelector(".katex-error")).toBeNull();
    expect(html.querySelectorAll(".eqn-num")).toHaveLength(0);
    expect(html.querySelector(".mystmd-equation-number")?.textContent).toBe(
      "(7)"
    );
  });

  it("renders mhchem chemistry", () => {
    const html = render(
      bodyOf([
        {
          type: "paragraph",
          children: [{ type: "inlineMath", value: "\\ce{Na+}" }]
        }
      ])
    );

    expect(html.querySelector(".katex")).not.toBeNull();
    expect(html.innerHTML).not.toMatch(/katex-error|#cc0000/);
  });

  it("shows a heading's number only when the document numbers it", () => {
    const html = render(
      bodyOf([
        {
          type: "heading",
          depth: 2,
          identifier: "methods",
          enumerator: "2",
          children: [{ type: "text", value: "Methods" }]
        },
        {
          type: "heading",
          depth: 2,
          identifier: "notes",
          children: [{ type: "text", value: "Notes" }]
        }
      ])
    );

    const [numbered, plain] = [...html.querySelectorAll("h1")];
    expect(numbered?.querySelector(".mystmd-heading-number")?.textContent).toBe(
      "2"
    );
    expect(numbered?.id).toBe("methods");
    expect(plain?.querySelector(".mystmd-heading-number")).toBeNull();
  });
});
