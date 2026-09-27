-- ============================================================
-- RANDOLPH DEDICATED WATCHDOG AUTHENTICATION
--
-- Randolph now uses a dedicated secret rather than Tetamo's
-- shared CRON_SECRET.
--
-- Supabase Vault:
--   randolph_watchdog_secret
--
-- Vercel Production:
--   RANDOLPH_WATCHDOG_SECRET
-- ============================================================

create or replace function public.invoke_randolph_watchdog()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  watchdog_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into watchdog_secret
  from vault.decrypted_secrets
  where name = 'randolph_watchdog_secret'
  limit 1;

  if watchdog_secret is null
    or length(trim(watchdog_secret)) = 0
  then
    raise warning
      'Randolph watchdog Vault secret randolph_watchdog_secret is missing';

    return null;
  end if;

  select net.http_get(
    url :=
      'https://www.tetamo.com/api/cron/randolph',

    headers :=
      jsonb_build_object(
        'Authorization',
        'Bearer ' || watchdog_secret,

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
