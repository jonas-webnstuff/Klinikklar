import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAssistance } from "@/lib/ai/generate-assistance";
import { documentKindFromRequirementCode } from "@/lib/document-drafts";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementId: z.string().uuid(),
  title: z.string().optional().default(""),
  body: z.string().optional().default(""),
  note: z.string().optional().default(""),
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

    const { data: document, error: documentError } = await supabase
      .from("generated_documents")
      .insert({
        application_id: context.applicationId,
        kind,
        title: assistance.title,
        body: assistance.body,
        is_approved: false,
      })
      .select("id, kind, title, body, is_approved, created_at")
      .single();

    if (documentError) throw documentError;

    const { error: versionError } = await supabase.from("document_versions").insert({
      generated_document_id: document.id,
      version: 1,
      body: assistance.body,
    });

    if (versionError) throw versionError;

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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte skapa dokumentutkast",
      },
      { status: 400 }
    );
  }
}