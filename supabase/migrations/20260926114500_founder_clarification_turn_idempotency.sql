-- ============================================================
-- FOUNDER CLARIFICATION TURN IDEMPOTENCY
--
-- One protected Founder clarification turn may exist for each
-- structured Founder-clarification Meeting Room item.
--
-- Ordinary meeting turns are unaffected.
-- ============================================================

create unique index if not exists
  ai_meeting_turns_founder_clarification_item_unique
on public.ai_meeting_turns (
  related_meeting_item_id
)
where related_meeting_item_id is not null
  and speaker_type = 'user'
  and metadata ->> 'turn_kind' =
    'founder_clarification'
  and metadata ->> 'clarification_source' =
    'founder_clarification_queue';
