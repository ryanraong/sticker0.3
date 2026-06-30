import { NextResponse } from "next/server";
import { submitProject } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    await submitProject(token, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit project" }, { status: 500 });
  }
}
