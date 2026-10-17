import "server-only";
import { Resend } from "resend";
import { APP_NAME } from "@/lib/config";
import { explainSmtpError, smtpConfigured, smtpFrom, smtpTransport } from "@/lib/smtp";

type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Resend tag, e.g. "verify_email"; shows up in the Resend dashboard for filtering. */
  category: string;
  /**
   * Same key = same email. Resend drops repeats for 24h, so retries (ours or a double-click)
   * never send twice. Max 256 chars.
   */
  idempotencyKey: string;
};

export class EmailError extends Error {}

/**
 * SMTP (e.g. your Gmail account) wins when SMTP_USER/SMTP_PASS are set; remove them to use Resend
 * with your own domain. With neither, emails are only printed to the server log.
 */
export function emailProvider(): "smtp" | "resend" | "log" {
  if (smtpConfigured()) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return "log";
}

export function emailConfigured() {
  return emailProvider() !== "log";
}

let client: Resend | null = null;
function resend() {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

// Resend errors worth retrying with the same idempotency key (see resend.com/docs/api-reference/errors).
const RETRYABLE = new Set(["rate_limit_exceeded", "application_error", "service_unavailable", "concurrent_idempotent_requests"]);

/**
 * Sends through SMTP or Resend (see emailProvider). With neither configured the email is printed
 * to the server log instead, which is handy locally but means users can't verify in production.
 * Returns the provider's message id (or null when only logged).
 */
export async function sendEmail(email: Email): Promise<string | null> {
  const provider = emailProvider();
  if (provider === "log") {
    console.warn(`[email] No email provider configured (SMTP_* or RESEND_API_KEY). Would send to ${email.to}:\n${email.subject}\n${email.text}`);
    return null;
  }

  if (provider === "smtp") {
    try {
      const info = await smtpTransport().sendMail({
        from: smtpFrom(),
        to: email.to,
        replyTo: process.env.EMAIL_REPLY_TO || undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
        // SMTP has no idempotency keys; this lets you match an email to its token in mail logs.
        headers: { "X-Entity-Ref-ID": email.idempotencyKey, "X-Category": email.category },
      });
      return info.messageId;
    } catch (err) {
      throw new EmailError(`SMTP: ${explainSmtpError(err)}`);
    }
  }

  for (let attempt = 1; ; attempt++) {
    const { data, error } = await resend().emails.send(
      {
        from: process.env.EMAIL_FROM!,
        to: [email.to],
        replyTo: process.env.EMAIL_REPLY_TO || undefined,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: "category", value: email.category }],
      },
      { idempotencyKey: email.idempotencyKey },
    );
    if (data) return data.id;

    if (error && RETRYABLE.has(error.name) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new EmailError(`Resend ${error?.name ?? "error"} (${error?.statusCode ?? "?"}): ${error?.message ?? "unknown"}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Simple, client-safe transactional layout: heading, paragraph, one button, fallback link. */
export function actionEmail(opts: { heading: string; body: string; button: string; url: string; footer: string }) {
  const { heading, body, button, url, footer } = opts;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px">
<tr><td style="font-weight:600;font-size:15px;color:#4f46e5;padding-bottom:16px">${escapeHtml(APP_NAME)}</td></tr>
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#334155;padding-bottom:24px">${escapeHtml(body)}</td></tr>
<tr><td><a href="${escapeHtml(url)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(button)}</a></td></tr>
<tr><td style="font-size:12px;color:#64748b;padding-top:24px;line-height:1.5">${escapeHtml(footer)}<br><br>Button not working? Paste this link into your browser:<br><a href="${escapeHtml(url)}" style="color:#4f46e5;word-break:break-all">${escapeHtml(url)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}\n\n${button}: ${url}\n\n${footer}`;
  return { html, text };
}
