"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

type Settings = {
  name: string;
  instructions: string;
  welcomeMessage: string;
  primaryColor: string;
  position: "right" | "left";
  provider: "gemini" | "groq";
  model: string;
  temperature: number;
  allowedDomains: string[];
  visitorDailyLimit: number;
};

const MODEL_SUGGESTIONS = {
  gemini: ["gemini-3.5-flash", "gemini-3.1-flash-lite"],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
};

function KeyField({
  byoAllowed,
  label,
  has,
  value,
  onChange,
  help,
}: {
  byoAllowed: boolean;
  label: string;
  has: boolean;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  help: string;
}) {
  const removing = value === "";
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input
          type="password"
          className="input"
          disabled={!byoAllowed}
          placeholder={removing ? "Will be removed on save" : has ? "•••••••• (saved, using your key)" : "Using platform key"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          autoComplete="off"
        />
        {has && !removing && byoAllowed && (
          <button type="button" className="btn-secondary" onClick={() => onChange("")}>Remove</button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{help}</p>
    </div>
  );
}

export function BotSettingsForm({
  botId,
  initial,
  hasGeminiKey,
  hasGroqKey,
  byoAllowed,
  defaultModels,
}: {
  botId: string;
  initial: Settings;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  byoAllowed: boolean;
  defaultModels: { gemini: string; groq: string };
}) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [domainsText, setDomainsText] = useState(initial.allowedDomains.join("\n"));
  const [geminiKey, setGeminiKey] = useState<string | undefined>(undefined);
  const [groqKey, setGroqKey] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus({});
    try {
      await api(`/api/bots/${botId}`, {
        method: "PATCH",
        json: {
          ...s,
          allowedDomains: domainsText.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean),
          geminiApiKey: geminiKey,
          groqApiKey: groqKey,
        },
      });
      setGeminiKey(undefined);
      setGroqKey(undefined);
      setStatus({ ok: "Saved" });
      router.refresh();
    } catch (err) {
      setStatus({ error: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${initial.name}" and all its documents and conversations? This cannot be undone.`)) return;
    await api(`/api/bots/${botId}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card space-y-5 p-6">
        <h2 className="font-semibold">Appearance</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={s.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="color">Brand color</label>
            <div className="flex gap-2">
              <input id="color" type="color" className="h-9 w-12 cursor-pointer rounded border border-slate-300" value={s.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
              <input className="input" value={s.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} pattern="#[0-9a-fA-F]{6}" />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="welcome">Welcome message</label>
          <input id="welcome" className="input" value={s.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} maxLength={500} />
        </div>
        <div>
          <span className="label">Bubble position</span>
          <div className="flex gap-4 text-sm">
            {(["right", "left"] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 capitalize">
                <input type="radio" checked={s.position === p} onChange={() => set("position", p)} /> Bottom {p}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="font-semibold">Behavior</h2>
        <div>
          <label className="label" htmlFor="instructions">Instructions</label>
          <textarea
            id="instructions"
            rows={5}
            className="input"
            value={s.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            maxLength={4000}
            placeholder={'e.g. "You are the friendly assistant for Acme Dental. Always reply in the visitor\'s language. If someone wants an appointment, share our booking link https://…"'}
          />
          <p className="mt-1 text-xs text-slate-500">Tone, persona, language, escalation rules. The bot always answers from your documents.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="provider">AI provider</label>
            <select id="provider" className="input" value={s.provider} onChange={(e) => setS((p) => ({ ...p, provider: e.target.value as Settings["provider"], model: "" }))}>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="model">Model</label>
            <input id="model" list="model-options" className="input" value={s.model} onChange={(e) => set("model", e.target.value)} placeholder={`Default (${defaultModels[s.provider]})`} />
            <datalist id="model-options">
              {MODEL_SUGGESTIONS[s.provider].map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="temp">Creativity: {s.temperature.toFixed(1)}</label>
            <input id="temp" type="range" min={0} max={1} step={0.1} value={s.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-xs text-slate-500">Lower = more precise</p>
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <div>
          <h2 className="font-semibold">Website security</h2>
          <p className="mt-1 text-sm text-slate-600">Control where the chatbot can appear and how much one visitor can use it.</p>
        </div>
        <div>
          <label className="label" htmlFor="domains">
            Allowed websites <span className="font-normal text-red-600">(required to go live)</span>
          </label>
          <textarea
            id="domains"
            rows={4}
            className="input font-mono"
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            placeholder={"example.com\n*.example.com\nshop.mybrand.io"}
          />
          <p className="mt-1 text-xs text-slate-500">
            One domain per line. <code>example.com</code> also covers <code>www.example.com</code>; use{" "}
            <code>*.example.com</code> for all subdomains. The chatbot only appears on these websites.
          </p>
          {!domainsText.trim() && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Not live yet: add at least one domain so the chatbot can appear on your website. Until then it only
              works in the Playground and on its direct link.
            </p>
          )}
        </div>
        <div className="max-w-xs">
          <label className="label" htmlFor="visitor-limit">Messages per visitor per day</label>
          <input
            id="visitor-limit"
            type="number"
            min={1}
            max={1000}
            className="input"
            value={s.visitorDailyLimit}
            onChange={(e) => set("visitorDailyLimit", Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
          />
          <p className="mt-1 text-xs text-slate-500">Stops a single visitor from draining your monthly messages. Visitors are also limited to 8 messages per minute.</p>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <div>
          <h2 className="font-semibold">Your own API keys</h2>
          <p className="mt-1 text-sm text-slate-600">
            {byoAllowed
              ? "Optional. When set, this bot uses your keys instead of the platform's, and you pay the provider directly. Keys are encrypted at rest."
              : "Available on paid plans. Upgrade to use your own Gemini or Groq keys."}
          </p>
        </div>
        <KeyField byoAllowed={byoAllowed} label="Gemini API key" has={hasGeminiKey} value={geminiKey} onChange={setGeminiKey} help="Used for embeddings (training) and Gemini chat." />
        <KeyField byoAllowed={byoAllowed} label="Groq API key" has={hasGroqKey} value={groqKey} onChange={setGroqKey} help="Used for chat when the provider is Groq." />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {status.ok && <span className="text-sm text-emerald-600">{status.ok}</span>}
        {status.error && <span className="text-sm text-red-600">{status.error}</span>}
      </div>

      <div className="card border-red-200 p-6">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">Deleting a chatbot removes its documents, embeddings and conversation history.</p>
        <button type="button" onClick={remove} className="btn-danger mt-4">Delete chatbot</button>
      </div>
    </form>
  );
}
