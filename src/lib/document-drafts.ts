import type { DocumentKind } from "@/types/domain";

export function documentKindFromRequirementCode(code: string): DocumentKind {
  switch (code) {
    case "R-01":
      return "verksamhetsbeskrivning";
    case "R-02":
      return "ledningssystem";
    case "R-03":
      return "riskanalys";
    case "R-04":
      return "avvikelsehantering";
    case "R-05":
    default:
      return "egenkontroll";
  }
}

export function documentKindLabel(kind: DocumentKind) {
  switch (kind) {
    case "verksamhetsbeskrivning":
      return "Verksamhetsbeskrivning";
    case "ledningssystem":
      return "Ledningssystem";
    case "riskanalys":
      return "Riskanalys";
    case "avvikelsehantering":
      return "Avvikelsehantering";
    case "egenkontroll":
      return "Egenkontroll";
  }
}

export const FALLBACK_DOCUMENT_DRAFT_BODY_MARKER =
  "1. Syfte\nDokumentet beskriver hur verksamheten uppfyller kravet och hur ansvaret är organiserat.";

export function isPlaceholderDocumentDraftBody(body: string | null | undefined): boolean {
  const trimmed = body?.trim() || "";
  return trimmed.length < 40 || trimmed.includes(FALLBACK_DOCUMENT_DRAFT_BODY_MARKER);
}