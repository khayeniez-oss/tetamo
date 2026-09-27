-- ============================================================
-- MONA DEDICATED FOLLOW-UP SCHEDULER AUTHENTICATION
--
-- Supabase Vault:
--   mona_followup_secret
--
-- Vercel Production:
--   MONA_FOLLOWUP_SECRET
--
-- Does NOT modify the shared CRON_SECRET.
-- ============================================================

create or replace function public.invoke_mona_followup()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  followup_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into followup_secret
  from vault.decrypted_secrets
  where name = 'mona_followup_secret'
  limit 1;

  if followup_secret is null
    or length(trim(followup_secret)) = 0
  then
    raise warning
      'Mona follow-up Vault secret mona_followup_secret is missing';

    return null;
  end if;

  select net.http_post(
    url :=
      'https://www.tetamo.com/api/whatsapp/mona-followup',

    body :=
      '{}'::jsonb,

    params :=
      '{}'::jsonb,

    headers :=
      jsonb_build_object(
        'Authorization',
        'Bearer ' || followup_secret,

        'Content-Type',
        'application/json',

        'User-Agent',
        'Tetamo-Supabase-Mona-Followup/1.0'
      ),

    timeout_milliseconds :=
      30000
  )
  into request_id;

  return request_id;

exception
  when others then
    raise warning
      'Mona follow-up HTTP invocation failed: %',
      sqlerrm;

    return null;
end;
$$;

revoke all
on function public.invoke_mona_followup()
from public;

revoke all
on function public.invoke_mona_followup()
from anon;

revoke all
on function public.invoke_mona_followup()
from authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname =
      'mona-followup-every-5-minutes'
  loop
    perform cron.unschedule(
      existing_job.jobid
    );
  end loop;
end;
$$;

select cron.schedule(
  'mona-followup-every-5-minutes',
  '*/5 * * * *',
  $job$
    select public.invoke_mona_followup();
  $job$
);
