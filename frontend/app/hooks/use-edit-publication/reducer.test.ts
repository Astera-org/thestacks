import { PatchResponseV1 } from "@/apiv1/publications";
import { PublicationV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import { Deferred } from "./deferred";
import { FieldName } from "./fields";
import { makeInitialState } from "./make-initial-state";
import { baseReducer, reducer, resultOf } from "./reducer";
import {
  Action,
  CommitOutcome,
  CommitRecord,
  CommitResult,
  FieldError,
  State,
} from "./types";

function makeFieldError(message: string): FieldError {
  return { code: "invalid", message, path: [] };
}

function makeEdit(
  commitId: string,
  changes: Record<string, unknown>,
  errors: Partial<Record<FieldName, FieldError>> = {},
  outcomes?: Partial<Record<FieldName, CommitOutcome>>
): Action {
  return {
    type: "edit",
    commitId,
    changes: new Map(Object.entries(changes)) as Map<FieldName, unknown>,
    errors,
    deferred: new Deferred<CommitResult>(),
    outcomes,
  };
}

function makeSettleResponse(
  rejected?: Partial<Record<FieldName, FieldError>>
): PatchResponseV1 {
  return {
    publication: {} as PublicationV1,
    applied: [],
    rejected,
    validationErrors: [],
  };
}

function makeCommitRecord(overrides: Partial<CommitRecord>): CommitRecord {
  return {
    id: "commit-0",
    requested: [],
    outstanding: new Set(),
    outcomes: {},
    errors: {},
    deferred: new Deferred<CommitResult>(),
    createdAt: 0,
    settledAt: null,
    ...overrides,
  };
}

const initial = (): State => makeInitialState("pub-1");

describe("resultOf", () => {
  it("omits errors when the commit had none", () => {
    const record = makeCommitRecord({ outcomes: { title: "applied" } });
    expect(resultOf(record)).toEqual({
      outcomes: { title: "applied" },
      errors: undefined,
    });
  });

  it("includes errors when the commit has at least one", () => {
    const error = makeFieldError("Title is required");
    const record = makeCommitRecord({
      outcomes: { title: "rejected" },
      errors: { title: error },
    });
    expect(resultOf(record)).toEqual({
      outcomes: { title: "rejected" },
      errors: { title: error },
    });
  });
});

describe("edit", () => {
  it("buffers a valid change as pending and opens an unsettled commit", () => {
    const state = baseReducer(initial(), makeEdit("c1", { title: "Draft" }));

    expect(state.pending.get("title")).toEqual({
      value: "Draft",
      commitId: "c1",
    });
    const commit = state.commits.get("c1");
    expect(commit?.outstanding).toEqual(new Set(["title"]));
    expect(commit?.settledAt).toBeNull();
  });

  it("records client-side-rejected fields on the commit without buffering them", () => {
    const error = makeFieldError("Subtitle too long");
    const state = baseReducer(
      initial(),
      makeEdit("c1", { title: "Draft" }, { subtitle: error })
    );

    expect(state.pending.has("subtitle")).toBe(false);
    const commit = state.commits.get("c1");
    expect(commit?.requested).toEqual(
      expect.arrayContaining(["title", "subtitle"])
    );
    expect(commit?.outstanding).toEqual(new Set(["title"]));
    expect(commit?.outcomes).toEqual({ subtitle: "rejected" });
    expect(commit?.errors).toEqual({ subtitle: error });
  });

  it("supersedes and settles the prior pending commit for the same field", async () => {
    const first = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const second = baseReducer(first, makeEdit("c2", { title: "B" }));

    // The old commit is done — a newer edit already won the field.
    const c1 = second.commits.get("c1")!;
    expect(c1.outstanding.size).toBe(0);
    expect(c1.outcomes).toEqual({ title: "superseded" });
    expect(c1.settledAt).not.toBeNull();
    await expect(c1.deferred.promise).resolves.toEqual({
      outcomes: { title: "superseded" },
      errors: undefined,
    });

    // The new commit owns the field now.
    expect(second.pending.get("title")).toEqual({
      value: "B",
      commitId: "c2",
    });
  });

  it("keeps a client-computed no-op outcome when another field in the same commit is a real edit", () => {
    const state = baseReducer(
      initial(),
      makeEdit("c1", { title: "New Title" }, {}, { subtitle: "no-op" })
    );

    expect(state.pending.has("subtitle")).toBe(false);
    const commit = state.commits.get("c1");
    expect(commit?.requested).toEqual(
      expect.arrayContaining(["title", "subtitle"])
    );
    expect(commit?.outstanding).toEqual(new Set(["title"]));
    expect(commit?.outcomes).toEqual({ subtitle: "no-op" });
  });

  it("clears a rejected field once the user edits it again", () => {
    const withRejection: State = {
      ...initial(),
      rejected: new Map([
        ["title", { value: "Old", error: makeFieldError("Server said no") }],
      ]),
    };

    const state = baseReducer(withRejection, makeEdit("c1", { title: "New" }));

    expect(state.rejected.has("title")).toBe(false);
  });
});

describe("flush", () => {
  it("moves pending into inflight and empties pending", () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const state = baseReducer(edited, { type: "flush" });

    expect(state.pending.size).toBe(0);
    expect(state.inflight?.get("title")).toEqual({
      value: "A",
      commitId: "c1",
    });
  });

  it("is a no-op when there is nothing pending", () => {
    const state = initial();
    expect(baseReducer(state, { type: "flush" })).toBe(state);
  });

  it("is a no-op while a batch is already inflight", () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const flushed = baseReducer(edited, { type: "flush" });
    const edited2 = baseReducer(flushed, makeEdit("c2", { subtitle: "B" }));

    expect(baseReducer(edited2, { type: "flush" })).toBe(edited2);
  });

  it("is a no-op while blocked", () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const blocked: State = { ...edited, blocked: true };
    expect(baseReducer(blocked, { type: "flush" })).toBe(blocked);
  });
});

