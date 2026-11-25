import type { Location, To } from "react-router";

/** Hash-only targets scroll the current page, so they must not start a transition. */
export function isHashOnlyTarget(to: To) {
  if (typeof to === "string") return to.startsWith("#");
  return Boolean(to.hash) && !to.pathname && !to.search;
}

/** Router state carrying the page a user should return to after auth. */
export interface AuthRedirectState {
  from?: Location;
}

/** Auth-flow pages that must never themselves become the redirect origin. */
const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password"
]);

function normalizePathname(pathname: string) {
  const withoutTrailingSlashes = pathname.replace(/\/+$/, "");
  return (withoutTrailingSlashes || "/").toLowerCase();
}

/**
 * Router `state` for a navigation within the auth flow (login, signup,
 * forgot/reset password). Preserves an existing `from` instead of
 * overwriting it, falling back to the current location as the origin on the
 * first hop — unless that location is itself an auth page, which would
 * otherwise leave the user stranded there after a successful login/signup.
 */
export function withAuthRedirect(location: Location): AuthRedirectState {
  const state = location.state as AuthRedirectState | null;
  if (state?.from) return { from: state.from };
  return AUTH_PATHS.has(normalizePathname(location.pathname))
    ? {}
    : { from: location };
}

/** Where to send the user after a successful login/signup, reading state set by `withAuthRedirect`. */
export function getAuthRedirectPath(location: Location): string {
  const state = location.state as AuthRedirectState | null;
  const from = state?.from;
  if (!from?.pathname) return "/";
  return `${from.pathname}${from.search}${from.hash}`;
}
