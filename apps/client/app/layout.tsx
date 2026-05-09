import type { Metadata } from "next";
import { ClientErrorReporter } from "@/src/components/client-error-reporter";
import { WebVitalsReporter } from "@/src/components/web-vitals-reporter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next BFF",
  description: "Next.js App Router base project for a BFF-style admin app."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ClientErrorReporter />
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
