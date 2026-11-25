import { State } from "./types";

export const makeInitialState = (owner: string): State => ({
  owner,
  pending: new Map(),
  inflight: null,
  rejected: new Map(),
  blocked: false,
  failures: 0,
  transportError: null,
  conflict: false,
  commits: new Map(),
  savedAt: new Map(),
});
