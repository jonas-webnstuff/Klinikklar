"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const REASON_MESSAGES: Record<string, string> = {
  not_found:
    "Den här bilagan finns inte längre. Kliniken kan ha tagit bort eller ersatt den efter att den här länken skapades. Kontakta kliniken om du behöver tillgång till underlaget.",
  no_file:
    "Ingen fil är längre kopplad till den här bilagan. Kontakta kliniken om du behöver tillgång till underlaget.",
  no_access:
    "Kontot du är inloggad med är inte kopplat till någon ansökan. Logga in med rätt konto, eller kontakta kliniken.",
};

const DEFAULT_MESSAGE = "Den här bilagan kunde inte öppnas just nu. Kontakta kliniken om problemet kvarstår.";

function AttachmentUnavailableContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "";
  const message = REASON_MESSAGES[reason] || DEFAULT_MESSAGE;

  return (
    <div className="mx-auto grid min-h-[60vh] w-full max-w-[1180px] items-center px-6 py-12 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_24px_60px_rgba(13,39,87,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">Klinikklar</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
          Bilagan kunde inte öppnas
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--line-strong)]"
        >
          Till startsidan
        </Link>
      </section>
    </div>
  );
}

export default function AttachmentUnavailablePage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[color:var(--muted)]">Laddar...</div>}>
      <AttachmentUnavailableContent />
    </Suspense>
  );
}
