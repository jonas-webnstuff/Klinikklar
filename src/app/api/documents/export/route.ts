import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";

const bodySchema = z.object({
  format: z.enum(["docx", "pdf"]),
  title: z.string().min(1),
  content: z.string().min(1),
});

type ParsedLine =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "separator" }
  | { kind: "empty" }
  | { kind: "text"; text: string };

function fileSafeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 60);
}

function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();

  if (!trimmed) {
    return { kind: "empty" };
  }

  if (trimmed === "---") {
    return { kind: "separator" };
  }

  if (trimmed.startsWith("### ")) {
    return { kind: "h3", text: trimmed.slice(4) };
  }

  if (trimmed.startsWith("## ")) {
    return { kind: "h2", text: trimmed.slice(3) };
  }

  if (trimmed.startsWith("# ")) {
    return { kind: "h1", text: trimmed.slice(2) };
  }

  return { kind: "text", text: line };
}

function wrapText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      continue;
    }
    current = next;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function generateDocxBuffer(title: string, content: string) {
  const lines = content.split("\n").map(parseLine);

  const bodyParagraphs: Paragraph[] = [];

  for (const line of lines) {
    if (line.kind === "empty") {
      bodyParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "", size: 22 })],
          spacing: { after: 100 },
        })
      );
      continue;
    }

    if (line.kind === "separator") {
      bodyParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "----------------", size: 20 })],
          spacing: { after: 140 },
        })
      );
      continue;
    }

    if (line.kind === "h1") {
      bodyParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.text, bold: true, size: 32 })],
          spacing: { before: 160, after: 180 },
        })
      );
      continue;
    }

    if (line.kind === "h2") {
      bodyParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.text, bold: true, size: 28 })],
          spacing: { before: 140, after: 160 },
        })
      );
      continue;
    }

    if (line.kind === "h3") {
      bodyParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.text, bold: true, size: 24 })],
          spacing: { before: 120, after: 130 },
        })
      );
      continue;
    }

    bodyParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line.text, size: 22 })],
        spacing: { after: 130 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 38 })],
            spacing: { after: 280 },
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

async function generatePdfBuffer(title: string, content: string) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(title, {
    x: 50,
    y: 790,
    size: 21,
    font: boldFont,
  });

  const lines = content.split("\n").map(parseLine);
  let y = 760;

  const ensureSpace = (requiredSpace: number) => {
    if (y >= requiredSpace) {
      return;
    }

    y = 760;
    page = pdfDoc.addPage([595, 842]);
  };

  for (const line of lines) {
    if (line.kind === "empty") {
      y -= 10;
      continue;
    }

    if (line.kind === "separator") {
      ensureSpace(70);
      page.drawLine({
        start: { x: 50, y },
        end: { x: 545, y },
        thickness: 0.8,
      });
      y -= 14;
      continue;
    }

    let text = "";
    let fontSize = 11;
    let font = regularFont;
    let step = 16;
    let maxChars = 95;

    if (line.kind === "h1") {
      text = line.text;
      fontSize = 16;
      font = boldFont;
      step = 22;
      maxChars = 72;
    } else if (line.kind === "h2") {
      text = line.text;
      fontSize = 14;
      font = boldFont;
      step = 20;
      maxChars = 80;
    } else if (line.kind === "h3") {
      text = line.text;
      fontSize = 12.5;
      font = boldFont;
      step = 18;
      maxChars = 88;
    } else {
      text = line.text;
    }

    const wrappedLines = wrapText(text, maxChars);

    for (const wrappedLine of wrappedLines) {
      ensureSpace(70);
      page.drawText(wrappedLine, {
        x: 50,
        y,
        size: fontSize,
        font,
        maxWidth: 495,
      });
      y -= step;
    }

    y -= 4;
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
