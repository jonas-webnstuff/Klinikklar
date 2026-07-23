import { NextResponse } from "next/server";
import {
  computeReadinessChecklist,
  resolveUserApplicationContext,
  synchronizeApplicationStatus,
} from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const context = await resolveUserApplicationContext(supabase, user.id);

    if (!context) {
      return NextResponse.json({ ok: true, found: false });
    }

    const checklist = await computeReadinessChecklist(supabase, context.applicationId);
    const { data: auditRows, error: auditError } = await supabase
      .from("compliance_audit_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", context.applicationId)
      .order("created_at", { ascending: false })
      .limit(15);

    if (auditError) throw auditError;

    const effectiveStatus = await synchronizeApplicationStatus(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      currentStatus: context.status,
      checklist,
    });

    return NextResponse.json({
      ok: true,
      found: true,
      status: effectiveStatus,
      checklist,
      audit: auditRows || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hämta readiness",
      },
      { status: 400 }
    );
  }
}
