"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  botId: string;
  botName: string;
  welcomeMessage: string;
  color: string;
  source: "widget" | "playground";
  showBranding?: boolean;
  appName?: string;
  onClose?: () => void;
};

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // third-party storage blocked
  }
}

function getVisitorId() {
  const s = storage();
  let id = s?.getItem("cb_visitor");
  if (!id) {
    id = crypto.randomUUID();
    s?.setItem("cb_visitor", id);
  }
  return id;
}

export function ChatWindow({ botId, botName, welcomeMessage, color, source, showBranding, appName, onClose }: Props) {
  const persist = source === "widget";
  const stateKey = `cb_state_${botId}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visitorRef = useRef<string>("");

  useEffect(() => {
    visitorRef.current = getVisitorId();
    if (!persist) return;
    try {
      const saved = JSON.parse(storage()?.getItem(stateKey) ?? "null");
      if (saved?.conversationId) {
        setConversationId(saved.conversationId);
        setMessages(saved.messages ?? []);
      }
    } catch {}
  }, [persist, stateKey]);

  useEffect(() => {
    if (persist && conversationId && !busy) {
      storage()?.setItem(stateKey, JSON.stringify({ conversationId, messages: messages.slice(-30) }));
    }
  }, [persist, stateKey, conversationId, messages, busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    const appendToLast = (chunk: string, replace = false) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: replace ? chunk : last.content + chunk };
        return copy;
      });

    try {
      const res = await fetch(`/api/chat/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          visitorId: visitorRef.current || getVisitorId(),
          conversationId,
          source,
          pageUrl: source === "widget" ? document.referrer || null : null,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        appendToLast(data.error ?? "Sorry, I couldn't answer right now. Please try again.", true);
        return;
      }
      const cid = res.headers.get("X-Conversation-Id");
      if (cid) setConversationId(cid);
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

  function reset() {
    setMessages([]);
    setConversationId(null);
    storage()?.removeItem(stateKey);
  }

  const all: Msg[] = welcomeMessage ? [{ role: "assistant", content: welcomeMessage }, ...messages] : messages;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: color }}>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-semibold">
            {botName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{botName}</p>
            <p className="text-xs opacity-80">{busy ? "Typing…" : "Online"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={reset} className="rounded px-2 py-1 text-xs opacity-80 hover:bg-white/20 hover:opacity-100" title="Start a new conversation">
              New chat
            </button>
          )}
          {onClose && (
            <button onClick={onClose} aria-label="Close chat" className="rounded p-1 hover:bg-white/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {all.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
              }`}
              style={m.role === "user" ? { background: color } : undefined}
            >
              {m.content ? (
                m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <span className="flex gap-1 py-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type your message…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
          style={{ background: color }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {showBranding && (
        <p className="pb-2 text-center text-[11px] text-slate-400">Powered by {appName}</p>
      )}
    </div>
  );
}
