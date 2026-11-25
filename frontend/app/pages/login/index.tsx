import AuthCard from "@/components/auth/AuthCard";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { withAuthRedirect } from "@/lib/navigation";
import { useEffect } from "react";
import { useLocation } from "react-router";

export function meta() {
  return [
    { title: "Log in | The Stacks" },
    { property: "og:title", content: "Log in" },
    {
      property: "og:description",
      content: "Log in to your account to continue"
    },
    { name: "description", content: "Log in to your account to continue" }
  ];
}

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useAppNavigate();
  const location = useLocation();

  // Redirect to home if user is already logged in.
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="bg-off-white flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        value="login"
        onValueChange={(tab) =>
          navigate(tab === "signup" ? "/register" : "/login", {
            state: withAuthRedirect(location)
          })
        }
        activationMode="manual"
      />
    </div>
  );
}
