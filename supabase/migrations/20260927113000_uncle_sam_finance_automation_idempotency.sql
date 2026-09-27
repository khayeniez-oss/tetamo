-- ============================================================
-- UNCLE SAM FINANCE AUTOMATION IDEMPOTENCY
--
-- Renewal task source_id format:
--   <subscription_uuid>:<YYYY-MM-DD>
--
-- A subscription may create a new review task when its actual
-- renewal date changes, but the same renewal date must never
-- create duplicate tasks.
-- ============================================================

create unique index if not exists
  ai_tasks_uncle_sam_subscription_renewal_unique
on public.ai_tasks (
  source_type,
  source_id
)
where
  source_type = 'uncle_sam_subscription_renewal';


-- ============================================================
-- WEEKLY FINANCIAL REPORT IDEMPOTENCY
--
-- source_data.report_key format:
--   uncle_sam_weekly_finance:<YYYY-MM-DD>
--
-- Prevents cron retries from producing duplicate weekly
-- financial reports.
-- ============================================================

create unique index if not exists
  ai_reports_uncle_sam_financial_report_key_unique
on public.ai_reports (
  agent_id,
  (
    source_data ->> 'report_key'
  )
)
where
  report_type = 'financial'
  and source_data ? 'report_key';
