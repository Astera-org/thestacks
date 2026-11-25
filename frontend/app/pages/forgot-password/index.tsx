import AuthPageLayout from "@/components/auth/AuthPageLayout";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export function meta() {
  return [
    { title: "Forgot password | The Stacks" },
    { property: "og:title", content: "Forgot password" },
    {
      property: "og:description",
      content: "Reset your password to get back into your account"
    },
    {
      name: "description",
      content: "Reset your password to get back into your account"
    }
  ];
}

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
