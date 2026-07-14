import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  probability: z.number().int().min(1).max(5),
  consequence: z.number().int().min(1).max(5),
  ownerRole: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
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
      return NextResponse.json({ ok: false, error: "Du maste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const organizationId = await resolveUserOrganizationId(supabase, user.id);

    if (!organizationId) {
      return NextResponse.json(
        { ok: false, error: "Ingen organisation hittades. Spara workspace forst." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("risk_register_entries")
      .insert({
        organization_id: organizationId,
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
