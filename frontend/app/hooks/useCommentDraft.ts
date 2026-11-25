import { useSessionStorage } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";

const UNUSED_KEY = "__comment-draft-noop__";

/**
 * Persists comment draft text to sessionStorage so it survives sheet
 * close/reopen within the same tab.  When `draftKey` is undefined the
 * hook falls back to plain `useState` (no persistence).
 *
 * Hooks can't be called conditionally, so both `useState` and
 * `useSessionStorage` are always invoked; only the active pair is returned.
 */
export function useCommentDraft(
  draftKey: string | undefined,
  fallback: string
): [body: string, setBody: (v: string) => void, clearDraft: () => void] {
  const enabled = draftKey != null;

  const [localBody, setLocalBody] = useState(fallback);
  const [sessionBody, setSessionBody] = useSessionStorage(
    enabled ? draftKey : UNUSED_KEY,
    fallback
  );

  // useSessionStorage's setter is recreated on every value change (depends on
  // [key, store]).  Stabilise it via a ref so consumers can safely include
  // setBody in useEffect dependency arrays without infinite loops.
  const setSessionBodyRef = useRef<(v: string) => void>(setSessionBody);
  useEffect(() => {
    setSessionBodyRef.current = setSessionBody;
  }, [setSessionBody]);
  const stableSetSessionBody = useCallback(
    (v: string) => setSessionBodyRef.current(v),
    []
  );

  // useSessionStorage always writes its initial value to storage, even when
  // we pass the UNUSED_KEY sentinel.  Clean it up so we don't leak a phantom
  // entry when drafts are disabled.
  useEffect(() => {
    if (!enabled) {
      try {
        sessionStorage.removeItem(UNUSED_KEY);
      } catch {
        /* SSR – ignore */
      }
    }
  }, [enabled]);

  const clearDraft = useCallback(() => {
    if (draftKey) {
      stableSetSessionBody(fallback);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* quota / SSR – ignore */
      }
    } else {
      setLocalBody(fallback);
    }
  }, [draftKey, fallback, stableSetSessionBody]);

  if (enabled) {
    return [sessionBody, stableSetSessionBody, clearDraft];
  }
  return [localBody, setLocalBody, clearDraft];
}

/**
 * Deterministic short hash for anchor text, used to build draft keys
 * without storing the full anchor string in the key.
 */
export function hashAnchorText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
