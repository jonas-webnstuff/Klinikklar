import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  subject: z.string().min(3),
  area: z.enum(["regelbevakning", "revision", "internkontroll", "risk", "avvikelser", "other"]),
  priority: z.enum(["normal", "high", "urgent"]),
  message: z.string().min(10),
});

async function resolveUserOrganization(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  if (!membership?.organization_id) {
    return null;
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, plan")
    .eq("id", membership.organization_id)
    .limit(1)
    .maybeSingle();

  if (orgError) throw orgError;

  return organization;
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
    const organization = await resolveUserOrganization(supabase, user.id);

    if (!organization) {
      return NextResponse.json(
        { ok: false, error: "Ingen organisation hittades. Spara workspace först." },
        { status: 400 }
      );
    }

    if (organization.plan !== "step3") {
      return NextResponse.json(
        { ok: false, error: "Prioriterad support ingår endast i Klinikklar Premium." },
        { status: 403 }
      );
    }

    const ticketId = `SUP-${Date.now()}`;

    return NextResponse.json({
      ok: true,
      ticketId,
      submittedAt: new Date().toISOString(),
      responseTarget: payload.priority === "urgent" ? "inom 2 arbetstimmar" : "inom 4 arbetstimmar",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa supportärende.",
      },
      { status: 400 }
    );
  }
}
