import { AxiosError } from "axios";
import { StatusCodes } from "http-status-codes";
import type { z } from "zod";

/**
 * Mirrors Zod's `$ZodIssueBase` — the backend emits validation errors in this
 * shape so the frontend doesn't need a second vocabulary for "what's wrong
 * with this field." `path` supports nested/indexed locations
 * (e.g. `["contributors", 2, "role"]`), not just flat field names.
 */
export type ValidationIssue = z.core.$ZodIssueBase;

export type ApiError =
  | { kind: "validation"; issues: ValidationIssue[]; message: string }
  | { kind: "http"; status: number; message: string }
  | { kind: "network"; message: string };

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection.";

/**
 * Thrown by the `http` client's response interceptor in place of a raw
 * AxiosError. `.message` stays populated so existing `toast.error(error.message)`
 * call sites keep working unchanged; `.apiError` gives callers that need to
 * discriminate (e.g. route validation errors to a specific field) a
 * structured shape instead of re-parsing the response body themselves.
 */
export class RequestError extends Error {
  readonly apiError: ApiError;
  readonly cause: AxiosError;

  constructor(apiError: ApiError, cause: AxiosError) {
    super(apiError.message);
    this.name = "RequestError";
    this.apiError = apiError;
    this.cause = cause;
  }
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { path?: unknown }).path) &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/**
 * Field errors are only trusted on a 422 with the explicit
 * `{ type: "validation_error", errors: ValidationIssue[] }` envelope — status
 * is the authoritative signal, the envelope confirms it. The backend reserves
 * 422 exclusively for field-validation failures (400 is for malformed
 * requests, 404/401/403/409/5xx keep their usual meanings).
 */
function asValidationIssues(
  status: number,
  data: unknown
): ValidationIssue[] | null {
  if (status !== StatusCodes.UNPROCESSABLE_ENTITY) return null;
  if (typeof data !== "object" || data === null) return null;

  const body = data as Record<string, unknown>;
  if (body.type !== "validation_error" || !Array.isArray(body.errors)) {
    return null;
  }

  return body.errors.every(isValidationIssue)
    ? (body.errors as ValidationIssue[])
    : null;
}

/**
 * The v1 backend reports non-validation errors as an `application_error` keyed
 * by the thing that failed, e.g.
 * `{ type: "application_error", errors: { auth: { message: "Permission denied" } } }`;
 * take the first message.
 */
function firstKeyedErrorMessage(data: unknown): string | undefined {
  if ((data as any)?.type !== "application_error") return undefined;
  const errors = (data as any)?.errors;
  if (typeof errors !== "object" || errors === null || Array.isArray(errors)) {
    return undefined;
  }
  return Object.values(errors)
    .map((entry) => (entry as any)?.message)
    .find((message): message is string => typeof message === "string");
}

function flatMessageFromPayload(data: unknown): string | null {
  const serverMsg =
    (data as any)?.error ||
    firstKeyedErrorMessage(data) ||
    (data as any)?.message ||
    (data as any)?.msg;
  return typeof serverMsg === "string" && serverMsg.trim().length > 0
    ? serverMsg
    : null;
}

/**
 * Classify a rejected axios response into a discriminated `ApiError` so
 * callers can route validation errors to specific fields, HTTP errors to a
 * toast/banner, and network errors (no response at all) to a distinct
 * "offline/unreachable" state instead of a generic failure message.
 */
export function classifyError(error: AxiosError): ApiError {
  if (!error.response) {
    return { kind: "network", message: NETWORK_MESSAGE };
  }

  const { status, data } = error.response;
  const issues = asValidationIssues(status, data);
  if (issues) {
    return {
      kind: "validation",
      issues,
      message: "Validation errors detected."
    };
  }

  const message = flatMessageFromPayload(data) ?? GENERIC_MESSAGE;
  return { kind: "http", status, message };
}

/**
 * Find the message for a given top-level field (i.e. an issue whose `path`
 * starts with it) among a set of validation issues — so a component can
 * render an error next to the input it belongs to instead of a toast.
 */
export function namespaceIssueMessage(
  issues: ValidationIssue[] | null | undefined,
  field: PropertyKey
): string | undefined {
  return issues?.find((issue) => issue?.path?.[0] === field)?.message;
}

/**
 * Find the messages for a given nested field path (e.g.
 * `["contributors", 0, "role"]`) among a set of validation issues — so a
 * component can render an error next to the input it belongs to instead of a
 * toast.
 *
 * To match a literal array index, use that number, otherwise you can use `"*"`
 * to select all in the array (e.g. `["assets", "*", "url"]`)
 */
export function issueMessages(
  issues: ValidationIssue[] | null | undefined,
  path: (string | number)[]
): string[] {
  if (issues == undefined) {
    return [];
  }
  return issues
    .filter(
      (issue) =>
        issue.path.length === path.length &&
        issue.path.reduce((prev, key, idx) => {
          if (typeof key === "number") {
            if (path[idx] === "*") {
              return prev;
            }
          }
          return prev && key === path[idx];
        }, true)
    )
    .map((i) => i.message);
}
