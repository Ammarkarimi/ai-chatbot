# BotForge: AI chatbot platform (SaaS)

Customers sign up, upload PDFs / Word / text files, and get an AI chatbot trained on that content.
They paste one `<script>` tag into their website and a branded chat bubble appears.

> "BotForge" is a placeholder brand. Change it with `NEXT_PUBLIC_APP_NAME`.

## Features

- **Accounts:** email/password signup and login (bcrypt + signed httpOnly JWT cookie), multi-tenant.
  Email verification and password reset via [Resend](https://resend.com). A reset signs out every other session.
- **Training:** upload PDF, DOCX, TXT, MD and CSV files, or paste text. With an S3-compatible bucket configured,
  browsers upload straight to storage (no serverless body-size limit) with a progress bar. Text is chunked and embedded with
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
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | | Direct-to-storage uploads (R2, S3, Supabase, MinIO). Unset: files go through the app, capped at 4 MB on Vercel |
| `S3_VIRTUAL_HOSTED` | | `true` for `bucket.host` style URLs instead of `host/bucket` |

### Stripe setup

1. Create two recurring Prices in Stripe (e.g. Pro $29/mo and Business $99/mo) and set `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS`.
2. Add a webhook endpoint `https://YOUR_APP/api/stripe/webhook` with the events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and
   `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (Settings → Billing → Customer portal) so users can switch plans or cancel.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Plan limits and prices shown in the UI live in `src/lib/plans.ts`.

### Email setup (Resend)

1. Create an account at [resend.com](https://resend.com), add and verify your sending domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `BotForge <no-reply@yourdomain.com>`).

New accounts can use the dashboard and Playground right away, but their widgets only go live after they click the
verification link. Accounts that existed before this feature were marked verified by the migration.

### Storage setup (large uploads)

Example with **Cloudflare R2** (no egress fees; AWS S3 and Supabase Storage work the same way):

1. Create a bucket, then an API token with *Object Read & Write* on it. Set `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`,
   `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
2. Add a **CORS rule** so browsers can upload from your app:
   ```json
   [{ "AllowedOrigins": ["https://YOUR_APP"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000 }]
   ```
3. Recommended: a **lifecycle rule** deleting objects under `uploads/` after 1 day. Files are deleted right after training,
   so this only catches abandoned uploads.

Flow: `POST /api/bots/:id/uploads` returns a 15-minute presigned PUT URL → the browser uploads → `POST
/api/bots/:id/documents/:docId/process` checks the real size in the bucket (the size the browser announced is never trusted),
trains, then deletes the file.

## Deploying

- **Vercel + Neon/Supabase** works out of the box. Run `npm run db:migrate` against the production database after each deploy
  that adds a migration. Configure storage (above) so Pro/Business customers can upload files over 4 MB.
- **Any Node host / Docker:** `npm run build && npm start`.

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
    api/auth/*            signup, login, logout
    api/bots/*            bot CRUD, document upload/delete
    api/chat/[botId]      public streaming chat endpoint (RAG)
    api/public/bots/*     widget config (CORS)
    api/billing/*         Stripe checkout + portal
    api/stripe/webhook    subscription sync
    dashboard/*           customer dashboard (bots, knowledge, playground, conversations, analytics, settings, embed, billing)
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

**Allowed websites (per bot, Settings → Website security).** One domain per line: `example.com` also covers `www.`,
`*.example.com` covers every subdomain, and ports are supported for testing (`localhost:8080`). When the list isn't empty:
- `/embed/:id` is served with `Content-Security-Policy: frame-ancestors …`, so **browsers refuse to show the chat inside
  any other website**, even if someone copies the iframe by hand.
- The widget config endpoint refuses other origins, so the bubble never appears there.
- The chat API rejects requests whose `Origin` isn't allowed.

An empty list allows every site, and the dashboard warns about it. Server-side scripts can fake headers, which is why
rate limits exist too.

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
Client IPs come from `X-Forwarded-For` (set correctly by Vercel and most proxies). If you self-host, put the app behind a
proxy that overwrites that header.

## Tests

```bash
npm test          # domain allow-list matching
npm run lint      # type check
```

## Roadmap

- **Website crawling** as a knowledge source, plus OCR for scanned PDFs.
- **Background ingestion queue** for very large documents (today training runs inside the upload request, up to 5 minutes).
- **Lead capture / human handoff** and "unanswered questions" reports.
- **Change email / delete account** self-service.
