import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  controlId: z.string().uuid(),
  status: z.enum(["pending", "done", "skipped"]),
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

// Advances a recurring control to its next occurrence. control_tasks rows never regenerated
// themselves before this — marking something "done" just stamped last_completed_at and left the
// row stuck in "done" forever, so a yearly/monthly/etc. checkpoint had to be manually recreated
// every cycle. This keeps the row itself as the single, ongoing recurring instance.
function advanceDueDate(dueDateIso: string, frequency: string): string {
  const date = new Date(`${dueDateIso}T00:00:00Z`);

  if (frequency === "weekly") {
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
  }

  const monthsToAdd =
    frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 0;

  if (monthsToAdd === 0) {
    return dueDateIso;
  }

  // Adding months naively (setUTCMonth on a day-31 date) overflows into the wrong month for
  // shorter months (e.g. Jan 31 + 1 month becomes Mar 3, not Feb 28) — clamp to the target
  // month's actual last day instead.
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, daysInTargetMonth));

  return date.toISOString().slice(0, 10);
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
      .select("id, frequency, next_due_date")
      .eq("id", payload.controlId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (readError) throw readError;

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Kontrollpunkten hittades inte." }, { status: 404 });
    }

    const updates: { status: string; last_completed_at?: string | null; next_due_date?: string } = {
      status: payload.status,
    };

    if (payload.status === "done") {
      updates.last_completed_at = new Date().toISOString();

      if (existing.frequency !== "ad_hoc" && existing.next_due_date) {
        updates.next_due_date = advanceDueDate(existing.next_due_date, existing.frequency);
        updates.status = "pending";
      }
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
