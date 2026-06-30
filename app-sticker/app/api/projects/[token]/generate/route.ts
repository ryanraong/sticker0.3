import { NextResponse } from "next/server";
import { generateForRecipients } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const images = await generateForRecipients(token, body.recipientIds);
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate images" }, { status: 500 });
  }
}
