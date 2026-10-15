import { z } from "zod";

export const botSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  instructions: z.string().max(4000),
  welcomeMessage: z.string().trim().max(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #4f46e5"),
  position: z.enum(["right", "left"]),
  provider: z.enum(["gemini", "groq"]),
  model: z.string().trim().max(100).regex(/^[\w./:-]*$/, "Invalid model id"),
  temperature: z.number().min(0).max(1),
  // undefined = leave unchanged, "" = remove, otherwise replace.
  geminiApiKey: z.string().trim().max(200).optional(),
  groqApiKey: z.string().trim().max(200).optional(),
});

export type BotSettingsInput = z.infer<typeof botSettingsSchema>;
