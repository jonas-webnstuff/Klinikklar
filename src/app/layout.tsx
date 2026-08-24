import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klinikklar",
  description: "AI-driven complianceplattform för privat tandvård",
  // Not launched yet — pull this once the real domain is connected and the site is ready
  // for search engines (see also src/app/robots.ts).
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full bg-[color:var(--bg)] text-[color:var(--ink)]">
        <div className="app-shell flex min-h-full flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
