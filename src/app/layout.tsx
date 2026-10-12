import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://klinikklar.se";
const DESCRIPTION =
  "AI-ledningssystem för privat tandvård — förbered er IVO-ansökan och driv ett löpande kvalitetssystem med rutiner, riskanalyser och avvikelsehantering på ett ställe.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Klinikklar",
  description: DESCRIPTION,
  openGraph: {
    title: "Klinikklar",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Klinikklar",
    locale: "sv_SE",
    type: "website",
    images: [{ url: "/images/hero-dentist.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klinikklar",
    description: DESCRIPTION,
    images: ["/images/hero-dentist.png"],
  },
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
