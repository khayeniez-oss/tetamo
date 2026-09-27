-- ============================================================
-- MONA SALES OPERATIONS REVIEW IDEMPOTENCY
-- ============================================================

create unique index if not exists
  ai_reports_mona_sales_review_key_unique
on public.ai_reports (
  agent_id,
  (
    source_data ->> 'report_key'
  )
)
where
  report_type = 'sales'
  and source_data ? 'report_key';

create unique index if not exists
  ai_insights_mona_sales_review_key_unique
on public.ai_insights (
  agent_id,
  (
    metadata ->> 'insight_key'
  )
)
where
  metadata ->> 'source' = 'mona_sales_review'
  and metadata ? 'insight_key';

create unique index if not exists
  ai_tasks_mona_sales_review_action_unique
on public.ai_tasks (
  source_type,
  source_id
)
where
  source_type = 'mona_sales_review_action';

create unique index if not exists
  ai_handoffs_mona_admin_attention_active_unique
on public.ai_handoffs (
  from_agent_id,
  to_agent_id,
  handoff_type
)
where
  handoff_type = 'sales_admin_attention_summary'
  and status in ('pending', 'accepted');
