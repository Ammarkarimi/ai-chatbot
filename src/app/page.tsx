import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { PricingTable } from "@/components/PricingTable";
import { ProductTour } from "@/components/ProductTour";
import { PLATFORMS, PlatformLogo } from "@/components/PlatformLogos";
import { SiteAssistant } from "@/components/SiteAssistant";
import { defaultCurrency } from "@/lib/currency";
import { APP_NAME, APP_URL } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT } from "@/lib/assistant";
import { AI_MARKUP, AI_RATES, formatAmount, ourCostPer1000 } from "@/lib/plans";

const ICONS = {
  doc: "M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5M9 13h6M9 17h4",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  brush: "M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.7-1.5 1.8-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM10.5 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  shield: "M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zM9 12l2 2 4-4",
  key: "M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zM16 8h.01",
  headset: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1zM17 20a4 4 0 0 1-4 2h-1",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21h.01M17 21h.01",
  cap: "m2 9 10-5 10 5-10 5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6",
  users: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const FEATURES: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  { icon: "doc", title: "Answers from your docs only", body: "Every reply is grounded in your content. If the answer isn't in your documents, the bot says so instead of guessing." },
  { icon: "bolt", title: "Gemini or Groq, per chatbot", body: "Pick Google Gemini for quality or Groq for lightning-fast replies. Switch any time." },
  { icon: "brush", title: "Your brand, your voice", body: "Set the color, welcome message, bubble position and instructions for tone and behavior." },
  { icon: "chart", title: "Conversations & analytics", body: "Read every question visitors ask, spot gaps in your docs and watch usage grow." },
  { icon: "shield", title: "Locked to your website", body: "The bot only runs on the domains you allow, with per-visitor rate limits to stop abuse." },
  { icon: "key", title: "Bring your own API keys", body: "On paid plans, plug in your own Gemini or Groq keys for full cost control." },
];

// Tailwind needs full class names, so each use case carries its own colors.
const USE_CASES: {
  icon: keyof typeof ICONS;
  title: string;
  body: string;
  docs: string;
  q: string;
  a: string;
  badge: string;
  bubble: string;
}[] = [
  {
    icon: "headset",
    title: "Customer support",
    body: "Answer FAQs, policies and how-tos instantly, and free your team for the hard questions.",
    docs: "Help center, policies, product guides",
    q: "How do I reset my password?",
    a: "Click “Forgot password” on the login page and we’ll email you a reset link within a minute.",
    badge: "bg-sky-100 text-sky-700",
    bubble: "bg-sky-600",
  },
  {
    icon: "cart",
    title: "Online stores",
    body: "Shipping, returns, sizing and product details, answered while the customer is ready to buy.",
    docs: "Shipping & returns policy, size charts, catalog",
    q: "Do you ship to Canada?",
    a: "Yes! International orders arrive in 5–8 business days, and shipping is free over $75.",
    badge: "bg-emerald-100 text-emerald-700",
    bubble: "bg-emerald-600",
  },
  {
    icon: "cap",
    title: "Courses & coaching",
    body: "Turn your course material into a study buddy that answers students day and night.",
    docs: "Syllabus, lesson notes, course FAQ",
    q: "What does module 3 cover?",
    a: "Module 3 is all about pricing: value-based pricing, anchoring and a hands-on worksheet.",
    badge: "bg-amber-100 text-amber-700",
    bubble: "bg-amber-600",
  },
  {
    icon: "users",
    title: "Internal help desk",
    body: "Give staff one place to ask about HR policies, onboarding and IT guides.",
    docs: "Employee handbook, IT guides, onboarding docs",
    q: "How many leave days do I get?",
    a: "Full-time staff get 24 paid leave days a year plus public holidays. Apply in the HR portal.",
    badge: "bg-violet-100 text-violet-700",
    bubble: "bg-violet-600",
  },
];

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-balance text-lg text-slate-600">{subtitle}</p>}
    </div>
  );
}

