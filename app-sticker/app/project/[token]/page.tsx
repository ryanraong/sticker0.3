import ProjectClient from "@/app/components/ProjectClient";
import { getProjectByToken } from "@/lib/supabase";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function ProjectPage({ params }: Props) {
  const { token } = await params;
  const payload = await getProjectByToken(token);
  if (!payload) notFound();
  return <ProjectClient initialPayload={payload} token={token} />;
}
