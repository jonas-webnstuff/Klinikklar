"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  hasSeenCookieNotice,
  markCookieNoticeSeen,
  OPEN_COOKIE_SETTINGS_EVENT,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasSeenCookieNotice()) {
      setVisible(true);
    }

    function handleOpenRequest() {
      setVisible(true);
    }

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenRequest);
  }, []);

  if (!visible) return null;

  function handleDismiss() {
    markCookieNoticeSeen();
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-2xl border border-[color:var(--line-strong)] bg-white p-5 shadow-[0_20px_50px_rgba(14,31,53,0.16)] sm:inset-x-auto sm:right-4 sm:max-w-sm">
      <p className="text-sm text-[color:var(--muted)]">
        Vi använder endast cookies som krävs för inloggning och en säker session. Vi
        använder inga analys- eller marknadsföringscookies.{" "}
        <Link
          href="/cookiepolicy"
          className="font-semibold text-[color:var(--brand)] underline underline-offset-2"
        >
          Läs vår cookiepolicy
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-xl bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(41,181,120,0.28)] transition hover:bg-[color:var(--brand-2)]"
      >
        Jag förstår
      </button>
    </div>
  );
}
