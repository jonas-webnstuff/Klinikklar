import { NextResponse } from "next/server";
import { z } from "zod";
import { AiAssistanceError, generateAssistance } from "@/lib/ai/generate-assistance";
import { documentKindFromRequirementCode } from "@/lib/document-drafts";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementId: z.string().uuid(),
  title: z.string().optional().default(""),
  body: z.string().optional().default(""),
  note: z.string().optional().default(""),
  mode: z.enum(["ai", "manual"]).default("ai"),
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

    const [{ data: organization }, { data: clinic }, { data: requirement }] = await Promise.all([
      supabase.from("organizations").select("plan, name").eq("id", context.organizationId).maybeSingle(),
      supabase.from("clinics").select("name, municipality").eq("id", context.clinicId).maybeSingle(),
      supabase
        .from("requirements")
        .select("id, code, title")
        .eq("id", payload.requirementId)
        .eq("application_id", context.applicationId)
        .maybeSingle(),
    ]);

    if (!requirement?.id) {
      return NextResponse.json({ ok: false, error: "Ogiltigt krav för aktiv ansökan." }, { status: 400 });
    }

    const kind = documentKindFromRequirementCode(requirement.code);

    const assistance = await generateAssistance({
      plan: (organization?.plan as "ansokan" | "step1" | "step2" | "step3") || "ansokan",
      feature: "document_draft",
      mode: payload.mode,
      clinicName: clinic?.name || organization?.name || "",
      municipality: clinic?.municipality || "",
      currentDocumentDraft: {
        kind,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        title: payload.title,
        body: payload.body,
        note: payload.note,
      },
    });

    if (assistance.feature !== "document_draft") {
      return NextResponse.json({ ok: false, error: "Kunde inte skapa dokumentutkast." }, { status: 400 });
    }

    const draftBody =
      payload.mode === "manual"
        ? `OBS: Manuellt startdokument – skriv klart och komplettera innan granskning.\n\n${assistance.body}`
        : assistance.body;

    const { data: document, error: documentError } = await supabase
      .rpc("create_document_draft_version", {
        p_application_id: context.applicationId,
        p_kind: kind,
        p_title: assistance.title,
        p_body: draftBody,
        p_source: payload.mode,
      })
      .select("id, kind, title, body, is_approved, is_current, source, created_at")
      .single();

    if (documentError) throw documentError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "document_draft_created",
      message: `Dokumentutkast skapad för ${requirement.code}: ${assistance.title}`,
      metadata: {
        requirementId: requirement.id,
        generatedDocumentId: document.id,
        kind,
      },
    });

    return NextResponse.json({ ok: true, document });
  } catch (error) {
    const reason = error instanceof AiAssistanceError ? error.reason : undefined;
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa dokumentutkast",
        reason,
      },
      { status: 400 }
    );
  }
}