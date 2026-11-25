import { updateUser, uploadUserAvatar } from "@/api/users";
import { assetUrl } from "@/api/utils";
import AvatarSelector from "@/components/AvatarSelector";
import OrcidLogo from "@/components/icons/OrcidLogo";
import OrcidProfileLink from "@/components/OrcidProfileLink";
import Button from "@/components/stacks-ui/Button";
import Input from "@/components/stacks-ui/Input";
import Textarea from "@/components/stacks-ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { authClient, getAuthErrorMessage } from "@/lib/authClient";
import { User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

interface ProfileSettingsFormProps {
  user: User;
}

export default function ProfileSettingsForm(props: ProfileSettingsFormProps) {
  const { user } = props;
  const { setUser } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
    setValue
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

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ?? null
  );

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

  // Show the user's stored avatar whenever the user changes.
  const [syncedUser, setSyncedUser] = useState(user);
  if (user !== syncedUser) {
    setSyncedUser(user);
    setAvatarPreview(user?.avatar ?? null);
  }

  // Handle avatar change.

  const avatarSrc = useMemo(() => {
    if (!avatarPreview) return undefined;
    if (avatarPreview.startsWith("data:")) return avatarPreview;
    return assetUrl(avatarPreview);
  }, [avatarPreview]);

  const handleAvatarChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setValue("avatarFile", file, { shouldDirty: true });
  };

  // Link ORCID.
  const [isLinkingOrcid, setIsLinkingOrcid] = useState(false);

  const linkOrcid = async () => {
    const fallbackMessage = "Failed to initiate ORCID linking.";
    setIsLinkingOrcid(true);
    try {
      const { error } = await authClient.oauth2.link({
        providerId: "orcid",
        callbackURL: window.location.href
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, fallbackMessage));
      }
    } catch (err: any) {
      toast.error(err?.message || fallbackMessage);
    } finally {
      setIsLinkingOrcid(false);
    }
  };

  // Update profile.
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const updatePayload: Partial<User> = {
        first_name: payload.first_name.trim(),
        last_name: payload.last_name.trim(),
        email: payload.email.trim(),
        orcid: payload.orcid.trim(),
        profile: payload.profile
      };

      if (payload.avatarFile) {
        const response = await uploadUserAvatar(user.id, payload.avatarFile);
        const newAvatarUrl = response.avatar_url;
        setAvatarPreview(newAvatarUrl);
        updatePayload.avatar = newAvatarUrl;
      }

      return await updateUser(user.id, updatePayload);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Your profile has been updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (values) =>
    updateProfileMutation.mutate(values);

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="bg-surface space-y-6 rounded-lg p-6 md:p-10"
    >
      <h4 className="text-body-40 text-fg-strong">
        Information on your public profile
      </h4>

      {/* Avatar selector. */}
      <AvatarSelector
        currentAvatarSrc={avatarSrc || undefined}
        currentAvatarFallback={
          user.first_name.charAt(0).toUpperCase() +
          user.last_name.charAt(0).toUpperCase()
        }
        onAvatarChange={handleAvatarChange}
        disabled={isSubmitting}
      />

      <div className="flex flex-col gap-6 md:flex-row md:gap-4">
        {/* First name. */}
        <div className="md:basis-1/2">
          <Controller
            name="first_name"
            control={control}
            rules={{ required: "First name is required" }}
            render={({ field }) => (
              <Input
                {...field}
                label="First name"
                autoComplete="given-name"
                error={errors.first_name?.message}
              />
            )}
          />
        </div>

        {/* Last name. */}
        <div className="md:basis-1/2">
          <Controller
            name="last_name"
            control={control}
            rules={{ required: "Last name is required" }}
            render={({ field }) => (
              <Input
                {...field}
                label="Last name"
                autoComplete="family-name"
                error={errors.last_name?.message}
              />
            )}
          />
        </div>
      </div>

      {/* ORCID. */}
      <div className="flex flex-col gap-2">
        <span className="text-body-30 text-carbon-500 font-sans">ORCID</span>
        {user.orcid ? (
          <OrcidProfileLink
            orcid={user.orcid}
            showId
            iconClassName="size-4"
            className="text-body-30 text-carbon-700 font-sans hover:underline hover:underline-offset-4"
            data-testid="orcid-link-button"
          />
        ) : (
          <Button
            type="button"
            intent="secondary"
            onClick={linkOrcid}
            disabled={isLinkingOrcid}
            className="gap-2"
            data-testid="orcid-link-button"
          >
            {isLinkingOrcid ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <OrcidLogo className="size-4" />
                Link ORCID iD
              </>
            )}
          </Button>
        )}
      </div>

      {/* Profile. */}
      <Controller
        name="profile"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="Profile"
            placeholder="Tell the community a bit about yourself..."
          />
        )}
      />

      {/* Save changes. */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting || updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
