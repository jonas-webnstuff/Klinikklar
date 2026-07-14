import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await admin
    .from("organization_memberships")
    .select("role, organizations(name, org_number)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-8">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Min profil
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          {profile?.full_name || "Anvandare"}
        </h1>
        <p className="mt-2 text-[color:var(--muted)]">{user.email}</p>
      </header>

      <section className="mt-6 rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Organisationer</h2>

        {!memberships || memberships.length === 0 ? (
          <p className="mt-3 text-[color:var(--muted)]">
            Inga organisationer kopplade an. Spara en workspace for att skapa kopplingen.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {memberships.map((item, index) => (
              <li
                key={`${item.role}-${index}`}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
              >
                <p className="font-semibold text-[color:var(--ink)]">
                  {(item.organizations as { name?: string } | null)?.name || "Okand organisation"}
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  Org.nr: {(item.organizations as { org_number?: string } | null)?.org_number || "-"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  Roll: {item.role}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
