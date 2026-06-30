import { NextResponse } from "next/server";
import { deleteRecipient, updateRecipient } from "@/lib/supabase";

type Params = { params: Promise<{ token: string; recipientId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { token, recipientId } = await params;
    const recipient = await updateRecipient(token, recipientId, await request.json());
    return NextResponse.json(recipient);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update recipient" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { token, recipientId } = await params;
    await deleteRecipient(token, recipientId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete recipient" }, { status: 500 });
  }
}
