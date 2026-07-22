import { redirect } from "next/navigation";
import type { OrganizationProfileInput } from "@/lib/organization-profile";
import OrganizationMembersManager from "./OrganizationMembersManager";
import OrganizationProfileEditor from "./OrganizationProfileEditor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MembershipRole = "owner" | "admin" | "editor" | "viewer";

type OrganizationMembershipItem = {
  role: MembershipRole;
  organizations:
    | {
        id?: string;
        name?: string;
        org_number?: string;
        email?: string;
      }
    | null;
};

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
    .select("role, organizations(id, name, org_number, email)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const organizationIds = (memberships || [])
    .map((item) => (item.organizations as { id?: string } | null)?.id)
    .filter((item): item is string => Boolean(item));

  const { data: clinics } = organizationIds.length
    ? await admin
        .from("clinics")
        .select("id, organization_id, name, address, postal_code, municipality, created_at")
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ id: string; organization_id: string; name: string; address: string; postal_code: string; municipality: string; created_at: string }> };

  const latestClinicByOrganization = new Map<
    string,
    { id: string; name: string; address: string; postal_code: string; municipality: string }
  >();

  for (const clinic of clinics || []) {
    if (!latestClinicByOrganization.has(clinic.organization_id)) {
      latestClinicByOrganization.set(clinic.organization_id, clinic);
    }
  }

  const primaryOrg = memberships?.[0]?.organizations as
    | { id?: string; name?: string; org_number?: string; email?: string }
    | null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-8">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Min profil
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          {profile?.full_name || "Användare"}
        </h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Org.nr: {primaryOrg?.org_number || "-"}
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Organisationer</h2>

        {!memberships || memberships.length === 0 ? (
          <p className="mt-3 text-[color:var(--muted)]">
            Inga organisationer kopplade än. Spara en workspace för att skapa kopplingen.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(memberships as OrganizationMembershipItem[]).map((item, index) => {
              const organization = item.organizations;
              const organizationId = organization?.id || "";
              const clinic = organizationId ? latestClinicByOrganization.get(organizationId) : null;
              const initialProfile: OrganizationProfileInput = {
                clinicName: clinic?.name || organization?.name || "",
                orgNumber: organization?.org_number || "",
                address: clinic?.address || "",
                postalCode: clinic?.postal_code || "",
                municipality: clinic?.municipality || "",
                email: organization?.email || user.email || "",
              };
              const canEdit = item.role === "owner" || item.role === "admin" || item.role === "editor";

              return (
              <li
                key={`${item.role}-${index}`}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
              >
                <p className="font-semibold text-[color:var(--ink)]">
                  {organization?.name || "Okänd organisation"}
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  E-post: {organization?.email || user.email || "-"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  Roll: {item.role}
                </p>

                {organizationId ? (
                  <OrganizationProfileEditor
                    organizationId={organizationId}
                    initialProfile={initialProfile}
                    canEdit={canEdit}
                  />
                ) : null}

                {item.role === "owner" ? (
                  <OrganizationMembersManager
                    organizationId={organizationId}
                    organizationName={organization?.name || "Organisation"}
                  />
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
