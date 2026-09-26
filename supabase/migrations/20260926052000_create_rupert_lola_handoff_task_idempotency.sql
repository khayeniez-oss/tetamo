-- ============================================================
-- RUPERT <- LOLA HANDOFF TASK IDEMPOTENCY
--
-- One internal Rupert task per Lola -> Rupert handoff.
-- The handoff UUID is used as the deterministic source_id.
-- ============================================================

create unique index if not exists
  ai_tasks_rupert_lola_handoff_unique
on public.ai_tasks (
  source_type,
  source_id
)
where source_type = 'rupert_lola_handoff'
  and source_id is not null;
