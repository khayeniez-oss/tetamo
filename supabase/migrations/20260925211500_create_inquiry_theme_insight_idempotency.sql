-- Inquiry Intelligence -> AI Insight idempotency.
--
-- Prevent overlapping workers from creating duplicate active insights
-- for the same AI agent and inquiry theme.
--
-- Scope is deliberately narrow:
-- - only ai_inquiry_theme related entities
-- - only active insight lifecycle states
-- - does not change uniqueness behavior for any other AI insight type
--
-- Once an earlier insight is dismissed or resolved, a future insight
-- for the same agent/theme may be created again.

create unique index if not exists
  ai_insights_active_inquiry_theme_agent_unique
on public.ai_insights (
  agent_id,
  related_entity_type,
  related_entity_id
)
where related_entity_type = 'ai_inquiry_theme'
  and related_entity_id is not null
  and status in (
    'open',
    'reviewing',
    'actioned'
  );
