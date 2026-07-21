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
  const isWorkspaceRoot = pathname === "/workspace";
  const isLedningssystemPath = pathname.startsWith("/workspace/ledningssystem");
  const isAvvikelserPath = pathname.startsWith("/workspace/avvikelser");
  const isRiskanalyserPath = pathname.startsWith("/workspace/riskanalyser");
  const isArshjulPath = pathname.startsWith("/workspace/arshjul");

  return (
    <nav className="hidden items-center gap-6 text-[15px] font-medium text-[color:var(--ink)] lg:mr-4 lg:flex xl:mr-8 xl:gap-8">
      {isAuthenticated ? (
        <>
          <Link
            href="/workspace/ledningssystem"
            className={`${baseLinkClass} ${isLedningssystemPath || (isWorkspaceRoot && view === "ledningssystem") ? activeLinkClass : ""}`}
          >
            Ledningssystem
          </Link>
          <Link
            href="/workspace/riskanalyser"
            className={`${baseLinkClass} ${isRiskanalyserPath || (isWorkspaceRoot && view === "riskanalyser") ? activeLinkClass : ""}`}
          >
            Riskanalyser
          </Link>
          <Link
            href="/workspace/avvikelser"
            className={`${baseLinkClass} ${isAvvikelserPath || (isWorkspaceRoot && view === "avvikelser") ? activeLinkClass : ""}`}
          >
            Avvikelser
          </Link>
          <Link
            href="/workspace/arshjul"
            className={`${baseLinkClass} ${isArshjulPath || (isWorkspaceRoot && view === "arshjul") ? activeLinkClass : ""}`}
          >
            Årshjul
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