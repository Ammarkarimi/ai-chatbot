import { APP_URL } from "@/lib/config";

// Hostname with optional "*." prefix and optional port, e.g. "shop.example.com", "*.example.com", "localhost:8080".
const DOMAIN_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?(:\d{1,5})?$/;

/** Turns whatever a customer pastes ("https://www.Shop.com/about") into "www.shop.com". Returns null if invalid. */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  value = value.split(/[/?#]/)[0]; // path, query, hash
  value = value.replace(/\.$/, "");
  return DOMAIN_RE.test(value) ? value : null;
}

/**
 * Variants an entry matches: "example.com" and "www.example.com" cover each other;
 * "*.example.com" covers the apex too. Ports, IPs and single-label hosts match exactly.
 */
function patterns(entry: string) {
  if (entry.startsWith("*.")) return [entry.slice(2), entry];
  if (entry.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(entry) || !entry.includes(".")) return [entry];
  if (entry.startsWith("www.")) return [entry, entry.slice(4)];
  return [entry, `www.${entry}`];
}

function hostMatches(host: string, hostname: string, pattern: string) {
  const target = pattern.includes(":") ? host : hostname; // entries with a port must match it exactly
  const bare = pattern.replace(/:\d+$/, "");
  if (pattern.startsWith("*.")) {
    const suffix = pattern.includes(":") ? pattern.slice(1) : bare.slice(1); // ".example.com[:port]"
    return target.endsWith(suffix) && target.length > suffix.length;
  }
  return target === pattern;
}

/**
 * True when the request origin may use this bot. Our own origin (dashboard, Playground, direct
 * link) always may; other websites only when listed. An empty list means the bot isn't live
 * on any website yet.
 */
export function isOriginAllowed(origin: string | null | undefined, allowedDomains: string[]) {
  if (!origin || origin === "null") return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin === new URL(APP_URL).origin) return true;
  return allowedDomains.some((entry) => patterns(entry).some((p) => hostMatches(url.host, url.hostname, p)));
}

/** A bot shows up on customers' websites only once it has a domain and a verified owner. */
export function isBotLive(allowedDomains: string[], ownerEmailVerified: boolean) {
  return allowedDomains.length > 0 && ownerEmailVerified;
}

/** CSP frame-ancestors value restricting which sites may iframe the chat ('self' only when the list is empty). */
export function frameAncestors(allowedDomains: string[]) {
  const sources = allowedDomains.flatMap((entry) =>
    patterns(entry).flatMap((p) => [`https://${p}`, `http://${p}`]),
  );
  return ["'self'", ...sources].join(" ");
}
