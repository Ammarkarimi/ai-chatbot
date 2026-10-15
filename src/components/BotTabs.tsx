"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Knowledge" },
  { href: "/playground", label: "Playground" },
  { href: "/conversations", label: "Conversations" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
  { href: "/embed", label: "Embed" },
];

export function BotTabs({ botId }: { botId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/bots/${botId}`;
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.label}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
