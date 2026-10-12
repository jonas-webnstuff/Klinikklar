import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bilagan är inte tillgänglig | Klinikklar",
  description: "Den här bilagan kunde inte öppnas.",
  robots: { index: false, follow: false },
};

export default function BilagaOtillgangligLayout({ children }: { children: React.ReactNode }) {
  return children;
}
