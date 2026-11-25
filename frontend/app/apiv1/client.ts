import { classifyError, RequestError } from "@/api/errors";
import { User } from "@/types";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

/* -------------------------------------------------------------------------- */
/* Environment-aware base URL                                                */
/* -------------------------------------------------------------------------- */

declare const __API_BASE__: string;
declare const __API_BACKEND_URL__: string;

const isSSR = typeof window === "undefined";
export const API_BASE_URL = isSSR
  ? `${__API_BACKEND_URL__}/api/v1`
  : `${__API_BASE__}/v1`;

/* -------------------------------------------------------------------------- */
/* Token storage                                                             */
/* -------------------------------------------------------------------------- */

const AUTH_STORAGE_KEY = "stacks_auth";

export interface StoredAuth {
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function persistAuth(auth: StoredAuth | null): void {
  if (auth) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

let _auth: StoredAuth | null = loadStoredAuth();

/* -------------------------------------------------------------------------- */
/* Event listeners (simple pub/sub)                                          */
/* -------------------------------------------------------------------------- */

type AuthListener = (auth: StoredAuth | null) => void;
const listeners = new Set<AuthListener>();

function notifyAuthChange(): void {
  listeners.forEach((cb) => cb(_auth));
}

export const onAuthChange = (cb: AuthListener): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/* -------------------------------------------------------------------------- */
/* Helper to synchronise auth from outside                                   */
/* -------------------------------------------------------------------------- */

export function setAuth(auth: StoredAuth | null): void {
  _auth = auth;
  persistAuth(auth);
  notifyAuthChange();
}

export function getAuth(): StoredAuth | null {
  return _auth;
}

export function updateAuthUser(user: User): void {
  if (_auth) {
    _auth.user = user;
    persistAuth(_auth);
    notifyAuthChange();
  }
}

/* -------------------------------------------------------------------------- */
/* Token refresh queue management                                            */
/* -------------------------------------------------------------------------- */

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

/* -------------------------------------------------------------------------- */
/* Axios instance with interceptors                                          */
/* -------------------------------------------------------------------------- */

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

/**
 * Inject Authorization header if token available.
 */
http.interceptors.request.use((config) => {
  if (_auth?.accessToken) {
    if (config.headers) {
      config.headers.Authorization = `Bearer ${_auth.accessToken}`;
    } else {
      (config.headers as any) = {
        Authorization: `Bearer ${_auth.accessToken}`
      };
    }
  }
  return config;
});

function _isAuthEndpoint(url: string): boolean {
  return url.startsWith("/auth/");
}

async function _refreshAccessToken(): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (_auth?.refreshToken) {
    headers.Authorization = `Bearer ${_auth.refreshToken}`;
  }

  const res = await axios.post<{ access_token: string }>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    {
      headers,
      withCredentials: true
    }
  );

  if (_auth) {
    _auth.accessToken = res.data.access_token;
    persistAuth(_auth);
    notifyAuthChange();
  }
}

/**
 * 401 handler with refresh token logic.
 */
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !_isAuthEndpoint(originalRequest.url || "") &&
      !originalRequest._retry &&
      _auth?.refreshToken
    ) {
      if (isRefreshing) {
        await new Promise<void>((resolve) => refreshQueue.push(resolve));
      } else {
        try {
          isRefreshing = true;
          await _refreshAccessToken();
        } catch (e) {
          setAuth(null);
          if (axios.isAxiosError(e)) {
            return Promise.reject(new RequestError(classifyError(e), e));
          }
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
          refreshQueue.forEach((fn) => fn());
          refreshQueue = [];
        }
      }

      originalRequest._retry = true;
      return http(originalRequest);
    }

    return Promise.reject(new RequestError(classifyError(error), error));
  }
);

/* -------------------------------------------------------------------------- */
/* Cookie helpers (simple, no deps)                                          */
/* -------------------------------------------------------------------------- */

function _readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function _eraseCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

/* -------------------------------------------------------------------------- */
/* Bootstrap auth from OAuth cookie                                          */
/* -------------------------------------------------------------------------- */

function bootstrapAuthFromCookie() {
  const rawCookie = _readCookie("google_user") || _readCookie("orcid_user");
  if (!rawCookie) return;

  try {
    const jsonStr = atob(rawCookie);
    const user = JSON.parse(jsonStr) as User;
    setAuth({ user });
    _eraseCookie("google_user");
    _eraseCookie("orcid_user");
  } catch {
    /* fall through */
  }
}

bootstrapAuthFromCookie();
