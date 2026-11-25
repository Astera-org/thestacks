import type { MdastNode } from "@/apiv1/mdast";
import sample from "@test/fixtures/mystmd/sample.v3.mdast.json";
import { describe, expect, it } from "vitest";
import { headingsFromMdast } from "./headings";

function tree(abstract: MdastNode[], body: MdastNode[]): MdastNode {
  return {
    type: "root",
    children: [
      { type: "block", data: { part: "abstract" }, children: abstract },
      { type: "block", data: { part: "body" }, children: body }
    ]
  };
}

function heading(depth: number, id: string, text: string): MdastNode {
  return {
    type: "heading",
    depth,
    html_id: id,
    children: [{ type: "text", value: text }]
  };
}

describe("headingsFromMdast", () => {
  it("lists Purpose, then the body headings of the sample", () => {
    expect(headingsFromMdast(sample.tree as MdastNode)).toEqual([
      { id: "purpose", text: "Purpose", depth: 1, hasChildren: false },
      { id: "methods", text: "Methods", depth: 1, hasChildren: false }
    ]);
  });

  it("lists ## and ### headings as its two levels, leaving out Purpose without an abstract, deeper headings and nested ones", () => {
    const headings = headingsFromMdast(
      tree(
        [],
        [
          heading(2, "intro", "Intro"),
          heading(3, "aims", "Aims"),
          heading(4, "too-deep", "Too deep"),
          {
            type: "admonition",
            children: [heading(2, "in-note", "In a note")]
          },
          { type: "block", children: [heading(2, "results", "Results")] }
        ]
      )
    );

    expect(headings).toEqual([
      { id: "intro", text: "Intro", depth: 1, hasChildren: true },
      { id: "aims", text: "Aims", depth: 2, hasChildren: false },
      { id: "results", text: "Results", depth: 1, hasChildren: false }
    ]);
  });

  it("lists a # heading in the body at the first level", () => {
    const headings = headingsFromMdast(
      tree([], [heading(1, "part", "Part"), heading(2, "section", "Section")])
    );

    expect(headings.map(({ id, depth }) => [id, depth])).toEqual([
      ["part", 1],
      ["section", 1]
    ]);
  });

  it("moves Purpose's id aside when a body heading has it", () => {
    const headings = headingsFromMdast(
      tree(
        [{ type: "paragraph", children: [] }],
        [heading(1, "purpose", "Purpose")]
      )
    );

    expect(headings.map((h) => h.id)).toEqual(["purpose-1", "purpose"]);
  });
});
