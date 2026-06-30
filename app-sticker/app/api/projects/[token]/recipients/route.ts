import { NextResponse } from "next/server";
import { createRecipient } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const recipient = await createRecipient(token, await request.json());
    return NextResponse.json(recipient);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create recipient" }, { status: 500 });
  }
}
