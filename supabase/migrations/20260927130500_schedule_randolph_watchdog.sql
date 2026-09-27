-- ============================================================
-- RANDOLPH HOURLY PRODUCTION WATCHDOG
--
-- Supabase Cron invokes Tetamo's protected Randolph endpoint.
--
-- IMPORTANT:
-- The bearer secret is NEVER stored in this migration.
-- Supabase Vault must contain:
--
--   name: tetamo_cron_secret
--   value: same value as Vercel CRON_SECRET
--
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    raise exception
      'pg_cron is not enabled. Enable Supabase Cron before applying this migration.';
  end if;

  if not exists (
    select 1
    from pg_extension
    where extname = 'pg_net'
  ) then
    raise exception
      'pg_net is not enabled.';
  end if;
end;
$$;


-- ============================================================
-- SECURE HTTP INVOKER
-- ============================================================

create or replace function public.invoke_randolph_watchdog()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'tetamo_cron_secret'
  limit 1;

  if cron_secret is null
    or length(trim(cron_secret)) = 0
  then
    raise warning
      'Randolph watchdog Vault secret tetamo_cron_secret is missing';

    return null;
  end if;

  select net.http_get(
    url :=
      'https://www.tetamo.com/api/cron/randolph',

    headers :=
      jsonb_build_object(
        'Authorization',
        'Bearer ' || cron_secret,

        'Accept',
        'application/json',

        'User-Agent',
        'Tetamo-Supabase-Randolph-Watchdog/1.0'
      ),

    timeout_milliseconds :=
      120000
  )
  into request_id;

  return request_id;

exception
  when others then
    raise warning
      'Randolph watchdog HTTP invocation failed: %',
      sqlerrm;

    return null;
end;
$$;


revoke all
on function public.invoke_randolph_watchdog()
from public;

revoke all
on function public.invoke_randolph_watchdog()
from anon;

revoke all
on function public.invoke_randolph_watchdog()
from authenticated;


-- ============================================================
-- HOURLY SCHEDULE
--
-- Runs at :15 every hour.
-- Keeping it away from Rupert 00:00 UTC and
-- Uncle Sam 00:30 UTC reduces worker overlap.
-- ============================================================

select cron.schedule(
  'randolph-hourly-watchdog',

  '15 * * * *',

  $$
    select public.invoke_randolph_watchdog();
  $$
);
