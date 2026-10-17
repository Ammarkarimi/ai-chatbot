import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode "N" button would otherwise overlap the chat input inside the widget iframe.
  devIndicators: false,
  // Document parsers ship their own worker/binary assets; keep them out of the bundle.
  serverExternalPackages: ["unpdf", "mammoth", "nodemailer"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Stop other sites from framing the dashboard (clickjacking). /embed is the exception:
        // proxy.ts sets its frame-ancestors to the bot's allowed websites.
        source: "/((?!embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // The widget loader is fetched cross-origin from customer websites.
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
