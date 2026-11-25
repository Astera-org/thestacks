import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOpenEditor } from "./useOpenEditor";

const navigate = vi.fn();
const postEditPublication = vi.fn();
const toastError = vi.fn();

vi.mock("@/hooks/useAppNavigate", () => ({ default: () => navigate }));
vi.mock("@/apiv1/publications", () => ({
  postEditPublication: (slug: string) => postEditPublication(slug)
}));
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m) } }));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("useOpenEditor", () => {
  beforeEach(() => {
    navigate.mockReset();
    postEditPublication.mockReset();
    toastError.mockReset();
  });

  it("gets or creates the draft and opens the new editor", async () => {
    postEditPublication.mockResolvedValue({
      publicationId: "01ABC",
      slug: "atlas",
      versionId: "v"
    });
    const { result } = renderHook(() => useOpenEditor("atlas"), { wrapper });

    act(() => result.current.openEditor());

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/publications/01abc/edit")
    );
    expect(postEditPublication).toHaveBeenCalledWith("atlas");
  });

  it("ignores repeat clicks while opening", async () => {
    postEditPublication.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOpenEditor("atlas"), { wrapper });

    act(() => result.current.openEditor());
    await waitFor(() => expect(result.current.isOpening).toBe(true));
    act(() => result.current.openEditor());

    expect(postEditPublication).toHaveBeenCalledTimes(1);
  });

  it("tells the user when the editor can't be opened", async () => {
    postEditPublication.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useOpenEditor("atlas"), { wrapper });

    act(() => result.current.openEditor());

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.isOpening).toBe(false);
  });
});
