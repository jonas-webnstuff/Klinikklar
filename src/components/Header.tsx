import Link from "next/link";
import { isSuperAdminUser } from "@/lib/admin-access";
import { HeaderNav } from "@/components/HeaderNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canAdminCustomers = isSuperAdminUser(user?.email);

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-white/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--ink)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--brand)]/30 bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 7 10 17l-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-[2rem] font-semibold tracking-[-0.04em]">Klinikklar</span>
        </Link>
        <HeaderNav isAuthenticated={Boolean(user)} canAdminCustomers={canAdminCustomers} />
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/profile"
                className="rounded-xl border border-[color:var(--line-strong)] bg-white px-6 py-3 text-sm font-semibold text-[color:var(--ink)] shadow-[0_10px_25px_rgba(14,31,53,0.06)] transition hover:border-[color:var(--brand)]/30"
              >
                Profil
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-xl bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(41,181,120,0.28)] transition hover:bg-[color:var(--brand-2)]"
                >
                  Logga ut
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-[color:var(--line-strong)] bg-white px-6 py-3 text-sm font-semibold text-[color:var(--ink)] shadow-[0_10px_25px_rgba(14,31,53,0.06)] transition hover:border-[color:var(--brand)]/30"
              >
                Logga in
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(41,181,120,0.28)] transition hover:bg-[color:var(--brand-2)]"
              >
                Kom igång
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
