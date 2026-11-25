import {
  getDoi,
  getDraftDoiEligibility,
  mintDoi,
  saveSelfManagedDoi,
} from "@/apiv1/doi";
import {
  getDraftById,
  patchPublicationById,
  PatchResponseV1,
} from "@/apiv1/publications";
import { useEditPublication } from "@/hooks/useEditPublication";
import { FOS_SUBJECT_SCHEME } from "@/lib/fos-subjects";
import useDoiSaveStore from "@/store/doiSaveStore";
import { PublicationV1 } from "@/types/v1";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DoiRow from "./DoiRow";
import { ReleaseTasks } from "./ReleaseTasks";

vi.mock("@/apiv1/doi", () => ({
  getDoi: vi.fn(),
  getDraftDoiEligibility: vi.fn(),
  mintDoi: vi.fn(),
  saveSelfManagedDoi: vi.fn(),
}));

vi.mock("@/apiv1/publications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/apiv1/publications")>()),
  getDraftById: vi.fn(),
  patchPublicationById: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // DOI save status outlives the QueryClient, and every test uses pub-1.
  useDoiSaveStore.setState({ saves: {} });
});

function renderDoiRow(publication: Partial<PublicationV1>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DoiRow
        disabled
        isPreviouslyPublished
        publication={{ id: "pub-1", ...publication } as PublicationV1}
        publicationId="pub-1"
        status={{ status: "saved", lastUpdated: null }}
      />
    </QueryClientProvider>
  );
}

/**
 * Renders DoiRow on a draft the way the editor page does: `publication` comes
 * from the real useEditPublication, so saves and autosaves share its cache.
 * Only the network is mocked. "Autosave title" commits and flushes a title
 * edit, to start a PATCH on demand. "Check release" runs the editor's release
 * readiness, which the real ReleaseTasks then lists. "Cached DOI" shows the
 * editor's cached value, which the Details completion check also reads.
 */
function renderDraftDoiRow(draft: Partial<PublicationV1>) {
  vi.mocked(getDraftById).mockResolvedValue({
    publication: { id: "pub-1", ...draft } as PublicationV1,
    validationErrors: [],
  });
  vi.mocked(getDraftDoiEligibility).mockResolvedValue({
    minting: false,
    selfMinting: true,
  });
  vi.mocked(saveSelfManagedDoi).mockResolvedValue();

  function Harness() {
    const { publication, commit, fieldErrors, flush, validatePublication } =
      useEditPublication("pub-1");
    const [ready, setReady] = useState<boolean | null>(null);
    if (!publication) return null;
    const isPreviouslyPublished = publication.state === "PUBLISHED";
    return (
      <>
        <button onClick={() => setReady(validatePublication())}>
          Check release
        </button>
        {ready !== null && <p>{ready ? "Release ready" : "Release blocked"}</p>}
        <p>Cached DOI: {publication.doi ?? "none"}</p>
        <ReleaseTasks
          fieldErrors={fieldErrors}
          isPreviouslyPublished={isPreviouslyPublished}
        />
        <button
          onClick={() => {
            commit("title", "Edited");
            flush();
          }}
        >
          Autosave title
        </button>
        <DoiRow
          isPreviouslyPublished={isPreviouslyPublished}
          publication={publication}
          publicationId="pub-1"
          status={{ status: "saved", lastUpdated: null }}
        />
      </>
    );
  }
  // Fail a query on its first error, so a failing check doesn't wait out
  // the default retry backoff. The editor's draft query sets its own retry.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  );
}

