import { NextResponse } from "next/server";
import { createProject } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = await createProject(body);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create project" }, { status: 500 });
  }
}
