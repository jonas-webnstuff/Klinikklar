import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementKey: z.string().min(1),
  requirementLabel: z.string().min(1),
  area: z.string().min(1),
  changeLog: z.string().min(1),
  owner: z.string().min(1),
  nextReview: z.string().min(1),
});

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

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
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
      return NextResponse.json(
        { ok: false, error: "Ingen organisation hittades. Spara workspace först." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("routine_entries")
      .upsert(
        {
          organization_id: organizationId,
          requirement_key: payload.requirementKey,
          requirement_label: payload.requirementLabel,
          area: payload.area,
          change_log: payload.changeLog,
          owner_role: payload.owner,
          next_review: payload.nextReview,
        },
        { onConflict: "organization_id,requirement_key" }
      )
      .select("id, requirement_key, requirement_label, area, change_log, owner_role, next_review, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      routine: {
        id: data.id,
        requirementKey: data.requirement_key,
        requirementLabel: data.requirement_label,
        area: data.area,
        changeLog: data.change_log,
        owner: data.owner_role,
        nextReview: data.next_review,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte spara rutin",
      },
      { status: 400 }
    );
  }
}
