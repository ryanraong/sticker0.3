import { NextResponse } from "next/server";
import { getProjectByToken, updateProject } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const project = await getProjectByToken(token);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const project = await updateProject(token, await request.json());
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update project" }, { status: 500 });
  }
}
