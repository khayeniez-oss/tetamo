-- ============================================================
-- REFINE RUPERT <- LOLA TASK IDEMPOTENCY
--
-- A cancelled task remains historical but does not block a
-- corrected task for the same handoff.
-- ============================================================

drop index if exists
  public.ai_tasks_rupert_lola_handoff_unique;

create unique index
  ai_tasks_rupert_lola_handoff_unique
on public.ai_tasks (
  source_type,
  source_id
)
where source_type = 'rupert_lola_handoff'
  and source_id is not null
  and status in (
    'pending',
    'in_progress',
    'blocked',
    'awaiting_approval',
    'completed'
  );
