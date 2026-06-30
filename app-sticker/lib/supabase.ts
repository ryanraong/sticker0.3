import { GeneratedImage, Project, ProjectPayload, Recipient } from "./types";

const bucket = "sticker-images";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function baseUrl() {
  return env("SUPABASE_URL").replace(/\/$/, "");
}

function serviceHeaders(extra?: HeadersInit) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: serviceHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export async function createProject(input: Partial<Project>) {
  const [project] = await supabaseFetch<Project[]>("/rest/v1/projects", {
    method: "POST",
    body: JSON.stringify({
      project_name: input.project_name || "Untitled sticker project",
      customer_email: input.customer_email || "hello@example.com",
      occasion: input.occasion || "",
      target_recipient_count: input.target_recipient_count || 5,
      shared_style: input.shared_style || "Cute bold vector",
      sticker_format: input.sticker_format || "Portrait sticker",
      background_preference: input.background_preference || "Transparent background",
      print_size: input.print_size || "2 inch stickers",
    }),
  });

  await supabaseFetch<Recipient[]>("/rest/v1/recipients", {
    method: "POST",
    body: JSON.stringify([
      {
        project_id: project.id,
        display_order: 1,
        name: "Maya Chen",
        description: "Short black hair, round glasses, cheerful expression, cozy cardigans.",
        personality: "Warm, organized, thoughtful, loves helping everyone feel included.",
        interests: "Coffee, plants, sci-fi books, quiet cafes, productivity notebooks.",
        style_notes: "Make her feel like a cozy cafe owner with a tiny plant accessory.",
        avoid_notes: "No text in the image.",
        status: "ready",
      },
    ]),
  });

  return project;
}

export async function getProjectByToken(token: string): Promise<ProjectPayload | null> {
  const projects = await supabaseFetch<Project[]>(`/rest/v1/projects?private_token=eq.${encodeURIComponent(token)}&select=*`);
  const project = projects[0];
  if (!project) return null;

  const recipients = await supabaseFetch<Recipient[]>(
    `/rest/v1/recipients?project_id=eq.${project.id}&select=*&order=display_order.asc,created_at.asc`,
  );
  const images = await supabaseFetch<GeneratedImage[]>(
    `/rest/v1/generated_images?project_id=eq.${project.id}&select=*&order=recipient_id.asc,version_number.desc`,
  );

  return { project, recipients, images: await withSignedUrls(images) };
}

export async function updateProject(token: string, input: Partial<Project>) {
  const [project] = await supabaseFetch<Project[]>(`/rest/v1/projects?private_token=eq.${encodeURIComponent(token)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return project;
}

export async function createRecipient(token: string, input: Partial<Recipient>) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  const [recipient] = await supabaseFetch<Recipient[]>("/rest/v1/recipients", {
    method: "POST",
    body: JSON.stringify({
      project_id: payload.project.id,
      display_order: payload.recipients.length + 1,
      name: input.name || `Recipient ${payload.recipients.length + 1}`,
      description: input.description || "",
      personality: input.personality || "",
      interests: input.interests || "",
      style_notes: input.style_notes || "",
      avoid_notes: input.avoid_notes || "",
      status: input.description ? "ready" : "incomplete",
    }),
  });
  return recipient;
}

export async function updateRecipient(token: string, recipientId: string, input: Partial<Recipient>) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  const allowed = payload.recipients.some((recipient) => recipient.id === recipientId);
  if (!allowed) throw new Error("Recipient not found");
  const status = input.name && input.description ? "ready" : input.status;
  const [recipient] = await supabaseFetch<Recipient[]>(`/rest/v1/recipients?id=eq.${recipientId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, status }),
  });
  return recipient;
}

export async function deleteRecipient(token: string, recipientId: string) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  if (!payload.recipients.some((recipient) => recipient.id === recipientId)) throw new Error("Recipient not found");
  await supabaseFetch<null>(`/rest/v1/recipients?id=eq.${recipientId}`, { method: "DELETE" });
}

export async function generateForRecipients(token: string, recipientIds?: string[]) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  const targets = payload.recipients.filter((recipient) => {
    const selected = !recipientIds || recipientIds.includes(recipient.id);
    return selected && recipient.name.trim() && recipient.description.trim();
  });

  const generated: GeneratedImage[] = [];
  for (const recipient of targets) {
    const previousVersions = payload.images.filter((image) => image.recipient_id === recipient.id);
    const version = previousVersions.length + 1;
    const prompt = buildPrompt(payload.project, recipient);
    const svg = makeMockSticker(recipient, version);
    const storagePath = `projects/${payload.project.id}/recipients/${recipient.id}/v${version}.svg`;

    await uploadSvg(storagePath, svg);
    await supabaseFetch<GeneratedImage[]>(`/rest/v1/generated_images?recipient_id=eq.${recipient.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_approved: false, status: "archived" }),
    });

    const [image] = await supabaseFetch<GeneratedImage[]>("/rest/v1/generated_images", {
      method: "POST",
      body: JSON.stringify({
        project_id: payload.project.id,
        recipient_id: recipient.id,
        storage_path: storagePath,
        prompt_used: prompt,
        version_number: version,
        status: "generated",
        is_approved: false,
      }),
    });
    await supabaseFetch<Recipient[]>(`/rest/v1/recipients?id=eq.${recipient.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "generated" }),
    });
    generated.push((await withSignedUrls([image]))[0]);
  }

  await updateProject(token, { status: "needs_review" });
  return generated;
}

