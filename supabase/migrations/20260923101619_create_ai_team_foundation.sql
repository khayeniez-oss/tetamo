-- ============================================================
-- TETAMO AI TEAM FOUNDATION
-- Shared intelligence, coordination, accountability and memory
-- layer for Tetamo's internal AI workforce.
--
-- IMPORTANT:
-- Existing operational systems remain the source of truth.
-- This migration does not replace Mona, WhatsApp, payments,
-- analytics, properties, content or other operational systems.
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- AI AGENTS
-- Registry for Tetamo's internal AI workforce.
-- ============================================================

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),

  agent_key text not null unique
    check (agent_key in (
      'jake',
      'mona',
      'rupert',
      'randolph',
      'lola',
      'uncle_sam'
    )),

  display_name text not null,
  role_title text not null,
  mission text not null,

  status text not null default 'inactive'
    check (status in (
      'inactive',
      'active',
      'paused',
      'maintenance'
    )),

  reports_to_agent_id uuid null
    references public.ai_agents(id)
    on delete set null,

  personality jsonb not null default '{}'::jsonb,

  capabilities jsonb not null default '{}'::jsonb,

  permissions jsonb not null default '{}'::jsonb,

  configuration jsonb not null default '{}'::jsonb,

  version integer not null default 1
    check (version > 0),

  enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_agents_status_idx
  on public.ai_agents (status);

create index if not exists ai_agents_reports_to_idx
  on public.ai_agents (reports_to_agent_id)
  where reports_to_agent_id is not null;


-- ============================================================
-- SHARED AI TEAM UPDATED AT
-- One function used by AI Team tables that track updated_at.
-- ============================================================

create or replace function public.set_ai_team_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_agents_updated_at
  on public.ai_agents;

create trigger set_ai_agents_updated_at
before update on public.ai_agents
for each row
execute function public.set_ai_team_updated_at();


-- ============================================================
-- RLS
-- No browser/client access is granted by this migration.
-- AI Team access will go through controlled server-side routes.
-- ============================================================

alter table public.ai_agents enable row level security;

-- ============================================================
-- AI TASKS
-- Shared task board for work assigned to and between AI agents.
-- ============================================================

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  requested_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  assigned_to_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  requested_by_user_id uuid,

  priority text not null default 'normal'
    check (priority in (
      'low',
      'normal',
      'high',
      'critical'
    )),

  status text not null default 'pending'
    check (status in (
      'pending',
      'in_progress',
      'blocked',
      'awaiting_approval',
      'completed',
      'cancelled'
    )),

  source_type text,
  source_id text,

  related_entity_type text,
  related_entity_id text,

  expected_outcome text,
  result_summary text,

  requires_approval boolean not null default false,

  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_tasks_assigned_to_idx
  on public.ai_tasks (assigned_to_agent_id);

create index if not exists ai_tasks_status_idx
  on public.ai_tasks (status);

create index if not exists ai_tasks_priority_idx
  on public.ai_tasks (priority);

create index if not exists ai_tasks_due_at_idx
  on public.ai_tasks (due_at)
  where due_at is not null;

create index if not exists ai_tasks_related_entity_idx
  on public.ai_tasks (related_entity_type, related_entity_id)
  where related_entity_type is not null
    and related_entity_id is not null;

    drop trigger if exists set_ai_tasks_updated_at
  on public.ai_tasks;

create trigger set_ai_tasks_updated_at
before update on public.ai_tasks
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_tasks enable row level security;


-- ============================================================
-- AI REPORTS
-- Structured reports produced by AI Team members.
-- ============================================================

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),

  agent_id uuid not null
    references public.ai_agents(id)
    on delete restrict,

  report_type text not null
    check (report_type in (
      'daily',
      'weekly',
      'specialist',
      'executive',
      'incident',
      'financial',
      'growth',
      'sales',
      'content',
      'system'
    )),

  title text not null,

  period_start timestamptz,
  period_end timestamptz,

  summary text not null,

  metrics jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,

  recipient_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  recipient_user_id uuid,

  source_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists ai_reports_agent_idx
  on public.ai_reports (agent_id);

