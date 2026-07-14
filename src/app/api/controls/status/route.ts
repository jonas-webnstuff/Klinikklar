import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  controlId: z.string().uuid(),
  status: z.enum(["pending", "done", "overdue", "skipped"]),
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
      return NextResponse.json({ ok: false, error: "Ingen organisation hittades." }, { status: 400 });
    }

    const { data: existing, error: readError } = await supabase
      .from("control_tasks")
      .select("id")
      .eq("id", payload.controlId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (readError) throw readError;

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Kontrollpunkten hittades inte." }, { status: 404 });
    }

    const updates: { status: string; last_completed_at?: string | null } = {
      status: payload.status,
    };

    if (payload.status === "done") {
      updates.last_completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("control_tasks")
      .update(updates)
      .eq("id", payload.controlId)
      .eq("organization_id", organizationId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte uppdatera kontrollpunkt",
      },
      { status: 400 }
    );
  }
}
