export const COOKIE_NOTICE_NAME = "klinikklar_cookie_notice";
export const COOKIE_NOTICE_VALUE = "seen";
export const COOKIE_NOTICE_MAX_AGE_DAYS = 365;

export const OPEN_COOKIE_SETTINGS_EVENT = "klinikklar:open-cookie-settings";

export function hasSeenCookieNotice(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith(`${COOKIE_NOTICE_NAME}=`));
}

export function markCookieNoticeSeen(): void {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_NOTICE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NOTICE_NAME}=${COOKIE_NOTICE_VALUE}; path=/; max-age=${maxAge}; samesite=lax`;
}
