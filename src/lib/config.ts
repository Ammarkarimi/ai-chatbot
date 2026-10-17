export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "BotForge";

/**
 * Public URL used in emails, embed snippets and Stripe redirects. Set NEXT_PUBLIC_APP_URL in
 * production; on Vercel we fall back to the project's production domain so links never point
 * at localhost.
 */
function resolveAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const APP_URL = resolveAppUrl().replace(/\/$/, "");
