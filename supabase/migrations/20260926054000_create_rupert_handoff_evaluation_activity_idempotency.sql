-- ============================================================
-- RUPERT HANDOFF EVALUATION ACTIVITY IDEMPOTENCY
--
-- Preserve separate audit records for genuine reevaluations
-- of the same handoff while suppressing duplicate writes from
-- the same evaluation cycle.
-- ============================================================

create unique index if not exists
  ai_activity_rupert_handoff_evaluation_unique
on public.ai_activity (
  agent_id,
  action,
  entity_type,
  entity_id,
  (details ->> 'evaluation_key')
)
where action = 'evaluated_lola_handoff'
  and entity_type = 'ai_handoff'
  and details ->> 'source' = 'rupert_handoff_intake'
  and details ->> 'evaluation_key' is not null;
