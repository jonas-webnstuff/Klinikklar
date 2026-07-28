import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_SIZE_BYTES,
  buildAttachmentStoragePath,
  detectAttachmentFileType,
} from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const formFieldsSchema = z.object({
  itemId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const { itemId } = formFieldsSchema.parse({ itemId: formData.get("itemId") });
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

    const { data: item, error: itemError } = await supabase
      .from("structured_requirement_items")
      .select("id, requirement_code")
      .eq("id", itemId)
      .eq("application_id", context.applicationId)
      .maybeSingle();

    if (itemError) throw itemError;

    if (!item) {
      return NextResponse.json({ ok: false, error: "Raden hittades inte." }, { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = detectAttachmentFileType(bytes);

    if (!detectedType) {
      return NextResponse.json(
        { ok: false, error: "Filtypen stöds inte. Tillåtna format: PDF, JPG, PNG." },
        { status: 400 }
      );
    }

    const storagePath = buildAttachmentStoragePath({
      organizationId: context.organizationId,
      applicationId: context.applicationId,
      requirementCode: item.requirement_code,
      itemId: item.id,
      originalFileName: file.name,
      extension: detectedType.extension,
    });

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, bytes, { contentType: detectedType.mimeType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: updatedItem, error: rpcError } = await supabase
      .rpc("replace_structured_requirement_attachment", {
        p_item_id: item.id,
        p_application_id: context.applicationId,
        p_file_path: storagePath,
        p_file_name: file.name,
        p_file_size: file.size,
        p_file_mime_type: detectedType.mimeType,
        p_uploaded_by: user.id,
      })
      .select("id, requirement_code, fields, file_path, file_name, file_size, uploaded_at")
      .single();

    if (rpcError) throw rpcError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "structured_requirement_attachment_uploaded",
      message: `Fil uppladdad för ${item.requirement_code}: ${file.name}`,
      metadata: { itemId: item.id, requirementCode: item.requirement_code, filePath: storagePath },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: updatedItem.id,
        requirementCode: updatedItem.requirement_code,
        fields: updatedItem.fields || {},
        filePath: updatedItem.file_path,
        fileName: updatedItem.file_name,
        fileSize: updatedItem.file_size,
        uploadedAt: updatedItem.uploaded_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte ladda upp filen" },
      { status: 400 }
    );
  }
}
