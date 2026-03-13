-- PitchParse Phase 2: Coaching Chat
-- Interactive coaching conversations tied to analyses

-- ============================================================
-- TABLES
-- ============================================================

create table conversations (
    id          uuid primary key default uuid_generate_v4(),
    org_id      uuid not null references organizations(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    analysis_id uuid references analyses(id) on delete set null,
    title       text not null default '',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table messages (
    id              uuid primary key default uuid_generate_v4(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    role            text not null check (role in ('user', 'assistant')),
    content         text not null,
    created_at      timestamptz not null default now()
);

-- Add coach_prompt column to organizations for custom system prompts
alter table organizations add column coach_prompt text;

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_conversations_org_id on conversations(org_id);
create index idx_conversations_user_id on conversations(user_id);
create index idx_conversations_analysis_id on conversations(analysis_id);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_messages_created_at on messages(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create trigger set_conversations_updated_at
    before update on conversations
    for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations: user can only see their own within their org
create policy "Users can view own conversations"
    on conversations for select
    using (org_id = public.user_org_id() and user_id = (select auth.uid()));

create policy "Users can insert own conversations"
    on conversations for insert
    with check (org_id = public.user_org_id() and user_id = (select auth.uid()));

create policy "Users can update own conversations"
    on conversations for update
    using (org_id = public.user_org_id() and user_id = (select auth.uid()));

create policy "Users can delete own conversations"
    on conversations for delete
    using (org_id = public.user_org_id() and user_id = (select auth.uid()));

-- Messages: accessible if user owns the parent conversation
create policy "Users can view messages in own conversations"
    on messages for select
    using (
        conversation_id in (
            select id from conversations
            where org_id = public.user_org_id() and user_id = (select auth.uid())
        )
    );

create policy "Users can insert messages in own conversations"
    on messages for insert
    with check (
        conversation_id in (
            select id from conversations
            where org_id = public.user_org_id() and user_id = (select auth.uid())
        )
    );
