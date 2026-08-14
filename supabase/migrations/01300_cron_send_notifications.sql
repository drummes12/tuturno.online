-- =============================================================================
-- 01300: Cron para invocar la Edge Function send-notifications
--
-- Las notificaciones se encolan en notification_outbox (status='pending') desde
-- las RPCs de reservas. Esta migración programa un cron que invoca la Edge
-- Function send-notifications cada minuto para procesar la bandeja.
--
-- Patrón: pg_cron → pg_net (HTTP POST) → Edge Function
-- Secrets: vault (supabase_base_url, service_role_key)
--
-- La Edge Function usa auth: ['secret'], que espera las secret keys de
-- Supabase (sb_secret_...), no el JWT del service_role.
--
-- Setup manual (una sola vez, desde el SQL Editor de Supabase):
--   select vault.create_secret('https://tu-proyecto.supabase.co', 'supabase_base_url');
--   select vault.create_secret('sb_secret_xxx', 'service_role_key');
-- =============================================================================

-- pg_net: permite hacer peticiones HTTP desde PostgreSQL
create extension if not exists pg_net schema extensions;

-- pg_cron: ya está habilitado en 01000, pero aseguramos por si acaso
create extension if not exists pg_cron with schema extensions;

-- -----------------------------------------------------------------------------
-- Función wrapper: invoca la Edge Function send-notifications vía HTTP POST.
-- Lee los secrets desde vault. Si los secrets no existen, no hace nada
-- (para no romper el cron en entornos donde aún no se configuraron).
-- -----------------------------------------------------------------------------
create or replace function public.dispatch_send_notifications()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_base_url text;
  v_secret_key text;
begin
  -- Leer secrets desde vault
  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'supabase_base_url'
  limit 1;

  select decrypted_secret into v_secret_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  -- Si no hay secrets configurados, salir silenciosamente
  if v_base_url is null or v_secret_key is null then
    return;
  end if;

  -- Invocar la Edge Function (auth: ['secret'] espera sb_secret_... en apiKey)
  perform net.http_post(
    url     := v_base_url || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apiKey', v_secret_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Programar el cron: cada minuto
-- -----------------------------------------------------------------------------
do $cron$
begin
  -- Eliminar job previo si existe (idempotente)
  if exists (
    select 1 from cron.job where jobname = 'send-notifications'
  ) then
    perform cron.unschedule('send-notifications');
  end if;

  -- Programar cada minuto
  perform cron.schedule(
    'send-notifications',
    '* * * * *',
    $job$select public.dispatch_send_notifications();$job$
  );
end$cron$;

-- Permisos: solo el rol service_role puede ejecutar el wrapper
-- (pg_cron corre como el rol que programa el job, típicamente postgres)
grant execute on function public.dispatch_send_notifications() to service_role;
