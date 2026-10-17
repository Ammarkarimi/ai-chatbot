"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";

/**
 * An animated, video-style walkthrough of the product, drawn with HTML instead of a video file so
 * it stays sharp, light and in sync with the real UI. The screen is laid out at a fixed design size
 * and scaled to fit, so the fake cursor can aim at elements by their data-tour attribute.
 */

const W = 680;
const H = 420;
const APP_HOST = "botforge-chat.vercel.app";

type Point = [number, number];
type Scene = {
  title: string;
  summary: string;
  url: string;
  duration: number;
  /** Subtitles: each shows from `at` ms until the next one. */
  captions: { at: number; text: string }[];
  /** From `at` ms the cursor glides to the element with data-tour={target}, or to a point. */
  cursor: { at: number; target: string | Point }[];
  clicks: number[];
  /** While dragging, a file chip follows the cursor. */
  drag?: { from: number; to: number; label: string };
  render: (t: number, appUrl: string) => React.ReactNode;
};

/** Text revealed character by character, starting at `start` ms. */
function typed(text: string, start: number, t: number, cps = 14) {
  if (t < start) return "";
  return text.slice(0, Math.floor(((t - start) / 1000) * cps));
}

const between = (t: number, from: number, to: number) => t >= from && t < to;

function Caret({ show }: { show: boolean }) {
  return show ? <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-slate-800 align-middle" /> : null;
}

