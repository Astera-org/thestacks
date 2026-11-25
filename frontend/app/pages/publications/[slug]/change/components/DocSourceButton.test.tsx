import { ImportStatusResponse } from "@/apiv1/imports";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkedGoogleDoc } from "../linked-google-doc";
import DocSourceButton from "./DocSourceButton";

const DOC: LinkedGoogleDoc = {
  id: "i1",
  url: "https://docs.google.com/document/d/abc/edit",
  format: "gdoc",
  filename: "Field notes",
  diagnostics: null,
  publicationVersionNumber: 0,
  body: "",
};

function renderButton(
  onReimport: (url: string) => Promise<void>,
  {
    importDocument = DOC,
    uploadState,
  }: {
    importDocument?: LinkedGoogleDoc;
    uploadState?: ImportStatusResponse;
  } = {}
) {
  return render(
    <DocSourceButton
      commit={vi.fn()}
      fieldErrors={null}
      importDocument={importDocument}
      isLoading={false}
      uploadState={uploadState}
      onReimport={onReimport}
      onSwitch={vi.fn()}
    />
  );
}

describe("DocSourceButton", () => {
  it("re-syncs by re-importing the doc", async () => {
    let finish: () => void = () => {};
    const onReimport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    renderButton(onReimport);

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(onReimport).toHaveBeenCalledWith(DOC.url);
    const busy = screen.getByRole<HTMLButtonElement>("button", {
      name: "Syncing…",
    });
    expect(busy.disabled).toBe(true);
    finish();
    await waitFor(() => screen.getByRole("button", { name: "Sync" }));
  });

  it("says why a re-sync failed", async () => {
    renderButton(vi.fn().mockRejectedValue(new Error("The doc is private.")));

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The doc is private."
    );
  });

  it("shows the import's media still copying as re-syncing", () => {
    renderButton(vi.fn(), {
      uploadState: {
        publicationId: "p1",
        versionId: "v1",
        settled: false,
        uploads: [],
      },
    });

    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "Syncing…",
    });
    expect(button.disabled).toBe(true);
  });

  it("can re-sync a doc inherited from an earlier version", () => {
    const onReimport = vi.fn().mockResolvedValue(undefined);
    renderButton(onReimport, {
      importDocument: { ...DOC, id: null, publicationVersionNumber: 1 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(onReimport).toHaveBeenCalledWith(DOC.url);
  });
});
