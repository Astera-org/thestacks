import type { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import {
  classifyError,
  issueMessages,
  namespaceIssueMessage,
  RequestError,
  type ValidationIssue
} from "./errors";

function makeAxiosError(response?: {
  status: number;
  data: unknown;
}): AxiosError {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "Request failed",
    toJSON: () => ({}),
    config: {} as AxiosError["config"],
    response: response
      ? {
          ...response,
          statusText: "",
          headers: {},
          config: {} as AxiosError["config"]
        }
      : undefined
  } as AxiosError;
}

describe("classifyError", () => {
  it("classifies a response-less error as a network failure", () => {
    const result = classifyError(makeAxiosError());
    expect(result).toEqual({
      kind: "network",
      message: "Couldn't reach the server. Check your connection."
    });
  });

  it("classifies a 422 with a validation envelope as validation errors", () => {
    const issues: ValidationIssue[] = [
      { path: ["title"], message: "Title is required" },
      { path: ["contributors"], message: "At least one contributor" }
    ];
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: { type: "validation_error", errors: issues }
      })
    );

    expect(result).toEqual({
      kind: "validation",
      issues,
      message: "Validation errors detected."
    });
  });

  it("does not treat a 422 without the validation envelope as validation errors", () => {
    const result = classifyError(
      makeAxiosError({ status: 422, data: { error: "Unprocessable" } })
    );
    expect(result).toEqual({
      kind: "http",
      status: 422,
      message: "Unprocessable"
    });
  });

  it("does not treat a 422 with a malformed issue list as validation errors", () => {
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: {
          type: "validation_error",
          errors: [{ path: ["title"] /* missing message */ }]
        }
      })
    );
    expect(result.kind).toBe("http");
  });

  it("surfaces the server's error message for a plain HTTP failure", () => {
    const result = classifyError(
      makeAxiosError({ status: 404, data: { error: "Not found" } })
    );
    expect(result).toEqual({ kind: "http", status: 404, message: "Not found" });
  });

  it("surfaces the first message from a keyed v1 errors object", () => {
    const result = classifyError(
      makeAxiosError({
        status: 403,
        data: {
          type: "application_error",
          errors: {
            auth: { message: "Permission denied" },
            org: { message: "Second message" }
          }
        }
      })
    );
    expect(result).toEqual({
      kind: "http",
      status: 403,
      message: "Permission denied"
    });
  });

  it("skips malformed entries in a keyed v1 errors object", () => {
    const result = classifyError(
      makeAxiosError({
        status: 409,
        data: {
          type: "application_error",
          errors: {
            draft: null,
            version: { message: 42 },
            doi: { message: "Already in progress" }
          }
        }
      })
    );
    expect(result).toEqual({
      kind: "http",
      status: 409,
      message: "Already in progress"
    });
  });

  it("falls back to a generic message when a keyed v1 errors object is empty", () => {
    const result = classifyError(
      makeAxiosError({
        status: 404,
        data: { type: "application_error", errors: {} }
      })
    );
    expect(result).toEqual({
      kind: "http",
      status: 404,
      message: "Something went wrong. Please try again."
    });
  });

  it("ignores a keyed errors object without the application_error type", () => {
    const result = classifyError(
      makeAxiosError({
        status: 403,
        data: { errors: { auth: { message: "Permission denied" } } }
      })
    );
    expect(result).toEqual({
      kind: "http",
      status: 403,
      message: "Something went wrong. Please try again."
    });
  });

  it("falls back to a generic message when the payload has no message field", () => {
    const result = classifyError(makeAxiosError({ status: 500, data: {} }));
    expect(result).toEqual({
      kind: "http",
      status: 500,
      message: "Something went wrong. Please try again."
    });
  });
});

/**
 * A version skew between frontend and backend (or a proxy/gateway sitting in
 * between returning its own error body) means `error.response.data` can be
 * almost anything. None of these should ever throw — worst case is a
 * misclassified/generic error, never an unhandled TypeError deep in a
 * response interceptor.
 */
