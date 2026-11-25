import { ImportStatusResponse } from "@/apiv1/imports";
import { SUBTITLE_TEXT_TOO_LONG_MESSAGE } from "@/lib/validators/publications/publish";
import { ImportedFieldV1, PublicationV1 } from "@/types/v1";
import { queryResult } from "@test/queryResult";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ContentSection from "./ContentSection";

// jsdom has no matchMedia, which the editor and renderer inside the section use.
beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

function renderWithSubtitle(
  subtitle: string,
  fieldErrors: { path: string[]; message: string }[] = []
) {
  render(
    <ContentSection
      collapsed={false}
      fieldErrors={fieldErrors}
      fullEditor={{ open: false }}
      hideBody
      importStatusResult={queryResult<ImportStatusResponse>(undefined)}
      publication={{ subtitle, title: "Title" } as PublicationV1}
      status={{ status: "saved", lastUpdated: null }}
      onCommit={vi.fn()}
      onFullEditorChange={vi.fn()}
      onReimport={vi.fn()}
      onSwitchDoc={vi.fn()}
      onToggleCollapse={vi.fn()}
    />
  );
  return screen.getByDisplayValue(subtitle, { exact: true });
}

describe("ContentSection subtitle", () => {
  it("does not allow typing past the 300-character database limit", () => {
    const input = renderWithSubtitle("Short subtitle");
    expect(input.getAttribute("maxLength")).toBe("300");
  });

  it("shows an error past 280 characters of text", () => {
    const input = renderWithSubtitle("a".repeat(281));
    expect(screen.getByText(SUBTITLE_TEXT_TOO_LONG_MESSAGE)).toBeDefined();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("281 / 280")).toBeDefined();
  });

  it("does not count markdown toward the limit", () => {
    const input = renderWithSubtitle(`**${"a".repeat(280)}**`);
    expect(screen.queryByText(SUBTITLE_TEXT_TOO_LONG_MESSAGE)).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("drops a stale server length error once the subtitle is short enough", () => {
    renderWithSubtitle("Short again", [
      { path: ["subtitle"], message: SUBTITLE_TEXT_TOO_LONG_MESSAGE },
    ]);
    expect(screen.queryByText(SUBTITLE_TEXT_TOO_LONG_MESSAGE)).toBeNull();
  });
});

function renderWithEditedFields(editedFields: ImportedFieldV1[] | null) {
  render(
    <ContentSection
      collapsed={false}
      fieldErrors={[]}
      fullEditor={{ open: false }}
      hideBody
      importStatusResult={queryResult<ImportStatusResponse>(undefined)}
      publication={
        {
          title: "Title",
          importDocument: {
            body: "",
            format: "gdoc",
            url: "https://docs.google.com/document/d/abc/edit",
            syncDate: "2026-10-29T00:00:00.000Z",
            filename: "Field notes.gdoc",
            editedFields,
          },
        } as PublicationV1
      }
      status={{ status: "saved", lastUpdated: null }}
      onCommit={vi.fn()}
      onFullEditorChange={vi.fn()}
      onReimport={vi.fn()}
      onSwitchDoc={vi.fn()}
      onToggleCollapse={vi.fn()}
    />
  );
}

describe("ContentSection imported doc", () => {
  it("shows when the doc was imported, not synced", () => {
    renderWithEditedFields([]);
    expect(screen.getByText(/^imported /)).toBeDefined();
    expect(screen.queryByText(/synced/i)).toBeNull();
  });

  it.each([[[]], [null]])(
    "shows no banner when no field changed (%j)",
    (editedFields) => {
      renderWithEditedFields(editedFields);
      expect(screen.queryByText(/edited since the last sync/)).toBeNull();
    }
  );

  it.each<[ImportedFieldV1[], string]>([
    [
      ["title"],
      "1 field has been edited since the last sync — Title no longer matches the Google Doc. Syncing replaces it with the doc’s version.",
    ],
    [
      ["title", "abstract"],
      "2 fields have been edited since the last sync — Title and Abstract no longer match the Google Doc. Syncing replaces them with the doc’s version.",
    ],
    [
      ["title", "subtitle", "body"],
      "3 fields have been edited since the last sync — Title, Subtitle, and Body no longer match the Google Doc. Syncing replaces them with the doc’s version.",
    ],
  ])("names the changed fields %j", (editedFields, text) => {
    renderWithEditedFields(editedFields);
    const banner = screen.getByText(/edited since the last sync/).closest("p");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toBe(text);
    for (const field of editedFields) {
      const label = field[0].toUpperCase() + field.slice(1);
      expect(within(banner!).getByText(label).tagName).toBe("EM");
    }
  });
});
