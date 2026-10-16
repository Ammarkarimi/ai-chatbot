"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";

type Doc = {
  id: string;
  name: string;
  sizeBytes: number;
  chunkCount: number;
  status: "uploading" | "processing" | "ready" | "error";
  error: string | null;
  createdAt: string;
};

const ACCEPT = ".pdf,.docx,.txt,.md,.csv";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** PUTs the file to a presigned storage URL, reporting progress (fetch can't report upload progress). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection (or the storage bucket's CORS settings)."));
    xhr.send(file);
  });
}

export function KnowledgeManager({
  botId,
  docs,
  maxDocs,
  maxFileMb,
  directUpload,
}: {
  botId: string;
  docs: Doc[];
  maxDocs: number;
  maxFileMb: number;
  directUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [dragging, setDragging] = useState(false);
  // label -> upload progress (0-100), or null while the bot is training on it
  const [queue, setQueue] = useState<Record<string, number | null>>({});
  const [error, setError] = useState("");

  const track = (label: string, value: number | null) => setQueue((q) => ({ ...q, [label]: value }));
  const untrack = (label: string) =>
    setQueue((q) => {
      const { [label]: _, ...rest } = q;
      return rest;
    });

  async function upload(body: FormData, label: string) {
    track(label, null);
    try {
      await api(`/api/bots/${botId}/documents`, { method: "POST", body });
    } catch (err) {
      setError(`${label}: ${(err as Error).message}`);
    } finally {
      untrack(label);
      router.refresh();
    }
  }

  /** Large-file path: browser -> storage bucket directly, then the server trains from there. */
  async function uploadDirect(file: File) {
    track(file.name, 0);
    let documentId: string | null = null;
    try {
      const start = await api<{ documentId: string; uploadUrl: string }>(`/api/bots/${botId}/uploads`, {
        method: "POST",
        json: { name: file.name, size: file.size, contentType: file.type },
      });
      documentId = start.documentId;
      router.refresh();
      await putWithProgress(start.uploadUrl, file, (pct) => track(file.name, pct));
      track(file.name, null);
      await api(`/api/bots/${botId}/documents/${documentId}/process`, { method: "POST" });
      documentId = null;
    } catch (err) {
      setError(`${file.name}: ${(err as Error).message}`);
      // Don't leave a half-finished upload counting against the document limit.
      if (documentId) await api(`/api/bots/${botId}/documents/${documentId}`, { method: "DELETE" }).catch(() => {});
    } finally {
      untrack(file.name);
      router.refresh();
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    setError("");
    for (const file of Array.from(files)) {
      if (file.size > maxFileMb * 1024 * 1024) {
        setError(`${file.name}: larger than the ${maxFileMb} MB limit.`);
        continue;
      }
      if (directUpload) {
        await uploadDirect(file);
      } else {
        const body = new FormData();
        body.append("file", file);
        await upload(body, file.name);
      }
    }
  }

  async function submitText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formEl = e.currentTarget;
    const body = new FormData(formEl);
    await upload(body, String(body.get("title") || "Pasted text"));
    formEl.reset();
  }

  async function remove(doc: Doc) {
    if (!confirm(`Remove "${doc.name}" from this chatbot's knowledge?`)) return;
    try {
      await api(`/api/bots/${botId}/documents/${doc.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const atLimit = docs.length >= maxDocs;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Train your chatbot</h2>
            <p className="text-sm text-slate-600">
              Add the content your bot should know: FAQs, product docs, policies, price lists.
            </p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(["file", "text"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 ${mode === m ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
              >
                {m === "file" ? "Upload files" : "Paste text"}
              </button>
            ))}
          </div>
        </div>

        {atLimit ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            You&apos;ve reached the {maxDocs}-document limit for this bot on your plan. Remove a document or upgrade.
          </p>
        ) : mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              uploadFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`mt-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition ${
              dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-500"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-3 text-sm font-medium">Drop files here or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, MD or CSV · up to {maxFileMb} MB each</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <form onSubmit={submitText} className="mt-6 space-y-3">
            <input name="title" className="input" placeholder="Title (e.g. Shipping policy)" maxLength={200} />
            <textarea name="text" required rows={8} className="input" placeholder="Paste your content here…" />
            <button className="btn-primary" disabled={Object.keys(queue).length > 0}>Add to knowledge base</button>
          </form>
        )}

        {Object.keys(queue).length > 0 && (
          <div className="mt-4 space-y-3">
            {Object.entries(queue).map(([label, pct]) => (
              <div key={label} className="text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                  <span className="truncate">{pct === null ? `Training on ${label}…` : `Uploading ${label}… ${pct}%`}</span>
                </div>
                {pct !== null && (
                  <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold">Knowledge base</h2>
          <span className="text-sm text-slate-500">{docs.length} / {maxDocs} documents</span>
        </div>
        {docs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No documents yet. Upload something above to train your bot.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(doc.sizeBytes)} · {doc.chunkCount} {doc.chunkCount === 1 ? "passage" : "passages"} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                  {doc.status === "error" && <p className="mt-1 text-xs text-red-600">{doc.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.status === "ready"
                        ? "bg-emerald-50 text-emerald-700"
                        : doc.status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {doc.status === "ready"
                      ? "Trained"
                      : doc.status === "error"
                        ? "Failed"
                        : doc.status === "uploading"
                          ? "Uploading"
                          : "Processing"}
                  </span>
                  <button onClick={() => remove(doc)} className="text-sm text-slate-400 hover:text-red-600">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
