import {
  deviceAuthorizationClient,
  genericOAuthClient,
  usernameClient
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

declare const __API_BACKEND_URL__: string;

const isSSR = typeof window === "undefined";
const baseURL = isSSR
  ? `${__API_BACKEND_URL__}/api/auth2`
  : `${window.location.origin}/api/auth2`;

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), genericOAuthClient(), deviceAuthorizationClient()]
});

interface AuthClientError {
  code?: string | null;
  message?: string | null;
  statusText?: string | null;
}

// Messages for better-auth error codes whose default text isn't enough for
// users.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // The server sends a new verification link whenever an unverified user
  // signs in (`emailVerification.sendOnSignIn`).
  EMAIL_NOT_VERIFIED:
    "Please verify your email address to log in. We have sent you a new verification link."
};

/**
 * Resolves an error returned by an `authClient` call (or thrown by one, once
 * wrapped in an `Error`) into a user-facing message.
 */
export function getAuthErrorMessage(
  error: AuthClientError | null | undefined,
  fallback: string
): string {
  const codeMessage = error?.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  return codeMessage || error?.message || error?.statusText || fallback;
}
