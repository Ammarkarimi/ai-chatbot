"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { Markdown } from "@/components/Markdown";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME =
  "Hi! I'm the BotForge Assistant. Ask me anything about BotForge (features, setup, pricing) or about IntelliForge's AI services.";

const SUGGESTIONS = [
  "How much does BotForge cost?",
  "How do I add the chatbot to my website?",
  "What services does IntelliForge offer?",
  "How can I contact you?",
];

/** Our own AI assistant on the landing page: answers questions about BotForge and IntelliForge. */
export function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);

    const appendToLast = (chunk: string, replace = false) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: replace ? chunk : last.content + chunk };
        return copy;
      });

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        appendToLast(data.error ?? "Sorry, I couldn't answer right now. Please try again.", true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToLast(decoder.decode(value, { stream: true }));
      }
    } catch {
      appendToLast("Connection lost. Please check your internet and try again.", true);
    } finally {
      setBusy(false);
    }
  }

  const all: Msg[] = [{ role: "assistant", content: WELCOME }, ...messages];
  const waiting = busy && messages[messages.length - 1]?.content === "";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="BotForge Assistant"
          className="flex h-[min(600px,calc(100dvh-6rem))] w-[calc(100vw-2rem)] origin-bottom-right animate-pop flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:w-96"
        >
          <div className="flex items-center gap-3 bg-linear-to-r from-brand-600 to-fuchsia-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <LogoMark className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">BotForge Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {busy ? "Typing…" : "Online · AI powered"}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                disabled={busy}
                className="rounded px-2 py-1 text-xs text-white/80 hover:bg-white/15 hover:text-white"
                title="Start a new conversation"
              >
                New chat
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {all.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">
                  {m.content}
                </div>
              ) : m.content ? (
                <div key={i} className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-100">
                  <Markdown text={m.content} />
                </div>
              ) : null,
            )}
            {waiting && (
              <div className="flex w-fit gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-700 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-slate-100 p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Ask about BotForge or IntelliForge…"
              className="input max-h-28 min-h-10 resize-none"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-10 px-3" aria-label="Send">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>
            </button>
          </form>
          <p className="pb-2 text-center text-[11px] text-slate-400">AI answers can be wrong. Built with BotForge.</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2 rounded-full bg-linear-to-r from-brand-600 to-fuchsia-600 py-3 pl-3 pr-3 text-white shadow-xl shadow-brand-600/30 transition hover:scale-105 sm:pr-5"
        aria-label={open ? "Close chat" : "Chat with the BotForge Assistant"}
        aria-expanded={open}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" />
          </svg>
        )}
        <span className="hidden text-sm font-semibold sm:inline">{open ? "Close" : "Ask our AI"}</span>
      </button>
    </div>
  );
}
