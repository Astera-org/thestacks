import { requestPasswordReset } from "@/api/auth";
import FormAlert from "@/components/auth/FormAlert";
import ChevronLeftIcon from "@/components/icons/ChevronLeft";
import Link from "@/components/Link";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import { withAuthRedirect } from "@/lib/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useLocation } from "react-router";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address" })
});

type FormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordForm() {
  const location = useLocation();

  // Form state and validation.
  const {
    control,
    handleSubmit,
    formState: { isValid }
  } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: { email: "" }
  });

  // Request mutation.
  const mutation = useMutation({
    mutationFn: ({ email }: FormValues) =>
      requestPasswordReset(
        email.trim(),
        `${window.location.origin}/reset-password`
      )
  });

  // Handle form submission.
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutation.mutate(values);
  };

  const errorMsg = mutation.isError
    ? (mutation.error as Error).message
    : undefined;

  return (
    <>
      {mutation.isSuccess ? (
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Heading. */}
          <div className="space-y-1 text-center">
            <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
              Reset link sent
            </h2>
            <p className="text-fg-muted text-body-20 font-sans">
              If there is an account for that email address, you will receive a
              password reset link shortly.
            </p>
            <p className="text-fg-muted text-body-20 font-sans">
              Check your spam folder if you do not see it in your inbox.
            </p>
          </div>

          {/* Back to login. */}
          <Button asChild size="lg" pill={false} className="mt-4 w-full">
            <Link to="/login" state={withAuthRedirect(location)}>
              Back to log in
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Back to login. */}
          <Link
            to="/login"
            state={withAuthRedirect(location)}
            className="text-carbon-500 hover:text-fg text-body-20 inline-flex items-center gap-1 font-mono transition-colors"
          >
            <ChevronLeftIcon className="size-4" />
            Back to log in
          </Link>

          {/* Heading. */}
          <div className="mt-10 space-y-1 text-center">
            <h2 className="text-carbon-700 text-body-50 font-sans font-semibold">
              Forgot your password?
            </h2>
            <p className="text-fg-muted text-body-20 font-sans">
              Enter the email address for your account, and we will send you a
              link to reset your password.
            </p>
          </div>

          <form
            method="post"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-8 flex flex-col gap-6"
          >
            {/* Email. */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="email"
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
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
              disabled={!isValid || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
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
