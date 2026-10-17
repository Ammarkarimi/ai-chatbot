/** Runs once when the server starts. In production, refuse to run with unsafe configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { checkEnv } = await import("@/lib/env-check");
  const { errors, warnings } = checkEnv();
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration:\n- ${errors.join("\n- ")}`);
  }
}
