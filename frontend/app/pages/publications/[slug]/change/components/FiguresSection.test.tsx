import { ImportStatusResponse } from "@/apiv1/imports";
import { MediaAssetV1, PublicationV1 } from "@/types/v1";
import { queryResult } from "@test/queryResult";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { extractFigures } from "../helpers/extract-figures";
import FiguresSection from "./FiguresSection";

const BODY = [
  '::::figure{#growth label="Figure 1"}',
  ':::image{src="raven-media://media-1"}',
  ":::",
  ":::figcaption",
  "**Figure 1.** Growth curves.",
  ":::",
  "::::",
  "",
  '::::figure{label="Figure 2"}',
  ':::image{src="https://bucket/2.png"}',
  ":::",
  "::::",
  "",
  '::::figure{type="table" label="Table 1"}',
  "| a |",
  "| - |",
  "| 1 |",
  "::::",
  "",
  ':::iframe{src="https://example.typeform.com/to/x"}',
  ":::",
].join("\n");

const ASSET: MediaAssetV1 = {
  id: "a2",
  byteSize: 1536,
  mimeType: "image/png",
  kind: "image",
  publicUrl: "https://bucket/2.png",
  width: 800,
  height: 600,
  durationMs: null,
  rotation: null,
};

const FAILED_UPLOAD: ImportStatusResponse = {
  publicationId: "p1",
  versionId: "v1",
  settled: true,
  uploads: [
    {
      id: "u1",
      ref: "raven-media://media-1",
      status: "failed",
      url: null,
      error: {
        code: "unavailable",
        message: "The source couldn't be fetched.",
      },
      source: {
        type: "url",
        url: "https://drive.google.com/file/d/abc/view",
      },
    },
  ],
};

function renderSection({
  body = BODY,
  collapsed = false,
  isReadOnly = false,
  uploadState = FAILED_UPLOAD,
  uploadsLoading = false,
  onShowInEditor = vi.fn(),
}: {
  body?: string;
  collapsed?: boolean;
  isReadOnly?: boolean;
  uploadState?: ImportStatusResponse;
  uploadsLoading?: boolean;
  onShowInEditor?: () => void;
} = {}) {
  return render(
    <FiguresSection
      collapsed={collapsed}
      figures={extractFigures(body)}
      importStatusResponse={queryResult(uploadState, {
        isLoading: uploadsLoading,
      })}
      isReadOnly={isReadOnly}
      publication={{ id: "p1", body, mediaAssets: [ASSET] } as PublicationV1}
      status={{ status: "saved", lastUpdated: null }}
      onShowInEditor={onShowInEditor}
      onToggleCollapse={vi.fn()}
    />
  );
}

/** The processing pills in the section's header. */
function statusPills() {
  const group = screen.getByRole("group", { name: "Processing status" });
  return Array.from(group.children, (pill) => pill.textContent);
}

/** Figure rows in display order, across the need-fixing and other lists. */
function rows() {
  return screen
    .getAllByRole("list", {
      name: /^(Figures|Figures that need fixing|Other figures)$/,
    })
    .flatMap((list) => within(list).getAllByRole("listitem"))
    .map((row) => ({ row, text: row.textContent }));
}

