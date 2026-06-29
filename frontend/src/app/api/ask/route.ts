import { NextRequest, NextResponse } from "next/server";
import { queryDocument, getDoc } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { doc_id, question } = await req.json();

    if (!doc_id || !question?.trim()) {
      return NextResponse.json(
        { detail: "doc_id and question are required" },
        { status: 400 }
      );
    }

    if (!getDoc(doc_id)) {
      return NextResponse.json(
        { detail: "Document not found" },
        { status: 404 }
      );
    }

    const answer = await queryDocument(doc_id, question);
    return NextResponse.json({ answer, doc_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Query failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
