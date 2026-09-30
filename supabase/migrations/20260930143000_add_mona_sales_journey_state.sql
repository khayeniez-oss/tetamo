-- Mona Sales Journey persistence
--
-- PURPOSE
-- Preserve factual sales-pursuit history across separate silence cycles.
--
-- IMPORTANT
-- This is intentionally separate from the existing Mona silence-cycle fields.
--
-- Silence cycle:
--   mona_followup_count
--   mona_followup_waiting_since
--   mona_first_followup_sent_at
--   mona_next_followup_due_at
--
-- Those fields may reset when a customer returns.
--
-- Sales journey:
--   mona_journey_status
--   mona_journey_started_at
--   mona_pursuit_count
--   mona_last_pursuit_at
--
-- These fields must NOT reset merely because the customer replies.
--
-- This migration does NOT modify:
--   claim_due_mona_followups()
--   follow-up cron scheduling
--   claim tokens
--   Meta delivery
--   Mona Call

alter table public.whatsapp_conversations
  add column if not exists mona_journey_status text null,
  add column if not exists mona_journey_started_at timestamptz null,
  add column if not exists mona_pursuit_count integer not null default 0,
  add column if not exists mona_last_pursuit_at timestamptz null;

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_mona_journey_status_check;

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_mona_journey_status_check
  check (
    mona_journey_status is null
    or mona_journey_status in (
      'active',
      'resolved',
      'stopped'
    )
  );

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_mona_pursuit_count_check;

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_mona_pursuit_count_check
  check (mona_pursuit_count >= 0);

comment on column public.whatsapp_conversations.mona_journey_status is
  'Persistent Mona sales-journey state. NULL means no sales journey has been established. Does not reset with a normal customer reply.';

comment on column public.whatsapp_conversations.mona_journey_started_at is
  'Timestamp when Mona first established this persistent sales journey.';

comment on column public.whatsapp_conversations.mona_pursuit_count is
  'Number of successfully delivered proactive Mona sales follow-ups recorded for this persistent journey. Separate from mona_followup_count, which belongs only to the current unanswered silence cycle.';

comment on column public.whatsapp_conversations.mona_last_pursuit_at is
  'Timestamp of Mona most recent successfully delivered proactive sales follow-up within the current journey.';

-- Atomically record a successfully delivered proactive Mona sales pursuit.
--
-- IMPORTANT:
-- Call only after the existing transport layer confirms successful delivery.
-- This function does not send messages, schedule follow-ups, claim rows,
-- or modify the current silence-cycle fields.

create or replace function public.record_mona_successful_pursuit(
  p_conversation_id uuid,
  p_sent_at timestamptz default now()
)
returns table (
  journey_status text,
  pursuit_count integer,
  last_pursuit_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.whatsapp_conversations wc
  set
    mona_journey_status = 'active',
    mona_journey_started_at =
      coalesce(
        wc.mona_journey_started_at,
        p_sent_at
      ),
    mona_pursuit_count =
      wc.mona_pursuit_count + 1,
    mona_last_pursuit_at =
      p_sent_at
  where wc.id = p_conversation_id
    and (
      wc.mona_journey_status is null
      or wc.mona_journey_status = 'active'
    )
  returning
    wc.mona_journey_status,
    wc.mona_pursuit_count,
    wc.mona_last_pursuit_at;
end;
$$;

comment on function public.record_mona_successful_pursuit(uuid, timestamptz) is
  'Atomically records one successfully delivered proactive Mona sales follow-up. Does not modify Mona silence-cycle scheduling or claim state.';

-- This mutation helper is server-side only.
-- Do not expose pursuit-history mutation to anon/authenticated clients.
revoke all on function public.record_mona_successful_pursuit(uuid, timestamptz)
  from public;

revoke all on function public.record_mona_successful_pursuit(uuid, timestamptz)
  from anon;

revoke all on function public.record_mona_successful_pursuit(uuid, timestamptz)
  from authenticated;

grant execute on function public.record_mona_successful_pursuit(uuid, timestamptz)
  to service_role;
