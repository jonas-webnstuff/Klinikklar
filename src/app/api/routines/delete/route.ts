import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  requirementKey: z.string().min(1),
});

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
    // See routines/save/route.ts — matches the workspace UI's real Rutiner page gate (step1).
    const organization = await requireOrganizationWithPlan(supabase, user.id, "step1");

    if (!organization) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("routine_entries")
      .delete()
      .eq("organization_id", organization.organizationId)
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
