import { NextResponse } from "next/server";
import { z } from "zod";
import { isSuperAdminUser } from "@/lib/admin-access";
import { organizationProfileSchema } from "@/lib/organization-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  profile: organizationProfileSchema,
  phone: z.string().trim().optional().default(""),
  plan: z.enum(["step1", "step2", "step3"]).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  profile: organizationProfileSchema,
  phone: z.string().trim().optional().default(""),
  plan: z.enum(["step1", "step2", "step3"]).optional().nullable(),
});

async function upsertPrimaryClinic(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  profile: z.infer<typeof organizationProfileSchema>
) {
  const { data: latestClinic, error: clinicLookupError } = await supabase
    .from("clinics")
    .select("id, region")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clinicLookupError) throw clinicLookupError;

  if (latestClinic?.id) {
    const { error: clinicUpdateError } = await supabase
      .from("clinics")
      .update({
        name: profile.clinicName,
        address: profile.address,
        postal_code: profile.postalCode,
        municipality: profile.municipality,
        region: latestClinic.region || "Ej angivet",
      })
      .eq("id", latestClinic.id);

    if (clinicUpdateError) throw clinicUpdateError;
    return latestClinic.id;
  }

  const { data: clinic, error: clinicInsertError } = await supabase
    .from("clinics")
    .insert({
      organization_id: organizationId,
      name: profile.clinicName,
      address: profile.address,
      postal_code: profile.postalCode,
      municipality: profile.municipality,
      region: "Ej angivet",
    })
    .select("id")
    .single();

  if (clinicInsertError) throw clinicInsertError;
  return clinic.id;
}

async function buildOrganizationResponse(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organization: {
    id: string;
    name: string;
    org_number: string;
    email: string;
    phone: string | null;
    plan: "step1" | "step2" | "step3" | null;
    created_at: string;
  }
) {
  const [clinicsResult, membershipsResult] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, address, postal_code, municipality, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase.from("organization_memberships").select("id").eq("organization_id", organization.id),
  ]);

  if (clinicsResult.error) throw clinicsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const latestClinic = clinicsResult.data?.[0] || null;

  return {
    ...organization,
    clinicCount: clinicsResult.data?.length || 0,
    membershipCount: membershipsResult.data?.length || 0,
    clinic_id: latestClinic?.id || null,
    clinic_name: latestClinic?.name || organization.name,
    address: latestClinic?.address || "",
    postal_code: latestClinic?.postal_code || "",
    municipality: latestClinic?.municipality || "",
  };
}

async function requireAdminAccess() {
  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 }) };
  }

  const allowed = isSuperAdminUser(user.email);

  if (!allowed) {
    return { error: NextResponse.json({ error: "Du har inte behörighet att administrera kunder." }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  try {
    const access = await requireAdminAccess();

    if ("error" in access) {
      return access.error;
    }

    const supabase = createSupabaseAdminClient();

    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("id, name, org_number, email, phone, plan, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const organizationIds = (organizations || []).map((item) => item.id);

    const [clinicResult, membershipResult] = await Promise.all([
      organizationIds.length
        ? supabase
            .from("clinics")
            .select("id, organization_id, name, address, postal_code, municipality, created_at")
            .in("organization_id", organizationIds)
        : Promise.resolve({ data: [], error: null }),
      organizationIds.length
        ? supabase
            .from("organization_memberships")
            .select("id, organization_id")
            .in("organization_id", organizationIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (clinicResult.error) throw clinicResult.error;
    if (membershipResult.error) throw membershipResult.error;

    const clinicCounts = new Map<string, number>();
    const latestClinicByOrganization = new Map<
      string,
      {
        id: string;
        name: string;
        address: string;
        postal_code: string;
        municipality: string;
        created_at: string;
      }
    >();
    const membershipCounts = new Map<string, number>();

    for (const item of clinicResult.data || []) {
      clinicCounts.set(item.organization_id, (clinicCounts.get(item.organization_id) || 0) + 1);

      const currentLatest = latestClinicByOrganization.get(item.organization_id);
      if (!currentLatest || new Date(item.created_at).getTime() > new Date(currentLatest.created_at).getTime()) {
        latestClinicByOrganization.set(item.organization_id, item);
      }
    }

    for (const item of membershipResult.data || []) {
      membershipCounts.set(item.organization_id, (membershipCounts.get(item.organization_id) || 0) + 1);
    }

    return NextResponse.json({
      organizations: (organizations || []).map((item) => ({
        ...item,
        clinicCount: clinicCounts.get(item.id) || 0,
        membershipCount: membershipCounts.get(item.id) || 0,
        clinic_id: latestClinicByOrganization.get(item.id)?.id || null,
        clinic_name: latestClinicByOrganization.get(item.id)?.name || item.name,
        address: latestClinicByOrganization.get(item.id)?.address || "",
        postal_code: latestClinicByOrganization.get(item.id)?.postal_code || "",
        municipality: latestClinicByOrganization.get(item.id)?.municipality || "",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte hämta kunder." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdminAccess();

    if ("error" in access) {
      return access.error;
    }

    const payload = createSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: payload.profile.clinicName,
        org_number: payload.profile.orgNumber,
        email: payload.profile.email,
        phone: payload.phone || null,
        plan: payload.plan || null,
      })
      .select("id, name, org_number, email, phone, plan, created_at")
      .single();

    if (error) throw error;

    await upsertPrimaryClinic(supabase, data.id, payload.profile);

    return NextResponse.json({ organization: await buildOrganizationResponse(supabase, data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte skapa kund." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireAdminAccess();

    if ("error" in access) {
      return access.error;
    }

    const payload = updateSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("organizations")
      .update({
        name: payload.profile.clinicName,
        org_number: payload.profile.orgNumber,
        email: payload.profile.email,
        phone: payload.phone || null,
        plan: payload.plan || null,
      })
      .eq("id", payload.id)
      .select("id, name, org_number, email, phone, plan, created_at")
      .single();

    if (error) throw error;

    await upsertPrimaryClinic(supabase, payload.id, payload.profile);

    return NextResponse.json({ organization: await buildOrganizationResponse(supabase, data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte uppdatera kund." },
      { status: 500 }
    );
  }
}
