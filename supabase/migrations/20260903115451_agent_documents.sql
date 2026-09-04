-- TETAMO Agent Documents
-- Shared persistence layer for Website + Tetamo Partner App.

create extension if not exists pgcrypto;

create table if not exists public.agent_documents (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  -- Kept as text intentionally so the document engine can safely work with
  -- the current property identifier without coupling this migration to the
  -- exact properties.id database type.
  property_id text null,

  -- High-level document family.
  document_type text not null
    check (document_type in ('inventory', 'rental_agreement', 'letter')),

  -- Identifies the actual template without requiring a new database column
  -- for every future Tetamo letter/form.
  template_key text null,

  title text not null default 'Untitled Document',

  language text not null default 'id'
    check (language in ('id', 'en', 'bilingual')),

  status text not null default 'draft'
    check (status in ('draft', 'ready', 'completed')),

  -- Structured document state.
  -- Inventory items, agreement terms, letter fields, clauses, etc.
  data jsonb not null default '{}'::jsonb,

  template_version integer not null default 1
    check (template_version > 0),

  generated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_documents_user_updated_idx
  on public.agent_documents (user_id, updated_at desc);

create index if not exists agent_documents_user_type_idx
  on public.agent_documents (user_id, document_type);

create index if not exists agent_documents_property_idx
  on public.agent_documents (property_id)
  where property_id is not null;


-- ============================================================
-- GOLD / AGENT PRO DOCUMENT ACCESS
-- ============================================================

create or replace function public.has_agent_document_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agent_memberships membership
    where membership.user_id = auth.uid()
      and membership.status = 'active'
      and (
        membership.expires_at is null
        or membership.expires_at >= now()
      )
      and (
        lower(coalesce(membership.package_id, '')) in ('gold', 'agent-pro')
        or lower(
          regexp_replace(
            trim(coalesce(membership.package_name, '')),
            '[[:space:]]+',
            '-',
            'g'
          )
        ) in ('gold', 'agent-pro')
      )
  );
$$;

revoke all on function public.has_agent_document_access() from public;
grant execute on function public.has_agent_document_access() to authenticated;


-- ============================================================
-- UPDATED AT
-- ============================================================

create or replace function public.set_agent_documents_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_documents_updated_at
  on public.agent_documents;

create trigger set_agent_documents_updated_at
before update on public.agent_documents
for each row
execute function public.set_agent_documents_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.agent_documents enable row level security;

drop policy if exists "agent_documents_select_own"
  on public.agent_documents;

create policy "agent_documents_select_own"
on public.agent_documents
for select
to authenticated
using (auth.uid() = user_id);


drop policy if exists "agent_documents_insert_gold_pro"
  on public.agent_documents;

create policy "agent_documents_insert_gold_pro"
on public.agent_documents
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.has_agent_document_access()
);


drop policy if exists "agent_documents_update_gold_pro"
  on public.agent_documents;

create policy "agent_documents_update_gold_pro"
on public.agent_documents
for update
to authenticated
using (
  auth.uid() = user_id
  and public.has_agent_document_access()
)
with check (
  auth.uid() = user_id
  and public.has_agent_document_access()
);


drop policy if exists "agent_documents_delete_own"
  on public.agent_documents;

create policy "agent_documents_delete_own"
on public.agent_documents
for delete
to authenticated
using (auth.uid() = user_id);


grant select, insert, update, delete
on public.agent_documents
to authenticated;
