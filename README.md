# BotForge: AI chatbot platform (SaaS)

Customers sign up, upload PDFs / Word / text files, and get an AI chatbot trained on that content.
They paste one `<script>` tag into their website and a branded chat bubble appears.

> "BotForge" is a placeholder brand. Change it with `NEXT_PUBLIC_APP_NAME`.

## Features

- **Accounts:** email/password signup and login (bcrypt + signed httpOnly JWT cookie), multi-tenant.
  Email verification and password reset via [Resend](https://resend.com) (official SDK, idempotent sends, retries).
  A reset signs out every other session.
- **Training:** upload PDF, DOCX, TXT, MD and CSV files, or paste text. With a private **Vercel Blob** store (or an
  S3-compatible bucket) configured, browsers upload straight to storage (no serverless body-size limit) with a progress bar. Text is chunked and embedded with
  **Gemini `gemini-embedding-001`** (768 dims), then stored in **Postgres + pgvector** (HNSW index).
- **Chat (RAG):** each question is embedded, the closest passages are retrieved and the answer is
  streamed from **Gemini** or **Groq** (chosen per bot). History is loaded server-side, never trusted from the browser.
- **Embeddable widget:** `public/widget.js` adds a floating button plus an iframe (`/embed/[botId]`), so host-site CSS
  can't break it. Full-screen on mobile, conversations persist across page loads, and it exposes a JS API
  (`window.Chatbot.open()`).
- **Customization:** name, color, welcome message, bubble side, custom instructions, provider, model, creativity.
- **Keys, both modes:** the platform's keys by default. Paid plans can set their own Gemini/Groq key per bot
  (AES-256-GCM encrypted at rest).
- **Conversations & analytics:** full transcripts, questions per day, unique visitors, latest questions.
- **Abuse protection:** per-bot allowed websites, per-visitor and per-IP rate limits, unverified accounts can't
  go live, and login/signup/reset are rate limited (see [Security](#security)).
- **Billing:** Stripe Checkout + Customer Portal + webhook sync. Plans enforce bots, monthly messages,
  documents per bot and file size. Free plan shows "Powered by" branding.

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Drizzle ORM · Postgres + pgvector · Stripe · `unpdf` (PDF) · `mammoth` (DOCX)

> **Why Gemini for embeddings even on Groq bots?** Groq has no embeddings API. Gemini creates every bot's vectors;
> Groq is only used to generate answers.

## Getting started

```bash
cp .env.example .env              # fill in GEMINI_API_KEY at minimum
docker compose up -d              # Postgres 16 + pgvector (or use Neon / Supabase)
npm install
npm run db:migrate                # creates the vector extension + tables
npm run dev                       # http://localhost:3000
```

Sign up, create a chatbot, upload a document, try it in **Playground**, then copy the snippet from **Embed**.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string (pgvector extension must be available) |
| `AUTH_SECRET` | ✅ | Signs session cookies (`openssl rand -base64 32`) |
| `ENCRYPTION_KEY` | ✅ | Encrypts customer API keys. **Don't change it after launch** or stored keys become unreadable |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL, used in embed snippets and Stripe redirects |
| `GEMINI_API_KEY` | ✅ | Platform Gemini key: embeddings + Gemini chat |
| `GROQ_API_KEY` | | Platform Groq key for Groq-powered bots |
| `GEMINI_CHAT_MODEL` / `GROQ_CHAT_MODEL` | | Default chat models (`gemini-3.5-flash`, `openai/gpt-oss-120b`) |
| `GEMINI_EMBEDDING_MODEL` | | Default `gemini-embedding-001`. Changing it requires re-uploading all documents |
| `GEMINI_API_BASE` / `GROQ_API_BASE` | | Override API base URLs (proxies, gateways, local mocks) |
| `STRIPE_*` | | Billing. When `STRIPE_SECRET_KEY` is unset, billing is disabled and everyone stays on Free |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✅ in production | Verification and password-reset emails. Unset: emails are printed to the server log |
| `EMAIL_REPLY_TO` | | Where replies to those emails go |
| `BLOB_READ_WRITE_TOKEN` | | Private Vercel Blob store for large uploads (recommended on Vercel) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | | Alternative: S3-compatible bucket (R2, S3, Supabase, MinIO). With neither, files go through the app, capped at 4 MB on Vercel |
| `CLIENT_IP_HEADER` | | Self-hosting only: header with the visitor's real IP (see [Self-hosting](#self-hosting-without-vercel)) |
| `S3_VIRTUAL_HOSTED` | | `true` for `bucket.host` style URLs instead of `host/bucket` |

### Stripe setup

1. Create recurring monthly Prices in Stripe and set their ids: `STRIPE_PRICE_PRO` ($29) and `STRIPE_PRICE_BUSINESS` ($99) in USD,
   plus `STRIPE_PRICE_PRO_INR` (₹1,999) and `STRIPE_PRICE_BUSINESS_INR` (₹6,999) in INR. The pricing pages have a USD / INR
   switch (visitors in India start on INR); the amounts shown come from `src/lib/plans.ts`, so keep them in line with Stripe.
2. Add a webhook endpoint `https://YOUR_APP/api/stripe/webhook` with the events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and
   `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (Settings → Billing → Customer portal) so users can switch plans or cancel.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Plan limits and prices shown in the UI live in `src/lib/plans.ts`.

### Email setup

Pick one. If `SMTP_USER`/`SMTP_PASS` are set they're used; otherwise Resend; with neither, emails are only printed to
the server log (fine locally, but nobody can verify in production). Check your setup with
`npm run email:test -- you@example.com`.

**Option A: Gmail (no domain needed).** Turn on 2-Step Verification for the Google account, create an
[App Password](https://myaccount.google.com/apppasswords) and set `SMTP_USER=you@gmail.com` and `SMTP_PASS=<app password>`.
Emails come from that Gmail address. Gmail allows about 500 emails a day, which is plenty for a launch. Other SMTP
mailboxes (Zoho, Outlook…) work with `SMTP_HOST`/`SMTP_PORT`.

**Option B: Resend (needs a domain you own).** Better deliverability and no daily cap. Remove the `SMTP_*` lines to use it.

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys) → `RESEND_API_KEY`.
2. Add and verify your sending domain at [resend.com/domains](https://resend.com/domains) (a few DNS records), then set
   `EMAIL_FROM="BotForge <no-reply@yourdomain.com>"`. For a first test you can use `onboarding@resend.dev`, but Resend then
   only delivers to your own Resend account's email.
3. Check it: `npm run email:test -- you@example.com`.

With Resend, every email carries an idempotency key tied to its one-time token, so retries (on Resend 429/5xx, up to 3 attempts) never
send duplicates, plus a `category` tag (`verify_email` / `reset_password`) for filtering in the Resend dashboard.

New accounts can use the dashboard and Playground right away; their widgets go live only after they click the
verification link. Accounts that existed before this feature were marked verified by the migration.

### Storage setup (large uploads)

Files only sit in storage for the few seconds between upload and training, then they're deleted.

**Option A: Vercel Blob (recommended when deploying on Vercel)**

1. Vercel dashboard → your project → **Storage** → **Create** → **Blob** → set access to **Private** (customers' documents
   must not be public) → connect it to the project.
2. Vercel adds `BLOB_READ_WRITE_TOKEN` to the project. For local development copy it into `.env`
   (or run `vercel env pull`).

That's it: no CORS or lifecycle rules. The browser uploads with `@vercel/blob/client` (multipart for big files); the
`/api/blob-upload` route only signs a token for the exact path reserved for that user's document, and puts the plan's size
limit inside the token, so **Vercel itself rejects oversized files**.

**Option B: any S3-compatible bucket** (Cloudflare R2, AWS S3, Supabase Storage, MinIO), for hosting outside Vercel

1. Create a bucket and an API token with read/write on it. Set `S3_ENDPOINT` (R2: `https://<account-id>.r2.cloudflarestorage.com`),
   `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
2. Add a **CORS rule** so browsers can upload from your app:
   ```json
   [{ "AllowedOrigins": ["https://YOUR_APP"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000 }]
   ```
3. Recommended: a **lifecycle rule** deleting objects under `uploads/` after 1 day, to catch abandoned uploads.

The browser PUTs to a 15-minute presigned URL; the server then checks the real object size (the size the browser
announced is never trusted), trains and deletes the file.

If `BLOB_READ_WRITE_TOKEN` is set it wins; with neither option, uploads go through the app itself.

## Deploying

**Vercel + Neon/Supabase** works out of the box; **any Node host / Docker** runs `npm run build && npm start`.

Checklist for production:

1. **Database:** a Postgres with pgvector (Neon and Supabase both include it). Use the **pooled** connection string as
   `DATABASE_URL` (Neon: the `-pooler` host; Supabase: the transaction pooler, port 6543), because every serverless
   instance opens its own connections. On Vercel, production deploys run the migrations automatically
   (`npm run vercel-build`); elsewhere run `npm run db:migrate` on each deploy. `vercel.json` runs the functions in
   Singapore (`sin1`): put the database in the same region, or change both.
2. **Secrets:** generate new `AUTH_SECRET` and `ENCRYPTION_KEY` values (`openssl rand -base64 32`). Never reuse local ones.
   Changing `ENCRYPTION_KEY` later makes customers' saved API keys unreadable.
3. **`NEXT_PUBLIC_APP_URL`:** your public URL, e.g. `https://chat.yourdomain.com`. It appears in emails and embed snippets
   and is built into the app, so **redeploy after changing it**. (On Vercel it falls back to the project's production
   domain if unset.)
4. **Email:** either your Gmail account (`SMTP_USER`/`SMTP_PASS`, no domain needed, ~500 emails/day) or Resend with
   `EMAIL_FROM` on a domain **you own and verified in Resend** (a `*.vercel.app` address can't be verified). Without
   working email, new customers can't verify, so their chatbots never go live.
5. **AI keys:** `GEMINI_API_KEY` (required, embeddings) and `GROQ_API_KEY`.
6. **Optional:** Stripe (see above) and upload storage (Vercel Blob or S3) for files over 4 MB on Vercel.
7. **Legal pages:** add Terms of Service and a Privacy Policy before taking payments. Stripe asks for them, and the
   chatbots store your customers' visitors' messages.

**The server refuses to start in production with unsafe settings:** missing `DATABASE_URL`/`GEMINI_API_KEY`, or
missing, short or placeholder `AUTH_SECRET`/`ENCRYPTION_KEY`. The reason is in the logs (on Vercel: the function
logs). Missing email, Stripe or storage only log a `[config]` warning, since the app still works without them.

## How embedding works

```html
<script src="https://YOUR_APP/widget.js" data-bot-id="BOT_ID" defer></script>
```

`widget.js` reads the bot's color/position from `/api/public/bots/:id`, renders a button in a Shadow DOM and lazily
loads `/embed/:id` in an iframe on first click. The chat API (`/api/chat/:id`) streams plain text and returns the
conversation id in the `X-Conversation-Id` header.

Optional attributes: `data-position="left"`, `data-color="#0ea5e9"`, `data-open="true"`.

## Project layout

```
src/
  app/
    api/auth/*            signup, login, logout, email verification, password reset
    api/account/*         profile, change password, delete account
    api/bots/*            bot CRUD, document upload/delete
    api/chat/[botId]      public streaming chat endpoint (RAG)
    api/public/bots/*     widget config (CORS)
    api/billing/*         Stripe checkout + portal
    api/stripe/webhook    subscription sync
    dashboard/*           customer dashboard (bots, knowledge, playground, conversations, analytics, settings, embed, billing, account)
    embed/[botId]         chat UI loaded inside the widget iframe
  lib/
    ai/                   text extraction, chunking, Gemini embeddings, Gemini/Groq streaming chat, key resolution
    db/                   Drizzle schema + client
    rag.ts                ingestion, retrieval, prompt building
    plans.ts              plan limits & pricing
public/widget.js          embed loader
drizzle/                  SQL migrations
```

## Security

**Allowed websites (per bot, Settings → Website security) are required to go live.** One domain per line:
`example.com` also covers `www.`, `*.example.com` covers every subdomain, and ports are supported for testing
(`localhost:8080`). A bot is **Live** once its owner verified their email and it has at least one domain; until then
it only works in the Playground and on its direct link (served from our own domain). Enforcement:
- `/embed/:id` is served with `Content-Security-Policy: frame-ancestors …`, so **browsers refuse to show the chat inside
  any other website**, even if someone copies the iframe by hand.
- The widget config endpoint refuses other origins, so the bubble never appears there.
- The chat API rejects requests whose `Origin` isn't allowed.

Server-side scripts can fake headers, which is why rate limits exist too.

**Rate limits** (fixed windows in Postgres, shared by all serverless instances, IPs stored only as keyed hashes):

| What | Limit |
| --- | --- |
| Chat, per visitor (IP + browser id) | owner-configurable per day (default 50) |
| Chat, per IP | 5× the visitor limit per day (offices and mobile carriers share IPs) |
| Chat burst, per IP | 8 messages / minute |
| Login | 10 / 15 min per account, 30 / 15 min per IP |
| Sign-up | 5 / hour per IP |
| Password reset requests | 3 / hour per account, 10 / hour per IP |

The Playground is owner-only and skips visitor limits; it still counts toward the monthly plan quota.
Client IPs come from `X-Forwarded-For` on Vercel; see below for other hosts.

**Other protections:** every page except `/embed/*` sends `frame-ancestors 'self'` and `X-Frame-Options`, so other sites
can't load the dashboard in a hidden frame (clickjacking). All responses send `nosniff` and a strict referrer policy.
`robots.txt` keeps the dashboard, API and chat pages out of search engines. Changing a password signs out all other
devices.

## Self-hosting (without Vercel)

"Self-hosting" means running the app on a machine you manage instead of Vercel: a VPS (DigitalOcean, Hetzner, AWS EC2),
a container platform (Railway, Render, Fly.io) or your own server, with `npm run build && npm start` or Docker.

The one thing to get right is **how the app learns a visitor's IP**, because per-IP rate limits depend on it:

- On **Vercel**, the platform writes the visitor's real IP into `X-Forwarded-For` and discards whatever the visitor sent.
  Nothing to configure.
- On your **own server**, `X-Forwarded-For` is just a header, and anyone can send `X-Forwarded-For: 1.2.3.4`. If the app
  trusted it, an abuser could pretend to be a new visitor on every request and dodge the limits.

So set `CLIENT_IP_HEADER` to the header *your* front proxy controls:

| Setup | `CLIENT_IP_HEADER` |
| --- | --- |
| Vercel | leave unset |
| Behind Cloudflare | `cf-connecting-ip` |
| nginx with `proxy_set_header X-Real-IP $remote_addr;` | `x-real-ip` |
| Railway / Render / Fly.io / a cloud load balancer | `x-forwarded-for` (they overwrite it); check your platform's docs |

Also on self-hosted setups: run `npm run db:migrate` on deploy, use Option B storage (or none: there's no 4.5 MB limit
outside Vercel), and serve the app over HTTPS.

## Tests

```bash
npm test          # domain allow-list matching
npm run lint      # type check
```

## Roadmap

- **Website crawling** as a knowledge source, plus OCR for scanned PDFs.
- **Background ingestion queue** for very large documents (today training runs inside the upload request, up to 5 minutes).
- **Lead capture / human handoff** and "unanswered questions" reports.
- **Change email** self-service (needs re-verification of the new address).
