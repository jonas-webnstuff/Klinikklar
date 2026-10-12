import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Återställ lösenord | Klinikklar",
  description: "Sätt ett nytt lösenord för ditt Klinikklar-konto.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
