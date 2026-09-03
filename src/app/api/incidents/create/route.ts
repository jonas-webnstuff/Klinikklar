import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  title: z.string().min(3),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(5),
  immediateAction: z.string().optional().default(""),
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

    const { data, error } = await supabase
      .from("incident_reports")
      .insert({
        organization_id: organization.organizationId,
        title: payload.title,
        event_date: payload.eventDate,
        severity: payload.severity,
        description: payload.description,
        immediate_action: payload.immediateAction || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa avvikelse",
      },
      { status: 400 }
    );
  }
}
