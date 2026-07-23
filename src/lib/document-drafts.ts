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