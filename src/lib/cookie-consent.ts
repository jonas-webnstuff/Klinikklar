export const COOKIE_NOTICE_NAME = "klinikklar_cookie_notice";
// Bump this whenever cookiepolicy/page.tsx changes materially (match its "updated" date)
// so returning visitors who already dismissed an older notice see the new one.
export const COOKIE_POLICY_VERSION = "2026-07-30";
export const COOKIE_NOTICE_MAX_AGE_DAYS = 365;

export const OPEN_COOKIE_SETTINGS_EVENT = "klinikklar:open-cookie-settings";

export function hasSeenCookieNotice(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${COOKIE_NOTICE_NAME}=${COOKIE_POLICY_VERSION}`);
}

export function markCookieNoticeSeen(): void {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_NOTICE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NOTICE_NAME}=${COOKIE_POLICY_VERSION}; path=/; max-age=${maxAge}; samesite=lax`;
}
