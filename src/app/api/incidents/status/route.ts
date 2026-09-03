import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(["new", "investigating", "closed"]),
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
        { ok: false, error: "Avvikelsehantering ingår inte i din nuvarande plan." },
        { status: 403 }
      );
    }

    const { data: existing, error: readError } = await supabase
      .from("incident_reports")
      .select("id")
      .eq("id", payload.incidentId)
      .eq("organization_id", organization.organizationId)
      .maybeSingle();

    if (readError) throw readError;

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Avvikelsen hittades inte." }, { status: 404 });
    }

    const { error } = await supabase
      .from("incident_reports")
      .update({ status: payload.status })
      .eq("id", payload.incidentId)
      .eq("organization_id", organization.organizationId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte uppdatera avvikelse",
      },
      { status: 400 }
    );
  }
}
