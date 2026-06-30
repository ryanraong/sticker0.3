import { NextResponse } from "next/server";
import { getAdminProject } from "@/lib/supabase";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { projectId } = await params;
    const project = await getAdminProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load admin project" }, { status: 500 });
  }
}

function isAdmin(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && request.headers.get("x-admin-password") === password);
}
