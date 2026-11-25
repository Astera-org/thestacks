import { FieldName } from "@/hooks/use-edit-publication/fields";
import {
  Action,
  CommitId,
  CommitOutcome,
  CommitRecord,
  CommitResult,
  Entry,
  FieldError,
  Layer,
  State,
} from "@/hooks/use-edit-publication/types";
import { PublicationV1 } from "@/types/v1";
import { makeInitialState } from "./make-initial-state";

const MAX_SETTLED = 50;

function evictSettled(commits: Map<CommitId, CommitRecord>): void {
  const settled = [...commits.values()].filter((r) => r.settledAt !== null);
  if (settled.length <= MAX_SETTLED) return;
  for (const r of settled.slice(0, settled.length - MAX_SETTLED)) {
    commits.delete(r.id);
  }
}

export function resultOf(r: CommitRecord): CommitResult {
  return {
    outcomes: r.outcomes,
    errors: Object.keys(r.errors).length ? r.errors : undefined,
  };
}

function record(
  commits: Map<CommitId, CommitRecord>,
  commitId: CommitId,
  field: FieldName,
  outcome: CommitOutcome,
  error?: FieldError
): void {
  const prev = commits.get(commitId);
  if (!prev || !prev.outstanding.has(field)) return;

  const outstanding = new Set(prev.outstanding);
  outstanding.delete(field);

  const next: CommitRecord = {
    ...prev,
    outstanding,
    outcomes: { ...prev.outcomes, [field]: outcome },
    errors: error ? { ...prev.errors, [field]: error } : prev.errors,
    settledAt: outstanding.size === 0 ? Date.now() : null,
  };
  commits.set(commitId, next);

  if (next.settledAt !== null) {
    next.deferred.resolve(resultOf(next));
    evictSettled(commits);
  }
}

/** Move an entry back into pending, keeping a newer pending value if one exists. */
function foldBack(
  pending: Layer,
  commits: Map<CommitId, CommitRecord>,
  field: FieldName,
  entry: Entry
): void {
  if (pending.has(field)) {
    // A newer value already won this field; the retried batch will carry that
    // instead, so this commit never gets a server answer for it.
    record(commits, entry.commitId, field, "superseded");
    return;
  }
  pending.set(field, entry);
}

