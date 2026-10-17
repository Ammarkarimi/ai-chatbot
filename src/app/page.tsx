import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { PricingTable } from "@/components/PricingTable";
import { ProductTour } from "@/components/ProductTour";
import { defaultCurrency } from "@/lib/currency";
import { APP_NAME, APP_URL } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";

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

const USE_CASES: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  { icon: "headset", title: "Customer support", body: "Answer FAQs, policies and how-tos instantly, and free your team for the hard questions." },
  { icon: "cart", title: "Online stores", body: "Shipping, returns, sizing and product details, answered while the customer is ready to buy." },
  { icon: "cap", title: "Courses & coaching", body: "Turn your course material into a study buddy that answers students day and night." },
  { icon: "users", title: "Internal help desk", body: "Give staff one place to ask about HR policies, onboarding and IT guides." },
];

const PLATFORMS = ["WordPress", "Shopify", "Webflow", "Wix", "Squarespace", "Framer", "Plain HTML"];

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
    a: "No, everything works out of the box. On paid plans you can optionally add your own keys per chatbot to pay the AI provider directly.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Plans are billed monthly and you can cancel or change plans from the Billing page whenever you like. The free plan is free forever.",
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
              ["#features", "Features"],
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
              <a href="#how" className="btn-secondary px-6 py-3 text-base">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-600" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>
                Watch how it works
              </a>
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

      <section className="border-y border-slate-100 bg-slate-50/60 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-400">Add it to any website in one paste</p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {PLATFORMS.map((p) => (
              <li key={p} className="text-base font-semibold text-slate-400">{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how" className="scroll-mt-16 bg-linear-to-b from-white to-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">From sign-up to a live chatbot in 6 steps</h2>
            <p className="mt-4 text-slate-600">
              Watch the whole setup, click by click. Jump to any step, or pause whenever you like.
            </p>
          </div>
          <div className="mt-12">
            <ProductTour appUrl={APP_URL} />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need, nothing you don&apos;t</h2>
          </div>
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

      <section className="bg-slate-900 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-200">Use cases</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">One bot, many jobs</h2>
            <p className="mt-4 text-slate-300">If the answers live in a document, {APP_NAME} can give them out, instantly.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500/20 text-brand-200">
                  <Icon name={u.icon} />
                </span>
                <h3 className="mt-4 font-semibold">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing</h2>
            <p className="mt-3 text-slate-600">Start free. Upgrade when your chatbot gets busy.</p>
          </div>
          <div className="mt-8">
            <PricingTable variant="landing" defaultCurrency={await defaultCurrency()} />
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
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

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
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

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <nav className="flex gap-5">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <Link href="/login" className="hover:text-slate-900">Log in</Link>
            <Link href="/signup" className="hover:text-slate-900">Sign up</Link>
          </nav>
          <p>© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
