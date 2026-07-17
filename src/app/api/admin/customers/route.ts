import { NextResponse } from "next/server";
import { z } from "zod";
import { isSuperAdminUser } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(1),
  orgNumber: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().default(""),
  plan: z.enum(["step1", "step2", "step3"]).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  orgNumber: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().default(""),
  plan: z.enum(["step1", "step2", "step3"]).optional().nullable(),
});

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
        ? supabase.from("clinics").select("id, organization_id").in("organization_id", organizationIds)
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
    const membershipCounts = new Map<string, number>();

    for (const item of clinicResult.data || []) {
      clinicCounts.set(item.organization_id, (clinicCounts.get(item.organization_id) || 0) + 1);
    }

    for (const item of membershipResult.data || []) {
      membershipCounts.set(item.organization_id, (membershipCounts.get(item.organization_id) || 0) + 1);
    }

    return NextResponse.json({
      organizations: (organizations || []).map((item) => ({
        ...item,
        clinicCount: clinicCounts.get(item.id) || 0,
        membershipCount: membershipCounts.get(item.id) || 0,
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
        name: payload.name,
        org_number: payload.orgNumber,
        email: payload.email,
        phone: payload.phone || null,
        plan: payload.plan || null,
      })
      .select("id, name, org_number, email, phone, plan, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: { ...data, clinicCount: 0, membershipCount: 0 } });
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
        name: payload.name,
        org_number: payload.orgNumber,
        email: payload.email,
        phone: payload.phone || null,
        plan: payload.plan || null,
      })
      .eq("id", payload.id)
      .select("id, name, org_number, email, phone, plan, created_at")
      .single();

    if (error) throw error;

    const { data: clinics } = await supabase
      .from("clinics")
      .select("id")
      .eq("organization_id", payload.id);

    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", payload.id);

    return NextResponse.json({
      organization: {
        ...data,
        clinicCount: clinics?.length || 0,
        membershipCount: memberships?.length || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte uppdatera kund." },
      { status: 500 }
    );
  }
}
