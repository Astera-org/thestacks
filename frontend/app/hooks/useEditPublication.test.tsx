import { RequestError } from "@/api/errors";
import { DraftResponse, PatchResponseV1 } from "@/apiv1/publications";
import { FieldName } from "@/hooks/use-edit-publication/fields";
import { CommitHandle, FieldError } from "@/hooks/use-edit-publication/types";
import { PublicationV1 } from "@/types/v1";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "./use-edit-publication/conflict-error";
import {
  setDraftPublicationField,
  useEditPublication,
} from "./useEditPublication";

vi.mock("@/apiv1/publications", () => ({
  getDraftById: vi.fn(),
  patchPublicationById: vi.fn(),
}));

const { getDraftById, patchPublicationById } =
  await import("@/apiv1/publications");
const mockedGetDraftById = vi.mocked(getDraftById);
const mockedPatchPublicationById = vi.mocked(patchPublicationById);

function makePublication(
  overrides: Partial<PublicationV1> = {}
): PublicationV1 {
  return {
    id: "1",
    slug: "my-pub",
    parentId: null,
    templateId: null,
    latestVersionId: null,
    title: "Original Title",
    subtitle: null,
    abstract: "Abstract",
    doi: null,
    body: "Body",
    versionDesc: null,
    versionNumber: 1,
    versionId: "1",
    state: "DRAFT",
    license: "CC BY",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: null,
    contributors: [],
    references: [],
    pdfUrl: null,
    mediaAssets: [],
    stats: {
      sections: 1,
      audio: 2,
      images: 3,
      videos: 4,
      iframes: 5,
      tables: 6,
      citations: 7,
    },
    ...overrides,
  };
}

function makeDraftResponse(publication: PublicationV1): DraftResponse {
  return { publication, validationErrors: [] };
}

function makePatchResponse(
  publication: PublicationV1,
  rejected?: Partial<Record<FieldName, FieldError>>
): PatchResponseV1 {
  return { publication, applied: [], rejected, validationErrors: [] };
}

function renderEditPublication(publicationId = "pub-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  const view = renderHook(({ id }) => useEditPublication(id), {
    wrapper: Wrapper,
    initialProps: { id: publicationId },
  });
  return { ...view, queryClient };
}

