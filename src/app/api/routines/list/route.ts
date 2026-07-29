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
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const organizationId = await resolveUserOrganizationId(supabase, user.id);

    if (!organizationId) {
      return NextResponse.json({ ok: true, routines: [] });
    }

    const { data, error } = await supabase
      .from("routine_entries")
      .select("id, requirement_key, requirement_label, area, change_log, owner_role, next_review, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      routines: (data || []).map((item) => ({
        id: item.id,
        requirementKey: item.requirement_key,
        requirementLabel: item.requirement_label,
        area: item.area,
        changeLog: item.change_log,
        owner: item.owner_role,
        nextReview: item.next_review,
        updatedAt: item.updated_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hämta rutiner",
      },
      { status: 400 }
    );
  }
}
