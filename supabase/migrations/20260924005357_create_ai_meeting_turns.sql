-- ============================================================
-- AI MEETING TURNS
-- Searchable, append-style conversational history for
-- Tetamo AI Team meetings.
--
-- IMPORTANT:
-- This table stores only content that was actually spoken,
-- shown, transcribed, or intentionally recorded as a
-- structured meeting event.
--
-- It must NOT be used to store hidden model reasoning.
-- ============================================================

create table if not exists public.ai_meeting_turns (
  id uuid primary key default gen_random_uuid(),

  meeting_id uuid not null
    references public.ai_meetings(id)
    on delete cascade,

  turn_order integer not null
    check (turn_order > 0),

  speaker_type text not null
    check (speaker_type in (
      'user',
      'advisor',
      'agent',
      'system'
    )),

  spoken_by_agent_id uuid
    references public.ai_agents(id)
    on delete set null,

  spoken_by_user_id uuid,

  speaker_name_snapshot text not null,
  speaker_role_snapshot text,

  input_source text not null default 'text'
    check (input_source in (
      'voice',
      'text',
      'system'
    )),

  presence_state text
    check (
      presence_state is null
      or presence_state in (
        'idle',
        'listening',
        'thinking',
        'speaking',
        'acknowledging',
        'flagging'
      )
    ),

  content text not null
    check (length(trim(content)) > 0),

  reply_to_turn_id uuid
    references public.ai_meeting_turns(id)
    on delete set null,

  related_meeting_item_id uuid
    references public.ai_meeting_items(id)
    on delete set null,

  related_task_id uuid
    references public.ai_tasks(id)
    on delete set null,

  related_decision_id uuid
    references public.ai_decisions(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  spoken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint ai_meeting_turns_speaker_identity_check
    check (
      (
        speaker_type = 'agent'
        and spoken_by_agent_id is not null
        and spoken_by_user_id is null
      )
      or (
        speaker_type = 'user'
        and spoken_by_user_id is not null
        and spoken_by_agent_id is null
      )
      or (
        speaker_type in ('advisor', 'system')
        and spoken_by_agent_id is null
        and spoken_by_user_id is null
      )
    ),

  constraint ai_meeting_turns_meeting_order_unique
    unique (meeting_id, turn_order)
);

create index if not exists ai_meeting_turns_meeting_idx
  on public.ai_meeting_turns (
    meeting_id,
    turn_order
  );

create index if not exists ai_meeting_turns_agent_idx
  on public.ai_meeting_turns (
    spoken_by_agent_id,
    spoken_at
  )
  where spoken_by_agent_id is not null;

create index if not exists ai_meeting_turns_user_idx
  on public.ai_meeting_turns (
    spoken_by_user_id,
    spoken_at
  )
  where spoken_by_user_id is not null;

create index if not exists ai_meeting_turns_spoken_at_idx
  on public.ai_meeting_turns (
    spoken_at
  );

alter table public.ai_meeting_turns
  enable row level security;

-- AI Team tables are internal-only.
-- Browser-side anon/authenticated roles must not receive
-- direct table privileges. Access goes through protected
-- server-side AI Team APIs.

revoke all on table public.ai_meeting_turns
  from anon, authenticated;

comment on table public.ai_meeting_turns is
  'Append-style searchable conversational history for Tetamo AI Team meetings. Stores visible/spoken/transcribed content and structured meeting events, never hidden model reasoning.';

comment on column public.ai_meeting_turns.turn_order is
  'Sequential speaking/event order within one meeting.';

comment on column public.ai_meeting_turns.speaker_type is
  'Speaker category: user, advisor, agent, or system. KooT uses advisor; Tetamo AI staff use agent.';

comment on column public.ai_meeting_turns.speaker_name_snapshot is
  'Speaker name captured at meeting time so historical records remain readable even if names later change.';

comment on column public.ai_meeting_turns.speaker_role_snapshot is
  'Speaker role/title captured at meeting time.';

comment on column public.ai_meeting_turns.presence_state is
  'Visible meeting-room state associated with this turn/event. Thinking records the visible state only, never hidden reasoning.';

comment on column public.ai_meeting_turns.content is
  'Visible spoken, typed, transcribed, or intentionally recorded meeting content.';

comment on column public.ai_meeting_turns.metadata is
  'Non-authoritative supporting metadata. Must not be used to grant permissions or store unnecessary private data.';