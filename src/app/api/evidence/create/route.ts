import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementId: z.string().uuid(),
  title: z.string().min(3),
  note: z.string().optional().default(""),
  filePath: z.string().optional().default(""),
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
    const context = await resolveUserApplicationContext(supabase, user.id);

    if (!context) {
      return NextResponse.json(
        { ok: false, error: "Ingen aktiv ansökan hittades. Spara ansökningsuppgifterna först." },
        { status: 400 }
      );
    }

    const { data: requirement, error: requirementError } = await supabase
      .from("requirements")
      .select("id, code")
      .eq("id", payload.requirementId)
      .eq("application_id", context.applicationId)
      .maybeSingle();

    if (requirementError) throw requirementError;

    if (!requirement?.id) {
      return NextResponse.json({ ok: false, error: "Ogiltigt krav för aktiv ansökan." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("evidence")
      .insert({
        requirement_id: payload.requirementId,
        title: payload.title,
        note: payload.note || null,
        file_path: payload.filePath || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "evidence_added",
      message: `Evidens tillagd för ${requirement.code}: ${payload.title}`,
      metadata: {
        requirementId: payload.requirementId,
        evidenceId: data.id,
      },
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa evidens",
      },
      { status: 400 }
    );
  }
}
