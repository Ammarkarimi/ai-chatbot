"use client";

import { useEffect, useState } from "react";

const FORMATS: Record<"date" | "time" | "datetime", Intl.DateTimeFormatOptions> = {
  date: { dateStyle: "medium" },
  time: { timeStyle: "short" },
  datetime: { dateStyle: "medium", timeStyle: "short" },
};

/**
 * Shows a timestamp in the viewer's own timezone and locale. The first render uses a fixed
 * format (en-US, UTC) so server HTML and hydration match; it switches to local time after mount.
 * Servers (e.g. Vercel) run in UTC, so formatting on the server would show the wrong time.
 */
export function LocalTime({ iso, format = "datetime" }: { iso: string; format?: keyof typeof FORMATS }) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  const date = new Date(iso);
  const text = local
    ? date.toLocaleString(undefined, FORMATS[format])
    : date.toLocaleString("en-US", { ...FORMATS[format], timeZone: "UTC" });
  return <time dateTime={iso}>{text}</time>;
}
