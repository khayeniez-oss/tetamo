-- ============================================================
-- RANDOLPH SYSTEM HEALTH
-- Persistent state for Tetamo's automated production watchdog.
--
-- One row per health check.
-- This is state, not an append-only event log.
-- Important state transitions are separately written to
-- ai_activity and failures may create ai_incidents.
-- ============================================================

create table if not exists public.ai_system_health (
  check_key text primary key,

  display_name text not null,

  category text not null,

  check_type text not null
    check (
      check_type in (
        'live',
        'configuration',
        'heartbeat'
      )
    ),

  status text not null default 'unknown'
    check (
      status in (
        'healthy',
        'degraded',
        'down',
        'unknown'
      )
    ),

  severity_on_failure text not null default 'warning'
    check (
      severity_on_failure in (
        'info',
        'warning',
        'high',
        'critical'
      )
    ),

  message text,

  latency_ms integer
    check (
      latency_ms is null
      or latency_ms >= 0
    ),

  consecutive_failures integer not null default 0
    check (
      consecutive_failures >= 0
    ),

  last_checked_at timestamptz,

  last_success_at timestamptz,

  last_failure_at timestamptz,

  failure_started_at timestamptz,

  last_recovered_at timestamptz,

  evidence jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists ai_system_health_status_idx
  on public.ai_system_health (status);

create index if not exists ai_system_health_category_idx
  on public.ai_system_health (category);

create index if not exists ai_system_health_checked_idx
  on public.ai_system_health (last_checked_at desc);

drop trigger if exists set_ai_system_health_updated_at
  on public.ai_system_health;

create trigger set_ai_system_health_updated_at
before update on public.ai_system_health
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_system_health
  enable row level security;


-- ============================================================
-- ACTIVE WATCHDOG INCIDENT IDEMPOTENCY
--
-- Randolph must never create a new open incident on every
-- monitoring cycle for the same failing system.
--
-- There may be only one unresolved system-health incident
-- for a given check_key.
-- ============================================================

create unique index if not exists
  ai_incidents_active_system_health_unique
on public.ai_incidents (
  related_entity_type,
  related_entity_id
)
where
  related_entity_type = 'system_health_check'
  and status not in (
    'resolved',
    'closed'
  );


comment on table public.ai_system_health is
  'Current automated production health state used by Randolph, Tetamo AI Systems & IT Watchdog.';

comment on column public.ai_system_health.check_type is
  'live = dependency actively contacted; configuration = credentials/local configuration validated; heartbeat = another scheduled worker must report execution.';

comment on column public.ai_system_health.consecutive_failures is
  'Number of sequential failed checks since the most recent successful health check.';