/** Opens the Change DOI modal and enters `suffix` (the DOI after "10."). */
async function changeDoiInModal(suffix: string) {
  fireEvent.click(await screen.findByRole("button", { name: "Change DOI" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Change this pub's DOI",
  });
  fireEvent.change(within(dialog).getByRole("textbox"), {
    target: { value: suffix },
  });
  return dialog;
}

async function closeModal() {
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

/** A draft that passes every other release check, so only the DOI can block. */
const RELEASABLE_DRAFT = {
  slug: "my-pub",
  title: "Title",
  subtitle: null,
  abstract: "",
  body: "Body",
  license: "",
  contributors: [{ inByline: true }] as PublicationV1["contributors"],
  state: "DRAFT",
  versionDesc: null,
  subjects: [
    { subject: "FOS: Biological sciences", subjectScheme: FOS_SUBJECT_SCHEME },
  ],
  doi: "10.12345/old-1234",
} satisfies Partial<PublicationV1>;

describe("DoiRow on a previously published publication", () => {
  it("shows the existing DOI as locked, read-only text", () => {
    renderDoiRow({ doi: "10.12345/abcd-1234" });

    expect(screen.getByText("12345/abcd-1234")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getAllByText("Locked").length).toBeGreaterThan(0);
  });

  it("offers no way to add a DOI when there is none", () => {
    renderDoiRow({ doi: null });

    expect(screen.getByText("No DOI set")).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(getDraftDoiEligibility).not.toHaveBeenCalled();
  });

  it("hides Change DOI for a self-managed DOI", async () => {
    renderDraftDoiRow({ state: "PUBLISHED", doi: "10.12345/abcd-1234" });

    expect(await screen.findByText("12345/abcd-1234")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change DOI" })).toBeNull();
  });
});

describe("DoiRow on a draft", () => {
  it("hides Change DOI for a DOI managed by The Stacks", async () => {
    renderDraftDoiRow({ doi: "10.83972/abcd-1234" });

    expect(await screen.findByText("83972/abcd-1234")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change DOI" })).toBeNull();
  });

  it("changes a saved self-managed DOI through the modal", async () => {
    renderDraftDoiRow({ doi: "10.12345/abcd-1234" });

    fireEvent.click(await screen.findByRole("button", { name: "Change DOI" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Change this pub's DOI",
    });
    // The field starts from the saved DOI.
    const input = within(dialog).getByRole<HTMLInputElement>("textbox");
    expect(input.value).toBe("12345/abcd-1234");
    fireEvent.change(input, { target: { value: "12345/new-5678" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("12345/new-5678")).toBeTruthy();
    expect(screen.getByText("DOI saved")).toBeTruthy();
    expect(saveSelfManagedDoi).toHaveBeenCalledWith(
      "pub-1",
      "10.12345/new-5678"
    );
  });
});

describe("DoiRow on a draft whose eligibility check failed", () => {
  it("keeps the saved DOI, and shows the error with a Retry that refetches", async () => {
    renderDraftDoiRow({ doi: "10.12345/abcd-1234" });
    vi.mocked(getDraftDoiEligibility).mockRejectedValueOnce(
      new Error("Eligibility unavailable")
    );

    expect(await screen.findByText("Eligibility unavailable")).toBeTruthy();
    expect(screen.getByText("12345/abcd-1234")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change DOI" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("button", { name: "Change DOI" })
    ).toBeTruthy();
    expect(getDraftDoiEligibility).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Eligibility unavailable")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});

describe("DoiRow saving a DOI while an autosave is in flight", () => {
  it("queues the DOI save behind the autosave, so its stale response can't revert the DOI", async () => {
    // The autosave read the publication before the DOI save, so its
    // response carries the old DOI. It finishes only when the test says so.
    let finishPatch!: (response: PatchResponseV1) => void;
    vi.mocked(patchPublicationById).mockReturnValue(
      new Promise((resolve) => {
        finishPatch = resolve;
      })
    );
    const draft = { title: "Original", doi: "10.12345/old-1234" };
    renderDraftDoiRow(draft);

    await screen.findByText("12345/old-1234");
    fireEvent.click(screen.getByRole("button", { name: "Autosave title" }));
    await waitFor(() => expect(patchPublicationById).toHaveBeenCalledTimes(1));

    const dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    // Let an unqueued DOI save run to completion before the autosave lands.
    await act(async () => {});

    await act(async () => {
      finishPatch({
        publication: {
          id: "pub-1",
          ...draft,
          title: "Edited",
        } as PublicationV1,
        applied: ["title"],
        validationErrors: [],
      });
    });

    expect(await screen.findByText("DOI saved")).toBeTruthy();
    expect(screen.getByText("12345/new-5678")).toBeTruthy();
    expect(screen.queryByText("12345/old-1234")).toBeNull();
  });
});

describe("Release while a DOI correction from the modal is pending", () => {
  it("is blocked while the DOI save is in flight, and allowed once it saves", async () => {
    renderDraftDoiRow(RELEASABLE_DRAFT);
    let finishSave!: () => void;
    vi.mocked(saveSelfManagedDoi).mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      })
    );

    const dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    await waitFor(() => expect(saveSelfManagedDoi).toHaveBeenCalled());
    // Close the modal while the save is still running, then try to release.
    await closeModal();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release blocked")).toBeTruthy();
    expect(
      screen.getByText("Your DOI correction is still saving")
    ).toBeTruthy();

    await act(async () => finishSave());
    await screen.findByText("DOI saved");
    // The successful save clears the DOI task without another check.
    expect(
      screen.queryByText("Your DOI correction is still saving")
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release ready")).toBeTruthy();
  });

  it("is blocked after a failed DOI save until a save succeeds", async () => {
    renderDraftDoiRow(RELEASABLE_DRAFT);
    vi.mocked(saveSelfManagedDoi).mockRejectedValueOnce(
      new Error("Network down")
    );

    let dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    // The failure stays in the modal.
    expect(await within(dialog).findByText("Network down")).toBeTruthy();
    await closeModal();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release blocked")).toBeTruthy();
    expect(screen.getByText("Your DOI correction didn't save")).toBeTruthy();

    dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("DOI saved")).toBeTruthy();
    expect(screen.queryByText("Your DOI correction didn't save")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release ready")).toBeTruthy();
  });

  it("still reports a save that fails after release was checked as failed", async () => {
    renderDraftDoiRow(RELEASABLE_DRAFT);
    let failSave!: (error: Error) => void;
    vi.mocked(saveSelfManagedDoi).mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        failSave = reject;
      })
    );

    const dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    await waitFor(() => expect(saveSelfManagedDoi).toHaveBeenCalled());
    await closeModal();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(
      screen.getByText("Your DOI correction is still saving")
    ).toBeTruthy();

    // The checklist follows the failure without another release check.
    await act(async () => failSave(new Error("Network down")));
    expect(
      await screen.findByText("Your DOI correction didn't save")
    ).toBeTruthy();
    expect(
      screen.queryByText("Your DOI correction is still saving")
    ).toBeNull();
  });

  it("stays blocked by a failed save after the modal is reopened and time passes", async () => {
    renderDraftDoiRow(RELEASABLE_DRAFT);
    vi.mocked(saveSelfManagedDoi).mockRejectedValueOnce(
      new Error("Network down")
    );

    const dialog = await changeDoiInModal("12345/new-5678");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save DOI" }));
    expect(await within(dialog).findByText("Network down")).toBeTruthy();
    await closeModal();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      // Reopening Change DOI resets the row's failed mutation.
      fireEvent.click(screen.getByRole("button", { name: "Change DOI" }));
      await screen.findByRole("dialog", { name: "Change this pub's DOI" });
      await closeModal();
      // Past TanStack's default 5 minute cleanup of unwatched mutations,
      // which must not take the release block with it.
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      });

      fireEvent.click(screen.getByRole("button", { name: "Check release" }));
      expect(screen.getByText("Release blocked")).toBeTruthy();
      expect(screen.getByText("Your DOI correction didn't save")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  // Known gap, kept on purpose: only a save counts as pending. A DOI typed
  // in the modal and then cancelled does not block release.
  it("is not blocked by a DOI that was typed but never saved", async () => {
    renderDraftDoiRow(RELEASABLE_DRAFT);

    await changeDoiInModal("12345/typed-not-saved");
    await closeModal();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release ready")).toBeTruthy();
    expect(saveSelfManagedDoi).not.toHaveBeenCalled();
  });
});

describe("Release after a failed self-managed save, then a managed mint", () => {
  const BOTH_OPTIONS = { minting: true, selfMinting: true };
  const NO_DOI_DRAFT = { ...RELEASABLE_DRAFT, doi: null };
  const MINTED = {
    publicationId: 1,
    slug: "my-pub",
    versionNumber: 1,
    doi: "10.83972/minted",
    versionDoi: "10.83972/minted.v1",
  };

  beforeEach(() => {
    vi.mocked(mintDoi).mockResolvedValue(MINTED);
    vi.mocked(getDoi).mockResolvedValue(null);
  });

  it("is allowed once the minted DOI supersedes the failed save", async () => {
    renderDraftDoiRow(NO_DOI_DRAFT);
    vi.mocked(getDraftDoiEligibility).mockResolvedValue(BOTH_OPTIONS);
    vi.mocked(saveSelfManagedDoi).mockRejectedValueOnce(
      new Error("Network down")
    );

    fireEvent.change(await screen.findByRole("textbox", { name: "DOI" }), {
      target: { value: "12345/self" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Save self-managed DOI/ })
    );
    expect(await screen.findByText("Network down")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Your DOI correction didn't save")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /Mint a DOI managed by The Stacks/ })
    );

    // The self-managed controls are gone, so only the mint can unblock.
    expect(await screen.findByText("83972/minted")).toBeTruthy();
    expect(screen.queryByText("Your DOI correction didn't save")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check release" }));
    expect(screen.getByText("Release ready")).toBeTruthy();
  });

  it("disables Mint while a self-managed save is pending", async () => {
    renderDraftDoiRow(NO_DOI_DRAFT);
    vi.mocked(getDraftDoiEligibility).mockResolvedValue(BOTH_OPTIONS);
    let finishSave!: () => void;
    vi.mocked(saveSelfManagedDoi).mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      })
    );

    fireEvent.change(await screen.findByRole("textbox", { name: "DOI" }), {
      target: { value: "12345/self" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Save self-managed DOI/ })
    );
    await waitFor(() => expect(saveSelfManagedDoi).toHaveBeenCalled());

    const mint = screen.getByRole<HTMLButtonElement>("button", {
      name: /Mint a DOI managed by The Stacks/,
    });
    expect(mint.disabled).toBe(true);

    // Once the save lands the row shows its DOI, so Mint is no longer offered.
    await act(async () => finishSave());
    expect(await screen.findByText("12345/self")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Mint a DOI managed by The Stacks/ })
    ).toBeNull();
    expect(mintDoi).not.toHaveBeenCalled();
  });

  it("disables the self-managed input and Save while a mint is pending", async () => {
    renderDraftDoiRow(NO_DOI_DRAFT);
    vi.mocked(getDraftDoiEligibility).mockResolvedValue(BOTH_OPTIONS);
    let finishMint!: (response: typeof MINTED) => void;
    vi.mocked(mintDoi).mockReturnValue(
      new Promise((resolve) => {
        finishMint = resolve;
      })
    );

    const input = await screen.findByRole<HTMLInputElement>("textbox", {
      name: "DOI",
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Mint a DOI managed by The Stacks/ })
    );
    await waitFor(() => expect(mintDoi).toHaveBeenCalled());

    expect(input.disabled).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /Save self-managed DOI/,
      }).disabled
    ).toBe(true);

    await act(async () => finishMint(MINTED));
    expect(await screen.findByText("83972/minted")).toBeTruthy();
    expect(saveSelfManagedDoi).not.toHaveBeenCalled();
  });
});

