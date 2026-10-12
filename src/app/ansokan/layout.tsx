import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ansökan | Klinikklar",
  description: "Förbered och skicka in underlag för IVO-ansökan.",
  robots: { index: false, follow: false },
};

export default function AnsokanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
