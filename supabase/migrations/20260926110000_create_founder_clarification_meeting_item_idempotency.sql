-- ============================================================
-- FOUNDER CLARIFICATION MEETING ITEM IDEMPOTENCY
--
-- One Founder-clarification discussion item per AI task
-- per meeting.
--
-- The same unresolved task may be surfaced again in a later
-- meeting if Founder clarification has still not been provided.
--
-- Scope is deliberately narrow and does not change uniqueness
-- behavior for normal Meeting Room items.
-- ============================================================

create unique index if not exists
  ai_meeting_items_founder_clarification_task_unique
on public.ai_meeting_items (
  meeting_id,
  related_task_id
)
where related_task_id is not null
  and metadata ->> 'source' =
    'founder_clarification_queue';
