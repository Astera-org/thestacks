import { Commit } from "@/hooks/use-edit-publication/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TagEditor from "./TagEditor";

const TYPES = ["Resource", "Perspective", "Dataset"];

function renderTags(tags: string[], props: { locked?: boolean } = {}) {
  const onCommit = vi.fn();
  render(
    <TagEditor
      locked={props.locked}
      suggested={[]}
      tags={tags}
      types={TYPES}
      onCommit={onCommit as unknown as Commit}
    />
  );
  return onCommit;
}

describe("TagEditor", () => {
  it("pins the pub type first and lists free tags after it", () => {
    renderTags(["Open science", "Resource"]);

    expect(
      screen.getByRole("button", { name: "Pub type: Resource" })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Remove tag: Open science" })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Remove tag: Resource" })
    ).toBeNull();
  });

  it("switches the pub type and keeps it first", () => {
    const onCommit = renderTags(["Resource", "Open science"]);

    fireEvent.click(screen.getByRole("button", { name: "Pub type: Resource" }));
    fireEvent.click(screen.getByRole("button", { name: "Perspective" }));

    expect(onCommit).toHaveBeenCalledWith({
      tags: ["Perspective", "Open science"],
    });
  });

  it("offers a type picker when no type tag is set", () => {
    const onCommit = renderTags(["Open science"]);

    fireEvent.click(screen.getByRole("button", { name: "Choose a pub type" }));
    fireEvent.click(screen.getByRole("button", { name: "Dataset" }));

    expect(onCommit).toHaveBeenCalledWith({
      tags: ["Dataset", "Open science"],
    });
  });

  it("adds a free tag on Enter and ignores duplicates", () => {
    const onCommit = renderTags(["Resource", "Open science"]);
    const input = screen.getByRole("textbox", { name: "Add a tag" });

    fireEvent.change(input, { target: { value: "  Genomics " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenLastCalledWith({
      tags: ["Resource", "Open science", "Genomics"],
    });

    onCommit.mockClear();
    fireEvent.change(input, { target: { value: "open science" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("removes a tag from its token or with Backspace", () => {
    const onCommit = renderTags(["Resource", "Open science", "Genomics"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove tag: Open science" })
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      tags: ["Resource", "Genomics"],
    });

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Add a tag" }), {
      key: "Backspace",
    });
    expect(onCommit).toHaveBeenLastCalledWith({
      tags: ["Resource", "Open science"],
    });
  });

  it("renders plain tokens without controls when locked", () => {
    renderTags(["Resource", "Open science"], { locked: true });

    expect(screen.getByText("Resource")).toBeDefined();
    expect(screen.getByText("Open science")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
