import { changePassword } from "@/api/auth";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import { useMutation } from "@tanstack/react-query";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

interface FormValues {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export default function PasswordChangeForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
    getValues
  } = useForm<FormValues>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_new_password: ""
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: FormValues) =>
      changePassword({
        current_password: values.current_password,
        new_password: values.new_password
      }),
    onSuccess: () => {
      toast.success("Your password has been updated successfully.");
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (values) =>
    changePasswordMutation.mutate(values);

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="bg-surface space-y-6 rounded-lg p-6 md:p-10"
    >
      {/* Current password. */}
      <Controller
        name="current_password"
        control={control}
        rules={{ required: "Current password is required" }}
        render={({ field }) => (
          <Input
            {...field}
            type="password"
            label="Current password"
            autoComplete="current-password"
            error={errors.current_password?.message}
          />
        )}
      />

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
        render={({ field }) => (
          <Input
            {...field}
            type="password"
            label="New password"
            autoComplete="new-password"
            error={errors.new_password?.message}
          />
        )}
      />

      {/* Confirm new password. */}
      <Controller
        name="confirm_new_password"
        control={control}
        rules={{
          required: "Please confirm your new password",
          validate: (value) =>
            value === getValues("new_password") || "Passwords do not match"
        }}
        render={({ field }) => (
          <Input
            {...field}
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirm_new_password?.message}
          />
        )}
      />

      {/* Save changes. */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={
            !isDirty || isSubmitting || changePasswordMutation.isPending
          }
        >
          {changePasswordMutation.isPending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