describe("cancelPending", () => {
  it("pulls a queued field back out and settles its commit as superseded", async () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "Draft" }));
    const state = baseReducer(edited, {
      type: "cancelPending",
      fields: ["title"],
    });

    expect(state.pending.has("title")).toBe(false);
    const commit = state.commits.get("c1")!;
    expect(commit.outstanding.size).toBe(0);
    expect(commit.outcomes).toEqual({ title: "superseded" });
    await expect(commit.deferred.promise).resolves.toEqual({
      outcomes: { title: "superseded" },
      errors: undefined,
    });
  });

  it("does nothing for a field that isn't pending", () => {
    const state = initial();
    expect(
      baseReducer(state, { type: "cancelPending", fields: ["title"] })
    ).toEqual(state);
  });

  it("leaves other fields on the same commit untouched", () => {
    const edited = baseReducer(
      initial(),
      makeEdit("c1", { title: "Draft", subtitle: "Draft sub" })
    );
    const state = baseReducer(edited, {
      type: "cancelPending",
      fields: ["title"],
    });

    expect(state.pending.has("title")).toBe(false);
    expect(state.pending.get("subtitle")).toEqual({
      value: "Draft sub",
      commitId: "c1",
    });
    const commit = state.commits.get("c1")!;
    expect(commit.outstanding).toEqual(new Set(["subtitle"]));
    expect(commit.outcomes).toEqual({ title: "superseded" });
    expect(commit.settledAt).toBeNull();
  });
});

