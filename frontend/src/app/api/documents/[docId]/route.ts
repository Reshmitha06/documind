import { NextRequest, NextResponse } from "next/server";
import { deleteDoc, getDoc } from "@/lib/rag";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;

  if (!getDoc(docId)) {
    return NextResponse.json({ detail: "Document not found" }, { status: 404 });
  }

  deleteDoc(docId);
  return NextResponse.json({ status: "deleted" });
}
