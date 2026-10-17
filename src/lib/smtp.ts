import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sending through an SMTP mailbox, e.g. your Gmail account with an App Password. Works without
 * owning a domain; Gmail allows roughly 500 recipients a day. Defaults are Gmail's.
 * No "server-only" import, so scripts/test-email.ts can use it too.
 */
export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

export function smtpTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    // 465 = TLS from the start; 587 = STARTTLS upgrade.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    // Google shows App Passwords in groups of four ("abcd efgh ..."); the spaces aren't part of it.
    auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS ?? "").replace(/\s+/g, "") },
  });
  return transporter;
}

/** Gmail only sends as the signed-in account (or its verified aliases), so default to SMTP_USER. */
export function smtpFrom() {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  const name = (process.env.NEXT_PUBLIC_APP_NAME ?? "BotForge").replace(/"/g, "");
  return `"${name}" <${process.env.SMTP_USER}>`;
}

/** Turns common SMTP failures into something actionable. */
export function explainSmtpError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/535|Username and Password not accepted|Invalid login/i.test(message)) {
    return `${message}\nCheck SMTP_USER and SMTP_PASS. For Gmail, SMTP_PASS must be a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords), not your normal password.`;
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ECONNRESET/i.test(message)) {
    return `${message}\nCouldn't reach the mail server. Check SMTP_HOST/SMTP_PORT; some hosts block outgoing SMTP.`;
  }
  return message;
}
