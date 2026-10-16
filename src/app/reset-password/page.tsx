import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/PasswordForms";
import { isTokenValid } from "@/lib/email-tokens";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  // Only checks the token; it's consumed when the new password is submitted, so mail scanners can't burn it.
  if (!(await isTokenValid(token, "reset_password"))) {
    return (
      <AuthShell title="Link expired" subtitle="This password reset link is invalid, already used, or older than 1 hour.">
        <Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