function Btn({ tour, pressed, full, children }: { tour?: string; pressed?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <span
      data-tour={tour}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition ${
        pressed ? "scale-95 bg-brand-700" : ""
      } ${full ? "w-full" : ""}`}
    >
      {children}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex w-fit gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );
}

function Bubble({ from, children }: { from: "bot" | "user"; children: React.ReactNode }) {
  return from === "user" ? (
    <div className="ml-auto w-fit max-w-[80%] animate-fade-in rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-xs text-white">{children}</div>
  ) : (
    <div className="w-fit max-w-[85%] animate-fade-in rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-800">{children}</div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <LogoMark className="h-6 w-6" /> BotForge
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium text-slate-900">Chatbots</span>
          <span>Billing</span>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">AK</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

const TABS = ["Knowledge", "Playground", "Conversations", "Analytics", "Settings", "Embed"];

function BotShell({ tab, children }: { tab: string; children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="px-6 pt-4">
        <p className="text-[11px] text-slate-400">Chatbots / Acme Support</p>
        <h3 className="text-base font-semibold">Acme Support</h3>
        <div className="mt-2 flex gap-1 border-b border-slate-200">
          {TABS.map((name) => (
            <span
              key={name}
              data-tour={`tab-${name.toLowerCase()}`}
              className={`-mb-px border-b-2 px-2.5 py-1.5 text-xs font-medium ${
                name === tab ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <div key={tab} className="animate-fade-in px-6 py-4">{children}</div>
    </AppShell>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
      <span className="text-emerald-400">✓</span> {children}
    </div>
  );
}

const ANSWER = "Yes! You can request a full refund within 30 days of purchase. Just email support@acme.com with your order number.";
const SHIPPING = "Orders ship within 2 business days and usually arrive in 3–5 days.";

const SCENES: Scene[] = [
  {
    title: "Create a chatbot",
    summary: "Sign up free and click “New chatbot”. Name it and pick Gemini or Groq.",
    url: "/dashboard",
    duration: 6500,
    captions: [
      { at: 0, text: "Sign up free, then click “+ New chatbot”" },
      { at: 1600, text: "Give it a name and pick an AI model" },
      { at: 3500, text: "Click “Create chatbot”" },
    ],
    cursor: [
      { at: 0, target: [520, 330] },
      { at: 300, target: "new-bot" },
      { at: 1700, target: "name" },
      { at: 3500, target: "create" },
      { at: 5000, target: [560, 360] },
    ],
    clicks: [1200, 1900, 4400],
    render: (t) => (
      <AppShell>
        {t < 1600 ? (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Your chatbots</h3>
                <p className="text-xs text-slate-500">Free plan · 0 of 1 chatbots used</p>
              </div>
              <Btn tour="new-bot" pressed={between(t, 1200, 1450)}>+ New chatbot</Btn>
            </div>
            <div className="mt-6 grid place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
              <LogoMark className="h-10 w-10 opacity-70" />
              <p className="mt-3 text-sm font-medium">No chatbots yet</p>
              <p className="text-xs text-slate-500">Create your first one in under a minute.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm animate-fade-in p-5">
            <h3 className="text-base font-semibold">New chatbot</h3>
            <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Chatbot name</p>
                <div
                  data-tour="name"
                  className={`h-8 rounded-lg border px-2.5 py-1.5 text-xs ${
                    between(t, 1900, 3500) ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-300"
                  }`}
                >
                  {typed("Acme Support", 2200, t) || (t < 1900 && <span className="text-slate-400">e.g. Acme Support</span>)}
                  <Caret show={between(t, 1900, 3500)} />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">AI provider</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-brand-500 bg-brand-50 p-2">
                    <p className="text-xs font-medium">● Google Gemini</p>
                    <p className="text-[10px] text-slate-500">High quality answers</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2">
                    <p className="text-xs font-medium">○ Groq</p>
                    <p className="text-[10px] text-slate-500">Extremely fast replies</p>
                  </div>
                </div>
              </div>
              <Btn tour="create" full pressed={between(t, 4400, 4650)}>{t >= 4500 ? "Creating…" : "Create chatbot"}</Btn>
            </div>
          </div>
        )}
        {t >= 5300 && <Toast>Chatbot created</Toast>}
      </AppShell>
    ),
  },
  {
    title: "Upload your documents",
    summary: "Drag in PDFs, Word files or text. BotForge reads and learns them in seconds.",
    url: "/dashboard/bots/acme-support",
    duration: 7000,
    captions: [
      { at: 0, text: "Open the Knowledge tab" },
      { at: 900, text: "Drag in your PDF, Word or text files" },
      { at: 2900, text: "BotForge reads and learns the file automatically" },
      { at: 5200, text: "Done. Your bot now knows this document" },
    ],
    cursor: [
      { at: 0, target: [560, 360] },
      { at: 100, target: "tab-knowledge" },
      { at: 900, target: "file" },
      { at: 1700, target: "drop" },
      { at: 3200, target: [600, 390] },
    ],
    clicks: [600, 1500],
    drag: { from: 1500, to: 2800, label: "refund-policy.pdf" },
    render: (t) => {
      const uploaded = Math.min(100, Math.max(0, Math.round(((t - 2900) / 1100) * 100)));
      return (
        <BotShell tab="Knowledge">
          <div className="flex gap-1 text-xs">
            <span className="rounded-md bg-brand-50 px-2.5 py-1 font-medium text-brand-700">Upload files</span>
            <span className="px-2.5 py-1 text-slate-500">Paste text</span>
          </div>
          <div
            data-tour="drop"
            className={`mt-3 grid place-items-center rounded-xl border-2 border-dashed py-6 text-center transition ${
              between(t, 2100, 2800) ? "scale-[1.01] border-brand-500 bg-brand-50" : "border-slate-300 bg-white"
            }`}
          >
            <span className="text-xl">📄</span>
            <p className="mt-1 text-xs font-medium">Drop files here or click to browse</p>
            <p className="text-[10px] text-slate-500">PDF, DOCX or TXT</p>
          </div>
          {t >= 2900 && (
            <div className="mt-3 flex animate-fade-in items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-red-50 text-[9px] font-bold text-red-600">PDF</span>
              <div className="flex-1">
                <p className="text-xs font-medium">refund-policy.pdf</p>
                {t < 4000 ? (
                  <div className="mt-1 h-1 w-40 overflow-hidden rounded bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${uploaded}%` }} />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">{t < 5200 ? "Reading and indexing…" : "38 passages · 214 KB"}</p>
                )}
              </div>
              {t < 4000 ? (
                <span className="text-[10px] text-slate-500">Uploading {uploaded}%</span>
              ) : t < 5200 ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" /> Training
                </span>
              ) : (
                <span className="animate-fade-in rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">✓ Ready</span>
              )}
            </div>
          )}
          {between(t, 700, 1500) && (
            <div data-tour="file" className="absolute bottom-5 right-6 flex animate-fade-in flex-col items-center gap-1">
              <span className="grid h-10 w-8 place-items-center rounded bg-white text-[9px] font-bold text-red-600 shadow-md ring-1 ring-slate-200">PDF</span>
              <span className="rounded bg-slate-800/80 px-1.5 text-[10px] text-white">refund-policy.pdf</span>
            </div>
          )}
        </BotShell>
      );
    },
  },
  {
    title: "Test it in the Playground",
    summary: "Ask questions like a customer would and check the answers before going live.",
    url: "/dashboard/bots/acme-support/playground",
    duration: 8200,
    captions: [
      { at: 0, text: "Open the Playground tab" },
      { at: 1000, text: "Ask a question the way a customer would" },
      { at: 4800, text: "The bot answers using only your documents" },
    ],
    cursor: [
      { at: 0, target: [600, 390] },
      { at: 100, target: "tab-playground" },
      { at: 1000, target: "chat-input" },
      { at: 3200, target: "send" },
      { at: 4300, target: [610, 380] },
    ],
    clicks: [600, 1400, 3700],
    render: (t) => {
      const q = "Do you offer refunds?";
      return (
        <BotShell tab="Playground">
          <div className="mx-auto flex h-[268px] max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 bg-brand-600 px-3 py-2 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> Acme Support
            </div>
            <div className="flex-1 space-y-2 overflow-hidden p-3">
              <Bubble from="bot">Hi! How can I help you today?</Bubble>
              {t >= 3800 && <Bubble from="user">{q}</Bubble>}
              {between(t, 3950, 4800) && <TypingDots />}
              {t >= 4800 && <Bubble from="bot">{typed(ANSWER, 4800, t, 45)}</Bubble>}
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 p-2">
              <div
                data-tour="chat-input"
                className={`h-7 flex-1 rounded-lg border px-2.5 py-1 text-xs ${
                  between(t, 1400, 3800) ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"
                }`}
              >
                {t < 3800 && typed(q, 1600, t)}
                {(t < 1600 || t >= 3800) && <span className="text-slate-400">Ask a question…</span>}
                <Caret show={between(t, 1400, 3800)} />
              </div>
              <Btn tour="send" pressed={between(t, 3700, 3950)}>Send</Btn>
            </div>
          </div>
        </BotShell>
      );
    },
  },
  {
    title: "Add your website",
    summary: "List the domains where the bot may appear. This keeps it off other people's sites.",
    url: "/dashboard/bots/acme-support/settings",
    duration: 6000,
    captions: [
      { at: 0, text: "Open Settings" },
      { at: 1000, text: "Type your website’s domain under “Allowed websites”" },
      { at: 2700, text: "Click “Save changes”. Your bot is now live on that site" },
    ],
    cursor: [
      { at: 0, target: [610, 380] },
      { at: 100, target: "tab-settings" },
      { at: 1000, target: "domains" },
      { at: 2700, target: "save" },
      { at: 4200, target: [560, 380] },
    ],
    clicks: [600, 1400, 3400],
    render: (t) => {
      const live = t >= 3600;
      return (
        <BotShell tab="Settings">
          <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Website security</p>
              {live ? (
                <span className="animate-fade-in rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">● Live on acme.com</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Not live yet</span>
              )}
            </div>
            <p className="mb-1 mt-3 text-xs font-medium text-slate-700">
              Allowed websites <span className="font-normal text-red-600">(required to go live)</span>
            </p>
            <div
              data-tour="domains"
              className={`h-16 rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                between(t, 1400, 3400) ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-300"
              }`}
            >
              {typed("acme.com", 1700, t, 10) || (t < 1400 && <span className="text-slate-400">example.com</span>)}
              <Caret show={between(t, 1400, 3400)} />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">One per line. www.acme.com is included automatically.</p>
            <div className="mt-3 flex items-center gap-3">
              <Btn tour="save" pressed={between(t, 3400, 3650)}>Save changes</Btn>
              {live && <span className="animate-fade-in text-xs text-emerald-600">✓ Saved</span>}
            </div>
          </div>
        </BotShell>
      );
    },
  },
  {
    title: "Copy the embed code",
    summary: "One line of code. Works on WordPress, Shopify, Webflow, Wix or plain HTML.",
    url: "/dashboard/bots/acme-support/embed",
    duration: 4800,
    captions: [
      { at: 0, text: "Open the Embed tab" },
      { at: 1100, text: "Click “Copy script tag”" },
      { at: 2100, text: "Paste it into your website, just before </body>" },
    ],
    cursor: [
      { at: 0, target: [560, 380] },
      { at: 100, target: "tab-embed" },
      { at: 1100, target: "copy" },
      { at: 2600, target: [600, 390] },
    ],
    clicks: [600, 1900],
    render: (t, appUrl) => {
      const copied = t >= 1900;
      return (
        <BotShell tab="Embed">
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">Add to your website</p>
            <p className="mt-1 text-xs text-slate-600">Paste this line just before the closing &lt;/body&gt; tag:</p>
            <pre
              className={`mt-3 whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100 transition ${
                copied ? "ring-2 ring-brand-500 ring-offset-2" : ""
              }`}
            >
              <span className="text-pink-300">&lt;script</span> <span className="text-sky-300">src</span>=
              <span className="text-emerald-300">&quot;{appUrl}/widget.js&quot;</span> <span className="text-sky-300">data-bot-id</span>=
              <span className="text-emerald-300">&quot;acme-support&quot;</span> <span className="text-sky-300">defer</span>
              <span className="text-pink-300">&gt;&lt;/script&gt;</span>
            </pre>
            <div className="mt-3 flex items-center justify-between">
              <Btn tour="copy" pressed={between(t, 1900, 2150)}>{copied ? "✓ Copied!" : "Copy script tag"}</Btn>
              <span className="text-[10px] text-slate-500">WordPress · Shopify · Webflow · Wix · HTML</span>
            </div>
          </div>
        </BotShell>
      );
    },
  },
  {
    title: "Live on your website",
    summary: "A chat bubble appears on your site and answers visitors 24/7.",
    url: "https://acme.com",
    duration: 9000,
    captions: [
      { at: 0, text: "That’s it. The chat bubble appears on your site" },
      { at: 1500, text: "Visitors click it and ask anything" },
      { at: 5400, text: "Your bot answers instantly, 24/7, from your documents" },
    ],
    cursor: [
      { at: 0, target: [600, 390] },
      { at: 800, target: "bubble" },
      { at: 2300, target: "widget-input" },
      { at: 4600, target: [380, 300] },
    ],
    clicks: [1700, 2500],
    render: (t) => {
      const open = t >= 1800;
      const q = "How long does shipping take?";
      return (
        <div className="relative h-full overflow-hidden bg-[#fbf8f3]">
          <div className="flex items-center justify-between px-8 py-4">
            <span className="font-serif text-lg font-bold tracking-tight text-stone-800">acme.</span>
            <div className="flex gap-5 text-xs text-stone-600">
              <span>Shop</span>
              <span>Collections</span>
              <span>About</span>
              <span>Cart (0)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 items-center gap-6 px-8 pt-8">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-amber-700">New collection</p>
              <h3 className="mt-2 font-serif text-3xl leading-tight text-stone-900">Furniture made to last.</h3>
              <p className="mt-3 text-xs text-stone-600">Solid oak, hand-finished, delivered to your door.</p>
              <span className="mt-4 inline-block rounded-full bg-stone-900 px-4 py-2 text-xs text-white">Shop now</span>
            </div>
            <div className="h-48 rounded-2xl bg-linear-to-br from-amber-200 via-orange-100 to-stone-200" />
          </div>
          {open && (
            <div className="absolute bottom-20 right-5 flex h-[280px] w-64 origin-bottom-right animate-pop flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
              <div className="bg-brand-600 px-3 py-2.5 text-white">
                <p className="text-xs font-semibold">Acme Support</p>
                <p className="text-[10px] text-brand-100">Typically replies instantly</p>
              </div>
              <div className="flex-1 space-y-2 overflow-hidden p-3">
                <Bubble from="bot">Hi! How can I help you today?</Bubble>
                {t >= 4600 && <Bubble from="user">{q}</Bubble>}
                {between(t, 4700, 5400) && <TypingDots />}
                {t >= 5400 && <Bubble from="bot">{typed(SHIPPING, 5400, t, 45)}</Bubble>}
              </div>
              <div className="border-t border-slate-100 p-2">
                <div data-tour="widget-input" className="h-7 rounded-lg border border-slate-200 px-2.5 py-1 text-xs">
                  {t < 4600 && typed(q, 2700, t, 16)}
                  {(t < 2700 || t >= 4600) && <span className="text-slate-400">Type your message…</span>}
                  <Caret show={between(t, 2500, 4600)} />
                </div>
                <p className="pt-1 text-center text-[9px] text-slate-400">Powered by BotForge</p>
              </div>
            </div>
          )}
          {t >= 400 && (
            <span
              data-tour="bubble"
              className={`absolute bottom-5 right-5 grid h-12 w-12 animate-pop place-items-center rounded-full bg-brand-600 text-white shadow-lg transition ${
                between(t, 1700, 1950) ? "scale-90" : ""
              }`}
            >
              {open ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" />
                </svg>
              )}
            </span>
          )}
        </div>
      );
    },
  },
];

