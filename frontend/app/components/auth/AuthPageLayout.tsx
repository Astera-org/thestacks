import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import AuthCardShell from "./AuthCardShell";

interface AuthPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared centered-card shell for auth pages (forgot/reset password). Redirects
 * home if the user is already logged in.
 */
export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  const { user } = useAuth();
  const navigate = useAppNavigate();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  return <AuthCardShell>{children}</AuthCardShell>;
}