describe("settle", () => {
  function flushed(fields: Record<string, unknown>, commitId = "c1") {
    const edited = baseReducer(initial(), makeEdit(commitId, fields));
    return baseReducer(edited, { type: "flush" });
  }

  it("is a no-op when nothing is inflight", () => {
    const state = initial();
    expect(
      baseReducer(state, {
        type: "settle",
        at: 0,
        response: makeSettleResponse(),
      })
    ).toBe(state);
  });

  it("marks every field applied and clears transport state on a clean settle", async () => {
    const before: State = {
      ...flushed({ title: "A" }),
      failures: 2,
      blocked: true,
    };
    const state = baseReducer(before, {
      type: "settle",
      at: 0,
      response: makeSettleResponse(),
    });

    expect(state.inflight).toBeNull();
    expect(state.blocked).toBe(false);
    expect(state.failures).toBe(0);
    expect(state.transportError).toBeNull();
    expect(state.conflict).toBe(false);

    const commit = state.commits.get("c1")!;
    expect(commit.outcomes).toEqual({ title: "applied" });
    await expect(commit.deferred.promise).resolves.toEqual({
      outcomes: { title: "applied" },
      errors: undefined,
    });
  });

  it("records a server rejection and surfaces it when nothing newer is pending", () => {
    const error = makeFieldError("Slug already taken");
    const state = baseReducer(flushed({ slug: "taken" }), {
      type: "settle",
      at: 0,
      response: makeSettleResponse({ slug: error }),
    });

    expect(state.commits.get("c1")?.outcomes).toEqual({ slug: "rejected" });
    expect(state.rejected.get("slug")).toEqual({ value: "taken", error });
  });

  it("stamps savedAt only for the fields the server applied", () => {
    const state = baseReducer(flushed({ title: "A", slug: "taken" }), {
      type: "settle",
      at: 1234,
      response: makeSettleResponse({ slug: makeFieldError("Slug taken") }),
    });

    expect(state.savedAt).toEqual(new Map([["title", 1234]]));
  });

  it("does not surface a server rejection once the user has already re-edited the field", () => {
    const error = makeFieldError("Slug already taken");
    const withNewerEdit = baseReducer(
      flushed({ slug: "taken" }),
      makeEdit("c2", { slug: "taken-2" })
    );

    const state = baseReducer(withNewerEdit, {
      type: "settle",
      at: 0,
      response: makeSettleResponse({ slug: error }),
    });

    // The original commit still learns it was rejected...
    expect(state.commits.get("c1")?.outcomes).toEqual({ slug: "rejected" });
    // ...but the UI-facing rejected banner doesn't clobber the newer edit.
    expect(state.rejected.has("slug")).toBe(false);
    expect(state.pending.get("slug")).toEqual({
      value: "taken-2",
      commitId: "c2",
    });
  });
});

describe("transportFail", () => {
  it("is a no-op when nothing is inflight", () => {
    const state = initial();
    expect(
      baseReducer(state, { type: "transportFail", error: new Error("boom") })
    ).toBe(state);
  });

  it("folds the inflight batch back into pending and blocks the drain loop", () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const inflight = baseReducer(edited, { type: "flush" });

    const state = baseReducer(inflight, {
      type: "transportFail",
      error: new Error("network down"),
    });

    expect(state.inflight).toBeNull();
    expect(state.pending.get("title")).toEqual({
      value: "A",
      commitId: "c1",
    });
    expect(state.blocked).toBe(true);
    expect(state.failures).toBe(1);
    expect(state.transportError?.message).toBe("network down");
  });

  it("supersedes the failed commit instead of restoring it when a newer edit already won the field", async () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const inflight = baseReducer(edited, { type: "flush" });
    // The user keeps typing while the first save is in flight.
    const withNewerEdit = baseReducer(inflight, makeEdit("c2", { title: "B" }));

    const state = baseReducer(withNewerEdit, {
      type: "transportFail",
      error: new Error("network down"),
    });

    // The newer edit is untouched and still owns the field.
    expect(state.pending.get("title")).toEqual({
      value: "B",
      commitId: "c2",
    });
    // The failed commit is retired, not silently dropped.
    const c1 = state.commits.get("c1")!;
    expect(c1.outcomes).toEqual({ title: "superseded" });
    await expect(c1.deferred.promise).resolves.toEqual({
      outcomes: { title: "superseded" },
      errors: undefined,
    });
  });
});

