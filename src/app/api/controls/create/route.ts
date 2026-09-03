import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationWithPlan } from "@/lib/server/organization-access";

const bodySchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(""),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "ad_hoc"]),
  ownerRole: z.string().optional().default(""),
  nextDueDate: z.string().optional().default(""),
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
        { ok: false, error: "Årshjul och kontroller ingår inte i din nuvarande plan." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("control_tasks")
      .insert({
        organization_id: organization.organizationId,
        title: payload.title,
        description: payload.description || null,
        frequency: payload.frequency,
        owner_role: payload.ownerRole || null,
        next_due_date: payload.nextDueDate || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa kontrollpunkt",
      },
      { status: 400 }
    );
  }
}
