import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";

const bodySchema = z.object({
  format: z.enum(["docx", "pdf"]),
  title: z.string().min(1),
  content: z.string().min(1),
});

function fileSafeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 60);
}

async function generateDocxBuffer(title: string, content: string) {
  const lines = content.split("\n").filter(Boolean);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            spacing: { after: 300 },
          }),
          ...lines.map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 160 },
              })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

async function generatePdfBuffer(title: string, content: string) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(title, {
    x: 50,
    y: 790,
    size: 18,
    font,
  });

  const lines = content.split("\n").filter(Boolean);
  let y = 760;

  for (const line of lines) {
    if (y < 60) {
      y = 760;
      page = pdfDoc.addPage([595, 842]);
    }

    page.drawText(line.slice(0, 110), {
      x: 50,
      y,
      size: 11,
      font,
      maxWidth: 495,
    });

    y -= 18;
  }

  return Buffer.from(await pdfDoc.save());
}

export async function POST(request: Request) {
  try {
    const { format, title, content } = bodySchema.parse(await request.json());

    const buffer =
      format === "docx"
        ? await generateDocxBuffer(title, content)
        : await generatePdfBuffer(title, content);

    const extension = format === "docx" ? "docx" : "pdf";
    const contentType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileSafeTitle(title)}.${extension}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Kunde inte exportera dokument" }, { status: 400 });
  }
}
