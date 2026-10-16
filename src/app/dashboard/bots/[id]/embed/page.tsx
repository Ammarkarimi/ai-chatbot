import { loadOwnedBot } from "@/lib/bot-access";
import { APP_URL } from "@/lib/config";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";

export default async function EmbedCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot, user } = await loadOwnedBot(id);
  const snippet = `<script src="${APP_URL}/widget.js" data-bot-id="${bot.id}" defer></script>`;
  const iframe = `<iframe src="${APP_URL}/embed/${bot.id}" width="400" height="600" style="border:0;border-radius:12px" title="${bot.name}"></iframe>`;
  const link = `${APP_URL}/embed/${bot.id}`;

  return (
    <div className="space-y-6">
      {!user.emailVerifiedAt && (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Verify your email to activate this chatbot on your website. Until then it only works in the Playground.
        </p>
      )}
      {bot.allowedDomains.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Any website can embed this chatbot</strong> and use up your messages.{" "}
          <Link href={`/dashboard/bots/${bot.id}/settings`} className="font-medium underline">Add your website&apos;s domain</Link>{" "}
          to lock it down.
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Only works on: {bot.allowedDomains.join(", ")}.{" "}
          <Link href={`/dashboard/bots/${bot.id}/settings`} className="font-medium underline">Change</Link>
        </p>
      )}
      <div className="card p-6">
        <h2 className="font-semibold">Add the chat bubble to your website</h2>
        <p className="mt-1 text-sm text-slate-600">
          Paste this line just before the closing <code className="rounded bg-slate-100 px-1">&lt;/body&gt;</code> tag on
          every page where the chatbot should appear.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"><code>{snippet}</code></pre>
        <div className="mt-3"><CopyButton text={snippet} label="Copy script tag" /></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold">Platform guides</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><strong>WordPress:</strong> Appearance → Theme File Editor → footer.php, or use a &ldquo;header &amp; footer scripts&rdquo; plugin.</li>
            <li><strong>Shopify:</strong> Online Store → Themes → Edit code → theme.liquid, before <code>&lt;/body&gt;</code>.</li>
            <li><strong>Webflow:</strong> Site settings → Custom code → Footer code.</li>
            <li><strong>Wix:</strong> Settings → Custom code → Add code to Body – end.</li>
            <li><strong>React / Next.js:</strong> add the tag to your root HTML or load it with a Script component.</li>
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold">Other options</h3>
          <p className="mt-2 text-sm text-slate-600">Inline iframe (embeds the chat inside a page section):</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs"><code>{iframe}</code></pre>
          <div className="mt-2"><CopyButton text={iframe} label="Copy iframe" /></div>
          <p className="mt-4 text-sm text-slate-600">Direct link (share or put behind a &ldquo;Chat with us&rdquo; button):</p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={link} className="input text-xs" />
            <CopyButton text={link} />
          </div>
        </div>
      </div>

      <div className="card p-6 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-900">Customize with attributes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><code>data-position=&quot;left&quot;</code>: show the bubble on the left</li>
          <li><code>data-color=&quot;#0ea5e9&quot;</code>: override the bubble color</li>
          <li><code>data-open=&quot;true&quot;</code>: open the chat automatically</li>
          <li>JavaScript: <code>window.Chatbot.open()</code>, <code>.close()</code>, <code>.toggle()</code></li>
        </ul>
      </div>
    </div>
  );
}
