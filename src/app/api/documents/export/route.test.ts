import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { POST } from "@/app/api/documents/export/route";

/**
 * Regression guard for a specific failure mode: a warning line built in
 * ansokan/page.tsx's export-content assembly (structuredSection/attachmentsSection)
 * could easily render correctly in the web UI while silently getting dropped when
 * serialized into the actual downloaded PDF/DOCX — the two are separate code paths
 * (React JSX vs. this route's line-based PDF/DOCX renderer) and nothing guarantees
 * they stay in sync. These tests exercise the real route handler end-to-end and
 * decode the real output bytes, rather than asserting on the content string alone.
 */
describe("documents/export route: stale-attachment-link warnings survive real serialization", () => {
  const WARNING_TEXT =
    "Källuppgiften har ändrats sedan kopplingen gjordes.";

  function buildRequest(format: "pdf" | "docx", content: string) {
    return new Request("http://localhost/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, title: "Test", content }),
    });
  }

  it("appears in the actual exported DOCX bytes, not just the content string", async () => {
    const content = [
      "## Bilagechecklista (R-09)",
      `- Maria Oskarsson — R-08 — Finns [VARNING: ${WARNING_TEXT}]`,
    ].join("\n");

    const response = await POST(buildRequest("docx", content));
    expect(response.status).toBe(200);

    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toBeTruthy();
    expect(documentXml).toContain(WARNING_TEXT);
  });

  it("appears in the actual exported PDF bytes, not just the content string", async () => {
    const content = [
      "## Bilagechecklista (R-09)",
      `- Maria Oskarsson — R-08 — Finns [VARNING: ${WARNING_TEXT}]`,
    ].join("\n");

    const response = await POST(buildRequest("pdf", content));
    expect(response.status).toBe(200);

    const buffer = Buffer.from(await response.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();

    expect(parsed.text).toContain(WARNING_TEXT);
  });
});
