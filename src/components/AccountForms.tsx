"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

type Status = { ok?: string; error?: string };

function StatusLine({ status }: { status: Status }) {
  if (status.ok) return <span className="text-sm text-emerald-600">{status.ok}</span>;
  if (status.error) return <span className="text-sm text-red-600">{status.error}</span>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setStatus({});
    try {
      await api("/api/account", { method: "PATCH", json: { name: new FormData(e.currentTarget).get("name") } });
      setStatus({ ok: "Saved" });
      router.refresh();
    } catch (err) {
      setStatus({ error: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <h2 className="font-semibold">Profile</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={name} required maxLength={100} className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" value={email} readOnly disabled className="input" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <StatusLine status={status} />
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [status, setStatus] = useState<Status>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    if (form.get("newPassword") !== form.get("confirm")) {
      setStatus({ error: "New passwords don't match" });
      return;
    }
    setSaving(true);
    setStatus({});
    try {
      await api("/api/account/password", {
        method: "POST",
        json: { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") },
      });
      formEl.reset();
      setStatus({ ok: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setStatus({ error: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <h2 className="font-semibold">Change password</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required className="input" autoComplete="current-password" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Change password"}</button>
        <StatusLine status={status} />
      </div>
    </form>
  );
}

export function DeleteAccount({ email, paidPlanName }: { email: string; paidPlanName: string | null }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleting(true);
    setError("");
    try {
      await api("/api/account", { method: "DELETE", json: { password: new FormData(e.currentTarget).get("password") } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="card border-red-200 p-6">
      <h2 className="font-semibold text-red-700">Delete account</h2>
      <p className="mt-1 text-sm text-slate-600">
        Permanently deletes your account, every chatbot, its documents and all conversations. Chatbots embedded on
        your websites stop working immediately. This cannot be undone.
        {paidPlanName && ` Your ${paidPlanName} subscription is canceled right away, without a refund for the current period.`}
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-danger mt-4">Delete my account…</button>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="confirmEmail">Type <strong>{email}</strong> to confirm</label>
              <input id="confirmEmail" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="input" autoComplete="off" />
            </div>
            <div>
              <label className="label" htmlFor="deletePassword">Your password</label>
              <input id="deletePassword" name="password" type="password" required className="input" autoComplete="current-password" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button className="btn-danger" disabled={deleting || confirmEmail.trim().toLowerCase() !== email}>
              {deleting ? "Deleting…" : "Permanently delete account"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
