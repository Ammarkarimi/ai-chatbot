import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ok = (await searchParams).status === "success";
  return ok ? (
    <AuthShell title="Email verified" subtitle="Thanks! Your chatbots can now go live on your website.">
      <Link href="/dashboard" className="btn-primary w-full">Go to dashboard</Link>
    </AuthShell>
  ) : (
    <AuthShell
      title="Link expired"
      subtitle="This verification link is invalid, already used, or older than 24 hours. Log in and use “Resend email” on your dashboard."
    >
      <Link href="/dashboard" className="btn-primary w-full">Go to dashboard</Link>
    </AuthShell>
  );
}
