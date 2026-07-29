import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_SIZE_BYTES,
  buildRequirementSupportingDocumentStoragePath,
  detectAttachmentFileType,
} from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const formFieldsSchema = z.object({
  requirementCode: z.string().min(1),
});

/**
 * Uploads a single document shared across an entire requirement (e.g. R-08's
 * aktiebok/registreringsbevis) — not tied to any one structured_requirement_items row.
 * See requirement_supporting_documents in schema.sql for why this is a separate table
 * from structured_requirement_item_attachments (R-09's per-row uploads).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const { requirementCode } = formFieldsSchema.parse({
      requirementCode: formData.get("requirementCode"),
    });
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Ingen fil bifogad." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: "Filen är tom." }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Filen är för stor. Max ${Math.floor(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))} MB.` },
        { status: 400 }
      );
    }

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

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = detectAttachmentFileType(bytes);

    if (!detectedType) {
      return NextResponse.json(
        { ok: false, error: "Filtypen stöds inte. Tillåtna format: PDF, JPG, PNG." },
        { status: 400 }
      );
    }

    const storagePath = buildRequirementSupportingDocumentStoragePath({
      organizationId: context.organizationId,
      applicationId: context.applicationId,
      requirementCode,
      originalFileName: file.name,
      extension: detectedType.extension,
    });

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, bytes, { contentType: detectedType.mimeType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: updatedDocument, error: rpcError } = await supabase
      .rpc("replace_requirement_supporting_document", {
        p_application_id: context.applicationId,
        p_requirement_code: requirementCode,
        p_file_path: storagePath,
        p_file_name: file.name,
        p_file_size: file.size,
        p_file_mime_type: detectedType.mimeType,
        p_uploaded_by: user.id,
      })
      .select("requirement_code, file_path, file_name, file_size, uploaded_at")
      .single();

    if (rpcError) throw rpcError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "requirement_supporting_document_uploaded",
      message: `Delad handling uppladdad för ${requirementCode}: ${file.name}`,
      metadata: { requirementCode, filePath: storagePath },
    });

    return NextResponse.json({
      ok: true,
      document: {
        requirementCode: updatedDocument.requirement_code,
        filePath: updatedDocument.file_path,
        fileName: updatedDocument.file_name,
        fileSize: updatedDocument.file_size,
        uploadedAt: updatedDocument.uploaded_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte ladda upp filen" },
      { status: 400 }
    );
  }
}
