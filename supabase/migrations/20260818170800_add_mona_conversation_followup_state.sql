-- Mona conversational silence-follow-up state.
--
-- Separate from the existing WhatsApp template campaign
-- followup_3_day / followup_14_day workflow.
--
-- Mona sequence:
--   normal Mona reply
--   -> 1 hour silence
--   -> follow-up #1
--   -> 12 hours silence
--   -> follow-up #2
--   -> stop

alter table public.whatsapp_conversations
  add column if not exists mona_followup_count integer not null default 0,
  add column if not exists mona_followup_waiting_since timestamptz null,
  add column if not exists mona_first_followup_sent_at timestamptz null,
  add column if not exists mona_next_followup_due_at timestamptz null,
  add column if not exists mona_dependency_controlled boolean not null default false,
  add column if not exists mona_dependency_reason text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'whatsapp_conversations_mona_followup_count_check'
  ) then
    alter table public.whatsapp_conversations
      add constraint whatsapp_conversations_mona_followup_count_check
      check (mona_followup_count between 0 and 2);
  end if;
end
$$;

create index if not exists
  whatsapp_conversations_mona_next_followup_due_at_idx
on public.whatsapp_conversations (mona_next_followup_due_at)
where mona_next_followup_due_at is not null;
