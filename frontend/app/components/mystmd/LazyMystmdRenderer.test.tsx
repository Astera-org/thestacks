import type { PublicationMdast } from "@/apiv1/mdast";
import type { Publication } from "@/types";
import { render, screen } from "@testing-library/react";
import { act, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import LazyMystmdRenderer, { loadMystmdRenderer } from "./LazyMystmdRenderer";

vi.mock("@/components/mystmd/MystmdRenderer", () => ({
  default: () => <h2>Methods</h2>
}));

describe("LazyMystmdRenderer", () => {
  it("renders without suspending once loaded", async () => {
    await loadMystmdRenderer();

    render(
      <Suspense fallback={<p>Loading</p>}>
        <LazyMystmdRenderer
          fallback={null}
          mdast={{} as PublicationMdast}
          publication={{} as Publication}
        />
      </Suspense>
    );

    expect(screen.getByRole("heading", { name: "Methods" })).toBeTruthy();
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("renders the fallback when the download fails", async () => {
    vi.resetModules();
    vi.doMock("./MystmdRenderer", () => {
      throw new Error("offline");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: FailingLazyMystmdRenderer, loadMystmdRenderer: load } =
      await import("./LazyMystmdRenderer");
    await load();

    await act(async () => {
      render(
        <Suspense fallback={<p>Loading</p>}>
          <FailingLazyMystmdRenderer
            fallback={<p>Older renderer</p>}
            mdast={{} as PublicationMdast}
            publication={{} as Publication}
          />
        </Suspense>
      );
    });

    expect(screen.getByText("Older renderer")).toBeTruthy();
    vi.doUnmock("./MystmdRenderer");
  });
});
