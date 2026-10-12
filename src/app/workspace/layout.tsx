import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arbetsyta | Klinikklar",
  description: "Ledningssystem, rutiner, risker, avvikelser och årshjul i en arbetsyta.",
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
