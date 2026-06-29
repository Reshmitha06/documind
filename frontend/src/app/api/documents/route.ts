import { NextRequest, NextResponse } from "next/server";
import { ingestDocument, listDocs } from "@/lib/rag";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "txt", "md"].includes(ext)) {
      return NextResponse.json(
        { detail: "Only PDF, TXT, and MD files are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      text = buffer.toString("utf-8");
    }

    const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const chunkCount = await ingestDocument(docId, file.name, text);

    return NextResponse.json({
      id: docId,
      filename: file.name,
      chunks: chunkCount,
      uploaded_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(listDocs());
}
