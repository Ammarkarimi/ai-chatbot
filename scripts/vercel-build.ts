/**
 * Vercel runs `npm run vercel-build` instead of `npm run build` when it exists.
 * Production deploys apply database migrations first, so a new table or column is always
 * there before the code that needs it goes live. Preview deploys only build.
 */
import { execSync } from "node:child_process";
import { config } from "./load-env";

config();
const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Connect a database (Vercel → Storage → Neon) and redeploy.");
    process.exit(1);
  }
  run("npm run db:migrate");
}
run("next build");
