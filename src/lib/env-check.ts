import { APP_URL } from "@/lib/config";
import { storageMode } from "@/lib/storage";
import { emailProvider } from "@/lib/email";

type Result = { errors: string[]; warnings: string[] };

const PLACEHOLDER = /^change-me|local-dev/i;

function secretProblem(name: string) {
  const value = process.env[name];
  if (!value) return `${name} is not set.`;
  if (PLACEHOLDER.test(value)) return `${name} is still the example placeholder. Generate one with: openssl rand -base64 32`;
  if (value.length < 32) return `${name} must be at least 32 characters.`;
  return null;
}

/** Problems that make a production deployment unsafe (errors) or partly broken (warnings). */
export function checkEnv(): Result {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL is not set.");
  for (const name of ["AUTH_SECRET", "ENCRYPTION_KEY"]) {
    const problem = secretProblem(name);
    if (problem) errors.push(problem);
  }
  if (!process.env.GEMINI_API_KEY) errors.push("GEMINI_API_KEY is not set: documents can't be trained.");

  if (APP_URL.includes("localhost")) {
    warnings.push(`NEXT_PUBLIC_APP_URL resolves to ${APP_URL}: email links and embed snippets will point at localhost.`);
  }
  const provider = emailProvider();
  if (provider === "log") {
    warnings.push("No email provider (SMTP_USER/SMTP_PASS or RESEND_API_KEY/EMAIL_FROM): new users can't verify their email, so their chatbots never go live.");
  } else if (provider === "resend" && /@resend\.dev>?$/i.test(process.env.EMAIL_FROM!.trim().replace(/"$/, ""))) {
    warnings.push("EMAIL_FROM uses resend.dev: Resend only delivers to your own account's address. Verify your domain, or use SMTP (Gmail).");
  } else if (provider === "smtp" && /gmail\.com$/i.test(process.env.SMTP_HOST || "smtp.gmail.com")) {
    warnings.push("Sending email through Gmail: about 500 emails a day. Switch to Resend with your own domain as signups grow.");
  }
  if (!process.env.GROQ_API_KEY) warnings.push("GROQ_API_KEY not set: Groq-powered bots only work with the customer's own key.");
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push("Stripe not configured: billing is disabled and everyone stays on the Free plan.");
  } else {
    for (const name of ["STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS"]) {
      if (!process.env[name]) errors.push(`STRIPE_SECRET_KEY is set but ${name} is not: paid plans won't activate.`);
    }
    if (!process.env.STRIPE_PRICE_PRO_INR || !process.env.STRIPE_PRICE_BUSINESS_INR) {
      warnings.push("STRIPE_PRICE_PRO_INR/STRIPE_PRICE_BUSINESS_INR not set: customers can't pay in rupees.");
    }
  }
  if (process.env.VERCEL && storageMode() === "none") {
    warnings.push("No upload storage (BLOB_READ_WRITE_TOKEN or S3_*): uploads are capped at 4 MB on Vercel.");
  }
  return { errors, warnings };
}
