import { create } from "zustand";

/** Where an unsettled self-managed DOI save stands. Absent means settled. */
export type DoiSaveStatus = "saving" | "failed";

interface DoiSaveStoreState {
  /** Unsettled DOI saves, by publication id. */
  saves: Record<string, DoiSaveStatus>;
  start: (publicationId: string) => void;
  fail: (publicationId: string) => void;
  settle: (publicationId: string) => void;
  /** Drops a failed save superseded another way (a managed mint). */
  clearFailed: (publicationId: string) => void;
}

function without(
  saves: Record<string, DoiSaveStatus>,
  publicationId: string
): Record<string, DoiSaveStatus> {
  const { [publicationId]: _dropped, ...rest } = saves;
  return rest;
}

/**
 * Tracks self-managed DOI saves that are still running or failed, so release
 * can be blocked until they settle. The DOI is saved outside the editor's
 * PATCH, so the editor can't see it otherwise.
 *
 * `DoiRow` writes it from the save's lifecycle; `useEditPublication` reads it.
 */
const useDoiSaveStore = create<DoiSaveStoreState>((set) => ({
  saves: {},
  start: (publicationId) =>
    set(({ saves }) => ({ saves: { ...saves, [publicationId]: "saving" } })),
  fail: (publicationId) =>
    set(({ saves }) => ({ saves: { ...saves, [publicationId]: "failed" } })),
  settle: (publicationId) =>
    set(({ saves }) => ({ saves: without(saves, publicationId) })),
  clearFailed: (publicationId) =>
    set(({ saves }) =>
      saves[publicationId] === "failed"
        ? { saves: without(saves, publicationId) }
        : { saves }
    )
}));

export default useDoiSaveStore;
