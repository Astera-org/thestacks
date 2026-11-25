import { create } from "zustand";

interface PendingVerificationStoreState {
  /** The email a verification link was sent to after sign-up, if any. */
  email: string | null;
  setEmail: (email: string) => void;
  clear: () => void;
}

/**
 * Remembers that a sign-up is waiting for email verification, so the
 * "Check your email" message survives `RegisterForm` unmounting (switching
 * between the log in and sign up tabs or pages, or closing the auth modal).
 * Cleared by `AuthProvider` whenever the signed-in user changes (log in by any
 * method, or log out), or when the user chooses to sign up again.
 */
const usePendingVerificationStore = create<PendingVerificationStoreState>(
  (set) => ({
    email: null,
    setEmail: (email) => set({ email }),
    clear: () => set({ email: null })
  })
);

export default usePendingVerificationStore;
