import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send you a reset link.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
