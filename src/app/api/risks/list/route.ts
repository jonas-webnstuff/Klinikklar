import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function resolveUserOrganizationId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return membership?.organization_id || null;
}

export async function POST() {
  try {
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du maste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const organizationId = await resolveUserOrganizationId(supabase, user.id);

    if (!organizationId) {
      return NextResponse.json({ ok: true, risks: [] });
    }

    const { data, error } = await supabase
      .from("risk_register_entries")
      .select("id, title, description, probability, consequence, status, owner_role, due_date, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      risks: (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        probability: item.probability,
        consequence: item.consequence,
        status: item.status,
        ownerRole: item.owner_role,
        dueDate: item.due_date,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hamta risker",
      },
      { status: 400 }
    );
  }
}
