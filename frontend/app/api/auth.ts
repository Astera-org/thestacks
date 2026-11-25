import { API_BASE_URL, getAuth, http, setAuth } from "@/api/client";
import { authClient, getAuthErrorMessage } from "@/lib/authClient";
import { User } from "@/types";
import axios from "axios";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function login(
  usernameOrEmail: string,
  password: string
): Promise<{ user: User }> {
  const { error } = isEmail(usernameOrEmail)
    ? await authClient.signIn.email({ email: usernameOrEmail, password })
    : await authClient.signIn.username({ username: usernameOrEmail, password });
  if (error) throw new Error(getAuthErrorMessage(error, "Login failed"));
  const meRes = await http.get<{ user: User }>("/auth/me");
  return { user: meRes.data.user };
}

export type RegisterResult =
  | { verificationRequired: false; user: User }
  | { verificationRequired: true; email: string };

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  /** Turnstile token, checked by the back-end on email sign-up when enabled. */
  captcha_token?: string;
}): Promise<RegisterResult> {
  const signUpData = {
    name: `${payload.first_name} ${payload.last_name}`,
    email: payload.email,
    password: payload.password,
    username: payload.username,
    firstName: payload.first_name,
    lastName: payload.last_name,
    fetchOptions: payload.captcha_token
      ? { headers: { "x-captcha-response": payload.captcha_token } }
      : undefined
  };
  const { data, error } = await authClient.signUp.email(signUpData);
  if (error) throw new Error(getAuthErrorMessage(error, "Registration failed"));
  // When the server requires email verification, sign-up doesn't sign the
  // user in, so there is no session token.
  if (!data.token) return { verificationRequired: true, email: payload.email };
  const meRes = await http.get<{ user: User }>("/auth/me");
  return { verificationRequired: false, user: meRes.data.user };
}

export async function logout(): Promise<void> {
  await authClient.signOut();
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  const { error } = await authClient.changePassword({
    currentPassword: payload.current_password,
    newPassword: payload.new_password
  });
  if (error)
    throw new Error(getAuthErrorMessage(error, "Password change failed"));
}

export async function requestPasswordReset(
  email: string,
  redirectTo: string
): Promise<void> {
  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo
  });
  if (error)
    throw new Error(
      error.message ?? error.statusText ?? "Failed to send reset link"
    );
}

export async function resetPassword(
  newPassword: string,
  token: string
): Promise<void> {
  const { error } = await authClient.resetPassword({
    newPassword,
    token
  });
  if (error)
    throw new Error(
      error.message ?? error.statusText ?? "Failed to reset password"
    );
}

/**
 * Attempt to initialise auth state from the server‐side session (for example
 * after an external OAuth flow where tokens were stored in the session cookie
 * rather than being passed back to the front-end).
 */
export async function initAuthFromSession(): Promise<void> {
  if (getAuth()) return;
  try {
    const res = await axios.get<User>(`${API_BASE_URL}/auth/me`, {
      withCredentials: true
    });
    if (res.status === 200 && res.data) {
      setAuth({ user: res.data });
    }
  } catch {
    /* silent */
  }
}
