import { loadOwnedBot } from "@/lib/bot-access";
import { getPlan } from "@/lib/plans";
import { defaultModel } from "@/lib/ai/chat";
import { BotSettingsForm } from "@/components/BotSettingsForm";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot, user } = await loadOwnedBot(id);
  return (
    <BotSettingsForm
      botId={bot.id}
      initial={{
        name: bot.name,
        instructions: bot.instructions,
        welcomeMessage: bot.welcomeMessage,
        primaryColor: bot.primaryColor,
        position: bot.position,
        provider: bot.provider,
        model: bot.model,
        temperature: bot.temperature,
        allowedDomains: bot.allowedDomains,
        visitorDailyLimit: bot.visitorDailyLimit,
      }}
      hasGeminiKey={Boolean(bot.geminiApiKeyEnc)}
      hasGroqKey={Boolean(bot.groqApiKeyEnc)}
      byoAllowed={getPlan(user.plan).id !== "free"}
      defaultModels={{ gemini: defaultModel("gemini"), groq: defaultModel("groq") }}
    />
  );
}
