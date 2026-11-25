import { PatchResponseV1 } from "@/apiv1/publications";
import { PublicationV1 } from "@/types/v1";
import { UseMutationResult } from "@tanstack/react-query";
import { z } from "zod";
import { Deferred } from "./deferred";
import { FieldName } from "./fields";

export type FieldSpec = {
  debounce?: number;
  schema: z.ZodTypeAny;
  /**
   * Converts the field's value (the response shape the editor works with) to
   * the shape the PATCH request expects. Defaults to sending it as-is.
   */
  toRequest?: (value: unknown) => unknown;
};

export type FieldError = { code: string; message: string; path: PropertyKey[] };

export type Entry<T extends FieldName = FieldName> = {
  commitId: CommitId;
  value: PublicationV1[T];
  // deferreds: Deferred<void>[];
};
export type Layer<T extends FieldName = FieldName> = Map<T, Entry<T>>;

export type State<T extends FieldName = FieldName> = {
  /** Publication id these buffers belong to. Never changes for a given row. */
  owner: string;
  /** Edited, not yet sent. */
  pending: Layer<T>;
  /** Sent, awaiting acknowledgement. At most one batch, ever. */
  inflight: Layer<T> | null;
  /** Server said no. Held out of future batches until the user edits again. */
  rejected: Map<T, { value: PublicationV1[T]; error: FieldError }>;
  /** Transport failure: pause the drain loop so we don't hammer a dead server. */
  blocked: boolean;
  failures: number;
  transportError: Error | null;
  /** Someone else changed the row underneath us. */
  conflict: boolean;
  /** Commits awaiting at least one field outcome. */
  commits: Map<CommitId, CommitRecord>;
  /** When the server last applied each field; drives per-section save times. */
  savedAt: Map<FieldName, number>;
};

export type Action =
  | {
      type: "edit";
      commitId: CommitId;
      changes: Map<FieldName, unknown>;
      errors: Partial<Record<FieldName, FieldError>>;
      deferred: Deferred<CommitResult>;
      outcomes?: Partial<Record<FieldName, CommitOutcome>>;
    }
  | { type: "flush" }
  | { type: "cancelPending"; fields: FieldName[] }
  | { type: "settle"; response: PatchResponseV1; at: number }
  | { type: "transportFail"; error: Error }
  | { type: "conflict" }
  | { type: "unblock" }
  | { type: "adopt"; owner: string };

export type StatusFor = <T extends FieldName>(
  field: T,
  when?: (value: PublicationV1[T]) => boolean
) => FieldStatus;

/** Where a single field currently sits in the pipeline. */
export type FieldStatus = "saved" | "queued" | "saving" | "rejected";

export type CommitId = string;

export type CommitOutcome =
  "applied" | "superseded" | "rejected" | "abandoned" | "no-op";

export type CommitResult<T extends FieldName = FieldName> = {
  outcomes: Partial<Record<T, CommitOutcome>>;
  errors?: Partial<Record<T, FieldError>>;
};

export type CommitRecord = {
  id: CommitId;
  /** Every field the commit asked for, including client-rejected ones. */
  requested: FieldName[];
  outstanding: Set<FieldName>;
  outcomes: Partial<Record<FieldName, CommitOutcome>>;
  errors: Partial<Record<FieldName, FieldError>>;
  deferred: Deferred<CommitResult>;
  createdAt: number;
  settledAt: number | null;
};

export type CommitHandle<T extends FieldName = FieldName> = {
  id: CommitId;
  result: Promise<CommitResult<T>>;
};

/** The `importDocument` a PATCH sends, including the raw source. */
export type ImportDocumentPatchV1 = {
  body: string;
  url: string;
  format: string;
  filename?: string | null;
  syncDate?: string | null;
};

export type PublicationPatchV1 = Omit<PublicationV1, "importDocument"> & {
  importDocument: ImportDocumentPatchV1 | null | undefined;
};
export interface Commit {
  <T extends FieldName = FieldName>(
    field: T,
    value: PublicationPatchV1[T]
  ): CommitHandle<T>;
  <T extends FieldName = FieldName>(changes: Changes<T>): CommitHandle<T>;
}
export type Changes<T extends FieldName = FieldName> = Partial<{
  [K in T]: PublicationPatchV1[K];
}>;

export type CommitLookup =
  | { status: "pending"; requested: FieldName[]; outstanding: FieldName[] }
  | { status: "settled"; result: CommitResult; at: number }
  | { status: "unknown" };

export type LookupCommit = (id: CommitId) => CommitLookup;

export type SaveStatus =
  "init" | "loaded" | "saved" | "saving" | "offline" | "error" | "conflict";

export type EditPublicationStatus = {
  status: SaveStatus;
  lastUpdated: Date | null;
};

export type DeleteMutation = UseMutationResult<void, Error, void, unknown>;
