import AuthCardShell from "@/components/auth/AuthCardShell";
import FormAlert from "@/components/auth/FormAlert";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { authClient } from "@/lib/authClient";
import { withAuthRedirect } from "@/lib/navigation";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";

export function meta() {
  return [
    { title: "Connect a device | The Stacks" },
    { name: "robots", content: "noindex" }
  ];
}

const NEW_CODE_HINT = "Run the login command again for a new one.";

/** Body fields better-auth's device endpoints add to the client error. */
interface DeviceAuthError {
  error?: string;
  status?: number;
}

/** Maps a device endpoint error to a message users can act on. */
function deviceErrorMessage(error: DeviceAuthError | null | undefined) {
  if (error?.error === "expired_token")
    return `That code has expired. ${NEW_CODE_HINT}`;
  if (error?.error === "access_denied")
    return `This code was opened by a different account. ${NEW_CODE_HINT}`;
  if (error?.status && error.status >= 500)
    return "Something went wrong on our end. Please try again.";
  return "That code is invalid or expired.";
}

/** Runs a device request, turning network failures into a message. */
async function withNetworkError(request: () => Promise<string | null>) {
  try {
    return await request();
  } catch {
    return "We couldn't reach the server. Check your connection and try again.";
  }
}

/** Returns why a code can't be approved, or null if it is waiting for approval. */
function checkUserCode(userCode: string) {
  return withNetworkError(async () => {
    const { data, error } = await authClient.device({
      query: { user_code: userCode }
    });
    if (error || !data) return deviceErrorMessage(error);
    if (data.status !== "pending")
      return `That code has already been used. ${NEW_CODE_HINT}`;
    return null;
  });
}

function normalizeUserCode(code: string) {
  return code.trim().replace(/-/g, "").toUpperCase();
}

