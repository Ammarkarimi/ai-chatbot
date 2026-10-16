import "server-only";
import { APP_NAME } from "@/lib/config";

type Email = { to: string; subject: string; text: string; html: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends through Resend (https://resend.com). Without RESEND_API_KEY the email is printed to the
 * server log instead, which is handy locally but means users can't verify in production.
 */
export async function sendEmail(email: Email) {
  if (!emailConfigured()) {
    console.warn(`[email] RESEND_API_KEY/EMAIL_FROM not set. Would send to ${email.to}:\n${email.subject}\n${email.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
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
