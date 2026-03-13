-- Prompt versioning: per-org customizable prompt templates with version history.
-- Each (org, slug, version) is unique. org_id=NULL rows are global defaults.

create table prompt_templates (
    id uuid primary key default gen_random_uuid(),
    org_id uuid references organizations(id) on delete cascade,
    slug text not null check (slug in ('analyze', 'report', 'coach')),
    version integer not null default 1,
    body text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- Unique per (org, slug, version) for org-specific prompts
create unique index idx_prompt_templates_org_slug_version
    on prompt_templates(org_id, slug, version) where org_id is not null;

-- Unique per (slug, version) for global defaults (org_id IS NULL)
create unique index idx_prompt_templates_global_slug_version
    on prompt_templates(slug, version) where org_id is null;

-- Fast lookup by org + slug
create index idx_prompt_templates_org_slug on prompt_templates(org_id, slug);

-- RLS
alter table prompt_templates enable row level security;

create policy "read own org prompts and globals"
    on prompt_templates for select
    using (org_id is null or org_id = public.user_org_id());

create policy "managers can insert org prompts"
    on prompt_templates for insert
    with check (org_id = public.user_org_id());

-- Track which prompt version was used for each analysis
alter table analyses add column prompt_template_id uuid references prompt_templates(id) on delete set null;
