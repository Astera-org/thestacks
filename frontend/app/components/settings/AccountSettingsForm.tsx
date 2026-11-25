import { updateUser } from "@/api/users";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

interface FormValues {
  first_name: string;
  last_name: string;
  email: string;
  profile: string;
  orcid: string;
  avatarFile?: File;
}

interface AccountSettingsFormProps {
  user: User;
}

export default function AccountSettingsForm(props: AccountSettingsFormProps) {
  const { user } = props;
  const { setUser } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset
  } = useForm<FormValues>({
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      orcid: user?.orcid ?? "",
      profile: user?.profile ?? "",
      avatarFile: undefined
    }
  });

  // Reset form.
  useEffect(() => {
    reset({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      orcid: user?.orcid ?? "",
      profile: user?.profile ?? "",
      avatarFile: undefined
    });
  }, [user, reset]);

  // Update profile.
  const updateAccountMutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const updatePayload: Partial<User> = {
        first_name: payload.first_name.trim(),
        last_name: payload.last_name.trim(),
        email: payload.email.trim(),
        orcid: payload.orcid.trim(),
        profile: payload.profile
      };
      return await updateUser(user.id, updatePayload);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Your account has been updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (values) =>
    updateAccountMutation.mutate(values);

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="bg-surface space-y-6 rounded-lg p-6 md:p-10"
    >
      {/* Username (read-only). */}
      <Input label="Username" value={user.username} disabled />

      {/* Email. */}
      <Controller
        name="email"
        control={control}
        rules={{
          required: "Email is required",
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Invalid email address"
          }
        }}
        render={({ field }) => (
          <Input
            {...field}
            type="email"
            label="Email"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />

      {/* Save changes. */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting || updateAccountMutation.isPending}
        >
          {updateAccountMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