describe("DoiRow minting a DOI while an autosave is in flight", () => {
  it("queues the mint behind the autosave, so its stale response can't reset the cached DOI", async () => {
    vi.mocked(mintDoi).mockResolvedValue({
      publicationId: 1,
      slug: "my-pub",
      versionNumber: 1,
      doi: "10.83972/minted",
      versionDoi: "10.83972/minted.v1",
    });
    vi.mocked(getDoi).mockResolvedValue(null);
    // The autosave read the publication before the mint, so its response
    // has no DOI. It finishes only when the test says so.
    let finishPatch!: (response: PatchResponseV1) => void;
    vi.mocked(patchPublicationById).mockReturnValue(
      new Promise((resolve) => {
        finishPatch = resolve;
      })
    );
    const draft = { title: "Original", doi: null };
    renderDraftDoiRow(draft);
    vi.mocked(getDraftDoiEligibility).mockResolvedValue({
      minting: true,
      selfMinting: true,
    });

    const mint = await screen.findByRole("button", {
      name: /Mint a DOI managed by The Stacks/,
    });
    fireEvent.click(screen.getByRole("button", { name: "Autosave title" }));
    await waitFor(() => expect(patchPublicationById).toHaveBeenCalledTimes(1));

    fireEvent.click(mint);
    // Let an unqueued mint run to completion before the autosave lands.
    await act(async () => {});

    await act(async () => {
      finishPatch({
        publication: {
          id: "pub-1",
          ...draft,
          title: "Edited",
        } as PublicationV1,
        applied: ["title"],
        validationErrors: [],
      });
    });

    await waitFor(() => expect(mintDoi).toHaveBeenCalled());
    expect(await screen.findByText("Cached DOI: 10.83972/minted")).toBeTruthy();
  });
});
