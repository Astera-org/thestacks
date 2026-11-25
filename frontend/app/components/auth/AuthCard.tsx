import IconButton from "@/components/stacks-ui/IconButton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/stacks-ui/Tabs";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export type AuthTab = "login" | "signup";

interface AuthCardProps {
  value: AuthTab;
  onValueChange: (value: AuthTab) => void;
  /** Radix activation mode. Pages use "manual" so arrow keys don't navigate. */
  activationMode?: "automatic" | "manual";
  /** Modal mode: render a close control on the card. */
  onClose?: () => void;
  /** Modal mode: called after successful auth instead of the full-page redirect. */
  onAuthSuccess?: () => void;
  /** Modal mode: footer links switch tabs in place instead of navigating. */
  onSwitchToSignup?: () => void;
  onSwitchToLogin?: () => void;
}

/**
 * The white auth card, always tabbed. Shared by the login/register pages and
 * the auth modal so both render the exact same surface and switching behaviour.
 */
export default function AuthCard({
  value,
  onValueChange,
  activationMode = "automatic",
  onClose,
  onAuthSuccess,
  onSwitchToSignup,
  onSwitchToLogin
}: AuthCardProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as AuthTab)}
      activationMode={activationMode}
      className="border-border-strong bg-surface relative w-full max-w-lg rounded-2xl border px-6 py-10 shadow-lg md:px-10"
    >
      {onClose && (
        <IconButton
          intent="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close"
          icon={<X className="size-5" />}
          className="text-fg-muted absolute top-3 right-3"
        />
      )}

      <TabsList aria-label="Log in or sign up">
        <TabsTrigger value="login" className="flex-1 justify-center">
          Log in
        </TabsTrigger>
        <TabsTrigger value="signup" className="flex-1 justify-center">
          Sign up
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <LoginForm
          onAuthSuccess={onAuthSuccess}
          onSwitchToRegister={onSwitchToSignup}
        />
      </TabsContent>

      <TabsContent value="signup">
        <RegisterForm
          onAuthSuccess={onAuthSuccess}
          onSwitchToLogin={onSwitchToLogin}
        />
      </TabsContent>
    </Tabs>
  );
}
