import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ status: "ok", api_key_configured: hasKey });
}
