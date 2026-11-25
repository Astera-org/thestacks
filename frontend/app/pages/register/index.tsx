import AuthCard from "@/components/auth/AuthCard";
import useAppNavigate from "@/hooks/useAppNavigate";
import { withAuthRedirect } from "@/lib/navigation";
import { useLocation } from "react-router";

export function meta() {
  return [{ title: "Sign up | The Stacks" }];
}

export default function RegisterPage() {
  const navigate = useAppNavigate();
  const location = useLocation();

  return (
    <div className="bg-off-white flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        value="signup"
        onValueChange={(tab) =>
          navigate(tab === "login" ? "/login" : "/register", {
            state: withAuthRedirect(location)
          })
        }
        activationMode="manual"
      />
    </div>
  );
}
