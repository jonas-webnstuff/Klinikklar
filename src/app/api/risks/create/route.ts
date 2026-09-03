import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  probability: z.number().int().min(1).max(5),
  consequence: z.number().int().min(1).max(5),
  ownerRole: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
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
    const organization = await requireOrganizationWithPlan(supabase, user.id, "step1");

    if (!organization) {
      return NextResponse.json(
        { ok: false, error: "Riskanalyser ingår inte i din nuvarande plan." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("risk_register_entries")
      .insert({
        organization_id: organization.organizationId,
        title: payload.title,
        description: payload.description,
        probability: payload.probability,
        consequence: payload.consequence,
        owner_role: payload.ownerRole || null,
        due_date: payload.dueDate || null,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa risk",
      },
      { status: 400 }
    );
  }
}
