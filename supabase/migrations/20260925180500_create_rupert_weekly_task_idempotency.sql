-- Rupert weekly automation idempotency.
--
-- Each weekly blog slot has a deterministic source_id:
-- YYYY-MM-DD:1
-- YYYY-MM-DD:2
-- YYYY-MM-DD:3
--
-- This prevents duplicate tasks if a scheduler request is
-- repeated or two workers overlap.

create unique index if not exists
  ai_tasks_rupert_weekly_source_unique
on public.ai_tasks (
  source_type,
  source_id
)
where source_type = 'rupert_weekly_blog'
  and source_id is not null;