describe("classifyError with malformed or unexpected payloads", () => {
  it("does not throw when data is null", () => {
    expect(() =>
      classifyError(makeAxiosError({ status: 422, data: null }))
    ).not.toThrow();
    expect(classifyError(makeAxiosError({ status: 422, data: null }))).toEqual({
      kind: "http",
      status: 422,
      message: "Something went wrong. Please try again."
    });
  });

  it("does not throw when data is undefined", () => {
    expect(() =>
      classifyError(makeAxiosError({ status: 422, data: undefined }))
    ).not.toThrow();
  });

  it("does not throw when data is a raw string (e.g. an HTML error page from a proxy)", () => {
    const html = "<html><body>502 Bad Gateway</body></html>";
    const result = classifyError(makeAxiosError({ status: 502, data: html }));
    expect(result).toEqual({
      kind: "http",
      status: 502,
      message: "Something went wrong. Please try again."
    });
  });

  it("does not throw when data is a bare number or boolean", () => {
    expect(() =>
      classifyError(makeAxiosError({ status: 500, data: 0 }))
    ).not.toThrow();
    expect(() =>
      classifyError(makeAxiosError({ status: 500, data: false }))
    ).not.toThrow();
  });

  it("does not throw and falls back to http when errors is present but not an array", () => {
    // e.g. a backend version that changed from a list of issues to a single
    // object, or vice versa.
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: {
          type: "validation_error",
          errors: { path: ["title"], message: "Title is required" }
        }
      })
    );
    expect(result.kind).toBe("http");
  });

  it("does not throw and rejects the whole batch when the issues array mixes valid and garbage entries", () => {
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: {
          type: "validation_error",
          errors: [
            { path: ["title"], message: "Title is required" }, // well-formed
            null,
            "just a string",
            42,
            { message: "no path field" },
            { path: ["subtitle"] }, // no message field
            { path: "not-an-array", message: "path should be an array" }
          ]
        }
      })
    );
    // All-or-nothing: one malformed issue in the batch means we don't trust
    // any of it as structured validation data.
    expect(result.kind).toBe("http");
  });

  it("still parses a well-formed issues array that carries extra, unknown fields", () => {
    // Forward-compatible: a newer backend adds fields this frontend doesn't
    // know about yet. Extra fields shouldn't break parsing of the ones we do.
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: {
          type: "validation_error",
          errors: [
            {
              path: ["title"],
              message: "Title is required",
              code: "too_small",
              severity: "error",
              hint: "Try adding a title"
            }
          ]
        }
      })
    );
    expect(result.kind).toBe("validation");
    expect(result.kind === "validation" && result.issues[0].message).toBe(
      "Title is required"
    );
  });

  it("treats an empty (but well-formed) issues array as validation, not http", () => {
    // Vacuously valid — `[].every(...)` is true — so this is "validation"
    // with zero issues rather than falling back to "http". Documenting this
    // rather than asserting it's ideal: a caller checking `issues.length`
    // before rendering a field error is unaffected either way.
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: { type: "validation_error", errors: [] }
      })
    );
    expect(result).toEqual({
      kind: "validation",
      issues: [],
      message: "Validation errors detected."
    });
  });

  it("does not throw when the validation_error type field has an unexpected value", () => {
    const result = classifyError(
      makeAxiosError({
        status: 422,
        data: {
          type: "ValidationError", // wrong case — a plausible version-skew typo
          errors: [{ path: ["title"], message: "Title is required" }]
        }
      })
    );
    expect(result.kind).toBe("http");
  });

  it("does not throw when namespaceIssueMessage/issueMessage see an issue with a non-standard path", () => {
    const weirdIssues = [
      { path: [{ nested: "not a PropertyKey" }], message: "Odd path shape" }
    ] as unknown as ValidationIssue[];

    expect(() => namespaceIssueMessage(weirdIssues, "title")).not.toThrow();
    expect(() => issueMessages(weirdIssues, ["title"])).not.toThrow();
    expect(namespaceIssueMessage(weirdIssues, "title")).toBeUndefined();
  });
});

