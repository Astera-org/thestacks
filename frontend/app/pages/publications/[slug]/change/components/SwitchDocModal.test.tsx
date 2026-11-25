import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkedGoogleDoc } from "../linked-google-doc";
import SwitchDocModal from "./SwitchDocModal";

const DOC: LinkedGoogleDoc = {
  id: "i1",
  url: "https://docs.google.com/document/d/abc/edit",
  format: "gdoc",
  filename: "Field notes",
  diagnostics: null,
  publicationVersionNumber: 0,
  body: "",
};
const NEW_URL = "https://docs.google.com/document/d/new/edit";

function renderModal(onReimport: (url: string) => Promise<void>) {
  const onClose = vi.fn();
  render(
    <SwitchDocModal
      importDocument={DOC}
      open
      onClose={onClose}
      onCommit={vi.fn()}
      onReimport={onReimport}
    />
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: ` ${NEW_URL} ` },
  });
  fireEvent.click(screen.getByRole("button", { name: "Switch doc" }));
  return { onClose };
}

describe("SwitchDocModal", () => {
  it("imports the new doc into the draft, then closes", async () => {
    const onReimport = vi.fn().mockResolvedValue(undefined);
    const { onClose } = renderModal(onReimport);

    expect(onReimport).toHaveBeenCalledWith(NEW_URL);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("stays open to say why the import failed", async () => {
    const { onClose } = renderModal(
      vi.fn().mockRejectedValue(new Error("The doc is private."))
    );

    expect(await screen.findByText("The doc is private.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
