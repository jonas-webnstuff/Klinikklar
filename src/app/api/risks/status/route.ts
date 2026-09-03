import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  riskId: z.string().uuid(),
  status: z.enum(["open", "mitigating", "closed"]),
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

    const { data: existing, error: readError } = await supabase
      .from("risk_register_entries")
      .select("id")
      .eq("id", payload.riskId)
      .eq("organization_id", organization.organizationId)
      .maybeSingle();

    if (readError) throw readError;

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Risken hittades inte." }, { status: 404 });
    }

    const { error } = await supabase
      .from("risk_register_entries")
      .update({ status: payload.status })
      .eq("id", payload.riskId)
      .eq("organization_id", organization.organizationId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte uppdatera risk",
      },
      { status: 400 }
    );
  }
}
