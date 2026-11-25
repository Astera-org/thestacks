import Link from "@/components/Link";
import { useAuth } from "@/hooks/useAuth";
import { withAuthRedirect } from "@/lib/navigation";
import { Plus } from "lucide-react";
import { useLocation } from "react-router";

/**
 * Prompt shown to unauthenticated visitors with links to log in or sign up.
 * Renders nothing when the user is already logged in.
 */
export default function CommentLogInNotice() {
  const { user } = useAuth();
  const location = useLocation();
  if (user != null) return null;

  return (
    <div className="group mb-11 flex items-center gap-5">
      <div className="group-hover:bg-periwinkle-900 bg-sky-blue-500 mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-700 p-0 md:h-6 md:w-6">
        <Plus
          className="text-fg-inverted h-4 w-4 md:h-5 md:w-5"
          strokeWidth={3}
        />
      </div>
      <div className="text-gray-blue-600 text-[15px] font-semibold md:text-[18px]">
        <Link
          to="/login"
          state={withAuthRedirect(location)}
          className="me-1 underline underline-offset-4"
        >
          Log in
        </Link>
        or
        <Link
          to="/register"
          state={withAuthRedirect(location)}
          className="mx-1 underline underline-offset-4"
        >
          sign up
        </Link>
        to leave a comment.
      </div>
    </div>
  );
}
