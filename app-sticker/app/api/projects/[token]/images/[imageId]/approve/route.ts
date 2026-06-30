import { NextResponse } from "next/server";
import { approveImage } from "@/lib/supabase";

type Params = { params: Promise<{ token: string; imageId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { token, imageId } = await params;
    const image = await approveImage(token, imageId);
    return NextResponse.json(image);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to approve image" }, { status: 500 });
  }
}
