import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementKey: z.string().min(1),
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
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("routine_entries")
      .delete()
      .eq("organization_id", organizationId)
      .eq("requirement_key", payload.requirementKey);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte ta bort rutin",
      },
      { status: 400 }
    );
  }
}