describe("RequestError", () => {
  it("carries the ApiError and the original AxiosError as `cause`", () => {
    const cause = makeAxiosError({ status: 500, data: {} });
    const apiError = classifyError(cause);
    const error = new RequestError(apiError, cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RequestError");
    expect(error.message).toBe(apiError.message);
    expect(error.apiError).toBe(apiError);
    expect(error.cause).toBe(cause);
  });
});

describe("namespaceIssueMessage", () => {
  const issues: ValidationIssue[] = [
    { path: ["title"], message: "Title is required" },
    { path: ["contributors", 0, "role"], message: "Role is required" }
  ];

  it("finds the message for a top-level field", () => {
    expect(namespaceIssueMessage(issues, "title")).toBe("Title is required");
  });

  it("matches on the first path segment for a nested issue", () => {
    expect(namespaceIssueMessage(issues, "contributors")).toBe(
      "Role is required"
    );
  });

  it("returns undefined when nothing matches", () => {
    expect(namespaceIssueMessage(issues, "slug")).toBeUndefined();
  });

  it("returns undefined for null/undefined issue lists", () => {
    expect(namespaceIssueMessage(null, "title")).toBeUndefined();
    expect(namespaceIssueMessage(undefined, "title")).toBeUndefined();
  });
});

function issue(path: PropertyKey[], message: string): ValidationIssue {
  return { path, message };
}

describe("issueMessages", () => {
  it("should return an empty array when issues is undefined", () => {
    expect(issueMessages(undefined, ["title"])).toEqual([]);
  });

  it("should return an empty array when issues is null", () => {
    expect(issueMessages(null, ["title"])).toEqual([]);
  });

  it("should match an issue at an exact top-level string path", () => {
    const issues = [issue(["title"], "Title is required")];
    expect(issueMessages(issues, ["title"])).toEqual(["Title is required"]);
  });

  it("should not match a different top-level field", () => {
    const issues = [issue(["subtitle"], "Subtitle is too long")];
    expect(issueMessages(issues, ["title"])).toEqual([]);
  });

  it("should not match when the path lengths differ", () => {
    const issues = [issue(["title", "nested"], "Nested issue")];
    expect(issueMessages(issues, ["title"])).toEqual([]);
  });

  it("should return every matching message, in order", () => {
    const issues = [
      issue(["title"], "Title is required"),
      issue(["subtitle"], "Subtitle is too long"),
      issue(["title"], "Title is too long")
    ];
    expect(issueMessages(issues, ["title"])).toEqual([
      "Title is required",
      "Title is too long"
    ]);
  });

  it("should select only that index when a number is passed", () => {
    const issues = [
      issue(["contributors", 0, "role"], "Role is required"),
      issue(["contributors", 3, "role"], "Role is invalid")
    ];
    expect(issueMessages(issues, ["contributors", 0, "role"])).toEqual([
      "Role is required"
    ]);
  });

  it("should select all indexes when a wildcard is passed", () => {
    const issues = [
      issue(["contributors", 0, "role"], "Role is required"),
      issue(["contributors", 3, "role"], "Role is invalid")
    ];
    expect(issueMessages(issues, ["contributors", "*", "role"])).toEqual([
      "Role is required",
      "Role is invalid"
    ]);
  });

  it("should not match a wildcard against a non-numeric path segment", () => {
    const issues = [issue(["contributors", "primary", "role"], "Invalid")];
    expect(issueMessages(issues, ["contributors", 0, "role"])).toEqual([]);
    expect(issueMessages(issues, ["contributors", "*", "role"])).toEqual([]);
  });

  it("should support multiple wildcards in a single path", () => {
    const issues = [
      issue(
        ["contributors", 1, "affiliations", 2, "name"],
        "Affiliation name is required"
      )
    ];
    expect(
      issueMessages(issues, ["contributors", "*", "affiliations", "*", "name"])
    ).toEqual(["Affiliation name is required"]);
  });

  it("should return an empty array when no issues match", () => {
    const issues = [issue(["subtitle"], "Subtitle is too long")];
    expect(issueMessages(issues, ["contributors", 0, "role"])).toEqual([]);
  });

  it("should return an empty array for an empty issues list", () => {
    expect(issueMessages([], ["title"])).toEqual([]);
  });
});