export async function approveImage(token: string, imageId: string) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  const image = payload.images.find((item) => item.id === imageId);
  if (!image) throw new Error("Image not found");
  await supabaseFetch<GeneratedImage[]>(`/rest/v1/generated_images?recipient_id=eq.${image.recipient_id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_approved: false, status: "archived" }),
  });
  const [approved] = await supabaseFetch<GeneratedImage[]>(`/rest/v1/generated_images?id=eq.${imageId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_approved: true, status: "approved" }),
  });
  await supabaseFetch<Recipient[]>(`/rest/v1/recipients?id=eq.${image.recipient_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved" }),
  });
  return (await withSignedUrls([approved]))[0];
}

export async function submitProject(token: string, order: Record<string, unknown>) {
  const payload = await getProjectByToken(token);
  if (!payload) throw new Error("Project not found");
  await updateProject(token, { status: "submitted", submitted_at: new Date().toISOString() } as Partial<Project>);
  await supabaseFetch("/rest/v1/print_orders", {
    method: "POST",
    body: JSON.stringify({
      project_id: payload.project.id,
      customer_name: order.customer_name || "Customer",
      customer_email: order.customer_email || payload.project.customer_email,
      customer_phone: order.customer_phone || "",
      sticker_size: order.sticker_size || payload.project.print_size,
      quantity_per_sticker: order.quantity_per_sticker || 1,
      print_notes: order.print_notes || "",
      status: "submitted",
    }),
  });
}

export async function listAdminProjects() {
  return supabaseFetch<Project[]>("/rest/v1/projects?select=*&order=created_at.desc");
}

export async function getAdminProject(projectId: string) {
  const [project] = await supabaseFetch<Project[]>(`/rest/v1/projects?id=eq.${projectId}&select=*`);
  if (!project) return null;
  const recipients = await supabaseFetch<Recipient[]>(
    `/rest/v1/recipients?project_id=eq.${project.id}&select=*&order=display_order.asc,created_at.asc`,
  );
  const images = await supabaseFetch<GeneratedImage[]>(
    `/rest/v1/generated_images?project_id=eq.${project.id}&select=*&order=recipient_id.asc,version_number.desc`,
  );
  return { project, recipients, images: await withSignedUrls(images) };
}

async function uploadSvg(path: string, svg: string) {
  const response = await fetch(`${baseUrl()}/storage/v1/object/${bucket}/${path}`, {
    method: "PUT",
    headers: serviceHeaders({
      "Content-Type": "image/svg+xml",
      "x-upsert": "true",
    }),
    body: svg,
  });
  if (!response.ok) throw new Error(`Storage upload failed: ${await response.text()}`);
}

async function withSignedUrls(images: GeneratedImage[]) {
  return Promise.all(
    images.map(async (image) => ({
      ...image,
      signed_url: await signStoragePath(image.storage_path),
    })),
  );
}

async function signStoragePath(path: string) {
  const response = await fetch(`${baseUrl()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: serviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!response.ok) return "";
  const data = (await response.json()) as { signedURL?: string };
  return data.signedURL ? `${baseUrl()}${data.signedURL}` : "";
}

function buildPrompt(project: Project, recipient: Recipient) {
  return [
    `Create a printable sticker illustration of ${recipient.name}.`,
    `Recipient description: ${recipient.description}.`,
    `Personality: ${recipient.personality}.`,
    `Interests and hobbies: ${recipient.interests}.`,
    `Occasion: ${project.occasion || "Personalized gift"}.`,
    `Shared sticker style: ${project.shared_style}.`,
    `Sticker format: ${project.sticker_format}.`,
    `Background preference: ${project.background_preference}.`,
    `Style notes: ${recipient.style_notes || "None"}.`,
    `Avoid: ${recipient.avoid_notes || "No text unless requested"}.`,
  ].join(" ");
}

function makeMockSticker(recipient: Recipient, version: number) {
  const colors = ["#2e8874", "#4667a9", "#c94f4f", "#d39b35", "#7761b7", "#5f7d53"];
  const seed = `${recipient.id}-${version}`;
  const color = colors[Math.abs([...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % colors.length];
  const initials = recipient.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const interest = (recipient.interests || "personalized sticker").split(",")[0].trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="52" fill="#ffffff"/>
    <path d="M88 112c38-54 145-78 232-38 90 41 139 147 95 250-41 96-153 137-245 98C76 382 31 193 88 112z" fill="${color}"/>
    <circle cx="256" cy="220" r="92" fill="#fff" opacity=".96"/>
    <path d="M170 352c30-52 141-64 183 0 12 19 5 43-18 52-53 21-127 21-180 0-23-9-29-33-17-52z" fill="#fff" opacity=".96"/>
    <text x="256" y="244" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="800" fill="${color}">${escapeSvg(initials)}</text>
    <text x="256" y="456" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1f2428">${escapeSvg(interest)}</text>
  </svg>`;
}

function escapeSvg(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] || char);
}
