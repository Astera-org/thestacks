import { ImportDiagnosticV1, PublicationV1 } from "@/types/v1";
import { renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImportResultToast } from "./use-import-result-toast";

const { success, warning } = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success, warning } }));

const DIAGNOSTIC: ImportDiagnosticV1 = {
  code: "media-invalid-src",
  severity: "warning",
  message: "Bad image source",
  path: ["body"],
};

function makePublication(
  diagnostics: ImportDiagnosticV1[] | null
): PublicationV1 {
  return {
    importDocument: {
      id: "import-1",
      body: "",
      url: "https://docs.google.com/document/d/abc/edit",
      format: "gdoc",
      diagnostics,
    },
  } as PublicationV1;
}

function render(
  publication: PublicationV1 | undefined,
  state: unknown = { justImported: true }
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter
      initialEntries={[{ pathname: "/publications/p/edit", state }]}
    >
      {children}
    </MemoryRouter>
  );
  return renderHook(
    ({ pub }) => {
      useImportResultToast(pub);
      return useLocation();
    },
    { initialProps: { pub: publication }, wrapper }
  );
}

describe("useImportResultToast", () => {
  beforeEach(() => {
    success.mockClear();
    warning.mockClear();
  });

  it("warns when the import has diagnostics", () => {
    render(makePublication([DIAGNOSTIC]));
    expect(warning).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
  });

  it("reports success when the import has no diagnostics", () => {
    render(makePublication([]));
    expect(success).toHaveBeenCalledTimes(1);
    expect(warning).not.toHaveBeenCalled();
  });

  it("waits for the draft to load", () => {
    const { rerender } = render(undefined);
    expect(warning).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();

    rerender({ pub: makePublication([DIAGNOSTIC]) });
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("says nothing when the page wasn't opened by an import", () => {
    render(makePublication([DIAGNOSTIC]), null);
    expect(warning).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it("clears the navigation state so it only shows once", () => {
    const { result, rerender } = render(makePublication([DIAGNOSTIC]));
    expect(result.current.state).toBeNull();

    rerender({ pub: makePublication([DIAGNOSTIC, DIAGNOSTIC]) });
    expect(warning).toHaveBeenCalledTimes(1);
  });
});
