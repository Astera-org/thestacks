import { resetPassword } from "@/api/auth";
import FormAlert from "@/components/auth/FormAlert";
import ChevronLeftIcon from "@/components/icons/ChevronLeft";
import Link from "@/components/Link";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useSearchParams } from "react-router";

interface FormValues {
  new_password: string;
  confirm_password: string;
}

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  // Form state and validation.
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isValid }
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { new_password: "", confirm_password: "" }
  });

  // Reset mutation.
  const mutation = useMutation({
    mutationFn: ({ new_password }: FormValues) =>
      resetPassword(new_password, token ?? "")
  });

  // Handle form submission.
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutation.mutate(values);
  };

  if (!token || tokenError) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Heading. */}
        <div className="mt-10 space-y-1 text-center">
          <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
            Password reset
          </h2>
          <p className="text-fg-muted text-body-20 mt-3 font-sans">
            The password could not be reset.
          </p>
          <FormAlert intent="error" className="mt-3">
            <div className="w-full">
              This password reset link is invalid or has expired;
              <br />
              please{" "}
              <Link to="/forgot-password" className="underline">
                request a new link
              </Link>
              .
            </div>
          </FormAlert>
        </div>
      </div>
    );
  }

  const errorMsg = mutation.isError
    ? (mutation.error as Error).message
    : undefined;

  return (
    <>
      {mutation.isSuccess ? (
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Heading. */}
          <div className="mt-10 space-y-1 text-center">
            <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
              Password reset
            </h2>
            <p className="text-fg-muted text-body-20 mt-3 font-sans">
              Your password has been reset successfully.
            </p>
          </div>

          {/* Back to login. */}
          <Button asChild size="lg" pill={false} className="mt-4 w-full">
            <Link to="/login">Back to log in</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Back to login. */}
          <Link
            to="/login"
            className="text-carbon-500 hover:text-fg text-body-20 inline-flex items-center gap-1 font-mono transition-colors"
          >
            <ChevronLeftIcon className="size-4" />
            Back to log in
          </Link>

          {/* Heading. */}
          <div className="mt-10 space-y-1 text-center">
            <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
              Set a new password
            </h2>
            <p className="text-fg-muted text-body-20 font-sans">
              Choose a new password for your account.
            </p>
          </div>

          <form
            method="post"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-8 flex flex-col gap-6"
          >
            {/* New password. */}
            <Controller
              name="new_password"
              control={control}
              rules={{
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                }
              }}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="new_password"
                  type="password"
                  label="New password"
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  autoFocus
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Confirm password. */}
            <Controller
              name="confirm_password"
              control={control}
              rules={{
                required: "Please confirm your new password",
                validate: (value) =>
                  value === getValues("new_password") ||
                  "Passwords do not match"
              }}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="confirm_password"
                  type="password"
                  label="Confirm password"
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Submit. */}
            <Button
              type="submit"
              size="lg"
              pill={false}
              className="w-full"
              disabled={!isValid || !token || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>

            {/* Global error from server. */}
            {errorMsg && <FormAlert intent="error">{errorMsg}</FormAlert>}
          </form>
        </>
      )}
    </>
  );
}
