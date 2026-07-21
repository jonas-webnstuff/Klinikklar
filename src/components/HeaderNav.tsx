"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type HeaderNavProps = {
  isAuthenticated: boolean;
  canAdminCustomers: boolean;
};

const baseLinkClass = "transition hover:text-[color:var(--brand)]";
const activeLinkClass = "text-[color:var(--brand)]";

export function HeaderNav({ isAuthenticated, canAdminCustomers }: HeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  return (
    <nav className="hidden items-center gap-6 text-[15px] font-medium text-[color:var(--ink)] lg:mr-4 lg:flex xl:mr-8 xl:gap-8">
      {isAuthenticated ? (
        <>
          <Link
            href="/workspace"
            className={`${baseLinkClass} ${pathname === "/workspace" && !view ? activeLinkClass : ""}`}
          >
            Startsida
          </Link>
          <Link
            href="/workspace?view=ledningssystem"
            className={`${baseLinkClass} ${pathname === "/workspace" && view === "ledningssystem" ? activeLinkClass : ""}`}
          >
            Arbetsyta
          </Link>
          <Link
            href="/ansokan"
            className={`${baseLinkClass} ${pathname.startsWith("/ansokan") ? activeLinkClass : ""}`}
          >
            Ansökan
          </Link>
          {canAdminCustomers ? (
            <Link
              href="/admin/customers"
              className={`${baseLinkClass} ${pathname.startsWith("/admin/customers") ? activeLinkClass : ""}`}
            >
              Admin
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <Link href="/#sa-fungerar-det" className={baseLinkClass}>
            Så fungerar det
          </Link>
          <Link href="/#funktioner" className={baseLinkClass}>
            Funktioner
          </Link>
          <Link href="/#priser" className={baseLinkClass}>
            Priser
          </Link>
          <Link href="/#om-oss" className={baseLinkClass}>
            Om oss
          </Link>
          <Link href="/#kunskapsbank" className={baseLinkClass}>
            Kunskapsbank
          </Link>
        </>
      )}
    </nav>
  );
}