create index if not exists ai_reports_type_idx
  on public.ai_reports (report_type);

create index if not exists ai_reports_created_at_idx
  on public.ai_reports (created_at desc);

alter table public.ai_reports enable row level security;


-- ============================================================
-- AI KPI SNAPSHOTS
-- Historical measurements for each AI Team member and system.
-- ============================================================

create table if not exists public.ai_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),

  agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  metric_key text not null,
  metric_value numeric,

  metric_text text,

  unit text,

  period_start timestamptz,
  period_end timestamptz,

  dimensions jsonb not null default '{}'::jsonb,
  source_type text,
  source_id text,

  recorded_at timestamptz not null default now()
);

create index if not exists ai_kpi_agent_metric_idx
  on public.ai_kpi_snapshots (agent_id, metric_key);

create index if not exists ai_kpi_recorded_at_idx
  on public.ai_kpi_snapshots (recorded_at desc);

alter table public.ai_kpi_snapshots enable row level security;

-- ============================================================
-- AI DECISIONS
-- Permanent record of proposals and founder/team decisions.
-- ============================================================

create table if not exists public.ai_decisions (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  proposed_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  decision_maker_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  decision_maker_user_id uuid,

  status text not null default 'proposed'
    check (status in (
      'proposed',
      'approved',
      'rejected',
      'deferred',
      'superseded'
    )),

  rationale text,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  related_entity_type text,
  related_entity_id text,

  decided_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_decisions_status_idx
  on public.ai_decisions (status);

create index if not exists ai_decisions_task_idx
  on public.ai_decisions (related_task_id)
  where related_task_id is not null;

create index if not exists ai_decisions_created_at_idx
  on public.ai_decisions (created_at desc);

drop trigger if exists set_ai_decisions_updated_at
  on public.ai_decisions;

create trigger set_ai_decisions_updated_at
before update on public.ai_decisions
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_decisions enable row level security;


-- ============================================================
-- AI APPROVALS
-- Founder/admin approval queue for controlled AI actions.
-- Approval does not itself grant technical authority.
-- ============================================================

create table if not exists public.ai_approvals (
  id uuid primary key default gen_random_uuid(),

  requested_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  decision_id uuid
    references public.ai_decisions(id)
    on delete set null,

  action_type text not null,
  action_summary text not null,

  risk_level text not null default 'normal'
    check (risk_level in (
      'low',
      'normal',
      'high',
      'critical'
    )),

  status text not null default 'pending'
    check (status in (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'expired'
    )),

  requested_payload jsonb not null default '{}'::jsonb,

  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,

  execution_status text not null default 'not_started'
    check (execution_status in (
      'not_started',
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled'
    )),

  executed_at timestamptz,
  execution_result jsonb not null default '{}'::jsonb,

  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_approvals_status_idx
  on public.ai_approvals (status);

create index if not exists ai_approvals_requested_by_idx
  on public.ai_approvals (requested_by_agent_id);

create index if not exists ai_approvals_created_at_idx
  on public.ai_approvals (created_at desc);

drop trigger if exists set_ai_approvals_updated_at
  on public.ai_approvals;

create trigger set_ai_approvals_updated_at
before update on public.ai_approvals
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_approvals enable row level security;


-- ============================================================
-- AI HANDOFFS
-- Structured transfer of work or information between agents.
-- Raw private data should not be copied here unnecessarily.
-- ============================================================

create table if not exists public.ai_handoffs (
  id uuid primary key default gen_random_uuid(),

  from_agent_id uuid not null
    references public.ai_agents(id)
    on delete restrict,

  to_agent_id uuid not null
    references public.ai_agents(id)
    on delete restrict,

  task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  handoff_type text not null,
  summary text not null,

  context jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in (
      'pending',
      'accepted',
      'completed',
      'declined',
      'cancelled'
    )),

  accepted_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (from_agent_id <> to_agent_id)
);

create index if not exists ai_handoffs_from_idx
  on public.ai_handoffs (from_agent_id);

create index if not exists ai_handoffs_to_idx
  on public.ai_handoffs (to_agent_id);

create index if not exists ai_handoffs_status_idx
  on public.ai_handoffs (status);

drop trigger if exists set_ai_handoffs_updated_at
  on public.ai_handoffs;

create trigger set_ai_handoffs_updated_at
before update on public.ai_handoffs
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_handoffs enable row level security;


-- ============================================================
-- AI ACTIVITY
-- Append-style audit trail of important AI Team activity.
-- ============================================================

create table if not exists public.ai_activity (
  id uuid primary key default gen_random_uuid(),

  agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  actor_user_id uuid,

  event_type text not null,
  action text not null,

  entity_type text,
  entity_id text,

  task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  severity text not null default 'info'
    check (severity in (
      'info',
      'warning',
      'high',
      'critical'
    )),

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists ai_activity_agent_idx
  on public.ai_activity (agent_id);

create index if not exists ai_activity_event_idx
  on public.ai_activity (event_type);

create index if not exists ai_activity_entity_idx
  on public.ai_activity (entity_type, entity_id)
  where entity_type is not null
    and entity_id is not null;

create index if not exists ai_activity_created_at_idx
  on public.ai_activity (created_at desc);

alter table public.ai_activity enable row level security;

-- ============================================================
-- AI INSIGHTS
-- Structured findings, opportunities, risks and observations
-- discovered by the AI Team.
-- ============================================================

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),

  agent_id uuid not null
    references public.ai_agents(id)
    on delete restrict,

  insight_type text not null
    check (insight_type in (
      'observation',
      'opportunity',
      'risk',
      'trend',
      'anomaly',
      'recommendation'
    )),

  title text not null,
  summary text not null,

  confidence text not null default 'unknown'
    check (confidence in (
      'confirmed',
      'probable',
      'possible',
      'unknown'
    )),

  priority text not null default 'normal'
    check (priority in (
      'low',
      'normal',
      'high',
      'critical'
    )),

  evidence jsonb not null default '[]'::jsonb,

  related_entity_type text,
  related_entity_id text,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  status text not null default 'open'
    check (status in (
      'open',
      'reviewing',
      'actioned',
      'dismissed',
      'resolved'
    )),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_insights_agent_idx
  on public.ai_insights (agent_id);

create index if not exists ai_insights_status_idx
  on public.ai_insights (status);

create index if not exists ai_insights_priority_idx
  on public.ai_insights (priority);

create index if not exists ai_insights_created_at_idx
  on public.ai_insights (created_at desc);

drop trigger if exists set_ai_insights_updated_at
  on public.ai_insights;

create trigger set_ai_insights_updated_at
before update on public.ai_insights
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_insights enable row level security;


-- ============================================================
-- AI MEETINGS
-- Meeting records for Tetamo's AI Team.
-- Scheduling/execution logic will live in application code.
-- ============================================================

create table if not exists public.ai_meetings (
  id uuid primary key default gen_random_uuid(),

  meeting_type text not null
    check (meeting_type in (
      'weekly_executive',
      'founder_coo_strategy',
      'incident',
      'special',
      'ad_hoc'
    )),

  title text not null,

  status text not null default 'scheduled'
    check (status in (
      'scheduled',
      'preparing',
      'in_progress',
      'completed',
      'cancelled'
    )),

  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,

  chaired_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  created_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  created_by_user_id uuid,

  agenda jsonb not null default '[]'::jsonb,
  attendees jsonb not null default '[]'::jsonb,

  summary text,
  decisions_summary jsonb not null default '[]'::jsonb,
  action_items_summary jsonb not null default '[]'::jsonb,

  previous_meeting_id uuid
    references public.ai_meetings(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_meetings_type_idx
  on public.ai_meetings (meeting_type);

create index if not exists ai_meetings_status_idx
  on public.ai_meetings (status);

create index if not exists ai_meetings_scheduled_for_idx
  on public.ai_meetings (scheduled_for);

drop trigger if exists set_ai_meetings_updated_at
  on public.ai_meetings;

create trigger set_ai_meetings_updated_at
before update on public.ai_meetings
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_meetings enable row level security;


-- ============================================================
-- AI MEETING ITEMS
-- Individual agenda items, reports, decisions and actions
-- discussed during a meeting.
-- ============================================================

create table if not exists public.ai_meeting_items (
  id uuid primary key default gen_random_uuid(),

  meeting_id uuid not null
    references public.ai_meetings(id)
    on delete cascade,

  item_type text not null
    check (item_type in (
      'agenda',
      'report',
      'insight',
      'decision',
      'action',
      'risk',
      'discussion'
    )),

  title text not null,
  content text,

  presented_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  related_report_id uuid
    references public.ai_reports(id)
    on delete set null,

  related_insight_id uuid
    references public.ai_insights(id)
    on delete set null,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  related_decision_id uuid
    references public.ai_decisions(id)
    on delete set null,

  status text not null default 'pending'
    check (status in (
      'pending',
      'discussed',
      'deferred',
      'actioned',
      'closed'
    )),

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_meeting_items_meeting_idx
  on public.ai_meeting_items (meeting_id, sort_order);

create index if not exists ai_meeting_items_status_idx
  on public.ai_meeting_items (status);

drop trigger if exists set_ai_meeting_items_updated_at
  on public.ai_meeting_items;

create trigger set_ai_meeting_items_updated_at
before update on public.ai_meeting_items
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_meeting_items enable row level security;

-- ============================================================
-- AI INCIDENTS
-- Randolph's structured system incident and risk register.
-- ============================================================

create table if not exists public.ai_incidents (
  id uuid primary key default gen_random_uuid(),

  detected_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  title text not null,
  description text,

  surface text not null,
  platform text,

  severity text not null default 'warning'
    check (severity in (
      'info',
      'warning',
      'high',
      'critical'
    )),

  status text not null default 'open'
    check (status in (
      'open',
      'investigating',
      'awaiting_approval',
      'mitigating',
      'monitoring',
      'resolved',
      'closed'
    )),

  confidence text not null default 'unknown'
    check (confidence in (
      'confirmed',
      'probable',
      'possible',
      'unknown'
    )),

  impact_summary text,
  probable_cause text,
  evidence jsonb not null default '[]'::jsonb,
  recommended_action text,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  related_approval_id uuid
    references public.ai_approvals(id)
    on delete set null,

  related_entity_type text,
  related_entity_id text,

  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,

  resolution_summary text,
  postmortem jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_incidents_severity_idx
  on public.ai_incidents (severity);

create index if not exists ai_incidents_status_idx
  on public.ai_incidents (status);

create index if not exists ai_incidents_detected_at_idx
  on public.ai_incidents (detected_at desc);

drop trigger if exists set_ai_incidents_updated_at
  on public.ai_incidents;

create trigger set_ai_incidents_updated_at
before update on public.ai_incidents
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_incidents enable row level security;


-- ============================================================
-- COMPETITORS
-- Lola's competitor registry.
-- Stores public market intelligence subjects, not scraped
-- private data or unauthorized information.
-- ============================================================

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  website text,

  market text,
  category text,

  status text not null default 'active'
    check (status in (
      'active',
      'inactive',
      'watchlist'
    )),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (name)
);

create index if not exists competitors_status_idx
  on public.competitors (status);

drop trigger if exists set_competitors_updated_at
  on public.competitors;

create trigger set_competitors_updated_at
before update on public.competitors
for each row
execute function public.set_ai_team_updated_at();

alter table public.competitors enable row level security;


-- ============================================================
-- COMPETITOR OBSERVATIONS
-- Historical public competitor intelligence collected by Lola.
-- ============================================================

create table if not exists public.competitor_observations (
  id uuid primary key default gen_random_uuid(),

  competitor_id uuid not null
    references public.competitors(id)
    on delete cascade,

  observed_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  observation_type text not null,

  title text not null,
  summary text not null,

  source_url text,
  source_type text,

  confidence text not null default 'unknown'
    check (confidence in (
      'confirmed',
      'probable',
      'possible',
      'unknown'
    )),

  evidence jsonb not null default '[]'::jsonb,

  observed_at timestamptz not null default now(),

  related_insight_id uuid
    references public.ai_insights(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists competitor_observations_competitor_idx
  on public.competitor_observations (competitor_id, observed_at desc);

create index if not exists competitor_observations_type_idx
  on public.competitor_observations (observation_type);

alter table public.competitor_observations enable row level security;


-- ============================================================
-- BUSINESS EXPENSES
-- Uncle Sam's operating expense register.
-- Does not replace formal accounting or tax records.
-- ============================================================

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),

  business_key text not null default 'tetamo',

  expense_type text not null
    check (expense_type in (
      'software',
      'infrastructure',
      'marketing',
      'communications',
      'office',
      'professional_services',
      'operations',
      'other'
    )),

  vendor_name text,
  description text not null,

  amount numeric(14,2) not null
    check (amount >= 0),

  currency text not null,

  expense_date date not null,

  payment_status text not null default 'paid'
    check (payment_status in (
      'planned',
      'pending',
      'paid',
      'failed',
      'refunded',
      'cancelled'
    )),

  source_type text,
  source_id text,

  receipt_reference text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_expenses_date_idx
  on public.business_expenses (expense_date desc);

create index if not exists business_expenses_type_idx
  on public.business_expenses (expense_type);

create index if not exists business_expenses_business_idx
  on public.business_expenses (business_key);

drop trigger if exists set_business_expenses_updated_at
  on public.business_expenses;

create trigger set_business_expenses_updated_at
before update on public.business_expenses
for each row
execute function public.set_ai_team_updated_at();

alter table public.business_expenses enable row level security;


-- ============================================================
-- BUSINESS SUBSCRIPTIONS
-- Uncle Sam's recurring service and renewal register.
-- ============================================================

create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),

  business_key text not null default 'tetamo',

  vendor_name text not null,
  service_name text not null,

  purpose text,

  billing_cycle text
    check (
      billing_cycle is null
      or billing_cycle in (
        'monthly',
        'quarterly',
        'semiannual',
        'annual',
        'usage_based',
        'other'
      )
    ),

  amount numeric(14,2)
    check (amount is null or amount >= 0),

  currency text,

  status text not null default 'active'
    check (status in (
      'trial',
      'active',
      'paused',
      'cancelled',
      'expired',
      'review'
    )),

  started_at date,
  next_renewal_date date,
  cancelled_at date,

  usage_summary jsonb not null default '{}'::jsonb,

  value_assessment text
    check (
      value_assessment is null
      or value_assessment in (
        'keep',
        'replace',
        'consolidate',
        'cancel',
        'review'
      )
    ),

  notes text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_subscriptions_business_idx
  on public.business_subscriptions (business_key);

create index if not exists business_subscriptions_status_idx
  on public.business_subscriptions (status);

create index if not exists business_subscriptions_renewal_idx
  on public.business_subscriptions (next_renewal_date)
  where next_renewal_date is not null;

drop trigger if exists set_business_subscriptions_updated_at
  on public.business_subscriptions;

create trigger set_business_subscriptions_updated_at
before update on public.business_subscriptions
for each row
execute function public.set_ai_team_updated_at();

alter table public.business_subscriptions enable row level security;


-- ============================================================
-- BUSINESS ASSETS
-- Uncle Sam's equipment and capital asset register.
-- Kept separate from normal monthly operating expenses.
-- ============================================================

create table if not exists public.business_assets (
  id uuid primary key default gen_random_uuid(),

  business_key text not null default 'tetamo',

  asset_type text not null,
  asset_name text not null,

  vendor_name text,

  purchase_date date,

  purchase_amount numeric(14,2)
    check (purchase_amount is null or purchase_amount >= 0),

  currency text,

  status text not null default 'active'
    check (status in (
      'active',
      'stored',
      'repair',
      'retired',
      'sold',
      'lost'
    )),

  assigned_to text,

  warranty_expires_at date,

  notes text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_assets_business_idx
  on public.business_assets (business_key);

create index if not exists business_assets_status_idx
  on public.business_assets (status);

drop trigger if exists set_business_assets_updated_at
  on public.business_assets;

create trigger set_business_assets_updated_at
before update on public.business_assets
for each row
execute function public.set_ai_team_updated_at();

alter table public.business_assets enable row level security;

-- ============================================================
-- PART 6 — FOUNDATION COMPLETION
-- Final shared architecture additions identified during the
-- full migration review.
-- ============================================================


-- ============================================================
-- AI TASK DEPENDENCIES
-- Allows Jake to coordinate workflows where one task may depend
-- on one or more other tasks being completed first.
-- ============================================================

create table if not exists public.ai_task_dependencies (
  id uuid primary key default gen_random_uuid(),

  task_id uuid not null
    references public.ai_tasks(id)
    on delete cascade,

  depends_on_task_id uuid not null
    references public.ai_tasks(id)
    on delete cascade,

  dependency_type text not null default 'blocks'
    check (dependency_type in (
      'blocks',
      'requires'
    )),

  created_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  check (task_id <> depends_on_task_id),

  unique (task_id, depends_on_task_id)
);

create index if not exists ai_task_dependencies_task_idx
  on public.ai_task_dependencies (task_id);

create index if not exists ai_task_dependencies_depends_on_idx
  on public.ai_task_dependencies (depends_on_task_id);

alter table public.ai_task_dependencies enable row level security;

-- ============================================================
-- AI EXPERIMENTS
-- Lola's structured growth experiment lifecycle.
-- Keeps hypotheses, measurements and outcomes separate from
-- general insights and prevents correlation from being stored
-- as proven causation.
-- ============================================================

create table if not exists public.ai_experiments (
  id uuid primary key default gen_random_uuid(),

  created_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  related_insight_id uuid
    references public.ai_insights(id)
    on delete set null,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  title text not null,

  hypothesis text not null,

  proposed_action text not null,

  target_metric_key text not null,

  baseline_value numeric,
  target_value numeric,
  result_value numeric,

  unit text,

  status text not null default 'proposed'
    check (status in (
      'proposed',
      'approved',
      'running',
      'paused',
      'completed',
      'cancelled'
    )),

  outcome text
    check (
      outcome is null
      or outcome in (
        'keep',
        'modify',
        'stop',
        'inconclusive'
      )
    ),

  evidence jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  ends_at timestamptz,
  completed_at timestamptz,

  result_summary text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    ends_at is null
    or started_at is null
    or ends_at >= started_at
  )
);

create index if not exists ai_experiments_status_idx
  on public.ai_experiments (status);

create index if not exists ai_experiments_created_by_idx
  on public.ai_experiments (created_by_agent_id);

create index if not exists ai_experiments_metric_idx
  on public.ai_experiments (target_metric_key);

create index if not exists ai_experiments_related_insight_idx
  on public.ai_experiments (related_insight_id)
  where related_insight_id is not null;

drop trigger if exists set_ai_experiments_updated_at
  on public.ai_experiments;

create trigger set_ai_experiments_updated_at
before update on public.ai_experiments
for each row
execute function public.set_ai_team_updated_at();

alter table public.ai_experiments enable row level security;

-- ============================================================
-- BUSINESS SUBSCRIPTION COMPLETION
-- Adds responsibility and business-value context so Uncle Sam
-- can evaluate recurring services rather than looking only
-- at their price.
-- ============================================================

alter table public.business_subscriptions
  add column if not exists owner_name text;

alter table public.business_subscriptions
  add column if not exists business_value text;

comment on column public.business_subscriptions.owner_name is
  'Person, team or function responsible for this subscription.';

comment on column public.business_subscriptions.business_value is
  'Plain-language description of the business value this subscription provides.';

-- ============================================================
-- AI TEAM BOOTSTRAP
-- Creates Tetamo's initial AI workforce registry.
--
-- IMPORTANT:
-- All agents begin disabled and inactive.
-- These records describe identity and organizational structure.
-- They do NOT grant technical authority.
-- ============================================================

insert into public.ai_agents (
  agent_key,
  display_name,
  role_title,
  mission,
  status,
  enabled
)
values
  (
    'jake',
    'Jake',
    'AI COO & Orchestrator',
    'Turn specialist information into coordinated action, align the AI Team with Tetamo priorities, surface decisions requiring founder attention, and ensure approved work is completed and measured.',
    'inactive',
    false
  ),
  (
    'mona',
    'Mona',
    'AI Sales Manager',
    'Drive Tetamo sales and revenue by supporting the existing Mona sales system with reporting, KPI visibility, revenue attribution and structured cross-team insights without replacing or altering Mona''s production sales brain.',
    'inactive',
    false
  ),
  (
    'rupert',
    'Rupert',
    'AI Content & SEO Manager',
    'Turn real market questions, Tetamo data, search behaviour and business priorities into useful bilingual content that attracts, educates and converts Tetamo audiences across Indonesia.',
    'inactive',
    false
  ),
  (
    'randolph',
    'Randolph',
    'AI Systems & IT Watchdog',
    'Monitor Tetamo digital systems, detect technical problems early, diagnose using evidence, report risks and recommend controlled corrective action without autonomous production changes.',
    'inactive',
    false
  ),
  (
    'lola',
    'Lola',
    'AI Growth Strategist',
    'Identify and measure growth opportunities and bottlenecks across Tetamo users, listings, geography, traffic, engagement, conversions, revenue and market activity.',
    'inactive',
    false
  ),
  (
    'uncle_sam',
    'Uncle Sam',
    'AI Finance & Admin Manager',
    'Maintain a clear operating picture of Tetamo revenue, expenses, subscriptions, assets and financial efficiency while identifying unnecessary costs and upcoming commitments.',
    'inactive',
    false
  )
on conflict (agent_key)
do update set
  display_name = excluded.display_name,
  role_title = excluded.role_title,
  mission = excluded.mission,
  updated_at = now();


-- Jake is the internal operational manager for specialist agents.
-- KooT is intentionally outside the employee hierarchy.

update public.ai_agents specialist
set reports_to_agent_id = jake.id
from public.ai_agents jake
where jake.agent_key = 'jake'
  and specialist.agent_key in (
    'mona',
    'rupert',
    'randolph',
    'lola',
    'uncle_sam'
  )
  and specialist.reports_to_agent_id is distinct from jake.id;

-- ============================================================
-- AI TEAM SECURITY
-- Internal server-side infrastructure only.
--
-- No direct browser/client access is granted to anon or
-- authenticated roles. AI Team operations must go through
-- protected server-side routes that verify Tetamo admin access
-- before using trusted server credentials.
-- ============================================================

revoke all on table
  public.ai_agents,
  public.ai_tasks,
  public.ai_reports,
  public.ai_kpi_snapshots,
  public.ai_decisions,
  public.ai_approvals,
  public.ai_handoffs,
  public.ai_activity,
  public.ai_insights,
  public.ai_meetings,
  public.ai_meeting_items,
  public.ai_incidents,
  public.ai_task_dependencies,
  public.ai_experiments,
  public.competitors,
  public.competitor_observations,
  public.business_expenses,
  public.business_subscriptions,
  public.business_assets
from anon, authenticated;
