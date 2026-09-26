-- ============================================================
-- TETAMO AI INQUIRY INTELLIGENCE
--
-- Purpose:
-- Read already-saved Meta WhatsApp inquiries asynchronously
-- and convert them into anonymized AI Team intelligence.
--
-- IMPORTANT:
-- - Does NOT modify Mona.
-- - Does NOT modify whatsapp_messages.
-- - Does NOT modify whatsapp_conversations.
-- - Does NOT store phone numbers, profile names or raw payloads.
-- - Starts disabled by default.
-- ============================================================


-- ============================================================
-- SETTINGS / MASTER KILL SWITCH
-- ============================================================

create table if not exists public.ai_inquiry_intelligence_settings (
  id uuid primary key default gen_random_uuid(),

  bridge_key text not null unique,

  enabled boolean not null default false,

  auto_create_insights boolean not null default false,
  auto_create_handoffs boolean not null default false,
  auto_create_tasks boolean not null default false,

  lookback_days integer not null default 14
    check (lookback_days between 1 and 90),

  max_messages_per_run integer not null default 50
    check (max_messages_per_run between 1 and 500),

  minimum_theme_signals integer not null default 3
    check (minimum_theme_signals between 1 and 100),

  minimum_content_score integer not null default 70
    check (minimum_content_score between 0 and 100),

  minimum_growth_score integer not null default 60
    check (minimum_growth_score between 0 and 100),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_inquiry_intelligence_settings (
  bridge_key,
  enabled,
  auto_create_insights,
  auto_create_handoffs,
  auto_create_tasks
)
values (
  'mona_meta_content_intelligence',
  false,
  false,
  false,
  false
)
on conflict (bridge_key) do nothing;

drop trigger if exists
  set_ai_inquiry_intelligence_settings_updated_at
  on public.ai_inquiry_intelligence_settings;

create trigger
  set_ai_inquiry_intelligence_settings_updated_at
before update on public.ai_inquiry_intelligence_settings
for each row
execute function public.set_ai_team_updated_at();

alter table
  public.ai_inquiry_intelligence_settings
enable row level security;


-- ============================================================
-- INQUIRY THEMES
--
-- Aggregated, anonymized customer-intelligence themes.
-- Example:
-- "Does Tetamo charge commission?"
-- ============================================================

create table if not exists public.ai_inquiry_themes (
  id uuid primary key default gen_random_uuid(),

  theme_key text not null unique,

  title text not null,
  summary text not null,

  signal_count integer not null default 0
    check (signal_count >= 0),

  distinct_conversation_count integer not null default 0
    check (distinct_conversation_count >= 0),

  first_seen_at timestamptz,
  last_seen_at timestamptz,

  customer_types jsonb not null default '[]'::jsonb,

  representative_questions jsonb not null default '[]'::jsonb,

  content_score integer not null default 0
    check (content_score between 0 and 100),

  growth_score integer not null default 0
    check (growth_score between 0 and 100),

  confidence text not null default 'unknown'
    check (confidence in (
      'confirmed',
      'probable',
      'possible',
      'unknown'
    )),

  status text not null default 'observing'
    check (status in (
      'observing',
      'qualified',
      'handed_off',
      'dismissed',
      'resolved'
    )),

  latest_insight_id uuid
    references public.ai_insights(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  ai_inquiry_themes_status_idx
  on public.ai_inquiry_themes (status);

create index if not exists
  ai_inquiry_themes_last_seen_idx
  on public.ai_inquiry_themes (last_seen_at desc)
  where last_seen_at is not null;

create index if not exists
  ai_inquiry_themes_content_score_idx
  on public.ai_inquiry_themes (content_score desc);

drop trigger if exists
  set_ai_inquiry_themes_updated_at
  on public.ai_inquiry_themes;

create trigger
  set_ai_inquiry_themes_updated_at
before update on public.ai_inquiry_themes
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_inquiry_themes
enable row level security;


-- ============================================================
-- INDIVIDUAL SANITIZED SIGNALS
--
-- One source message may produce at most one signal.
-- Source IDs are stored only for deduplication/audit linkage.
--
-- NO PHONE NUMBER
-- NO PROFILE NAME
-- NO RAW PAYLOAD
-- NO RAW MESSAGE COPY
-- ============================================================

create table if not exists public.ai_inquiry_signals (
  id uuid primary key default gen_random_uuid(),

  source_message_id text not null unique,
  source_conversation_id text not null,
  source_created_at timestamptz not null,

  source_provider text not null default 'meta'
    check (source_provider = 'meta'),

  theme_id uuid
    references public.ai_inquiry_themes(id)
    on delete set null,

  language text not null default 'unknown'
    check (language in (
      'id',
      'en',
      'mixed',
      'unknown'
    )),

  customer_type text not null default 'unknown'
    check (customer_type in (
      'agent',
      'owner',
      'agency',
      'developer',
      'buyer_renter',
      'unknown'
    )),

  inquiry_kind text not null default 'other'
    check (inquiry_kind in (
      'question',
      'objection',
      'pain_point',
      'confusion',
      'request',
      'comparison',
      'feedback',
      'other'
    )),

  intent text,
  intent_subject text,

  question_summary text not null,

  content_relevance integer not null default 0
    check (content_relevance between 0 and 100),

  growth_relevance integer not null default 0
    check (growth_relevance between 0 and 100),

  confidence numeric(4,3) not null default 0
    check (confidence between 0 and 1),

  content_candidate boolean not null default false,

  privacy_status text not null default 'sanitized'
    check (privacy_status in (
      'sanitized',
      'review_required',
      'blocked'
    )),

  status text not null default 'new'
    check (status in (
      'new',
      'aggregated',
      'ignored',
      'review_required'
    )),

  metadata jsonb not null default '{}'::jsonb,

  processed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  ai_inquiry_signals_theme_idx
  on public.ai_inquiry_signals (theme_id)
  where theme_id is not null;

create index if not exists
  ai_inquiry_signals_source_created_idx
  on public.ai_inquiry_signals (source_created_at desc);

create index if not exists
  ai_inquiry_signals_status_idx
  on public.ai_inquiry_signals (status);

create index if not exists
  ai_inquiry_signals_candidate_idx
  on public.ai_inquiry_signals (content_candidate)
  where content_candidate = true;

drop trigger if exists
  set_ai_inquiry_signals_updated_at
  on public.ai_inquiry_signals;

create trigger
  set_ai_inquiry_signals_updated_at
before update on public.ai_inquiry_signals
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_inquiry_signals
enable row level security;
