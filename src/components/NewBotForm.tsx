"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function NewBotForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const { id } = await api<{ id: string }>("/api/bots", { method: "POST", json: form });
      router.push(`/dashboard/bots/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="name">Chatbot name</label>
        <input id="name" name="name" required maxLength={80} className="input" placeholder="e.g. Acme Support" />
      </div>
      <fieldset>
        <legend className="label">AI provider</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "gemini", title: "Google Gemini", body: "High quality answers, great with long documents." },
            { value: "groq", title: "Groq", body: "Extremely fast replies using open models like GPT-OSS." },
          ].map((p) => (
            <label key={p.value} className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-brand-500 has-checked:bg-brand-50">
              <input type="radio" name="provider" value={p.value} defaultChecked={p.value === "gemini"} className="mt-1" />
              <span>
                <span className="block text-sm font-medium">{p.title}</span>
                <span className="block text-xs text-slate-600">{p.body}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Embeddings always use Gemini. You can switch the chat provider later.</p>
      </fieldset>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating…" : "Create chatbot"}</button>
    </form>
  );
}
