import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { ResendVerificationButton } from "@/components/PasswordForms";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = getPlan(user.plan);
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden gap-4 text-sm sm:flex">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">Chatbots</Link>
              <Link href="/dashboard/billing" className="text-slate-600 hover:text-slate-900">Billing</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard/billing" className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {plan.name}
            </Link>
            <span className="hidden text-slate-600 md:inline">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="text-slate-500 hover:text-slate-900">Log out</button>
            </form>
          </div>
        </div>
      </header>
      {!user.emailVerifiedAt && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm text-amber-900 sm:px-6">
            Verify your email to put your chatbots live. We sent a link to <strong>{user.email}</strong>.{" "}
            <ResendVerificationButton />
          </p>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
