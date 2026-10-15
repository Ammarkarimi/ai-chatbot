import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Document parsers ship their own worker/binary assets; keep them out of the bundle.
  serverExternalPackages: ["unpdf", "mammoth"],
  async headers() {
    return [
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
