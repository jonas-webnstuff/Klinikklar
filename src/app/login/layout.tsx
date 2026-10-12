import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logga in | Klinikklar",
  description: "Logga in eller skapa konto hos Klinikklar.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
