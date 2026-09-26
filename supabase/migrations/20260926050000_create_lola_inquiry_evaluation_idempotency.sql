-- ============================================================
-- LOLA INQUIRY EVALUATION IDEMPOTENCY
--
-- Protect the autonomous inquiry-intelligence workflow from:
-- 1. creating more than one Lola evaluation decision
--    for the same AI insight;
-- 2. creating more than one Lola -> Rupert handoff
--    for the same AI insight.
--
-- These indexes are deliberately narrow and only apply to the
-- new Lola inquiry evaluator workflow.
-- ============================================================


-- ------------------------------------------------------------
-- ONE LOLA INQUIRY-EVALUATION DECISION PER AI INSIGHT
--
-- Expected decision metadata:
-- {
--   "source": "lola_inquiry_evaluator",
--   ...
-- }
--
-- related_entity_type = 'ai_insight'
-- related_entity_id   = <source insight UUID as text>
-- ------------------------------------------------------------

create unique index if not exists
  ai_decisions_lola_inquiry_insight_unique
on public.ai_decisions (
  proposed_by_agent_id,
  related_entity_type,
  related_entity_id
)
where related_entity_type = 'ai_insight'
  and related_entity_id is not null
  and metadata ->> 'source' = 'lola_inquiry_evaluator';


-- ------------------------------------------------------------
-- ONE LOLA -> RUPERT HANDOFF PER AI INSIGHT
--
-- Expected handoff context:
-- {
--   "source": "lola_inquiry_evaluator",
--   "source_insight_id": "<uuid>",
--   ...
-- }
--
-- from/to agent IDs remain part of the unique key so this
-- guard does not interfere with unrelated agent handoffs.
-- ------------------------------------------------------------

create unique index if not exists
  ai_handoffs_lola_inquiry_insight_unique
on public.ai_handoffs (
  from_agent_id,
  to_agent_id,
  (context ->> 'source_insight_id')
)
where context ->> 'source' = 'lola_inquiry_evaluator'
  and context ->> 'source_insight_id' is not null;
