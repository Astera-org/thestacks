import { Commit } from "@/hooks/use-edit-publication/types";
import { LinkedAssetTypeV1, LinkedAssetV1 } from "@/types/v1";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdditionalAssets, { reconcileRows } from "./AdditionalAssets";

const other: LinkedAssetV1 = {
  type: LinkedAssetTypeV1.Other,
  url: "https://example.com/other",
  name: "",
};
const code: LinkedAssetV1 = {
  type: LinkedAssetTypeV1.Code,
  url: "https://example.com/code",
  name: "",
};

function urlValues() {
  return screen
    .getAllByRole("textbox", { name: /Asset \d+ URL/ })
    .map((el) => (el as HTMLInputElement).value);
}

describe("AdditionalAssets", () => {
  it("keeps the on-screen order when the server returns assets sorted by type", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <AdditionalAssets
        assets={[other, code]}
        fieldErrors={null}
        onCommit={onCommit}
      />
    );
    expect(urlValues()).toEqual([other.url, code.url]);

    // The backend sorts by type and sends the list back in that order.
    rerender(
      <AdditionalAssets
        assets={[code, other]}
        fieldErrors={null}
        onCommit={onCommit}
      />
    );
    expect(urlValues()).toEqual([other.url, code.url]);
  });

  it("commits edits in the displayed order and keeps the edited row in place", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <AdditionalAssets
        assets={[other, code]}
        fieldErrors={null}
        onCommit={onCommit}
      />
    );

    const [first] = screen.getAllByRole("textbox", { name: /Asset \d+ URL/ });
    fireEvent.change(first, {
      target: { value: "https://example.com/other2" },
    });

    expect(onCommit).toHaveBeenLastCalledWith("linkedAssets", [
      { ...other, url: "https://example.com/other2" },
      code,
    ]);

    // Server echo, sorted by type again.
    rerender(
      <AdditionalAssets
        assets={[code, { ...other, url: "https://example.com/other2" }]}
        fieldErrors={null}
        onCommit={onCommit}
      />
    );
    expect(urlValues()).toEqual(["https://example.com/other2", code.url]);
  });
});

describe("reconcileRows", () => {
  let id = 10;
  const nextId = () => id++;

  it("pairs a normalized value with its original row by position", () => {
    const rows = [
      { id: 1, asset: other },
      { id: 2, asset: { ...code, url: "https://example.com/code " } },
    ];
    const result = reconcileRows(rows, [code, other], nextId);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
    expect(result[1].asset.url).toBe(code.url);
  });

  it("pairs an edited asset with its row and leaves the other in place", () => {
    const rows = [
      { id: 1, asset: other },
      { id: 2, asset: code },
    ];
    const extra = { ...code, url: "https://example.com/data" };
    const result = reconcileRows(rows, [extra, other], nextId);
    expect(result.map((r) => r.asset.url)).toEqual([other.url, extra.url]);
    expect(result[0].id).toBe(1);
  });
});

describe("AdditionalAssets draft row", () => {
  it("keeps the same input mounted when the draft becomes a saved row", () => {
    const onCommit = vi.fn();
    render(
      <AdditionalAssets
        assets={[]}
        fieldErrors={null}
        onCommit={onCommit as unknown as Commit}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add asset" }));
    const url = screen.getByRole("textbox", { name: "Asset 1 URL" });

    // No type yet: nothing is committed.
    fireEvent.change(url, { target: { value: "https://example.com/x" } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Asset 1 URL" })).toBe(url);
  });

  it("holds a row locally until its URL is valid", () => {
    const onCommit = vi.fn();
    render(
      <AdditionalAssets
        assets={[other]}
        fieldErrors={null}
        onCommit={onCommit as unknown as Commit}
      />
    );
    const url = screen.getByRole("textbox", { name: "Asset 1 URL" });
    fireEvent.change(url, { target: { value: "h" } });
    expect(onCommit).not.toHaveBeenCalled();
    expect((url as HTMLInputElement).value).toBe("h");
    fireEvent.change(url, { target: { value: "https://example.com/h" } });
    expect(onCommit).toHaveBeenLastCalledWith("linkedAssets", [
      { ...other, url: "https://example.com/h" },
    ]);
  });

  it("does not commit while two rows collide", () => {
    const onCommit = vi.fn();
    render(
      <AdditionalAssets
        assets={[other, { ...other, url: "https://example.com/other2" }]}
        fieldErrors={null}
        onCommit={onCommit as unknown as Commit}
      />
    );
    const [, second] = screen.getAllByRole("textbox", {
      name: /Asset \d+ URL/,
    });
    fireEvent.change(second, { target: { value: other.url } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Duplicate asset/).length).toBeGreaterThan(0);
  });
});
