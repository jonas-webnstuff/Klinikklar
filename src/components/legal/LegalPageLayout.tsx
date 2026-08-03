import type { ReactNode } from "react";

export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-16 lg:px-8">
      <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold">Utkast – ej juridiskt granskat</p>
        <p>
          Den här sidan är ett arbetsutkast som beskriver vad Klinikklar avser att lagra och
          behandla, baserat på nuvarande datamodell. Texten är inte juridiskt granskad och ska
          godkännas av jurist innan den publiceras och görs gällande mot kunder.
        </p>
      </div>
      <h1 className="font-display text-3xl font-semibold text-[color:var(--ink)]">{title}</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">Senast uppdaterad: {updated}</p>
      <div className="legal-content mt-8 text-[color:var(--ink)]">{children}</div>
    </div>
  );
}
