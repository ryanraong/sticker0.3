-- Sticker Studio Supabase schema
-- Run this in the Supabase SQL editor for the project.

create extension if not exists "pgcrypto";

create type project_status as enum (
  'draft',
  'ready_to_generate',
  'generating',
  'needs_review',
  'submitted',
  'printed',
  'fulfilled'
);

create type recipient_status as enum (
  'incomplete',
  'ready',
  'queued',
  'generating',
  'generated',
  'failed',
  'approved'
);

create type image_status as enum (
  'generated',
  'failed',
  'approved',
  'archived'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  private_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  project_name text not null,
  customer_email text not null,
  occasion text,
  target_recipient_count integer not null check (target_recipient_count between 5 and 200),
  shared_style text not null,
  sticker_format text not null,
  background_preference text not null,
  print_size text not null,
  status project_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  display_order integer not null default 0,
  name text not null default '',
  description text not null default '',
  personality text not null default '',
  interests text not null default '',
  style_notes text not null default '',
  avoid_notes text not null default '',
  status recipient_status not null default 'incomplete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id) on delete cascade,
  storage_path text not null,
  prompt_used text not null,
  version_number integer not null default 1,
  status image_status not null default 'generated',
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.print_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  sticker_size text not null,
  quantity_per_sticker integer not null default 1 check (quantity_per_sticker > 0),
  print_notes text not null default '',
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipients_project_id_idx on public.recipients(project_id);
create index generated_images_project_id_idx on public.generated_images(project_id);
create index generated_images_recipient_id_idx on public.generated_images(recipient_id);
create index projects_private_token_idx on public.projects(private_token);
create index projects_status_idx on public.projects(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as '
begin
  new.updated_at = now();
  return new;
end;
';

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger recipients_set_updated_at
before update on public.recipients
for each row execute function public.set_updated_at();

create trigger print_orders_set_updated_at
before update on public.print_orders
for each row execute function public.set_updated_at();

-- Storage bucket for generated sticker files.
insert into storage.buckets (id, name, public)
values ('sticker-images', 'sticker-images', false)
on conflict (id) do nothing;

-- RLS is enabled. In the production app, customer project access should go
-- through server routes that verify private_token, not direct public table access.
alter table public.projects enable row level security;
alter table public.recipients enable row level security;
alter table public.generated_images enable row level security;
alter table public.print_orders enable row level security;

-- Service role policies: backend routes and generation jobs use SUPABASE_SERVICE_ROLE_KEY.
create policy "service role can manage projects"
on public.projects for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role can manage recipients"
on public.recipients for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role can manage generated images"
on public.generated_images for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role can manage print orders"
on public.print_orders for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role can manage sticker image objects"
on storage.objects for all
using (bucket_id = 'sticker-images' and auth.role() = 'service_role')
with check (bucket_id = 'sticker-images' and auth.role() = 'service_role');
