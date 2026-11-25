import { EditorView } from "@uiw/react-codemirror";
import { afterEach, describe, expect, it } from "vitest";
import { selectRange } from "./codemirror-highlighting";

let view: EditorView | undefined;

afterEach(() => {
  view?.destroy();
  view = undefined;
});

function editor(doc: string) {
  view = new EditorView({ doc, parent: document.body });
  return view;
}

describe("selectRange", () => {
  it("selects a range given in 1-based lines and columns", () => {
    const view = editor("first line\nsecond line\nthird line");

    selectRange(view, {
      startLine: 2,
      startColumn: 1,
      endLine: 3,
      endColumn: 6,
    });

    const { from, to } = view.state.selection.main;
    expect(view.state.sliceDoc(from, to)).toBe("second line\nthird");
  });

  it("clamps a range that runs past the document", () => {
    const view = editor("short");

    selectRange(view, {
      startLine: 1,
      startColumn: 3,
      endLine: 9,
      endColumn: 99,
    });

    expect(view.state.selection.main).toMatchObject({ from: 2, to: 5 });
  });
});
