import aboutMarkdown from "@/../content/about.md?raw";
import { describe, expect, it } from "vitest";
import { buildSitePageMdast } from "./buildSitePageMdast.server";
import { headingsFromMdast, partChildren } from "./headings";
import { MDAST_SCHEMA_VERSION, MYST_AST_VERSION } from "./versions";

describe("buildSitePageMdast", () => {
  it("puts the page in a body block, with no abstract", () => {
    const mdast = buildSitePageMdast("## Hello\n\nSome *text*.");
    expect(mdast.schema).toBe(MDAST_SCHEMA_VERSION);
    expect(mdast.version).toBe(MYST_AST_VERSION);
    expect(partChildren(mdast.tree, "abstract")).toEqual([]);
    expect(partChildren(mdast.tree, "body").map((n) => n.type)).toEqual([
      "heading",
      "paragraph"
    ]);
  });

  it("keys nodes deterministically and drops positions", () => {
    const source = "## A\n\nText with a footnote[^1].\n\n[^1]: Note.";
    const first = buildSitePageMdast(source);
    expect(buildSitePageMdast(source)).toEqual(first);
    expect(JSON.stringify(first.tree)).not.toContain('"position"');
    expect(first.tree.key).toBe("k0");
  });

  it("reports unknown directives as messages", () => {
    const { messages } = buildSitePageMdast(":::{nonsense}\nx\n:::");
    expect(messages?.some((m) => m.severity === "error")).toBe(true);
  });

  describe("the About page", () => {
    const mdast = buildSitePageMdast(aboutMarkdown);

    it("parses without warnings or errors", () => {
      expect(mdast.messages).toEqual([]);
    });

    it("has its figures as containers with an image and caption", () => {
      const figures: Record<string, unknown>[] = [];
      const visit = (node: (typeof mdast)["tree"]) => {
        if (node.type === "container") figures.push(node);
        node.children?.forEach(visit);
      };
      visit(mdast.tree);
      expect(figures).toHaveLength(2);
      for (const figure of figures) {
        const types = (figure.children as { type: string }[]).map(
          (c) => c.type
        );
        expect(types).toEqual(["image", "caption"]);
        expect(figure.enumerator).toBeUndefined();
      }
    });

    it("lists its sections in the table of contents", () => {
      const sections = headingsFromMdast(mdast.tree)
        .filter((h) => h.depth === 1)
        .map((h) => h.text);
      expect(sections).toEqual([
        "What we believe",
        "The Stacks publishing service",
        "Raven, our open source backend",
        // MyST's typography turns ' into a curly apostrophe.
        "What we’re learning",
        "FAQ"
      ]);
    });
  });
});