describe("conflict", () => {
  it("is a no-op when nothing is inflight", () => {
    const state = initial();
    expect(baseReducer(state, { type: "conflict" })).toBe(state);
  });

  it("folds the inflight batch back into pending without touching failures/blocked", () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    const before: State = {
      ...baseReducer(edited, { type: "flush" }),
      failures: 3,
    };

    const state = baseReducer(before, { type: "conflict" });

    expect(state.inflight).toBeNull();
    expect(state.conflict).toBe(true);
    expect(state.pending.get("title")).toEqual({
      value: "A",
      commitId: "c1",
    });
    // Unrelated transport bookkeeping is left as-is.
    expect(state.failures).toBe(3);
    expect(state.blocked).toBe(false);
  });
});

describe("unblock", () => {
  it("clears blocked without touching anything else", () => {
    const blocked: State = { ...initial(), blocked: true, failures: 5 };
    const state = baseReducer(blocked, { type: "unblock" });

    expect(state.blocked).toBe(false);
    expect(state.failures).toBe(5);
  });
});

describe("adopt", () => {
  it("resolves every outstanding commit as abandoned and resets to a fresh owner", async () => {
    const edited = baseReducer(initial(), makeEdit("c1", { title: "A" }));
    // `adopt` reaps commits by mutating `edited.commits` in place (see
    // `reapAll`), so grab the reference before dispatching, not after.
    const commit = edited.commits.get("c1")!;

    const state = baseReducer(edited, { type: "adopt", owner: "pub-2" });

    expect(state).toEqual(makeInitialState("pub-2"));

    // The commit itself is gone from the (now-fresh) state, but its promise
    // still resolves — callers awaiting `commit()` must not hang forever
    // just because the page navigated to a different publication.
    await expect(commit.deferred.promise).resolves.toEqual({
      outcomes: { title: "abandoned" },
      errors: undefined,
    });
  });

  it("preserves outcomes a commit had already settled before the adopt", async () => {
    const record = makeCommitRecord({
      id: "c1",
      outstanding: new Set(["subtitle"]),
      outcomes: { title: "applied" },
      errors: {},
    });
    const state: State = {
      ...initial(),
      commits: new Map([["c1", record]]),
    };

    baseReducer(state, { type: "adopt", owner: "pub-2" });

    await expect(record.deferred.promise).resolves.toEqual({
      outcomes: { title: "applied", subtitle: "abandoned" },
      errors: undefined,
    });
  });
});

describe("reducer (dev invariant wrapper)", () => {
  it("does not false-positive on a normal edit -> flush -> settle sequence", () => {
    const edited = reducer(initial(), makeEdit("c1", { title: "A" }));
    const inflight = reducer(edited, { type: "flush" });
    expect(() =>
      reducer(inflight, {
        type: "settle",
        at: 0,
        response: makeSettleResponse(),
      })
    ).not.toThrow();
  });

  it("throws if a commit is left waiting on a field that is in no buffer", () => {
    const orphaned: State = {
      ...initial(),
      commits: new Map([
        ["c1", makeCommitRecord({ id: "c1", outstanding: new Set(["title"]) })],
      ]),
    };

    expect(() => reducer(orphaned, { type: "unblock" })).toThrow(/stranded/);
  });
});

describe("commit eviction", () => {
  it("keeps the commits map bounded once many commits have settled", () => {
    let state = initial();
    for (let i = 0; i < 60; i++) {
      state = baseReducer(state, makeEdit(`c${i}`, { title: `v${i}` }));
    }

    // Every edit but the last superseded (and thereby settled) the one
    // before it on the same field, so 59 commits are eligible for eviction.
    expect(state.commits.size).toBeLessThan(60);
    expect(state.commits.has("c0")).toBe(false);
    expect(state.commits.has("c59")).toBe(true);
  });
});
