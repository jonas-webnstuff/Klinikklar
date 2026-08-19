"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/cookie-consent";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
      className="text-left text-sm font-semibold text-[color:var(--brand)] underline underline-offset-2 hover:text-[color:var(--brand-2)]"
    >
      Cookieinformation
    </button>
  );
}
