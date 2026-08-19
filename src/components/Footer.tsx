import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import { COMPANY_INFO } from "@/lib/legal/company-info";

const legalLinks = [
  { href: "/integritetspolicy", label: "Integritetspolicy" },
  { href: "/cookiepolicy", label: "Cookiepolicy" },
  { href: "/anvandarvillkor", label: "Användarvillkor" },
];

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--line)] bg-white/60">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-6 py-10 text-sm text-[color:var(--muted)] lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-[color:var(--ink)]">Klinikklar</p>
          <p>{COMPANY_INFO.name}</p>
          <p>Org.nr: {COMPANY_INFO.orgNumber}</p>
          <p>E-post: {COMPANY_INFO.email}</p>
        </div>
        <nav className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[color:var(--ink)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div>
          <CookieSettingsButton />
        </div>
      </div>
    </footer>
  );
}