describe("FiguresSection", () => {
  it("lists each figure with its media's status", () => {
    renderSection();

    const [failed, stored, table, embed] = rows();
    expect(rows()).toHaveLength(4);
    expect(failed?.text).toContain("Figure 1");
    expect(failed?.text).toContain("Growth curves.");
    expect(failed?.text).toContain("Upload failed");
    expect(stored?.text).toContain("Image · 1.5 KB · 800×600");
    expect(stored?.text).toContain("Stored");
    expect(stored?.row.querySelector("img")?.getAttribute("src")).toBe(
      "https://bucket/2.png"
    );
    expect(table?.text).toContain("Table 1");
    expect(embed?.text).toContain("Embed outside a figure");
    expect(embed?.text).toContain("Embed · example.typeform.com");
    expect(embed?.text).toContain("External");
    expect(screen.getByText("4 figures · 1 to fix")).toBeTruthy();
  });

  it("opens the editor at the figure", () => {
    const onShowInEditor = vi.fn();
    renderSection({ onShowInEditor });

    fireEvent.click(
      screen.getByRole("button", { name: "Show in editor: Figure 2" })
    );

    expect(onShowInEditor).toHaveBeenCalledWith({
      startLine: 9,
      startColumn: 1,
      endLine: 12,
      endColumn: 5,
    });
  });

  it("doesn't open the editor while the body can't be edited", () => {
    renderSection({ isReadOnly: true });

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Show in editor: Figure 2",
      }).disabled
    ).toBe(true);
  });

  it("waits for the import's uploads before reporting on refs", () => {
    renderSection({ uploadState: undefined, uploadsLoading: true });

    expect(rows()[0]?.text).not.toContain("Upload missing");
    expect(rows()[1]?.text).toContain("Stored");
  });

  it("counts processed figures and errors once settled", () => {
    renderSection();

    expect(statusPills()).toEqual(["3 figures processed", "1 Error"]);
  });

  it("counts settled figures while uploads are in progress", () => {
    renderSection({
      uploadState: { ...FAILED_UPLOAD, settled: false, uploads: [] },
      uploadsLoading: true,
    });

    expect(statusPills()).toEqual(["Processing: 3 / 4 figures"]);
  });

  it("counts figures without a source as errors", () => {
    renderSection({ body: ":::image\n:::" });

    expect(statusPills()).toEqual(["0 figures processed", "1 Error"]);
  });

  it("shows where a failed upload was copied from, with a link to it", () => {
    renderSection();

    expect(rows()[0]?.text).toContain("Image · from drive.google.com");
    const link = screen.getByRole("link", {
      name: "Open the original file (opens in a new tab)",
    });
    expect(link.getAttribute("href")).toBe(
      "https://drive.google.com/file/d/abc/view"
    );
  });

  it("shows where media still being copied came from, without a link", () => {
    renderSection({
      uploadState: {
        ...FAILED_UPLOAD,
        settled: false,
        uploads: [
          {
            id: "u1",
            ref: "raven-media://media-1",
            status: "active",
            url: null,
            error: null,
            source: { type: "bytes", filename: "image.png" },
          },
        ],
      },
    });

    expect(rows()[0]?.text).toContain("Image · embedded in the doc");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("lists media without a source as needing fixing", () => {
    renderSection({ body: ":::image\n:::" });

    const list = screen.getByRole("list", { name: "Figures that need fixing" });
    expect(list.textContent).toContain(
      "This media has no source. Add one in the editor."
    );
  });

  it("pins figures that need fixing above the others, with the import's error", () => {
    renderSection();

    const pinned = screen.getByRole("list", {
      name: "Figures that need fixing",
    });
    expect(within(pinned).getAllByRole("listitem")).toHaveLength(1);
    expect(pinned.textContent).toContain("Figure 1");
    const describedBy = screen
      .getByRole("button", { name: "Show in editor: Figure 1" })
      .getAttribute("aria-describedby");
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe(
      "The source couldn't be fetched."
    );
    expect(
      within(screen.getByRole("list", { name: "Other figures" })).getAllByRole(
        "listitem"
      )
    ).toHaveLength(3);
  });

  it("keeps figures that need fixing visible when collapsed", () => {
    renderSection({ collapsed: true });

    expect(
      screen.getByRole("list", { name: "Figures that need fixing" })
    ).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Other figures" })).toBeNull();
  });

  it("has nothing to collapse when every figure needs fixing", () => {
    renderSection({ body: ":::image\n:::" });

    expect(
      screen.queryByRole("list", { name: /^(Figures|Other figures)$/ })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /collapse|expand/i })
    ).toBeNull();
  });

  it("isn't shown when the body has no figures", () => {
    const { container } = renderSection({ body: "Just text." });

    expect(container.innerHTML).toBe("");
  });

  it("gives each row an id to link to, from where its figure starts", () => {
    renderSection();

    expect(rows().map(({ row }) => row.id)).toEqual([
      "figure-1-1",
      "figure-9-1",
      "figure-14-1",
      "figure-20-1",
    ]);
  });
});
