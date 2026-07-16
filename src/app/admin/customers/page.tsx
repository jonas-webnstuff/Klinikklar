import { redirect } from "next/navigation";
import { canManageCustomers } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminCustomersClient } from "./AdminCustomersClient";

type OrganizationRow = {
  id: string;
  name: string;
  org_number: string;
  email: string;
  phone: string | null;
  created_at: string;
  clinicCount: number;
  membershipCount: number;
};

async function loadOrganizations(): Promise<OrganizationRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name, org_number, email, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const organizationIds = (organizations || []).map((item) => item.id);

  if (organizationIds.length === 0) {
    return [];
  }

  const [clinicResult, membershipResult] = await Promise.all([
    supabase.from("clinics").select("id, organization_id").in("organization_id", organizationIds),
    supabase
      .from("organization_memberships")
      .select("id, organization_id")
      .in("organization_id", organizationIds),
  ]);

  if (clinicResult.error) throw clinicResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const clinicCounts = new Map<string, number>();
  const membershipCounts = new Map<string, number>();

  for (const item of clinicResult.data || []) {
    clinicCounts.set(item.organization_id, (clinicCounts.get(item.organization_id) || 0) + 1);
  }

  for (const item of membershipResult.data || []) {
    membershipCounts.set(item.organization_id, (membershipCounts.get(item.organization_id) || 0) + 1);
  }

  return (organizations || []).map((item) => ({
    ...item,
    clinicCount: clinicCounts.get(item.id) || 0,
    membershipCount: membershipCounts.get(item.id) || 0,
  }));
}

export default async function AdminCustomersPage() {
  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/customers");
  }

  const allowed = await canManageCustomers(user.id);

  if (!allowed) {
    redirect("/workspace");
  }

  const organizations = await loadOrganizations();

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 py-10 lg:px-8">
      <header className="rounded-[2rem] border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
          Kundadministration
        </h1>
        <p className="mt-2 max-w-2xl text-[color:var(--muted)]">
          Hantera kundernas organisationsuppgifter, kontaktvägar och översikt över kopplade kliniker.
        </p>
      </header>

      <div className="mt-6">
        <AdminCustomersClient initialOrganizations={organizations} />
      </div>
    </div>
  );
}
