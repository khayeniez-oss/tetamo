-- Fix Mona scheduler Vault lookup.
-- Existing Vault secret:
--   MONA_FOLLOWUP_SECRET
--
-- Vercel:
--   MONA_FOLLOWUP_SECRET

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
  select btrim(decrypted_secret, E' \\n\\r\\t')
  into followup_secret
  from vault.decrypted_secrets
  where name = 'MONA_FOLLOWUP_SECRET'
  limit 1;

  if followup_secret is null
    or length(followup_secret) = 0
  then
    raise warning
      'Mona follow-up Vault secret MONA_FOLLOWUP_SECRET is missing';

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
