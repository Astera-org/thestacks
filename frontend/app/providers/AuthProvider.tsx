import { logout as apiLogout } from "@/api/auth";
import { http } from "@/api/client";
import { AuthContext } from "@/hooks/useAuth";
import { authClient } from "@/lib/authClient";
import usePendingVerificationStore from "@/store/pendingVerificationStore";
import { User } from "@/types";
import { ReactNode, useCallback, useEffect, useState } from "react";

interface ProfileState {
  sessionUserId: string | null;
  request: number;
  user: User | null;
  error: Error | null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: session,
    isPending: sessionPending,
    refetch
  } = authClient.useSession();
  const sessionUserId = session ? String(session.user.id) : null;
  const [profileState, setProfileState] = useState<ProfileState>({
    sessionUserId: null,
    request: -1,
    user: null,
    error: null
  });
  const [profileRequest, setProfileRequest] = useState(0);

  // Fetch the full user profile whenever the session resolves to a logged-in state.
  // session.user only carries Better Auth's stripped shape and omits fields like
  // points, moderator, orcid, login_at, and can_create_publications.
  useEffect(() => {
    if (!sessionUserId) return;

    let cancelled = false;
    http
      .get<{ user: User }>("/auth/me")
      .then((res) => {
        if (!cancelled) {
          setProfileState({
            sessionUserId,
            request: profileRequest,
            user: res.data.user,
            error: null
          });
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          authClient.signOut();
          if (!cancelled) {
            setProfileState({
              sessionUserId,
              request: profileRequest,
              user: null,
              error: null
            });
          }
          return;
        }

        if (!cancelled) {
          setProfileState((current) => ({
            sessionUserId,
            request: profileRequest,
            user: current.sessionUserId === sessionUserId ? current.user : null,
            error:
              error instanceof Error
                ? error
                : new Error("Failed to load account profile.")
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, sessionUserId, profileRequest]);

  // A sign-up waiting for verification no longer applies once someone signs
  // in (by any method) or out.
  useEffect(() => {
    usePendingVerificationStore.getState().clear();
  }, [sessionUserId]);

  // Detect ORCID linking via helper cookie. The backend sets a short-lived `orcid_user`
  // cookie that contains the updated user JSON (base64-encoded). If present, merge it into the
  // current auth state and clear the cookie.
  useEffect(() => {
    const cookiePair = document.cookie
      .split("; ")
      .find((row) => row.startsWith("orcid_user="));

    if (!cookiePair) return;

    const rawVal = cookiePair.split("=")[1];
    try {
      const decoded = JSON.parse(
        window.atob(decodeURIComponent(rawVal))
      ) as User;
      if (decoded && decoded.id) {
        refetch();
      }
    } catch {
      /* ignore parsing errors */
    }

    // Expire helper cookie.
    document.cookie =
      "orcid_user=; Max-Age=0; path=/; SameSite=Lax; " +
      (window.location.protocol === "https:" ? "Secure;" : "");
  }, [refetch]);

  // Session is already updated by the authClient.signIn.* call in api/auth.ts.
  // This is a no-op kept for interface compatibility until LoginForm and the ORCID
  // callback are migrated off the old (user, access, refresh) signature.
  const login = useCallback(
    (_user: User, _access: string, _refresh: string) => {},
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
  }, []);

  // Updates auth state immediately after profile changes so the Navbar
  // reflects new name/avatar without a page refresh.
  const setUser = useCallback(
    (updatedUser: User) => {
      setProfileState({
        sessionUserId,
        request: profileRequest,
        user: updatedUser,
        error: null
      });
    },
    [sessionUserId, profileRequest]
  );

  const retryProfile = useCallback(() => {
    if (!sessionUserId) return;
    setProfileRequest((request) => request + 1);
  }, [sessionUserId]);

  const currentProfile =
    sessionUserId &&
    profileState.sessionUserId === sessionUserId &&
    profileState.request === profileRequest
      ? profileState
      : null;
  const user = session ? (currentProfile?.user ?? null) : null;
  const profileError = currentProfile?.error ?? null;
  const profilePending = !!session && !currentProfile;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: null,
        refreshToken: null,
        login,
        logout,
        setUser,
        isPending: sessionPending || profilePending,
        profileError,
        retryProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