const FAQS = [
  {
    q: "Will the chatbot make things up?",
    a: "It is built to answer only from the passages it finds in your documents. When the answer isn't there, it tells the visitor it doesn't have that information and suggests contacting your team.",
  },
  {
    q: "What can I upload?",
    a: "PDF, Word (.docx) and plain-text files, or you can paste text directly. The free plan includes 5 documents per chatbot; paid plans include more.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. You copy one line from the Embed tab and paste it into your site. Most website builders have a box for custom code. You can also share a direct link to the chat or use an iframe.",
  },
  {
    q: "Can someone else put my chatbot on their website?",
    a: "No. Your bot only works on the websites you list under Allowed websites, and each visitor gets a daily message limit so nobody can run up your usage.",
  },
  {
    q: "Do I need my own Gemini or Groq API key?",
    a: "No, everything works out of the box on our AI, starting with your plan's monthly AI credit. On Pro and Business you can optionally add your own keys per chatbot and pay the AI provider directly.",
  },
  {
    q: "How is AI usage charged?",
    a: `Your plan covers the platform and includes a monthly AI credit. After that, AI tokens cost ${AI_MARKUP}× the provider's list price: about ${formatAmount(ourCostPer1000(AI_RATES[0]), "usd")} per 1,000 replies on Groq or ${formatAmount(ourCostPer1000(AI_RATES[1]), "usd")} on Gemini. With your own API key, we charge nothing for AI.`,
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Plans are billed monthly and you can cancel or change plans from the Billing page whenever you like. The free plan is free forever.",
  },
  {
    q: "Who builds BotForge? Can you build something custom for us?",
    a: `${APP_NAME} is built by IntelliForge, an AI solutions company in Ahmedabad, India. IntelliForge also builds custom chatbots, AI automation, machine learning and web apps. Call ${CONTACT.phone}, email ${CONTACT.email} or visit intelliforgeai.vercel.app for a free consultation.`,
  },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-tr from-brand-200/60 via-fuchsia-100/60 to-sky-100/60 blur-2xl" />
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5">
        <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
            <LogoMark className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold">Acme Support</p>
            <p className="flex items-center gap-1.5 text-xs text-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online · replies instantly
            </p>
          </div>
        </div>
        <div className="space-y-3 bg-slate-50/60 p-4 text-sm">
          <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-slate-700 shadow-sm ring-1 ring-slate-100">
            Hi! I can answer questions about orders, shipping and returns. What do you need?
          </p>
          <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2.5 text-white">
            Can I return a chair after 2 weeks?
          </p>
          <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-slate-700 shadow-sm ring-1 ring-slate-100">
            Yes. You have <strong>30 days</strong> from delivery to return any item for a full refund. Just email
            support@acme.com with your order number and we&apos;ll send a free return label.
          </p>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 p-3">
          <span className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">Type your message…</span>
          <span className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">Send</span>
        </div>
      </div>

      <div className="absolute -right-4 -top-7 hidden animate-float items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-lg ring-1 ring-slate-900/5 sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-[10px] font-bold text-red-600">PDF</span>
        <div>
          <p className="text-xs font-semibold">return-policy.pdf</p>
          <p className="text-[11px] text-emerald-600">✓ Trained · 38 passages</p>
        </div>
      </div>
      <div className="absolute -bottom-9 right-8 hidden animate-float items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-lg ring-1 ring-slate-900/5 [animation-delay:-3s] sm:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-xs font-semibold">Live on acme.com</p>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            {[
              ["#how", "How it works"],
              ["#use-cases", "Use cases"],
              ["#pricing", "Pricing"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900 md:block">
                {label}
              </a>
            ))}
            {user ? (
              <Link href="/dashboard" className="btn-primary ml-2">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900">Log in</Link>
                <Link href="/signup" className="btn-primary">Get started free</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_70%_-10%,var(--color-brand-100),transparent),radial-gradient(40rem_25rem_at_0%_20%,#fae8ff,transparent)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> No code · Live in 5 minutes
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn your documents into a{" "}
              <span className="bg-linear-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-transparent">24/7 AI support agent</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 lg:mx-0">
              Upload your PDFs, Word files and text. {APP_NAME} answers your customers&apos; questions from them, right on
              your website, in your brand, with one line of code.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base shadow-lg shadow-brand-600/25">Build your chatbot free</Link>
              <a href="#how" className="btn-secondary px-6 py-3 text-base">See how it works</a>
            </div>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500 lg:justify-start">
              {["Free plan, no credit card", "Gemini & Groq models", "Works on any website"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-500" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Integrations"
            title="Works with the website you already have"
            subtitle="Add it to any of these with one copy-paste. No plugins and no developer needed."
          />
          <ul className="mt-10 flex flex-wrap justify-center gap-3">
            {PLATFORMS.map((p) => (
              <li
                key={p.name}
                className="flex w-[calc(50%-0.375rem)] flex-col items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-36"
              >
                <PlatformLogo path={p.path} color={p.color} className="h-9 w-9" />
                <span className="text-sm font-semibold text-slate-700">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how" className="scroll-mt-16 bg-linear-to-b from-white to-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From sign-up to a live chatbot in 6 steps"
            subtitle="Here’s the whole setup, click by click. Pick any step to jump straight to it."
          />
          <div className="mt-12">
            <ProductTour appUrl={APP_URL} />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need, nothing you don’t"
            subtitle="All the tools to launch, run and improve an AI assistant on your website."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={f.icon} />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Use cases"
            title="One bot, many jobs"
            subtitle={`If the answers live in a document, ${APP_NAME} can give them out, instantly. Here’s what that looks like.`}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {USE_CASES.map((u) => (
              <div key={u.title} className="card flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:p-7">
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${u.badge}`}>
                    <Icon name={u.icon} />
                  </span>
                  <h3 className="text-lg font-semibold">{u.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{u.body}</p>
                <div className="mt-5 flex-1 space-y-2.5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className={`ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm text-white ${u.bubble}`}>{u.q}</p>
                  <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                    {u.a}
                  </p>
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Icon name="doc" className="h-4 w-4 shrink-0" /> Trained on: {u.docs}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple, transparent pricing"
            subtitle="Start free. Pay for the platform, and only for the AI you actually use."
          />
          <div className="mt-10">
            <PricingTable variant="landing" defaultCurrency={await defaultCurrency()} />
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Can’t find your answer? Ask our AI assistant in the corner, or contact us directly."
          />
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 to-fuchsia-600 px-6 py-14 text-center text-white shadow-xl sm:px-12">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Your 24/7 support agent is 5 minutes away</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-brand-100">
            Upload a document, test a few questions and paste one line into your site. Free to start.
          </p>
          <Link href="/signup" className="btn relative mt-8 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
            Build your chatbot free
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-slate-600">AI chatbots trained on your documents, live on your website in minutes.</p>
            <p className="mt-4 text-slate-500">
              A product by{" "}
              <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-brand-700">
                IntelliForge
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Product</h3>
            <ul className="mt-4 space-y-2.5 text-slate-600">
              <li><a href="#how" className="hover:text-slate-900">How it works</a></li>
              <li><a href="#use-cases" className="hover:text-slate-900">Use cases</a></li>
              <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
              <li><Link href="/signup" className="hover:text-slate-900">Get started free</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Contact IntelliForge</h3>
            <ul className="mt-4 space-y-2.5 text-slate-600">
              <li><a href={`mailto:${CONTACT.email}`} className="hover:text-slate-900">{CONTACT.email}</a></li>
              <li><a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="hover:text-slate-900">{CONTACT.phone}</a></li>
              <li>
                <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">
                  intelliforgeai.vercel.app
                </a>
              </li>
              <li className="text-slate-500">Ahmedabad, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {APP_NAME} by IntelliForge. All rights reserved.
        </div>
      </footer>
      <SiteAssistant />
    </div>
  );
}
