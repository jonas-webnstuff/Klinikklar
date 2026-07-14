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
      return NextResponse.json({ ok: true, controls: [] });
    }

    const { data, error } = await supabase
      .from("control_tasks")
      .select("id, title, description, frequency, owner_role, next_due_date, status, last_completed_at, created_at")
      .eq("organization_id", organizationId)
      .order("next_due_date", { ascending: true })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      controls: (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        frequency: item.frequency,
        ownerRole: item.owner_role,
        nextDueDate: item.next_due_date,
        status: item.status,
        lastCompletedAt: item.last_completed_at,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hamta kontroller",
      },
      { status: 400 }
    );
  }
}
