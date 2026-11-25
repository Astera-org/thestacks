import { User } from "@/types";
import { createContext, useContext } from "react";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, access: string, refresh: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  isPending: boolean;
  profileError: Error | null;
  retryProfile: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
};
