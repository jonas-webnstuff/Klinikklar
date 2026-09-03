import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  requirementKey: z.string().min(1),
  requirementLabel: z.string().min(1),
  area: z.string().min(1),
  changeLog: z.string().min(1),
  owner: z.string().min(1),
  nextReview: z.string().min(1),
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
    // Matches the workspace UI's actual Rutiner page gate (step1), not the "step2" tag on
    // this module in ledningssystemModules — that list disagrees with the real page lock and
    // hasn't been reconciled; the page itself is the enforced boundary today.
    const organization = await requireOrganizationWithPlan(supabase, user.id, "step1");

    if (!organization) {
      return NextResponse.json(
        { ok: false, error: "Rutiner ingår inte i din nuvarande plan." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("routine_entries")
      .upsert(
        {
          organization_id: organization.organizationId,
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
