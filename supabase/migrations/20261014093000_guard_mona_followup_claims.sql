-- Safety filter for scheduled Mona follow-up claims.
-- Keep transport + Brain checks as independent final defenses.
-- Replaces the existing function if present. Review LIVE definition before applying.
create or replace function public.claim_due_mona_followups(p_limit integer default 25)
returns table(conversation_id uuid, claim_token text)
language plpgsql
security definer
set search_path to public
as $$
begin
  return query
  with due as (
    select wc.id
    from public.whatsapp_conversations wc
    where wc.mona_next_followup_due_at is not null
      and wc.mona_next_followup_due_at <= now()
      and wc.opted_out_at is null
      and coalesce(lower(wc.status), '') not in ('blocked', 'opted_out')
      and wc.ai_enabled is distinct from false
      and wc.handover_to_admin is distinct from true
      and coalesce(wc.mona_journey_status, '') not in ('stopped', 'resolved')
      and coalesce(wc.sales_stage, '') not in ('closed_won', 'closed_lost')
      and coalesce(wc.mona_dependency_controlled, false) is false
      and (
        wc.mona_followup_claimed_at is null
        or wc.mona_followup_claimed_at < now() - interval '10 minutes'
      )
    order by wc.mona_next_followup_due_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  ),
  claimed as (
    update public.whatsapp_conversations wc
    set mona_followup_claimed_at = now(),
        mona_followup_claim_token = gen_random_uuid()::text
    from due
    where wc.id = due.id
    returning wc.id, wc.mona_followup_claim_token
  )
  select claimed.id, claimed.mona_followup_claim_token from claimed;
end;
$$;

-- Only the server-side service role may claim due follow-ups.
revoke execute on function
  public.claim_due_mona_followups(integer)
  from PUBLIC, anon, authenticated;

grant execute on function
  public.claim_due_mona_followups(integer)
  to service_role;
