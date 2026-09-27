-- ============================================================
-- ONE ACTIVE AI TEAM MEETING PER CREATOR
--
-- Prevent duplicate in-progress meetings caused by double-clicks,
-- request retries, or concurrent Meeting Room start requests.
--
-- Completed/cancelled meetings are unaffected.
-- Different admin users may each have their own active meeting.
-- ============================================================

create unique index if not exists
  ai_meetings_one_in_progress_per_creator
on public.ai_meetings (
  created_by_user_id
)
where status = 'in_progress'
  and created_by_user_id is not null;
