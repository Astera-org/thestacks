import AuthModal from "@/components/auth/AuthModal";
import { createContext, useCallback, useRef, useState } from "react";

interface CommentAuthContextValue {
  requestAuth: (onSuccess: () => void) => void;
}

export const CommentAuthContext = createContext<CommentAuthContextValue | null>(
  null
);

/**
 * Provides a `requestAuth` callback via context so any nested comment
 * component can trigger the Sign In / Sign Up modal. After successful
 * authentication the caller-supplied callback is invoked, resuming the
 * action the user originally attempted (e.g. opening a reply editor).
 */
export default function CommentAuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const pendingCallback = useRef<(() => void) | null>(null);

  const requestAuth = useCallback((onSuccess: () => void) => {
    pendingCallback.current = onSuccess;
    setShowModal(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setShowModal(false);
    const cb = pendingCallback.current;
    pendingCallback.current = null;
    cb?.();
  }, []);

  return (
    <CommentAuthContext value={{ requestAuth }}>
      {children}
      <AuthModal
        open={showModal}
        onOpenChange={setShowModal}
        onAuthSuccess={handleAuthSuccess}
      />
    </CommentAuthContext>
  );
}
