import type { PublicationMdast } from "@/apiv1/mdast";
import type { Publication } from "@/types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePublicationReferences } from "./usePublicationReferences";

const publication = {
  references: [
    { url: "https://example.org/b", text: "B" },
    { url: "https://doi.org/10.1234/A", text: "A" },
    { url: "https://example.org/uncited", text: "Uncited" }
  ]
} as Publication;

describe("usePublicationReferences", () => {
  it("orders a MyST publication's references by the AST's citations", () => {
    const mdast = {
      tree: { type: "root", children: [] },
      citations: {
        order: ["https://doi.org/10.1234/a", "https://example.org/b"]
      }
    } as unknown as PublicationMdast;

    const { result } = renderHook(() =>
      usePublicationReferences(publication, mdast)
    );

    expect(result.current.sortedReferences.map((ref) => ref.text)).toEqual([
      "A",
      "B",
      "Uncited"
    ]);
    expect(result.current.referenceNumbers).toEqual([1, 2, 3]);
  });

  it("lists a bibliography entry cited by key, with the AST's text", () => {
    const mdast = {
      tree: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "cite",
                identifier: "mitchell2009",
                citationKey: "mitchell2009",
                citationText: "Mitchell M. (2009). Complexity."
              }
            ]
          }
        ]
      },
      citations: {
        order: ["mitchell2009", "https://example.org/b"]
      }
    } as unknown as PublicationMdast;

    const { result } = renderHook(() =>
      usePublicationReferences(publication, mdast)
    );

    expect(result.current.sortedReferences).toEqual([
      { text: "Mitchell M. (2009). Complexity.", url: undefined },
      { url: "https://example.org/b", text: "B" },
      { url: "https://doi.org/10.1234/A", text: "A" },
      { url: "https://example.org/uncited", text: "Uncited" }
    ]);
    expect(result.current.referenceNumbers).toEqual([1, 2, 3, 4]);
  });

  it("gives a bibliography entry with a URL the AST's text", () => {
    const mdast = {
      tree: {
        type: "root",
        children: [
          {
            type: "cite",
            identifier: "https://example.org/b",
            citationKey: "b2020",
            citationText: "Bee B. (2020). B. Journal, 1(2), 3–4."
          }
        ]
      },
      citations: { order: ["https://example.org/b"] }
    } as unknown as PublicationMdast;
    const withEmptyRow = {
      references: [{ url: "https://example.org/b", text: "" }]
    } as Publication;

    const { result } = renderHook(() =>
      usePublicationReferences(withEmptyRow, mdast)
    );

    expect(result.current.sortedReferences).toEqual([
      {
        text: "Bee B. (2020). B. Journal, 1(2), 3–4.",
        url: "https://example.org/b"
      }
    ]);
  });
});
