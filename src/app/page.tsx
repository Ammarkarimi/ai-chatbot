import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PricingTable } from "@/components/PricingTable";
import { defaultCurrency } from "@/lib/currency";
import { APP_NAME } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";

const STEPS = [
  { title: "Upload your content", body: "Drop in PDFs, Word documents, or text files, or paste content directly. We read and index everything." },
  { title: "We train your bot", body: "Your documents are split into passages and turned into embeddings, so the bot finds the right answer every time." },
  { title: "Paste one script tag", body: "Copy a single <script> line into your website. Your branded chat bubble appears instantly." },
];

const FEATURES = [
  { title: "Answers from your docs only", body: "Retrieval-augmented answers grounded in your content. If it's not in your docs, the bot says so." },
  { title: "Gemini & Groq models", body: "Choose Google Gemini for quality or Groq for lightning-fast responses, per chatbot." },
  { title: "Your brand, your voice", body: "Custom colors, welcome message, position and instructions for tone and behavior." },
  { title: "Conversation history", body: "See every question visitors ask, spot gaps in your docs, and track usage over time." },
  { title: "Works on any website", body: "WordPress, Shopify, Webflow, Wix, or custom HTML. If you can paste a script, it works." },
  { title: "Bring your own keys", body: "On paid plans, plug in your own Gemini or Groq API keys for full cost control." },
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          <a href="#pricing" className="hidden text-slate-600 hover:text-slate-900 sm:block">Pricing</a>
          {user ? (
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">Log in</Link>
              <Link href="/signup" className="btn-primary">Get started free</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          AI customer support in 5 minutes
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          A chatbot trained on <span className="text-brand-600">your documents</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Upload your PDFs, Word files and text. {APP_NAME} turns them into an AI assistant that answers your
          customers 24/7. Add it to your website with a single line of code.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Build your chatbot</Link>
          <a href="#how" className="btn-secondary px-6 py-3 text-base">See how it works</a>
        </div>
        <pre className="mx-auto mt-12 max-w-2xl overflow-x-auto rounded-xl bg-slate-900 p-4 text-left text-sm text-slate-100">
          <code>{`<script src="https://your-app.com/widget.js" data-bot-id="YOUR_BOT_ID" defer></script>`}</code>
        </pre>
      </section>

      <section id="how" className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-semibold text-white">{i + 1}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-center text-slate-600">Start free. Upgrade when your chatbot gets busy.</p>
          <div className="mt-8">
            <PricingTable variant="landing" defaultCurrency={await defaultCurrency()} />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
