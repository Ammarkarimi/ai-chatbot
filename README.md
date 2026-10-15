# BotForge: AI chatbot platform (SaaS)

Customers sign up, upload PDFs / Word / text files, and get an AI chatbot trained on that content.
They paste one `<script>` tag into their website and a branded chat bubble appears.

> "BotForge" is a placeholder brand. Change it with `NEXT_PUBLIC_APP_NAME`.

## Features

- **Accounts:** email/password signup and login (bcrypt + signed httpOnly JWT cookie), multi-tenant.
- **Training:** upload PDF, DOCX, TXT, MD and CSV files, or paste text. Text is chunked and embedded with
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

### Stripe setup

1. Create two recurring Prices in Stripe (e.g. Pro $29/mo and Business $99/mo) and set `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS`.
2. Add a webhook endpoint `https://YOUR_APP/api/stripe/webhook` with the events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and
   `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (Settings → Billing → Customer portal) so users can switch plans or cancel.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Plan limits and prices shown in the UI live in `src/lib/plans.ts`.

## Deploying

- **Vercel + Neon/Supabase** works out of the box. Run `npm run db:migrate` against the production database once.
  Vercel limits request bodies to **4.5 MB**, so larger uploads need a self-hosted deployment or direct-to-storage uploads
  (see roadmap).
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

## Roadmap / known limitations

- **Domain allow-list:** today anyone who knows a bot id can embed it (usage still counts against the owner's limits).
  Add per-bot allowed domains enforced with `Content-Security-Policy: frame-ancestors` and origin checks.
- **Per-IP rate limiting** on `/api/chat` (e.g. Upstash Redis) to stop a single visitor from draining a plan.
- **Background ingestion** (queue + direct-to-storage uploads) for very large files and the Vercel 4.5 MB body limit.
- **Website crawling** as a knowledge source, plus OCR for scanned PDFs.
- **Password reset and email verification** (needs an email provider such as Resend).
- **Lead capture / human handoff** and "unanswered questions" reports.
