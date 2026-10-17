import type { Metadata } from "next";
import "./globals.css";

import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — AI chatbots trained on your documents`, template: `%s · ${APP_NAME}` },
  description: "Upload your PDFs, Word files and text. Get an AI chatbot for your website in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
