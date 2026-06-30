export type ProjectStatus = "draft" | "ready_to_generate" | "generating" | "needs_review" | "submitted" | "printed" | "fulfilled";
export type RecipientStatus = "incomplete" | "ready" | "queued" | "generating" | "generated" | "failed" | "approved";

export type Project = {
  id: string;
  private_token: string;
  project_name: string;
  customer_email: string;
  occasion: string | null;
  target_recipient_count: number;
  shared_style: string;
  sticker_format: string;
  background_preference: string;
  print_size: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type Recipient = {
  id: string;
  project_id: string;
  display_order: number;
  name: string;
  description: string;
  personality: string;
  interests: string;
  style_notes: string;
  avoid_notes: string;
  status: RecipientStatus;
  created_at: string;
  updated_at: string;
};

export type GeneratedImage = {
  id: string;
  project_id: string;
  recipient_id: string;
  storage_path: string;
  prompt_used: string;
  version_number: number;
  status: "generated" | "failed" | "approved" | "archived";
  is_approved: boolean;
  created_at: string;
  signed_url?: string;
};

export type ProjectPayload = {
  project: Project;
  recipients: Recipient[];
  images: GeneratedImage[];
};
