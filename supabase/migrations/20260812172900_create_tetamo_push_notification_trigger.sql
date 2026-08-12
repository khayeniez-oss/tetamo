create or replace function public.tetamo_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  push_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into push_secret
  from vault.decrypted_secrets
  where name = 'tetamo_push_webhook_secret'
  limit 1;

  if push_secret is null or length(trim(push_secret)) = 0 then
    raise warning 'Tetamo push webhook secret is missing';
    return new;
  end if;

  select net.http_post(
    url := 'https://lfqodnkpcueokgqdbomg.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-tetamo-push-secret', push_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', new.id
      ),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  )
  into request_id;

  return new;

exception
  when others then
    raise warning 'Tetamo push webhook failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists tetamo_push_notification_insert
on public.notifications;

create trigger tetamo_push_notification_insert
after insert on public.notifications
for each row
execute function public.tetamo_push_on_notification_insert();
