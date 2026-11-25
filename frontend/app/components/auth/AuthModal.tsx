import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import AuthCard, { type AuthTab } from "./AuthCard";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
  defaultTab?: "signin" | "signup";
}

export default function AuthModal(props: AuthModalProps) {
  const { open, onOpenChange, onAuthSuccess, defaultTab = "signin" } = props;
  const [activeTab, setActiveTab] = useState<AuthTab>(
    defaultTab === "signup" ? "signup" : "login"
  );

  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* The overlay is the scroll container so the whole card scrolls when
            it is taller than the viewport (Radix "scrollable overlay" pattern). */}
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-overlay/80 fixed inset-0 z-[250] grid place-items-center overflow-y-auto p-4">
          <DialogPrimitive.Content
            data-testid="auth-modal"
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[250] my-8 w-full max-w-lg duration-200"
          >
            <DialogPrimitive.Title className="sr-only">
              {activeTab === "login" ? "Log in" : "Sign up"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {activeTab === "login"
                ? "Log in to your account"
                : "Sign up for an account"}
            </DialogPrimitive.Description>

            <AuthCard
              value={activeTab}
              onValueChange={setActiveTab}
              onClose={close}
              onAuthSuccess={onAuthSuccess}
              onSwitchToSignup={() => setActiveTab("signup")}
              onSwitchToLogin={() => setActiveTab("login")}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