export function baseReducer(state: State, action: Action): State {
  switch (action.type) {
    case "edit": {
      const { commitId, changes, deferred, outcomes: passedOutcomes } = action;
      const pending = new Map(state.pending);
      const rejected = new Map(state.rejected);
      const commits = new Map(state.commits);

      const outcomes: Partial<Record<FieldName, CommitOutcome>> = passedOutcomes
        ? {
            ...passedOutcomes,
          }
        : {};

      for (const field of Object.keys(action.errors) as FieldName[]) {
        outcomes[field] = "rejected";
      }

      const outstanding = new Set(changes.keys());
      const commit: CommitRecord = {
        id: commitId,
        // Every field this call asked about — including ones settled
        // synchronously above (rejected, or already a no-op) — not just the
        // ones that made it into the buffer.
        requested: [
          ...new Set([
            ...changes.keys(),
            ...(Object.keys(outcomes) as FieldName[]),
          ]),
        ],
        outstanding,
        outcomes,
        errors: { ...action.errors },
        deferred,
        createdAt: Date.now(),
        // Nothing survived client validation/dedup — this commit is already
        // fully settled, same as if record() had just cleared its last
        // field. Without this, a commit like that never enters `commits` at
        // all, so lookupCommit(id) would report "unknown" for it forever.
        settledAt: outstanding.size === 0 ? Date.now() : null,
      };
      commits.set(commitId, commit);
      if (commit.settledAt !== null) {
        deferred.resolve(resultOf(commit));
        evictSettled(commits);
      }

      for (const [field, value] of changes) {
        // Whoever held this field is now superseded — for this field only.
        const prior = pending.get(field);
        if (prior) record(commits, prior.commitId, field, "superseded");

        pending.set(field, {
          value: value as PublicationV1[FieldName],
          commitId,
        });
        rejected.delete(field);
      }

      return { ...state, pending, rejected, commits };
    }

    case "flush": {
      // The reducer is the arbiter, not the caller — actions queue in order,
      // so an immediate field can dispatch edit then flush in one tick.
      if (state.inflight || state.blocked || state.pending.size === 0) {
        return state;
      }
      return { ...state, inflight: state.pending, pending: new Map() };
    }

    case "settle": {
      const batch = state.inflight;
      if (!batch) return state;

      const issues = action.response.rejected ?? {};
      const rejected = new Map(state.rejected);
      const commits = new Map(state.commits);
      const savedAt = new Map(state.savedAt);

      for (const [field, entry] of batch) {
        const issue = issues[field];
        if (!issue) {
          record(commits, entry.commitId, field, "applied");
          savedAt.set(field, action.at);
          rejected.delete(field);
        } else {
          record(commits, entry.commitId, field, "rejected", issue);
          if (!state.pending.has(field)) {
            rejected.set(field, { value: entry.value, error: issue });
          }
        }
      }

      return {
        ...state,
        inflight: null,
        rejected,
        commits,
        blocked: false,
        failures: 0,
        transportError: null,
        conflict: false,
        savedAt,
      };
    }

    case "transportFail": {
      const batch = state.inflight;
      if (!batch) return state;

      const pending = new Map(state.pending);
      const commits = new Map(state.commits);
      for (const [field, entry] of batch)
        foldBack(pending, commits, field, entry);

      return {
        ...state,
        pending,
        commits,
        inflight: null,
        blocked: true,
        failures: state.failures + 1,
        transportError: action.error,
      };
    }

    case "conflict": {
      const batch = state.inflight;
      if (!batch) return state;

      // Keep the user's values and let them win against a refreshed version.
      const pending = new Map(state.pending);
      const commits = new Map(state.commits);
      for (const [field, entry] of batch)
        foldBack(pending, commits, field, entry);

      return { ...state, pending, commits, inflight: null, conflict: true };
    }

    case "cancelPending": {
      const pending = new Map(state.pending);
      const commits = new Map(state.commits);

      for (const field of action.fields) {
        const entry = pending.get(field);
        if (!entry) continue;
        // A newer commit claimed this field before it ever shipped — same
        // as any other supersede, regardless of the newer commit's own fate.
        record(commits, entry.commitId, field, "superseded");
        pending.delete(field);
      }

      return { ...state, pending, commits };
    }

    case "unblock":
      return { ...state, blocked: false };

    case "adopt": {
      reapAll(state.commits, "abandoned");
      return makeInitialState(action.owner);
    }

    default:
      return state;
  }
}

function reapAll(
  commits: Map<CommitId, CommitRecord>,
  outcome: CommitOutcome
): void {
  for (const commit of commits.values()) {
    for (const field of commit.outstanding) commit.outcomes[field] = outcome;
    commit.outstanding.clear();
    commit.deferred.resolve({
      outcomes: commit.outcomes,
      errors: Object.keys(commit.errors).length ? commit.errors : undefined,
    });
  }
  commits.clear();
}

function assertNoOrphans(state: State, action: Action): void {
  const reachable = new Set<FieldName>([
    ...state.pending.keys(),
    ...(state.inflight?.keys() ?? []),
  ]);

  for (const [commitId, commit] of state.commits) {
    for (const field of commit.outstanding) {
      if (!reachable.has(field)) {
        throw new Error(
          `useEditPublication: commit ${commitId} is stranded waiting on ` +
            `"${field}" after "${action.type}" — it is in no buffer, so it ` +
            `can never settle.`
        );
      }
    }
  }
}

export const reducer =
  process.env.NODE_ENV === "production"
    ? baseReducer
    : (state: State, action: Action): State => {
        const next = baseReducer(state, action);
        assertNoOrphans(next, action);
        return next;
      };
