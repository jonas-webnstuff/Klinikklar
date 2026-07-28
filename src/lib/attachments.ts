export const ATTACHMENTS_BUCKET = "requirement-attachments";
export const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024;
export const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60;

type DetectedAttachmentType = {
  extension: "pdf" | "jpg" | "png";
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
};

/**
 * Sniffs the file's actual magic bytes instead of trusting the client-supplied
 * extension or content-type header, so a renamed executable can't pass itself
 * off as a PDF/JPG/PNG.
 */
export function detectAttachmentFileType(bytes: Uint8Array): DetectedAttachmentType | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { extension: "pdf", mimeType: "application/pdf" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  return null;
}

function sanitizeFileNameStem(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[a-zA-Z0-9]+$/, "");
  const stem = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return stem.slice(0, 60) || "fil";
}

/**
 * {organization_id}/{application_id}/{requirement_code}/{item_id}/{version}-{name}.{ext}
 * so the org id is always the first path segment for the storage RLS policy
 * (storage.foldername(name)[1]). The extension always matches the detected file
 * type, never the client-supplied original extension.
 */
export function buildAttachmentStoragePath(input: {
  organizationId: string;
  applicationId: string;
  requirementCode: string;
  itemId: string;
  originalFileName: string;
  extension: DetectedAttachmentType["extension"];
}): string {
  const stem = sanitizeFileNameStem(input.originalFileName);
  const version = Date.now();

  return `${input.organizationId}/${input.applicationId}/${input.requirementCode}/${input.itemId}/${version}-${stem}.${input.extension}`;
}
