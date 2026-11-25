import { RequestError, ValidationIssue } from "@/api/errors";
import {
  type DraftResponse,
  getDraftById,
  patchPublicationById,
} from "@/apiv1/publications";
import {
  FIELD_NAMES,
  FieldName,
  FIELDS,
  toRequestBody,
} from "@/hooks/use-edit-publication/fields";
import {
  EditPublicationStatus,
  SaveStatus,
} from "@/hooks/use-edit-publication/types";
import { buildPublishSchema } from "@/lib/validators/publications/publish";
import useDoiSaveStore, { type DoiSaveStatus } from "@/store/doiSaveStore";
import { ImportDocumentV1, PublicationV1, VersionInfoV1 } from "@/types/v1";
import {
  onlineManager,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import isEqual from "lodash.isequal";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
} from "react";
import { ConflictError } from "./use-edit-publication/conflict-error";
import { Deferred } from "./use-edit-publication/deferred";
import { makeInitialState } from "./use-edit-publication/make-initial-state";
import { reducer, resultOf } from "./use-edit-publication/reducer";
import {
  Changes,
  Commit,
  CommitHandle,
  CommitId,
  CommitLookup,
  CommitOutcome,
  CommitResult,
  FieldError,
  FieldStatus,
  Layer,
  LookupCommit,
  State,
  StatusFor,
} from "./use-edit-publication/types";

const DEFAULT_DEBOUNCE = 1_000;

/* ------------------------------------------------------------------ *
 * 5. Read resolution
 *
 * has() rather than ?? — a pending value of null (clearing a subtitle)
 * is meaningful and must not fall through to the server value.
 * ------------------------------------------------------------------ */

function resolveField<T extends FieldName>(
  state: State<T>,
  server: PublicationV1 | undefined,
  field: T
): PublicationV1[T] | undefined {
  if (state.pending.has(field)) return state.pending.get(field)!.value;
  if (state.inflight?.has(field)) return state.inflight.get(field)!.value;
  if (state.rejected.has(field)) return state.rejected.get(field)!.value;
  return server?.[field];
}

/**
 * Last-ditch send for buffered work when the editor is going away — unmount,
 * or a route param change. Fire and forget: no If-Match, no response handling,
 * because there is no longer a component to show a conflict to.
 */
function beaconPending(id: string, pending: Layer): void {
  if (pending.size === 0 || !onlineManager.isOnline()) return;
  patchPublicationById(id, toRequestBody(pending)).catch(() => {});
}

function isClientError(error: Error): boolean {
  return (
    error instanceof RequestError &&
    error.apiError.kind === "http" &&
    error.apiError.status >= 400 &&
    error.apiError.status < 500
  );
}

export type UseEditPublication = {
  commit: Commit;
  errorFor: (field: FieldName) => FieldError | undefined;
  /** Some field was rejected by the server and is held until edited again. */
  hasRejected: boolean;
  isDirty: boolean;
  isLoading: boolean;
  isOnline: boolean;
  isReadOnly: boolean;
  /** Why the draft couldn't be loaded, e.g. a 403 when the user lacks access. */
  loadError: Error | null;
  lookupCommit: LookupCommit;
  fieldErrors: ValidationIssue[];
  /** Send anything buffered right now — blur handlers, explicit Save. */
  flush: () => void;
  publication: PublicationV1 | undefined;
  /** Fetch the draft again, e.g. after a failed load. */
  reload: () => void;
  /**
   * Runs `write`, a change to `fields` made outside the PATCH that replaces
   * them wholesale (e.g. re-importing the doc), once any autosave in flight
   * has finished, then fetches the draft again. Unsaved edits to those fields
   * are dropped first, and queued again if `write` fails.
   */
  replaceFields: <T>(
    fields: FieldName[],
    write: () => Promise<T>
  ) => Promise<T>;
  /** Clear a transport block and try again immediately. */
  retry: () => void;
  serverPublication: PublicationV1 | undefined;
  setFieldErrors: (fieldErrors: ValidationIssue[]) => void;
  status: EditPublicationStatus;
  /** Per-field pipeline state, for inline spinners and check marks. */
  statusFor: (field: FieldName) => FieldStatus;
  /** Save status scoped to a section's fields; see SECTION_FIELDS. */
  statusForFields: (fields: readonly FieldName[]) => EditPublicationStatus;
  transportError: Error | null;
  validatePublication: () => boolean;
};

/** Query key for the editor's draft, used by the hook and the helpers below. */
const draftQueryKey = (publicationId: string) =>
  ["publication", publicationId, "draft"] as const;

