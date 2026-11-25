import AuthPageLayout from "@/components/auth/AuthPageLayout";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export function meta() {
  return [
    { title: "Reset password | The Stacks" },
    { property: "og:title", content: "Reset password" },
    {
      property: "og:description",
      content: "Set a new password for your account"
    },
    {
      name: "description",
      content: "Set a new password for your account"
    }
  ];
}

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
    </AuthPageLayout>
  );
}