/** Shows a user code as two dashed halves, e.g. ABCD-1234. */
function formatUserCode(code: string) {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

type Step = "enter" | "checking" | "confirm" | "approved" | "denied";

export default function DevicePage() {
  const { user, isPending, profileError, retryProfile } = useAuth();
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const location = useLocation();
  const linkedCode = params.get("user_code") ?? "";
  const [code, setCode] = useState(linkedCode);
  // A code from the link is checked straight away, like verification_uri_complete.
  const [step, setStep] = useState<Step>(linkedCode ? "checking" : "enter");
  const [deciding, setDeciding] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userCode = normalizeUserCode(code);

  // A profile error still means there's a session, so don't send them to login.
  const signedOut = !isPending && !user && !profileError;

  useEffect(() => {
    if (signedOut) {
      navigate("/login", { replace: true, state: withAuthRedirect(location) });
    }
  }, [signedOut, navigate, location]);

  useEffect(() => {
    if (!user || step !== "checking") return;
    let cancelled = false;
    checkUserCode(userCode).then((message) => {
      if (cancelled) return;
      setError(message);
      setStep(message ? "enter" : "confirm");
    });
    return () => {
      cancelled = true;
    };
  }, [user, step, userCode]);

  if (profileError && !user) {
    return (
      <AuthCardShell>
        <DeviceResult
          icon={
            <AlertTriangle aria-hidden className="stroke-error-900 size-10" />
          }
          title="We couldn't load your account"
        >
          Check your connection and try again.
        </DeviceResult>
        <Button
          className="mt-8 w-full"
          pill={false}
          size="lg"
          onClick={retryProfile}
        >
          Try again
        </Button>
      </AuthCardShell>
    );
  }

  if (!user) {
    return (
      <AuthCardShell>
        <div className="flex justify-center py-6">
          <Loader2
            aria-label="Loading"
            className="text-fg-muted size-6 animate-spin"
          />
        </div>
      </AuthCardShell>
    );
  }

  if (step === "approved") {
    return (
      <AuthCardShell>
        <DeviceResult
          icon={
            <CheckCircle2 aria-hidden className="stroke-success-900 size-10" />
          }
          title="Device connected"
        >
          You can close this window and go back to your terminal.
        </DeviceResult>
      </AuthCardShell>
    );
  }

  if (step === "denied") {
    return (
      <AuthCardShell>
        <DeviceResult
          icon={<XCircle aria-hidden className="text-fg-muted size-10" />}
          title="Request denied"
        >
          The device was not given access to your account. You can close this
          window.
        </DeviceResult>
      </AuthCardShell>
    );
  }

  async function decide(action: "approve" | "deny") {
    if (deciding) return;
    setDeciding(action);
    setError(null);
    const message = await withNetworkError(async () => {
      const { error } = await authClient.device[action]({ userCode });
      return error ? deviceErrorMessage(error) : null;
    });
    setDeciding(null);
    if (message) return setError(message);
    setStep(action === "approve" ? "approved" : "denied");
  }

  function enterDifferentCode() {
    setCode("");
    setError(null);
    setStep("enter");
  }

  if (step === "confirm") {
    return (
      <AuthCardShell>
        {/* Takes focus because the code form that had it is gone, so the
            account and code are read before reaching Approve. */}
        <DeviceHeading takeFocus title="Connect The Stacks CLI?">
          The Stacks CLI wants to sign in as{" "}
          <span className="text-fg font-semibold">{user.username}</span>.
        </DeviceHeading>

        <div className="bg-off-white mt-8 rounded-lg px-4 py-5 text-center">
          <span className="text-caption-30 text-carbon-500 block font-mono">
            Code
          </span>
          <p className="text-headline-30 text-fg-strong mt-1 font-mono tracking-widest">
            {formatUserCode(userCode)}
          </p>
        </div>
        <p className="text-fg-muted text-body-20 mt-4 text-center font-sans">
          Only approve if this code is showing right now in a terminal you're
          using.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            aria-busy={deciding === "approve" || undefined}
            className="w-full"
            disabled={Boolean(deciding)}
            pill={false}
            size="lg"
            onClick={() => decide("approve")}
          >
            {deciding === "approve" ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Approving…
              </>
            ) : (
              "Approve"
            )}
          </Button>
          <Button
            aria-busy={deciding === "deny" || undefined}
            className="w-full"
            disabled={Boolean(deciding)}
            intent="outline"
            pill={false}
            size="lg"
            onClick={() => decide("deny")}
          >
            {deciding === "deny" ? "Denying…" : "Deny"}
          </Button>
        </div>

        {error && (
          <>
            <FormAlert className="mt-6">{error}</FormAlert>
            <button
              className="text-carbon-500 hover:text-fg text-body-20 mt-4 w-full text-center font-mono transition-colors"
              type="button"
              onClick={enterDifferentCode}
            >
              Enter a different code
            </button>
          </>
        )}
      </AuthCardShell>
    );
  }

  const checking = step === "checking";

  return (
    <AuthCardShell>
      <DeviceHeading title="Connect a device">
        Enter the code shown in your terminal.
      </DeviceHeading>

      <form
        className="mt-8 flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!userCode || checking) return;
          setError(null);
          setStep("checking");
        }}
      >
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          className="font-mono tracking-widest uppercase"
          disabled={checking}
          error={error ?? undefined}
          id="device-code"
          label="Device code"
          placeholder="ABCD-1234"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
        />
        <Button
          aria-busy={checking || undefined}
          className="w-full"
          disabled={!userCode || checking}
          pill={false}
          size="lg"
          type="submit"
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Checking…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </AuthCardShell>
  );
}

function focusElement(element: HTMLElement | null) {
  element?.focus();
}

function DeviceHeading({
  children,
  takeFocus,
  title
}: {
  children: ReactNode;
  /** Focus the heading on mount, for screens that replace the focused control. */
  takeFocus?: boolean;
  title: string;
}) {
  return (
    <div className="space-y-1 text-center">
      <h1
        ref={takeFocus ? focusElement : undefined}
        className="text-carbon-700 text-body-50 font-sans font-semibold focus:outline-none"
        tabIndex={takeFocus ? -1 : undefined}
      >
        {title}
      </h1>
      <p className="text-fg-muted text-body-20 font-sans">{children}</p>
    </div>
  );
}

function DeviceResult({
  children,
  icon,
  title
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {icon}
      {/* Takes focus because the button that had it (Approve, Deny) is gone,
          so screen readers announce the outcome. */}
      <DeviceHeading takeFocus title={title}>
        {children}
      </DeviceHeading>
    </div>
  );
}
