create or replace function public.dispatch_send_push_notifications()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_base_url text;
  v_secret_key text;
begin
  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'supabase_base_url'
  limit 1;

  select decrypted_secret into v_secret_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_base_url is null or v_secret_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_base_url || '/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apiKey', v_secret_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

do $cron$
begin
  if exists (
    select 1 from cron.job where jobname = 'send-push-notifications'
  ) then
    perform cron.unschedule('send-push-notifications');
  end if;

  perform cron.schedule(
    'send-push-notifications',
    '*/2 * * * *',
    $job$select public.dispatch_send_push_notifications();$job$
  );
end$cron$;

grant execute on function public.dispatch_send_push_notifications() to service_role;