async function waitUntilLoaded(
  result: ReturnType<typeof renderEditPublication>["result"]
) {
  await waitFor(() => expect(result.current.status.status).toBe("loaded"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEditPublication", () => {
  it("loads the server publication and reports a loaded status", async () => {
    mockedGetDraftById.mockResolvedValue(
      makeDraftResponse(makePublication({ title: "Hello" }))
    );

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    expect(result.current.publication?.title).toBe("Hello");
    expect(result.current.isDirty).toBe(false);
    expect(mockedGetDraftById).toHaveBeenCalledWith("pub-1");
  });

  it("exposes a 403 as loadError without retrying", async () => {
    mockedGetDraftById.mockRejectedValue(
      new RequestError(
        { kind: "http", status: 403, message: "Permission denied" },
        new AxiosError("Request failed with status code 403")
      )
    );

    const { result } = renderEditPublication();

    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(result.current.loadError).toBeInstanceOf(RequestError);
    expect(result.current.publication).toBeUndefined();
    expect(mockedGetDraftById).toHaveBeenCalledTimes(1);
  });

  it("exposes a 404 as loadError without retrying", async () => {
    mockedGetDraftById.mockRejectedValue(
      new RequestError(
        { kind: "http", status: 404, message: "No draft found" },
        new AxiosError("Request failed with status code 404")
      )
    );

    const { result } = renderEditPublication();

    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(mockedGetDraftById).toHaveBeenCalledTimes(1);
  });

  it("retries a 500 before exposing it, and reload() recovers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGetDraftById.mockRejectedValue(
      new RequestError(
        { kind: "http", status: 500, message: "Internal Server Error" },
        new AxiosError("Request failed with status code 500")
      )
    );

    const { result } = renderEditPublication();

    // Default backoff: 1s, 2s, 4s between the four attempts.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(result.current.loadError).toBeInstanceOf(RequestError);
    expect(mockedGetDraftById).toHaveBeenCalledTimes(4);

    mockedGetDraftById.mockResolvedValue(
      makeDraftResponse(makePublication({ title: "Back" }))
    );
    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.publication?.title).toBe("Back"));
    expect(result.current.loadError).toBeNull();
  });

  it("sends a committed change on flush and applies the server's response", async () => {
    const original = makePublication({ title: "Original" });
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));
    mockedPatchPublicationById.mockResolvedValue(
      makePatchResponse({ ...original, title: "Updated" })
    );

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    act(() => {
      result.current.commit("title", "Updated");
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.flush();
    });

    await waitFor(() => expect(result.current.status.status).toBe("saved"));

    expect(mockedPatchPublicationById).toHaveBeenCalledWith("pub-1", {
      title: "Updated",
    });
    expect(result.current.publication?.title).toBe("Updated");
    expect(result.current.isDirty).toBe(false);
  });

  it("scopes saving state and save times to the fields asked about", async () => {
    const original = makePublication();
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));
    mockedPatchPublicationById.mockResolvedValue(
      makePatchResponse({ ...original, title: "Updated" })
    );

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);
    expect(result.current.statusForFields(["title"]).status).toBe("loaded");

    act(() => {
      result.current.commit("title", "Updated");
    });
    expect(result.current.statusForFields(["title"]).status).toBe("saving");
    expect(result.current.statusForFields(["slug"]).status).toBe("loaded");

    act(() => {
      result.current.flush();
    });
    await waitFor(() =>
      expect(result.current.statusForFields(["title"]).status).toBe("saved")
    );

    expect(result.current.statusForFields(["title"]).lastUpdated).toEqual(
      result.current.status.lastUpdated
    );
    expect(result.current.statusForFields(["slug"])).toEqual({
      status: "loaded",
      lastUpdated: null,
    });
  });

  it("treats a commit matching the current server value as a no-op", async () => {
    mockedGetDraftById.mockResolvedValue(
      makeDraftResponse(makePublication({ title: "Same" }))
    );

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    let handle: CommitHandle | undefined;
    act(() => {
      handle = result.current.commit("title", "Same");
    });

    await expect(handle!.result).resolves.toEqual({
      outcomes: { title: "no-op" },
      errors: undefined,
    });
    expect(result.current.isDirty).toBe(false);
    expect(mockedPatchPublicationById).not.toHaveBeenCalled();

    // A commit that settles entirely synchronously still gets recorded, so
    // lookupCommit can find it instead of reporting "unknown" forever.
    const lookup = result.current.lookupCommit(handle!.id);
    expect(lookup.status).toBe("settled");
    if (lookup.status === "settled") {
      expect(lookup.result).toEqual({
        outcomes: { title: "no-op" },
        errors: undefined,
      });
    }
  });

  it("cancels a still-queued edit that reverts to the server value before it flushes", async () => {
    const original = makePublication({ title: "Original" });
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    vi.useFakeTimers();

    let firstEdit: CommitHandle | undefined;
    act(() => {
      firstEdit = result.current.commit("title", "Originalx");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    let revert: CommitHandle | undefined;
    act(() => {
      revert = result.current.commit("title", "Original");
    });

    // Resolves as a no-op immediately, without waiting on a flush.
    await expect(revert!.result).resolves.toEqual({
      outcomes: { title: "no-op" },
      errors: undefined,
    });
    expect(result.current.isDirty).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // The reverted value never gets sent — nor does the stale one it replaced.
    expect(mockedPatchPublicationById).not.toHaveBeenCalled();
    // The stale edit didn't itself match the server — it was overtaken by
    // the revert, same as any other supersede.
    await expect(firstEdit!.result).resolves.toEqual({
      outcomes: { title: "superseded" },
      errors: undefined,
    });
  });

  it("rejects an invalid value client-side without buffering or hitting the server", async () => {
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(makePublication()));

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    let handle: CommitHandle | undefined;
    act(() => {
      // `title`'s schema caps it at 255 characters.
      handle = result.current.commit("title", "x".repeat(300));
    });

    const settled = await handle!.result;
    expect(settled.outcomes.title).toBe("rejected");
    expect(settled.errors?.title?.message).toBeTruthy();
    expect(result.current.isDirty).toBe(false);
    expect(mockedPatchPublicationById).not.toHaveBeenCalled();
  });

  it("debounces rapid commits to the same field into a single flush", async () => {
    const original = makePublication({ title: "Original" });
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));
    mockedPatchPublicationById.mockResolvedValue(
      makePatchResponse({ ...original, title: "C" })
    );

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    vi.useFakeTimers();

    act(() => {
      result.current.commit("title", "A");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockedPatchPublicationById).not.toHaveBeenCalled();

    // A second commit inside the debounce window resets the clock — if it
    // didn't, "A" would flush at the 1000ms mark from the first commit.
    act(() => {
      result.current.commit("title", "B");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockedPatchPublicationById).not.toHaveBeenCalled();

    act(() => {
      result.current.commit("title", "C");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockedPatchPublicationById).toHaveBeenCalledTimes(1);
    expect(mockedPatchPublicationById).toHaveBeenCalledWith("pub-1", {
      title: "C",
    });
  });

  it("surfaces a conflict without retrying or re-flushing, and refetches the draft", async () => {
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(makePublication()));
    mockedPatchPublicationById.mockRejectedValue(new ConflictError(2));

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    act(() => {
      result.current.commit("title", "Updated");
      result.current.flush();
    });

    await waitFor(() => expect(result.current.status.status).toBe("conflict"));

    // No retry for a conflict itself (`retry` returns false for
    // ConflictError), and the drain effect stays paused while `conflict` is
    // set — otherwise the folded-back batch would re-flush on the very next
    // render, hit the same conflict again, and loop with no backoff.
    expect(mockedPatchPublicationById).toHaveBeenCalledTimes(1);
    // The stale draft is invalidated, so it's refetched...
    await waitFor(() => expect(mockedGetDraftById).toHaveBeenCalledTimes(2));
    // ...but the edit is still buffered, waiting for an explicit retry —
    // it isn't silently dropped just because the batch was rejected.
    expect(result.current.isDirty).toBe(true);
    expect(mockedPatchPublicationById).toHaveBeenCalledTimes(1);
  });

  it("blocks the drain loop and records the transport error once retries are exhausted", async () => {
    mockedGetDraftById.mockResolvedValue(makeDraftResponse(makePublication()));
    mockedPatchPublicationById.mockRejectedValue(new Error("network down"));

    const { result } = renderEditPublication();
    await waitUntilLoaded(result);

    vi.useFakeTimers();

    act(() => {
      result.current.commit("title", "Updated");
      result.current.flush();
    });

    // The mutation retries up to 3 times (500ms, 1000ms, 2000ms backoff — a
    // little over 3500ms total) before the hook's own effect ever sees the
    // final rejection. Stop right after that first burst: once `transportFail`
    // dispatches, the separate "back off, then try again" effect schedules its
    // own `unblock` and a second burst starts, which would make the call
    // count and status here depend on exactly how far past that we advance.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.transportError?.message).toBe("network down");
    expect(mockedPatchPublicationById).toHaveBeenCalledTimes(4); // 1 attempt + 3 retries
  });

  it("beacons unsaved work and resets state when the publicationId changes", async () => {
    mockedGetDraftById.mockImplementation((id: string) =>
      Promise.resolve(
        makeDraftResponse(
          makePublication({ id: id === "pub-1" ? "1" : "2", slug: id })
        )
      )
    );
    // The beacon goes through the authenticated API client, fire and forget.
    mockedPatchPublicationById.mockResolvedValue(
      makePatchResponse(makePublication({ id: "1", slug: "pub-1" }))
    );

    const { result, rerender } = renderEditPublication("pub-1");
    await waitUntilLoaded(result);

    act(() => {
      result.current.commit("title", "Unsaved edit");
    });
    expect(result.current.isDirty).toBe(true);

    rerender({ id: "pub-2" });

    await waitFor(() =>
      expect(mockedPatchPublicationById).toHaveBeenCalledWith("pub-1", {
        title: "Unsaved edit",
      })
    );

    await waitFor(() => expect(result.current.publication?.slug).toBe("pub-2"));
    expect(result.current.isDirty).toBe(false);
  });

  it("records a field saved outside the PATCH when the draft has no validationErrors", async () => {
    // The API omits validationErrors for a draft that is ready to publish.
    mockedGetDraftById.mockResolvedValue({ publication: makePublication() });

    const { result, queryClient } = renderEditPublication();
    await waitUntilLoaded(result);

    act(() => {
      setDraftPublicationField(queryClient, "pub-1", "doi", "10.1234/abcd");
    });

    await waitFor(() =>
      expect(result.current.publication?.doi).toBe("10.1234/abcd")
    );
    expect(result.current.fieldErrors).toEqual([]);
  });

  describe("replaceFields", () => {
    it("drops unsaved edits to the fields, writes, then reloads the draft", async () => {
      mockedGetDraftById
        .mockResolvedValueOnce(makeDraftResponse(makePublication()))
        .mockResolvedValueOnce(
          makeDraftResponse(makePublication({ title: "Imported" }))
        );
      const write = vi.fn().mockResolvedValue("written");

      const { result } = renderEditPublication();
      await waitUntilLoaded(result);

      act(() => {
        result.current.commit("title", "Typed");
      });
      let returned: unknown;
      await act(async () => {
        returned = await result.current.replaceFields(["title"], write);
      });

      expect(returned).toBe("written");
      expect(write).toHaveBeenCalledTimes(1);
      expect(result.current.publication?.title).toBe("Imported");
      expect(result.current.isDirty).toBe(false);
      // The dropped edit never reaches the server, even after its debounce.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(mockedPatchPublicationById).not.toHaveBeenCalled();
    });

    it("waits for an autosave in flight before writing", async () => {
      const original = makePublication();
      mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));
      let finishPatch: (response: PatchResponseV1) => void = () => {};
      mockedPatchPublicationById.mockReturnValue(
        new Promise((resolve) => {
          finishPatch = resolve;
        })
      );
      const write = vi.fn().mockResolvedValue(undefined);

      const { result } = renderEditPublication();
      await waitUntilLoaded(result);

      act(() => {
        result.current.commit("abstract", "Saved first");
        result.current.flush();
      });
      await waitFor(() =>
        expect(mockedPatchPublicationById).toHaveBeenCalled()
      );
      let replaced: Promise<unknown> | undefined;
      act(() => {
        replaced = result.current.replaceFields(["title"], write);
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(write).not.toHaveBeenCalled();

      await act(async () => {
        finishPatch(
          makePatchResponse({ ...original, abstract: "Saved first" })
        );
        await replaced;
      });
      expect(write).toHaveBeenCalledTimes(1);
    });

    it("queues the dropped edits again if the write fails", async () => {
      const original = makePublication();
      mockedGetDraftById.mockResolvedValue(makeDraftResponse(original));
      mockedPatchPublicationById.mockResolvedValue(
        makePatchResponse({ ...original, title: "Typed" })
      );
      const failure = new Error("The doc is private");

      const { result } = renderEditPublication();
      await waitUntilLoaded(result);

      act(() => {
        result.current.commit("title", "Typed");
      });
      await act(async () => {
        await expect(
          result.current.replaceFields(["title"], () => Promise.reject(failure))
        ).rejects.toBe(failure);
      });

      expect(result.current.publication?.title).toBe("Typed");
      act(() => {
        result.current.flush();
      });
      await waitFor(() =>
        expect(mockedPatchPublicationById).toHaveBeenCalledWith("pub-1", {
          title: "Typed",
        })
      );
    });
  });
});
