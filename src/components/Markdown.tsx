import { Fragment, type ReactNode } from "react";

// Tiny, XSS-safe Markdown subset for chat replies: paragraphs, lists, bold, italic, code, links.
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g;

function safeHref(url: string) {
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : undefined;
}

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="rounded bg-black/5 px-1 text-[0.9em]">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link || /^https?:\/\//.test(part)) {
      const href = safeHref(link ? link[2] : part);
      const label = link ? link[1] : part;
      return href ? (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline">{label}</a>
      ) : (
        label
      );
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={blocks.length} className={`my-1 space-y-0.5 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, j) => <li key={j}>{inline(item)}</li>)}
        </List>,
      );
      continue;
    }
    if (line.trim()) {
      const heading = line.match(/^#{1,6}\s+(.*)$/);
      blocks.push(
        <p key={blocks.length} className={`my-1 ${heading ? "font-semibold" : ""}`}>
          {inline(heading ? heading[1] : line)}
        </p>,
      );
    }
    i++;
  }
  return <>{blocks}</>;
}
