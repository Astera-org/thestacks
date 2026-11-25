import { describe, expect, it } from "vitest";
import { parseCommentIdFromHash, retryUntil } from "./commentNavigation";

describe("parseCommentIdFromHash", () => {
  it("should read the id from a comment hash with a leading #", () => {
    expect(parseCommentIdFromHash("#comment-17626")).toBe(17626);
  });

  it("should read the id from a comment hash without a leading #", () => {
    expect(parseCommentIdFromHash("comment-17626")).toBe(17626);
  });

  it("should return null for section hashes", () => {
    expect(parseCommentIdFromHash("#comments")).toBeNull();
    expect(parseCommentIdFromHash("#references")).toBeNull();
  });

  it("should return null for an empty hash", () => {
    expect(parseCommentIdFromHash("")).toBeNull();
  });

  it("should return null when the id is not a whole number", () => {
    expect(parseCommentIdFromHash("#comment-abc")).toBeNull();
    expect(parseCommentIdFromHash("#comment-1.5")).toBeNull();
  });
});

describe("retryUntil", () => {
  it("settles with false when cancelled while waiting to retry", async () => {
    const retry = retryUntil(() => false, { delayMs: 60_000 });

    retry.cancel();

    await expect(retry.promise).resolves.toBe(false);
  });
});
