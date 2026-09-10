-- =============================================================================
-- 03600: Hotfix — timeouts en expire_pending_reservations y notification_outbox
--
-- Problema: desde el despliegue de v1.0.0, la Edge Function send-notifications
-- hace ~250 consultas DB por ciclo (50 notificaciones × 5 queries c/u) en lugar
-- de ~50-100. Esto satura el pool de conexiones, provocando 504 en las primeras
-- consultas (expire RPC + claim). Cuando el expire RPC timeoutea, las reservas
-- pendientes expiradas se acumulan, haciendo la próxima ejecución aún más lenta.
--
-- Soluciones a nivel BD:
-- 1. expire_pending_reservations con LIMIT para procesar en lotes
-- 2. Limpieza automática de notificaciones stuck en 'processing'
-- 3. Índice optimizado para el claim query de notification_outbox
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. expire_pending_reservations con LIMIT
--
-- Antes procesaba TODAS las reservas expiradas en una sola transacción. Si
-- había backlog (por timeouts previos), la transacción crecía sin límite y
-- terminaba timeouteando. Ahora procesa en lotes de 200; si hay más, el
-- siguiente ciclo del cron las toma.
-- -----------------------------------------------------------------------------
create or replace function public.expire_pending_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
  v_client_email text;
  v_client_name text;
begin
  for v_row in
    select
      r.id,
      r.user_id,
      r.client_id,
      r.starts_at,
      r.ends_at,
      c.name as resource_name,
      b.name as business_name,
      au.email as user_email,
      p.full_name as user_name
    from public.reservations r
    join public.resources c on c.id = r.resource_id
    join public.businesses b on b.id = r.business_id
    left join auth.users au on au.id = r.user_id
    left join public.profiles p on p.id = r.user_id
    where r.status = 'pending'
      and r.hold_expires_at <= now()
    order by r.hold_expires_at asc
    limit 200
  loop
    update public.reservations
    set status = 'expired', hold_expires_at = null
    where id = v_row.id;

    perform public.log_reservation_event(
      v_row.id,
      'pending',
      'expired',
      null,
      'Hold expirado'
    );

    -- Priorizar contacto desde clients; fallback a auth.users
    v_client_email := v_row.user_email;
    v_client_name := v_row.user_name;

    if v_row.client_id is not null then
      select cl.email, cl.name into v_client_email, v_client_name
      from public.clients cl where cl.id = v_row.client_id;
    end if;

    if v_client_email is not null and btrim(v_client_email) <> '' then
      perform public.enqueue_notification(
        'reservation_expired',
        v_client_email,
        v_client_name,
        jsonb_build_object(
          'reservation_id', v_row.id,
          'business_name', v_row.business_name,
          'resource_name', v_row.resource_name,
          'starts_at', v_row.starts_at,
          'ends_at', v_row.ends_at
        ),
        'reservation_expired_' || v_row.id::text
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_pending_reservations() to service_role;

-- -----------------------------------------------------------------------------
-- 2. Limpieza de notificaciones stuck en 'processing'
--
-- Si la Edge Function crashea o timeoutea después del claim (cambiar a
-- 'processing') pero antes de enviar/marcar las notificaciones, quedan
-- stuck en 'processing' para siempre. Esta función las devuelve a 'pending'
-- si llevan más de 5 minutos en 'processing'.
-- -----------------------------------------------------------------------------
create or replace function public.recover_stuck_notifications()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notification_outbox
  set status = 'pending'
  where status = 'processing'
    and created_at < now() - interval '5 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.recover_stuck_notifications() to service_role;

-- Programar cron cada 5 minutos para recuperar notificaciones stuck
do $cron$
begin
  if exists (
    select 1 from cron.job where jobname = 'recover-stuck-notifications'
  ) then
    perform cron.unschedule('recover-stuck-notifications');
  end if;

  perform cron.schedule(
    'recover-stuck-notifications',
    '*/5 * * * *',
    $job$select public.recover_stuck_notifications();$job$
  );
end$cron$;

-- Ejecutar una vez para limpiar el backlog actual
select public.recover_stuck_notifications();

-- -----------------------------------------------------------------------------
-- 3. Índice optimizado para el claim query de notification_outbox
--
-- El claim de la Edge Function filtra por status='pending' AND attempts<3,
-- ordena por created_at ASC, y limita a 50. El índice parcial existente
-- (idx_outbox_status) solo cubre status='pending'; Postgres tiene que escanear
-- y filtrar por attempts y ordenar en memoria. Este nuevo índice cubre
-- exactamente el patrón del claim query.
-- -----------------------------------------------------------------------------
create index if not exists idx_outbox_claim
  on public.notification_outbox (created_at)
  where status = 'pending' and attempts < 3;

-- El índice anterior ya no es óptimo pero lo dejamos por compatibilidad
-- (otras consultas podrían usarlo).

-- -----------------------------------------------------------------------------
-- 4. LIMIT en complete_past_reservations
--
-- Misma vulnerabilidad que expire_pending_reservations: si hay backlog de
-- reservas confirmadas cuyo turno ya terminó, procesa todas en una transacción
-- y puede timeoutar. Añadimos LIMIT 200.
-- -----------------------------------------------------------------------------
create or replace function public.complete_past_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select id
    from public.reservations
    where status = 'confirmed'
      and ends_at <= now()
    order by ends_at asc
    for update skip locked
    limit 200
  loop
    update public.reservations
    set status = 'completed', hold_expires_at = null
    where id = v_row.id
      and status = 'confirmed'
      and ends_at <= now();

    if found then
      perform public.log_reservation_event(
        v_row.id,
        'confirmed',
        'completed',
        null,
        'Turno finalizado'
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.complete_past_reservations() from public, anon, authenticated;
grant execute on function public.complete_past_reservations() to service_role;
