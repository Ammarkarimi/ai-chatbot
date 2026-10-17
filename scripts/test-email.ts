/**
 * Checks your email setup by sending one email with the provider the app will use
 * (SMTP/Gmail if SMTP_USER and SMTP_PASS are set, otherwise Resend).
 * Usage: npm run email:test -- you@example.com
 */
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { config } from "./load-env";
import { explainSmtpError, smtpConfigured, smtpFrom, smtpTransport } from "../src/lib/smtp";

config();

const SUBJECT = "Your email setup works ✔";
const TEXT = "If you can read this, verification and password-reset emails will work.";

async function viaSmtp(to: string) {
  try {
    const info = await smtpTransport().sendMail({ from: smtpFrom(), to, subject: SUBJECT, text: TEXT, html: `<p>${TEXT}</p>` });
    console.log(`✔ Sent via SMTP (${process.env.SMTP_HOST || "smtp.gmail.com"}) from ${smtpFrom()}. Message id: ${info.messageId}. Check ${to} (and spam).`);
  } catch (err) {
    console.error(`✖ SMTP send failed: ${explainSmtpError(err)}`);
    process.exit(1);
  }
}

async function viaResend(to: string) {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY) throw new Error("No email provider set: add SMTP_USER + SMTP_PASS (e.g. Gmail) or RESEND_API_KEY to .env");
  if (!EMAIL_FROM) throw new Error('EMAIL_FROM is not set in .env (e.g. "BotForge <no-reply@yourdomain.com>")');

  const { data, error } = await new Resend(RESEND_API_KEY).emails.send(
    {
      from: EMAIL_FROM,
      to: [to],
      subject: SUBJECT,
      text: TEXT,
      html: `<p>${TEXT}</p>`,
      tags: [{ name: "category", value: "setup_test" }],
    },
    { idempotencyKey: `setup-test/${randomUUID()}` },
  );
  if (error) {
    console.error(`✖ Resend rejected the email: ${error.name} (${error.statusCode}): ${error.message}`);
    if (error.name === "validation_error" && /domain/i.test(error.message)) {
      console.error("  Tip: verify your sending domain at https://resend.com/domains, or use onboarding@resend.dev\n  as EMAIL_FROM (that only delivers to your own Resend account email).");
    }
    process.exit(1);
  }
  console.log(`✔ Sent via Resend. Email id: ${data?.id}. Check ${to} (and spam).`);
}

async function main() {
  const to = process.argv[2];
  if (!to) throw new Error("Usage: npm run email:test -- you@example.com");
  if (smtpConfigured()) await viaSmtp(to);
  else await viaResend(to);
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
