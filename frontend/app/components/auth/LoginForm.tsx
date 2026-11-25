import { login as apiLogin } from "@/api/auth";
import FormAlert from "@/components/auth/FormAlert";
import GoogleLogo from "@/components/icons/GoogleLogo";
import OrcidLogo from "@/components/icons/OrcidLogo";
import Link from "@/components/Link";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import { getAuthRedirectPath, withAuthRedirect } from "@/lib/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useLocation, useSearchParams } from "react-router";

interface FormValues {
  username: string;
  password: string;
}

// Debug: flip a flag to preview that UI state without a real request.
// Keep all false in committed code.
const DEBUG = {
  loading: false,
  fieldError: false,
  serverError: false,
  success: false
};

interface VerificationNotice {
  intent: "success" | "error";
  message: string;
}

// The server redirects here from the email verification link with
// `verified=true`, and better-auth adds its `error` code when verification
// fails.
function getVerificationNotice(
  searchParams: URLSearchParams
): VerificationNotice | null {
  if (searchParams.get("verified") !== "true") return null;
  const error = searchParams.get("error");
  if (error === "TOKEN_EXPIRED") {
    return {
      intent: "error",
      message:
        "Your verification link has expired. Log in and we will send you a new one."
    };
  }
  if (error === "USER_NOT_FOUND") {
    return {
      intent: "error",
      message:
        "We could not find an account for this verification link. Please sign up again."
    };
  }
  if (error) {
    return {
      intent: "error",
      message:
        "This verification link is not valid. Log in and we will send you a new one."
    };
  }
  return {
    intent: "success",
    message: "Your email address has been verified. Please log in to continue."
  };
}

interface LoginFormProps {
  /** Modal mode: switch to the register form in place. Omit for page mode (route links). */
  onSwitchToRegister?: () => void;
  /** Modal mode: called after a successful login instead of the full-page redirect. */
  onAuthSuccess?: () => void;
}

export default function LoginForm({
  onSwitchToRegister,
  onAuthSuccess
}: LoginFormProps) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Read once: the URL params are removed below, so the notice doesn't come
  // back on refresh or history navigation.
  const [verificationNotice] = useState(() =>
    getVerificationNotice(searchParams)
  );

  // Remove the verification params from the URL, keeping the navigation
  // state that carries the post-login redirect.
  useEffect(() => {
    if (!searchParams.has("verified")) return;
    setSearchParams(
      (params) => {
        params.delete("verified");
        params.delete("error");
        return params;
      },
      { replace: true, preventScrollReset: true, state: location.state }
    );
  }, [searchParams, setSearchParams, location.state]);

  // Form state and validation.
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Login mutation.
  const mutation = useMutation({
    mutationFn: ({ username, password }: FormValues) =>
      apiLogin(username.trim(), password),
    onSuccess: () => {
      if (onAuthSuccess) {
        onAuthSuccess();
        return;
      }
      window.location.replace(getAuthRedirectPath(location));
    }
  });

  // Handle form submission.
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutation.mutate(values);
  };

  const isPending = DEBUG.loading || mutation.isPending;
  const errorMsg = mutation.isError
    ? (mutation.error as Error).message
    : DEBUG.serverError
      ? "Invalid credentials"
      : undefined;

  return (
    <>
      {/* Form. */}
      <form
        method="post"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-10 flex flex-col gap-6"
      >
        {/* Result of following an email verification link. Kept through
            failed login attempts; a successful login navigates away. */}
        {verificationNotice && !mutation.isSuccess && (
          <FormAlert intent={verificationNotice.intent}>
            {verificationNotice.message}
          </FormAlert>
        )}

        {/* Username or email. */}
        <Controller
          name="username"
          control={control}
          rules={{ required: "Please enter your username or email" }}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="username"
              type="text"
              label="Username or Email"
              placeholder="you@example.com"
              autoComplete="username"
              autoFocus
              error={
                DEBUG.fieldError
                  ? "Please enter your username or email"
                  : fieldState.error?.message
              }
            />
          )}
        />

        {/* Password. */}
        <Controller
          name="password"
          control={control}
          rules={{ required: "Please enter your password" }}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="password"
              type="password"
              label="Password"
              labelAction={
                <Link
                  to="/forgot-password"
                  state={withAuthRedirect(location)}
                  className="text-carbon-700 text-body-20 font-sans font-medium underline underline-offset-4 [text-decoration-skip-ink:none] [text-underline-position:from-font]"
                >
                  Forgot password?
                </Link>
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              error={
                DEBUG.fieldError
                  ? "Please enter your password"
                  : fieldState.error?.message
              }
            />
          )}
        />

        {/* Submit. */}
        <Button
          type="submit"
          size="lg"
          pill={false}
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>

        {/* Global error from server. */}
        {errorMsg && <FormAlert intent="error">{errorMsg}</FormAlert>}

        {/* Success (debug-only preview; real success redirects). */}
        {DEBUG.success && (
          <FormAlert intent="success">
            Logged in successfully. Redirecting...
          </FormAlert>
        )}

        {/* TODO (#30): Implement Google OAuth. */}
        <Button
          type="button"
          intent="secondary"
          size="lg"
          className="hidden w-full"
        >
          <span className="flex items-center gap-2">
            Log in with Google
            <GoogleLogo />
          </span>
        </Button>

        {/* TODO (#31): Implement ORCID OAuth. */}
        <Button
          type="button"
          intent="secondary"
          size="lg"
          className="hidden w-full"
        >
          <span className="flex items-center gap-2">
            Log in with ORCID iD
            <OrcidLogo />
          </span>
        </Button>
      </form>

      {/* Footer. */}
      <div className="mt-10 text-center">
        <p className="text-carbon-500 text-body-20 font-sans">
          Don't have an account?{" "}
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-carbon-700 font-medium underline underline-offset-4 [text-decoration-skip-ink:none] [text-underline-position:from-font]"
            >
              Sign up
            </button>
          ) : (
            <Link
              to="/register"
              state={withAuthRedirect(location)}
              className="text-carbon-700 font-medium underline underline-offset-4 [text-decoration-skip-ink:none] [text-underline-position:from-font]"
            >
              Sign up
            </Link>
          )}
        </p>
      </div>
    </>
  );
}
