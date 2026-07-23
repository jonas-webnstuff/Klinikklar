import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeReadinessChecklist,
  logApplicationEvent,
  resolveUserApplicationContext,
  synchronizeApplicationStatus,
  type ApplicationStatus,
} from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  status: z.enum(["draft", "in_review", "ready_to_submit", "submitted"]).optional(),
});

const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Utkast",
  in_review: "Klar för granskning",
  ready_to_submit: "Godkänd",
  submitted: "Klar att skicka",
};

function canTransition(
  current: ApplicationStatus,
  next: ApplicationStatus,
  checklist: Awaited<ReturnType<typeof computeReadinessChecklist>>
) {
  if (current === next) {
    return true;
  }

  if (next === "draft") {
    return true;
  }

  if (next === "in_review") {
    return checklist.canMoveToReady;
  }

  if (next === "ready_to_submit") {
    return checklist.canMoveToReady;
  }

  if (next === "submitted") {
    return checklist.canSubmit;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const { status } = bodySchema.parse(await request.json());
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
      return NextResponse.json({ ok: true, found: false, status: "draft" as ApplicationStatus });
    }

    const checklist = await computeReadinessChecklist(supabase, context.applicationId);

    if (!status) {
      const { data: auditRows } = await supabase
        .from("compliance_audit_events")
        .select("id, event_type, message, created_at")
        .eq("application_id", context.applicationId)
        .order("created_at", { ascending: false })
        .limit(15);

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
    }

    if (!canTransition(context.status, status, checklist)) {
      const effectiveStatus = await synchronizeApplicationStatus(supabase, {
        applicationId: context.applicationId,
        userId: user.id,
        currentStatus: context.status,
        checklist,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Status kan inte uppdateras ännu. Säkerställ att checklistan är uppfylld.",
          status: effectiveStatus,
          checklist,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", context.applicationId);

    if (updateError) throw updateError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "application_status_changed",
      message: `Status uppdaterad: ${statusLabels[context.status]} -> ${statusLabels[status]}`,
      metadata: { from: context.status, to: status },
    });

    const refreshedChecklist = await computeReadinessChecklist(supabase, context.applicationId);

    return NextResponse.json({
      ok: true,
      found: true,
      status,
      checklist: refreshedChecklist,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte uppdatera ansökningsstatus",
      },
      { status: 400 }
    );
  }
}
