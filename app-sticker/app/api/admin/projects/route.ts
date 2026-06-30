import { NextResponse } from "next/server";
import { listAdminProjects } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const projects = await listAdminProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load admin projects" }, { status: 500 });
  }
}

function isAdmin(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && request.headers.get("x-admin-password") === password);
}
