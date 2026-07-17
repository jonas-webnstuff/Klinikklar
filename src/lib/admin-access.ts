const SUPER_ADMIN_EMAIL = "jonas@web-n-stuff.com";

export function isSuperAdminUser(userEmail: string | null | undefined) {
  return userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL;
}