/**
 * Record a field saved outside the PATCH (e.g. the DOI) in the draft cache,
 * so `publication` shows it without knowing the cache's shape.
 */
export function setDraftPublicationField<F extends keyof PublicationV1>(
  queryClient: QueryClient,
  publicationId: string,
  field: F,
  value: PublicationV1[F]
): void {
  queryClient.setQueryData<DraftResponse>(
    draftQueryKey(publicationId),
    (prev) =>
      prev
        ? {
            publication: { ...prev.publication, [field]: value },
            // The saved value supersedes any error reported for the field.
            validationErrors: (prev.validationErrors ?? []).filter(
              (issue) => issue.path[0] !== field
            ),
          }
        : prev
  );
}

const DOI_SAVE_MESSAGES: Record<DoiSaveStatus, string> = {
  saving: "Your DOI correction is still saving",
  failed: "Your DOI correction didn't save",
};

const DOI_SAVE_CODE_PREFIX = "doi_save_";

/**
 * The release blocker for a DOI save that is still running or failed.
 * Release is blocked until it settles, so a publish can't lock in the DOI
 * the correction was replacing.
 */
function doiSaveIssue(save: DoiSaveStatus): ValidationIssue {
  return {
    code: `${DOI_SAVE_CODE_PREFIX}${save}`,
    path: ["doi"],
    message: DOI_SAVE_MESSAGES[save],
  };
}

/**
 * Mutation scope for writes to the draft. Mutations sharing it run one at a
 * time, so a write outside the PATCH (e.g. the DOI save) never overlaps an
 * autosave whose response would carry the old value back into the cache.
 */
export const draftMutationScope = (publicationId: string) => ({
  id: `publication:${publicationId}`,
});

/** Most recent server save across `fields`, or null if none saved yet. */
function lastSavedAt(state: State, fields: readonly FieldName[]): Date | null {
  const times = fields.flatMap((f) => state.savedAt.get(f) ?? []);
  return times.length ? new Date(Math.max(...times)) : null;
}

/**
 * With `fields`, only those fields count as dirty, so a section isn't marked
 * saving or failed because of another section's edits. Conflict stays global:
 * the whole row changed underneath us.
 */
const getStatus = (
  state: State,
  lastUpdated: Date | null,
  isOnline: boolean,
  fields?: readonly FieldName[]
): SaveStatus => {
  if (state.conflict) return "conflict";
  const dirty = fields
    ? fields.some((f) => state.pending.has(f) || state.inflight?.has(f))
    : state.pending.size > 0 || state.inflight !== null;

  // Offline with nothing buffered is still 'saved' — the work is on the
  // server, the network is just absent.
  if (!isOnline && dirty) return "offline";

  // A transport failure pauses the drain loop for backoff — surface that
  // before "saving". `blocked` implies `pending` is non-empty (transportFail
  // folds its batch back into pending), so globally `dirty` always holds
  // here; per section it scopes the error to the fields that failed.
  if (state.blocked && dirty) return "error";

  if (dirty) return "saving";

  // Only per section: globally, "error" means a transport failure to the
  // save button, which would retry instead of asking for a fix.
  if (fields?.some((f) => state.rejected.has(f))) return "error";

  if (lastUpdated === null) {
    return "loaded";
  }
  return "saved";
};

