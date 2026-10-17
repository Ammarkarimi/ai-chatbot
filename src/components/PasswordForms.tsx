"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/forgot-password", { method: "POST", json: Object.fromEntries(new FormData(e.currentTarget)) });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="card space-y-4 p-6 text-center text-sm text-slate-600">
        <p>If an account exists for that email, we&apos;ve sent a link to reset your password. It expires in 1 hour.</p>
        <p>Didn&apos;t get it? Check your spam folder.</p>
        <Link href="/login" className="btn-secondary w-full">Back to log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-sm text-slate-600">
        Remembered it? <Link href="/login" className="font-medium text-brand-600">Log in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, password: form.get("password") } });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Saving…" : "Set new password"}</button>
      <p className="text-center text-xs text-slate-500">You&apos;ll be signed out on all other devices.</p>
    </form>
  );
}

export function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={state !== "idle"}
        className="font-medium underline disabled:no-underline disabled:opacity-70"
        onClick={async () => {
          setState("sending");
          setError("");
          try {
            await api("/api/auth/resend-verification", { method: "POST" });
            setState("sent");
          } catch (err) {
            setError((err as Error).message);
            setState("idle");
          }
        }}
      >
        {state === "sent" ? "Email sent!" : state === "sending" ? "Sending…" : "Resend email"}
      </button>
      {error && <span className="text-red-700">{error}</span>}
    </span>
  );
}
