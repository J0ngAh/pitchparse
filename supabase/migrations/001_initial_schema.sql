-- Pitch|Parse Phase 1: Initial Schema
-- Multi-tenant sales call QA system with RLS

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    config jsonb not null default '{}'::jsonb,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text not null default 'starter' check (plan in ('starter', 'team', 'enterprise')),
    analysis_quota integer not null default 50,
    analysis_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table users (
    id uuid primary key references auth.users(id) on delete cascade,
    org_id uuid not null references organizations(id) on delete cascade,
    email text not null,
    name text not null default '',
    created_at timestamptz not null default now()
);

create table consultants (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references organizations(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now(),
    unique (org_id, name)
);

create table transcripts (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references organizations(id) on delete cascade,
    consultant_id uuid references consultants(id) on delete set null,
    filename text not null,
    source text not null default 'upload' check (source in ('upload', 'recording', 'synthetic')),
    metadata jsonb not null default '{}'::jsonb,
    body text not null default '',
    audio_url text,
    created_at timestamptz not null default now()
);

create table analyses (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references organizations(id) on delete cascade,
    transcript_id uuid not null references transcripts(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
    overall_score integer,
    rating text,
    consultant_name text,
    prospect_name text,
    scorecard jsonb,
    phases jsonb,
    coaching jsonb,
    sentiment jsonb,
    body text,
    model_used text,
    error_message text,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

create table reports (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references organizations(id) on delete cascade,
    analysis_id uuid not null references analyses(id) on delete cascade,
    body text not null default '',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_users_org_id on users(org_id);
create index idx_consultants_org_id on consultants(org_id);
create index idx_transcripts_org_id on transcripts(org_id);
create index idx_transcripts_consultant_id on transcripts(consultant_id);
create index idx_analyses_org_id on analyses(org_id);
create index idx_analyses_transcript_id on analyses(transcript_id);
create index idx_analyses_status on analyses(status);
create index idx_reports_org_id on reports(org_id);
create index idx_reports_analysis_id on reports(analysis_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql set search_path = '';

create trigger set_updated_at
    before update on organizations
    for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations enable row level security;
alter table users enable row level security;
alter table consultants enable row level security;
alter table transcripts enable row level security;
alter table analyses enable row level security;
alter table reports enable row level security;

-- Helper: get the org_id for the current authenticated user
create or replace function public.user_org_id()
returns uuid as $$
    select org_id from public.users where id = auth.uid();
$$ language sql security definer stable set search_path = '';

-- Organizations: users can only see their own org
create policy "Users can view own org"
    on organizations for select
    using (id = public.user_org_id());

create policy "Users can update own org"
    on organizations for update
    using (id = public.user_org_id());

-- Users: can see other users in same org
create policy "Users can view org members"
    on users for select
    using (org_id = public.user_org_id());

create policy "Users can insert self"
    on users for insert
    with check (id = (select auth.uid()));

-- Consultants: org-scoped
create policy "Org members can view consultants"
    on consultants for select
    using (org_id = public.user_org_id());

create policy "Org members can insert consultants"
    on consultants for insert
    with check (org_id = public.user_org_id());

create policy "Org members can update consultants"
    on consultants for update
    using (org_id = public.user_org_id());

create policy "Org members can delete consultants"
    on consultants for delete
    using (org_id = public.user_org_id());

-- Transcripts: org-scoped
create policy "Org members can view transcripts"
    on transcripts for select
    using (org_id = public.user_org_id());

create policy "Org members can insert transcripts"
    on transcripts for insert
    with check (org_id = public.user_org_id());

create policy "Org members can update transcripts"
    on transcripts for update
    using (org_id = public.user_org_id());

create policy "Org members can delete transcripts"
    on transcripts for delete
    using (org_id = public.user_org_id());

-- Analyses: org-scoped
create policy "Org members can view analyses"
    on analyses for select
    using (org_id = public.user_org_id());

create policy "Org members can insert analyses"
    on analyses for insert
    with check (org_id = public.user_org_id());

create policy "Org members can update analyses"
    on analyses for update
    using (org_id = public.user_org_id());

-- Reports: org-scoped
create policy "Org members can view reports"
    on reports for select
    using (org_id = public.user_org_id());

create policy "Org members can insert reports"
    on reports for insert
    with check (org_id = public.user_org_id());

-- ============================================================
-- SERVICE ROLE POLICIES (for API background tasks)
-- These bypass RLS when using service_role key
-- ============================================================

-- The service_role key bypasses RLS by default in Supabase,
-- so no additional policies needed for backend operations.

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Atomically increment analysis count for an org
create or replace function increment_analysis_count(org_id_param uuid)
returns void as $$
begin
    update public.organizations
    set analysis_count = analysis_count + 1
    where id = org_id_param;
end;
$$ language plpgsql security definer set search_path = '';

-- ============================================================
-- STORAGE BUCKET FOR AUDIO FILES
-- ============================================================

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Storage policies: org-scoped uploads
create policy "Org members can upload audio"
    on storage.objects for insert
    with check (
        bucket_id = 'audio'
        and (storage.foldername(name))[1] = public.user_org_id()::text
    );

create policy "Org members can view own audio"
    on storage.objects for select
    using (
        bucket_id = 'audio'
        and (storage.foldername(name))[1] = public.user_org_id()::text
    );