export function useEditPublication(publicationId: string): UseEditPublication {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => draftQueryKey(publicationId), [publicationId]);
  const doiSave = useDoiSaveStore((s) => s.saves[publicationId]);

  const {
    data: server,
    error: loadError,
    isLoading,
    refetch,
  } = useQuery<DraftResponse>({
    queryKey,
    queryFn: () => getDraftById(publicationId),
    // The buffers hold unsaved work; a background refetch must not race it.
    staleTime: Infinity,
    // Drop it once the editor unmounts: a later visit (e.g. a new version after
    // a release) must load the current draft, not this session's copy.
    gcTime: 0,
    refetchOnWindowFocus: false,
    // A 4xx (no access, not found) won't change on retry.
    retry: (count, error) => !isClientError(error) && count < 3,
  });

  const [state, dispatch] = useReducer(
    reducer,
    publicationId,
    makeInitialState
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentBatch = useRef<Layer | null>(null);
  const stateRef = useRef(state);
  // Mirrors the prop so an in-flight response can tell whether
  // the editor has since moved to a different publication.
  const currentId = useRef(publicationId);
  useEffect(() => {
    currentId.current = publicationId;
  }, [publicationId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // onlineManager rather than navigator.onLine directly: it is the same
  // signal the mutation's networkMode consults, so the indicator can never
  // disagree with whether requests are actually being sent.
  const isOnline = useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true
  );

  const mutation = useMutation({
    // Serialize: only one PATCH per publication is ever open.
    scope: draftMutationScope(publicationId),
    // Offline, the batch is held rather than failed — it stays in `inflight`
    // and resumes on reconnect, so a tunnel or a sleeping laptop never
    // produces a spurious error state.
    networkMode: "online",
    retry: (count, error) => !(error instanceof ConflictError) && count < 3,
    retryDelay: (count) => Math.min(8000, 500 * 2 ** count),
    mutationFn: (batch: Layer) => {
      return patchPublicationById(publicationId, toRequestBody(batch));
    },
  });

  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  });

  // Writes made outside the PATCH that replace whole fields. Same scope, so
  // they wait for an autosave in flight and one never overlaps them.
  const replacement = useMutation({
    scope: draftMutationScope(publicationId),
    mutationFn: (write: () => Promise<unknown>) => write(),
  });
  const replaceRef = useRef(replacement.mutateAsync);
  useEffect(() => {
    replaceRef.current = replacement.mutateAsync;
  });

  /* --- Route param changed under a reused component ---------------- */
  // Only fires for a genuinely different publication now that the route is
  // keyed by id. Prefer <Editor key={id} /> at the route; this is the net.
  useEffect(() => {
    if (state.owner === publicationId) return;

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    beaconPending(state.owner, state.pending);

    sentBatch.current = null;
    dispatch({ type: "adopt", owner: publicationId });
  }, [publicationId, state.owner, state.pending]);

  const lookupCommit = useCallback(
    (id: CommitId): CommitLookup => {
      const r = state.commits.get(id);
      if (!r) return { status: "unknown" };
      if (r.settledAt === null)
        return {
          status: "pending",
          requested: r.requested,
          outstanding: [...r.outstanding],
        };
      return { status: "settled", result: resultOf(r), at: r.settledAt };
    },
    [state.commits]
  );

  /* --- Send whatever landed in inflight ---------------------------- */
  useEffect(() => {
    // Buffers belong to a publication we have navigated away from; the adopt
    // above is one dispatch behind. Never send them under the new id.
    if (state.owner !== publicationId) return;

    const batch = state.inflight;
    // Identity guard: StrictMode double-invokes effects in development.
    if (!batch || sentBatch.current === batch) return;
    sentBatch.current = batch;

    const forId = state.owner;

    mutateRef.current(batch).then(
      (response) => {
        // queryKey is captured from this effect run, so it always names the
        // publication the request was actually for. One cache write per
        // acknowledged batch, never per keystroke.
        queryClient.setQueryData<DraftResponse>(queryKey, (prev) => ({
          publication: response.publication,
          validationErrors:
            response.validationErrors ?? prev?.validationErrors ?? [],
        }));
        if (currentId.current !== forId) return;
        dispatch({ type: "settle", response, at: Date.now() });
      },
      (error: unknown) => {
        if (currentId.current !== forId) return;
        if (error instanceof ConflictError) {
          void queryClient.invalidateQueries({ queryKey });
          dispatch({ type: "conflict" });
        } else {
          dispatch({ type: "transportFail", error: error as Error });
        }
      }
    );
  }, [state.inflight, state.owner, publicationId, queryKey, queryClient]);

  /* --- Drain: pick up work that arrived during a flight ------------ */
  useEffect(() => {
    // A live debounce timer owns the next flush; don't pre-empt it.
    if (timer.current) return;

    // An unresolved conflict pauses the drain loop the same way a blocked
    // transport does — otherwise the batch `conflict` folds back into
    // `pending` would be re-flushed on the very next render, hit the same
    // conflict again, and loop with no backoff. Unlike a transport failure,
    // nothing here auto-resolves a conflict on a timer; `retry()` (or a
    // fresh commit) is the way out.
    if (
      state.inflight ||
      state.blocked ||
      state.conflict ||
      state.pending.size === 0
    )
      return;
    dispatch({ type: "flush" });
  }, [state.inflight, state.blocked, state.conflict, state.pending]);

  /* --- Back off, then try again ------------------------------------ */
  useEffect(() => {
    if (!state.blocked || !isOnline) return;
    const delay = Math.min(30_000, 2_000 * 2 ** (state.failures - 1));
    const id = setTimeout(() => dispatch({ type: "unblock" }), delay);
    return () => clearTimeout(id);
  }, [state.blocked, state.failures, isOnline]);

  /* --- Reconnect: don't sit out a backoff we no longer need -------- */
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    const reconnected = isOnline && !wasOnline.current;
    wasOnline.current = isOnline;
    if (reconnected && stateRef.current.blocked) dispatch({ type: "unblock" });
  }, [isOnline]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    dispatch({ type: "flush" });
  }, []);

  /* --- The one entry point ----------------------------------------- */
  const commit = useCallback<Commit>(
    (...args: [FieldName, unknown] | [Changes]): CommitHandle => {
      const changes: Changes =
        args.length === 2 ? { [args[0]]: args[1] } : args[0];

      const commitId = crypto.randomUUID();
      const deferred = new Deferred<CommitResult>();
      const valid = new Map<FieldName, unknown>();
      const errors: Partial<Record<FieldName, FieldError>> = {};
      const outcomes: Partial<Record<FieldName, CommitOutcome>> = {};
      const cancels: FieldName[] = [];
      let soonest = Infinity;

      const data = queryClient.getQueryData<DraftResponse>(queryKey);
      const server = data?.publication;
      const s = stateRef.current;

      for (const [key, value] of Object.entries(changes)) {
        const field = key as FieldName;
        const spec = FIELDS[field];
        if (spec) {
          const parsed = spec.schema.safeParse(value);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            outcomes[field] = "rejected";
            errors[field] = {
              code: issue?.code ?? "invalid",
              message: issue?.message ?? "That value is not valid.",
              path: issue.path,
            };
            continue;
          }
        }
        // Already sent or already failed — can't be pulled back, so a value
        // that now matches the server still has to go through as a real edit.
        const locked = s.inflight?.has(field) || s.rejected.has(field);
        if (server && !locked && isEqual(server[field], value)) {
          outcomes[field] = "no-op";
          // A still-queued edit for this field is now moot — cancel it
          // instead of leaving its stale value to be flushed as-is.
          if (s.pending.has(field)) cancels.push(field);
          continue;
        }
        valid.set(field, value);
        soonest = Math.min(soonest, spec?.debounce ?? DEFAULT_DEBOUNCE);
      }

      if (cancels.length > 0) {
        dispatch({ type: "cancelPending", fields: cancels });
      }

      // Always dispatch, even when nothing survived client validation/dedup —
      // the reducer records the commit (and settles it immediately in that
      // case) so `lookupCommit` can find it, instead of the deferred
      // resolving straight from here with no trace left in `commits`.
      dispatch({
        type: "edit",
        commitId,
        changes: valid,
        deferred,
        errors,
        outcomes,
      });

      // Nothing survived client validation — the reducer above already
      // settled the commit. Don't touch a debounce timer that may still be
      // running for someone else's pending fields.
      if (valid.size === 0) {
        return { id: commitId, result: deferred.promise };
      }

      if (timer.current) clearTimeout(timer.current);
      if (soonest === 0) {
        timer.current = null;
        dispatch({ type: "flush" });
      } else {
        timer.current = setTimeout(() => {
          timer.current = null;
          dispatch({ type: "flush" });
        }, soonest);
      }

      return { id: commitId, result: deferred.promise };
    },
    [queryClient, queryKey]
  );

  const retry = useCallback(() => {
    dispatch({ type: "unblock" });
    flush();
  }, [flush]);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const replaceFields = useCallback(
    async <T>(fields: FieldName[], write: () => Promise<T>): Promise<T> => {
      // Queued edits to these fields would otherwise be sent after `write`
      // and undo it.
      const { pending } = stateRef.current;
      const dropped = Object.fromEntries(
        fields.flatMap((field) => {
          const entry = pending.get(field);
          return entry ? [[field, entry.value]] : [];
        })
      ) as Changes;
      dispatch({ type: "cancelPending", fields });

      let result: T;
      try {
        result = (await replaceRef.current(write)) as T;
      } catch (error) {
        // Nothing was replaced, so the edits still stand.
        if (Object.keys(dropped).length > 0) commit(dropped);
        throw error;
      }
      await refetch();
      return result;
    },
    [commit, refetch]
  );

  /* --- Leaving with unsaved work ----------------------------------- */
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const s = stateRef.current;
      if (s.pending.size === 0 && !s.inflight) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const s = stateRef.current;
      beaconPending(s.owner, s.pending);
    };
  }, [publicationId]);

  /* --- Derived ------------------------------------------------------ */
  const publication: PublicationV1 | undefined = useMemo(() => {
    if (!server) {
      return undefined;
    }
    function setField<T extends FieldName>(
      target: PublicationV1,
      field: T,
      value: PublicationV1[T]
    ): void {
      target[field] = value;
    }
    const out: PublicationV1 = { ...server.publication };
    for (const field of FIELD_NAMES)
      setField(out, field, resolveField(state, server.publication, field));
    return out;
  }, [state, server]);

  const errorFor = useCallback(
    (field: FieldName) => state.rejected.get(field)?.error,
    [state.rejected]
  );

  // A field swept into someone else's flush correctly reports 'saving' —
  // it really is being written, just not by its own timer.
  const statusFor: StatusFor = useCallback(
    <T extends FieldName>(
      field: T,
      when?: (value: PublicationV1[T]) => boolean
    ): FieldStatus => {
      const matches = (value: PublicationV1[FieldName]) =>
        !when || when(value as PublicationV1[T]);

      // First layer holding the field is the one that will win, so a queued
      // upload correctly reports no pending delete even if a delete is in flight.
      if (state.pending.has(field))
        return matches(state.pending.get(field)!.value) ? "queued" : "saved";
      if (state.inflight?.has(field))
        return matches(state.inflight.get(field)!.value) ? "saving" : "saved";
      if (state.rejected.has(field))
        return matches(state.rejected.get(field)!.value) ? "rejected" : "saved";
      return "saved";
    },
    [state]
  );

  const lastUpdated = useMemo(() => lastSavedAt(state, FIELD_NAMES), [state]);

  const status: SaveStatus = useMemo(
    () => getStatus(state, lastUpdated, isOnline),
    [lastUpdated, state, isOnline]
  );

  const statusForFields = useCallback(
    (fields: readonly FieldName[]): EditPublicationStatus => {
      if (isLoading) return { status: "init", lastUpdated: null };

      const sectionUpdated = lastSavedAt(state, fields);
      return {
        status: getStatus(state, sectionUpdated, isOnline, fields),
        lastUpdated: sectionUpdated,
      };
    },
    [isLoading, isOnline, state]
  );

  const setFieldErrors = useCallback(
    (fieldErrors: ValidationIssue[]) => {
      queryClient.setQueryData<DraftResponse>(queryKey, (prev) =>
        prev
          ? {
              publication: prev.publication,
              validationErrors: fieldErrors,
            }
          : undefined
      );
    },
    [queryClient, queryKey]
  );

  const validatePublication = useCallback((): boolean => {
    const result = buildPublishSchema(false).safeParse(publication);
    const issues = [
      ...(result.success ? [] : result.error.issues),
      ...(doiSave ? [doiSaveIssue(doiSave)] : []),
    ];
    setFieldErrors(issues);
    return issues.length === 0;
  }, [publication, setFieldErrors, doiSave]);

  // A DOI blocker already on the checklist follows the save as it settles
  // (still saving → didn't save, or gone), without another release check.
  const fieldErrors = useMemo(
    () =>
      (server?.validationErrors ?? []).flatMap((issue) => {
        if (!issue.code?.startsWith(DOI_SAVE_CODE_PREFIX)) return [issue];
        return doiSave ? [doiSaveIssue(doiSave)] : [];
      }),
    [server?.validationErrors, doiSave]
  );

  const importDocument = useMemo((): ImportDocumentV1 | null => {
    if (!publication) return null;

    if (publication.importDocument) return publication.importDocument;

    const versionsWithImportDocument =
      publication.versions?.filter(
        (v) => v.importDocument != null && v.versionNumber != undefined
      ) ?? [];
    const latestPreviousVersion: VersionInfoV1 | undefined =
      versionsWithImportDocument.sort(
        (vA, vB) => vB.versionNumber! - vA.versionNumber!
      )[0];

    if (
      latestPreviousVersion == undefined ||
      latestPreviousVersion.importDocument == null
    )
      return null;

    return {
      ...latestPreviousVersion.importDocument,
      id: null,
      diagnostics: null,
      // Edits are tracked per draft; a previous version's edits don't apply here.
      editedFields: null,
      publicationVersionNumber: latestPreviousVersion.versionNumber,
    };
  }, [publication]);

  return {
    commit,
    errorFor,
    fieldErrors,
    flush,
    hasRejected: state.rejected.size > 0,
    isDirty: state.pending.size > 0 || state.inflight !== null,
    isLoading,
    isOnline,
    isReadOnly: false,
    loadError,
    lookupCommit,
    publication: publication ? { ...publication, importDocument } : publication,
    reload,
    replaceFields,
    retry,
    serverPublication: server?.publication,
    setFieldErrors,
    status: isLoading
      ? { status: "init", lastUpdated: null }
      : {
          status,
          lastUpdated,
        },
    statusFor,
    statusForFields,
    transportError: state.transportError,
    validatePublication,
  };
}
