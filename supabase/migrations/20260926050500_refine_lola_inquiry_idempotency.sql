-- ============================================================
-- REFINE LOLA INQUIRY EVALUATION IDEMPOTENCY
--
-- Preserve superseded/cancelled history while allowing a
-- corrected evaluation of the same source insight.
-- ============================================================


-- ------------------------------------------------------------
-- LOLA DECISIONS
--
-- Only one CURRENT evaluator decision per insight.
--
-- Terminal decisions such as:
--   rejected
--   superseded
--
-- remain historical records and do not block a corrected
-- evaluation.
-- ------------------------------------------------------------

drop index if exists
  public.ai_decisions_lola_inquiry_insight_unique;

create unique index
  ai_decisions_lola_inquiry_insight_unique
on public.ai_decisions (
  proposed_by_agent_id,
  related_entity_type,
  related_entity_id
)
where related_entity_type = 'ai_insight'
  and related_entity_id is not null
  and metadata ->> 'source' = 'lola_inquiry_evaluator'
  and status in (
    'proposed',
    'approved',
    'deferred'
  );


-- ------------------------------------------------------------
-- LOLA -> RUPERT HANDOFFS
--
-- Only one CURRENT / SUCCESSFUL handoff per source insight.
--
-- cancelled or declined handoffs remain historical records
-- but do not block a corrected handoff.
-- ------------------------------------------------------------

drop index if exists
  public.ai_handoffs_lola_inquiry_insight_unique;

create unique index
  ai_handoffs_lola_inquiry_insight_unique
on public.ai_handoffs (
  from_agent_id,
  to_agent_id,
  (context ->> 'source_insight_id')
)
where context ->> 'source' = 'lola_inquiry_evaluator'
  and context ->> 'source_insight_id' is not null
  and status in (
    'pending',
    'accepted',
    'completed'
  );
