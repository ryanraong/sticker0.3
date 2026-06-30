import { NextResponse } from "next/server";
import { generateForRecipients } from "@/lib/supabase";

type Params = { params: Promise<{ token: string; recipientId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { token, recipientId } = await params;
    const images = await generateForRecipients(token, [recipientId]);
    return NextResponse.json({ image: images[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to regenerate image" }, { status: 500 });
  }
}
