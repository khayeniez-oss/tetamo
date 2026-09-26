-- ============================================================
-- INQUIRY INSIGHT ACTIVITY IDEMPOTENCY
--
-- One creation-audit event per inquiry-intelligence insight.
--
-- This is deliberately narrow:
-- it does NOT make ai_activity globally unique.
-- ============================================================

create unique index if not exists
  ai_activity_inquiry_insight_created_unique
on public.ai_activity (
  entity_type,
  entity_id,
  action
)
where event_type = 'inquiry_intelligence'
  and action = 'created_inquiry_theme_insight'
  and entity_type = 'ai_insight'
  and entity_id is not null;