function lastAt<T extends { at: number }>(items: T[], t: number): T {
  let found = items[0];
  for (const item of items) if (item.at <= t) found = item;
  return found;
}

export function ProductTour({ appUrl }: { appUrl: string }) {
  const [clock, setClock] = useState({ scene: 0, t: 0 });
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState<number | null>(null);
  const [cursor, setCursor] = useState<Point>([520, 330]);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const scene = SCENES[clock.scene];
  const target = lastAt(scene.cursor, clock.t).target;

  // Fit the fixed-size screen to the available width.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setClock(({ scene: i, t }) =>
        t + dt < SCENES[i].duration ? { scene: i, t: t + dt } : { scene: (i + 1) % SCENES.length, t: 0 },
      );
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  // Aim the cursor at its current target element.
  useLayoutEffect(() => {
    if (typeof target !== "string") {
      setCursor(target);
      return;
    }
    const canvas = canvasRef.current;
    const el = canvas?.querySelector(`[data-tour="${target}"]`);
    if (!canvas || !el || !scale) return;
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setCursor([(r.left - c.left + r.width / 2) / scale, (r.top - c.top + r.height * 0.6) / scale]);
  }, [target, clock.scene, scale]);

  function seek(i: number) {
    setClock({ scene: i, t: 0 });
    setPlaying(true);
  }

  const caption = lastAt(scene.captions, clock.t).text;
  const clicking = scene.clicks.find((c) => between(clock.t, c, c + 450));
  const dragging = scene.drag && between(clock.t, scene.drag.from, scene.drag.to) ? scene.drag : null;
  const progress = Math.min(1, clock.t / scene.duration);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[300px_1fr]">
      <ol className="order-2 space-y-2 lg:order-1">
        {SCENES.map((s, i) => {
          const active = i === clock.scene;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => seek(i)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active ? "border-brand-200 bg-white shadow-sm" : "border-transparent hover:bg-white/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      active ? "bg-brand-600 text-white" : i < clock.scene ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`font-semibold ${active ? "text-slate-900" : "text-slate-600"}`}>{s.title}</span>
                </div>
                {active && (
                  <>
                    <p className="mt-2 pl-10 text-sm text-slate-600">{s.summary}</p>
                    <div className="ml-10 mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-brand-500" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="order-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 lg:order-2">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-xs text-slate-500">
            🔒 {scene.url.startsWith("http") ? scene.url.replace(/^https?:\/\//, "") : APP_HOST + scene.url}
          </div>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label={playing ? "Pause walkthrough" : "Resume walkthrough"}
            title={playing ? "Pause" : "Resume"}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M7 4.5v15l12-7.5z" /></svg>
            )}
          </button>
        </div>

        <div ref={frameRef} className="relative overflow-hidden" style={{ height: scale ? H * scale : undefined, aspectRatio: scale ? undefined : `${W} / ${H}` }} aria-hidden="true">
          <div
            ref={canvasRef}
            className={`absolute left-0 top-0 origin-top-left ${scale ? "" : "invisible"}`}
            style={{ width: W, height: H, transform: `scale(${scale ?? 1})` }}
          >
            <div key={clock.scene} className="h-full">{scene.render(clock.t, appUrl)}</div>

            <div
              className="pointer-events-none absolute left-0 top-0 z-10 transition-transform duration-700 ease-in-out"
              style={{ transform: `translate(${cursor[0]}px, ${cursor[1]}px)` }}
            >
              {clicking !== undefined && (
                <span key={clicking} className="absolute -left-4 -top-4 h-8 w-8 animate-tour-click rounded-full bg-brand-500/40" />
              )}
              {dragging && (
                <span className="absolute left-3 top-4 flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[10px] font-medium shadow-lg ring-1 ring-slate-200">
                  <span className="font-bold text-red-600">PDF</span> {dragging.label}
                </span>
              )}
              <svg viewBox="0 0 24 24" className="h-6 w-6 drop-shadow-md">
                <path d="M5 3l14 8-6 1.5L9.5 19z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex min-h-11 items-center justify-center gap-2.5 bg-brand-600 px-4 py-2.5">
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">Step {clock.scene + 1}</span>
          <p key={caption} className="animate-fade-in text-sm font-medium text-white">{caption}</p>
        </div>
      </div>
    </div>
  );
}
