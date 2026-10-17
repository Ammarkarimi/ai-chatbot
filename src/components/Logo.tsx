import Link from "next/link";

import { APP_NAME } from "@/lib/config";

/** Product mark: a friendly robot head. Keep in sync with src/app/icon.svg. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="15.2" y="3.5" width="1.6" height="4" rx=".8" fill="#4f46e5" />
      <circle cx="16" cy="3.4" r="2" fill="#a5b4fc" />
      <rect x="2.5" y="13" width="3.5" height="7" rx="1.75" fill="#a5b4fc" />
      <rect x="26" y="13" width="3.5" height="7" rx="1.75" fill="#a5b4fc" />
      <rect x="5" y="7" width="22" height="19" rx="6" fill="#4f46e5" />
      <rect x="8.5" y="11" width="15" height="11" rx="4" fill="#fff" />
      <circle cx="13" cy="15.5" r="1.8" fill="#312e81" />
      <circle cx="19" cy="15.5" r="1.8" fill="#312e81" />
      <path d="M13.5 18.8q2.5 1.8 5 0" fill="none" stroke="#312e81" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900">
      <LogoMark className="h-10 w-10" />
      {APP_NAME}
    </Link>
  );
}
