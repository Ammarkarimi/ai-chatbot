/**
 * Checks your Resend setup by sending one email.
 * Usage: npm run email:test -- you@example.com
 */
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { config } from "./load-env";

config();

async function main() {
  const to = process.argv[2];
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!to) throw new Error("Usage: npm run email:test -- you@example.com");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set in .env");
  if (!EMAIL_FROM) throw new Error('EMAIL_FROM is not set in .env (e.g. "BotForge <no-reply@yourdomain.com>")');

  const { data, error } = await new Resend(RESEND_API_KEY).emails.send(
    {
      from: EMAIL_FROM,
      to: [to],
      subject: "Resend is connected ✔",
      text: "If you can read this, verification and password-reset emails will work.",
      html: "<p>If you can read this, verification and password-reset emails will work.</p>",
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
  console.log(`✔ Sent. Resend email id: ${data?.id}. Check ${to} (and spam).`);
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
