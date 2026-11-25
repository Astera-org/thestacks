import { register as apiRegister } from "@/api/auth";
import FormAlert from "@/components/auth/FormAlert";
import TurnstileWidget, {
  isTurnstileEnabled,
  TurnstileHandle
} from "@/components/auth/TurnstileWidget";
import GoogleLogo from "@/components/icons/GoogleLogo";
import OrcidLogo from "@/components/icons/OrcidLogo";
import Link from "@/components/Link";
import Button from "@/components/stacks-ui/Button";
import Checkbox from "@/components/stacks-ui/Checkbox";
import Input from "@/components/stacks-ui/Input";
import { getAuthRedirectPath, withAuthRedirect } from "@/lib/navigation";
import usePendingVerificationStore from "@/store/pendingVerificationStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useLocation } from "react-router";
import { z } from "zod";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(18, "Username must be at most 18 characters")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can only contain letters, numbers, underscores, hyphens, and periods."
      )
      .regex(
        /^[a-zA-Z0-9]([._-]?[a-zA-Z0-9])*$/,
        "Username cannot begin or end with a special character, or contain consecutive special characters."
      ),
    email: z.email({ message: "Invalid email address" }),
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string(),
    agree: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions to register."
    })
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"]
  });

type FormValues = z.infer<typeof registerSchema>;

// Debug: flip a flag to preview that UI state without a real request.
// Keep all false in committed code.
const DEBUG = {
  loading: false,
  fieldError: false,
  serverError: false,
  success: false
};

// A stable ref callback, so React calls it only when the element mounts.
function focusElement(element: HTMLElement | null) {
  element?.focus();
}

interface RegisterFormProps {
  /** Modal mode: switch to the login form in place. Omit for page mode (route links). */
  onSwitchToLogin?: () => void;
  /** Modal mode: called after a successful registration instead of the full-page redirect. */
  onAuthSuccess?: () => void;
}

export default function RegisterForm({
  onSwitchToLogin,
  onAuthSuccess
}: RegisterFormProps) {
  const location = useLocation();
  const pendingVerificationEmail = usePendingVerificationStore(
    (state) => state.email
  );
  const setPendingVerificationEmail = usePendingVerificationStore(
    (state) => state.setEmail
  );
  const clearPendingVerification = usePendingVerificationStore(
    (state) => state.clear
  );

  // Turnstile token; when Turnstile is on, sign-up stays disabled until the
  // challenge passes.
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Form state and validation.
  const {
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      confirm_password: "",
      agree: false
    }
  });

  // Register mutation.
  const mutation = useMutation({
    mutationFn: (
      payload: Omit<FormValues, "confirm_password" | "agree"> & {
        captcha_token?: string;
      }
    ) => apiRegister(payload),
    // The back-end consumes the token on every attempt, so a retry needs a new one.
    onError: () => turnstileRef.current?.reset(),
    onSuccess: (result) => {
      if (result.verificationRequired) {
        setPendingVerificationEmail(result.email);
        return;
      }
      if (onAuthSuccess) {
        onAuthSuccess();
        return;
      }
      window.location.replace(getAuthRedirectPath(location));
    }
  });

  // Handle form submission.
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (isTurnstileEnabled && !captchaToken) return;
    mutation.mutate({
      username: values.username.trim(),
      email: values.email.trim(),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      password: values.password,
      captcha_token: captchaToken ?? undefined
    });
  };

  // Watch form values.
  // eslint-disable-next-line react-hooks/incompatible-library
  const agreed = watch("agree");

  // Global error from server.
  const errorMsg = mutation.isError
    ? (mutation.error as Error).message
    : DEBUG.serverError
      ? "Something went wrong. Please try again."
      : undefined;

  const isPending = DEBUG.loading || isSubmitting || mutation.isPending;

  const fieldError = (message: string, actual: string | undefined) =>
    DEBUG.fieldError ? message : actual;

  const loginLinkClassName =
    "underline underline-offset-4 [text-decoration-skip-ink:none] [text-underline-position:from-font]";
  const loginLink = onSwitchToLogin ? (
    <button
      type="button"
      onClick={onSwitchToLogin}
      className={loginLinkClassName}
    >
      Log in
    </button>
  ) : (
    <Link
      to="/login"
      state={withAuthRedirect(location)}
      className={loginLinkClassName}
    >
      Log in
    </Link>
  );

  if (pendingVerificationEmail) {
    return (
      <div className="mt-10 space-y-4">
        {/* Takes focus after a sign-up from this form, since the submit button
            that had it is gone. */}
        <h2
          ref={mutation.isSuccess ? focusElement : undefined}
          tabIndex={-1}
          className="text-carbon-700 text-body-50 text-center font-sans font-semibold focus:outline-none"
        >
          Check your email
        </h2>
        <p className="text-fg-muted text-body-20 font-sans">
          If{" "}
          <span className="text-carbon-700 font-medium">
            {pendingVerificationEmail}
          </span>{" "}
          is a new account, we have sent a verification link to it. Click the
          link to verify your email address, then log in.
        </p>
        <p className="text-fg-muted text-body-20 font-sans">
          Already have an account with this email? {loginLink}, or reset your
          password if you have forgotten it.
        </p>
        <p className="text-fg-muted text-body-20 font-sans">
          Want to use a different email?{" "}
          <button
            type="button"
            onClick={() => {
              clearPendingVerification();
              mutation.reset();
            }}
            className={loginLinkClassName}
          >
            Sign up with a different address
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Heading. */}
      <div className="mt-10 space-y-1 text-center">
        <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
          Create Account
        </h2>
        <p className="text-fg-muted text-body-20 font-sans">
          Enter your details to get started with The Stacks
        </p>
      </div>

      {/* Form. */}
      <form
        method="post"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 flex flex-col gap-6"
      >
        {/* Username. */}
        <Controller
          name="username"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="username"
              type="text"
              label="Username"
              placeholder="Enter your username"
              autoComplete="username"
              error={fieldError(
                "Username must be at least 3 characters",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* Email. */}
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldError(
                "Invalid email address",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* First name. */}
        <Controller
          name="first_name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="first_name"
              type="text"
              label="First name"
              placeholder="First name"
              autoComplete="given-name"
              error={fieldError(
                "First name must be at least 2 characters",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* Last name. */}
        <Controller
          name="last_name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="last_name"
              type="text"
              label="Last name"
              placeholder="Last name"
              autoComplete="family-name"
              error={fieldError(
                "Last name must be at least 2 characters",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* Password. */}
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="password"
              type="password"
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
              error={fieldError(
                "Password must be at least 6 characters",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* Confirm password. */}
        <Controller
          name="confirm_password"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              id="confirm_password"
              type="password"
              label="Confirm password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={fieldError(
                "Passwords do not match",
                fieldState.error?.message
              )}
            />
          )}
        />

        {/* Terms agreement. */}
        <Controller
          name="agree"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Checkbox
                id="agree"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="mt-1"
              >
                <span className="text-body-20 text-carbon-500 font-sans">
                  I have read and agree to the{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="text-carbon-700 underline underline-offset-4 hover:opacity-80"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    className="text-carbon-700 underline underline-offset-4 hover:opacity-80"
                  >
                    Privacy Notice
                  </Link>
                  .
                </span>
              </Checkbox>
              {(DEBUG.fieldError || fieldState.error) && (
                <p className="text-error-800 text-body-20 font-sans">
                  {DEBUG.fieldError
                    ? "You must agree to the terms and conditions to register."
                    : fieldState.error?.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Bot check (only when a site key is configured). */}
        {isTurnstileEnabled && (
          <TurnstileWidget
            ref={turnstileRef}
            action="sign-up"
            onTokenChange={setCaptchaToken}
          />
        )}

        {/* Submit. */}
        <Button
          type="submit"
          size="lg"
          pill={false}
          className="w-full"
          disabled={
            isPending || !agreed || (isTurnstileEnabled && !captchaToken)
          }
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Signing up...
            </>
          ) : (
            "Sign up"
          )}
        </Button>

        {/* Global error from server. */}
        {errorMsg && <FormAlert intent="error">{errorMsg}</FormAlert>}

        {/* Success (debug-only preview; real success redirects). */}
        {DEBUG.success && (
          <FormAlert intent="success">
            Account created successfully. Redirecting...
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
          Already have an account? {loginLink}
        </p>
      </div>
    </>
  );
}
