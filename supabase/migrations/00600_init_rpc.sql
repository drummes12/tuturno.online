-- =============================================================================
-- 6. RPCs — Lógica de negocio transaccional
-- =============================================================================

-- =============================================================================
-- get_availability: devuelve los slots de una cancha para una fecha
-- =============================================================================
create or replace function public.get_availability(
  p_court_id uuid,
  p_date date
)
returns table(
  court_id uuid,
  court_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_court record;
  v_business_id uuid;
  v_timezone text;
  v_slot_minutes integer;
  v_max_advance integer;
  v_day_of_week integer;
  v_hours record;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_now timestamptz := now();
begin
  -- Obtener datos de la cancha y negocio
  select c.*, b.timezone, b.slot_duration_minutes, b.max_advance_days
  into v_court
  from public.courts c
  join public.businesses b on c.business_id = b.id
  where c.id = p_court_id and c.is_active = true;

  if not found then
    return;
  end if;

  v_business_id := v_court.business_id;
  v_timezone := v_court.timezone;
  v_slot_minutes := v_court.slot_duration_minutes;
  v_max_advance := v_court.max_advance_days;

  -- Validar que la fecha no esté demasiado en el futuro
  if p_date > (current_date + v_max_advance) then
    return;
  end if;

  -- Determinar el día de la semana (0 = domingo)
  v_day_of_week := extract(dow from p_date);

  -- Obtener el horario para ese día
  select * into v_hours
  from public.business_hours
  where business_id = v_business_id
    and day_of_week = v_day_of_week
    and is_active = true;

  if not found then
    return; -- No hay horario para este día
  end if;

  -- Construir las marcas de tiempo en la zona horaria del negocio
  -- Usamos AT TIME ZONE para convertir correctamente
  v_day_start := (p_date::text || ' ' || v_hours.open_time || ':00')::timestamp at time zone v_timezone;
  v_day_end := (p_date::text || ' ' || v_hours.close_time || ':00')::timestamp at time zone v_timezone;

  -- Generar slots
  v_slot_start := v_day_start;
  while v_slot_start + (v_slot_minutes || ' minutes')::interval <= v_day_end loop
    v_slot_end := v_slot_start + (v_slot_minutes || ' minutes')::interval;

    -- Determinar el estado del slot
    if v_slot_start <= v_now then
      -- Slot en el pasado
      v_slot_start := v_slot_end;
      continue;
    end if;

    return query
    select
      p_court_id,
      v_court.name,
      v_slot_start,
      v_slot_end,
      coalesce(
        (select case
          when r.status = 'pending' and r.hold_expires_at > v_now then 'held'
          when r.status = 'confirmed' then 'reserved'
          when r.status = 'pending' and r.hold_expires_at <= v_now then 'available' -- expirada, disponible
          else 'reserved'
        end
        from public.reservations r
        where r.court_id = p_court_id
          and r.status in ('pending', 'confirmed')
          and r.starts_at = v_slot_start
        limit 1),
        -- Verificar excepciones/bloqueos
        (select case
          when exists(
            select 1 from public.availability_exceptions ae
            where ae.business_id = v_business_id
              and (ae.court_id is null or ae.court_id = p_court_id)
              and ae.starts_at <= v_slot_start
              and ae.ends_at >= v_slot_end
          ) then 'blocked'
          else 'available'
        end)
      )::text;

    v_slot_start := v_slot_end;
  end loop;
end;
$$;

-- =============================================================================
-- create_reservation: crea una solicitud de reserva con hold temporal
-- =============================================================================
create or replace function public.create_reservation(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_notes text default null
)
returns table(id uuid, status text, hold_expires_at timestamptz, error text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_court record;
  v_business_id uuid;
  v_slot_minutes integer;
  v_hold_minutes integer;
  v_max_advance integer;
  v_cancel_limit integer;
  v_ends_at timestamptz;
  v_hold_expires timestamptz;
  v_now timestamptz := now();
  v_existing record;
  v_exception record;
  v_reservation_id uuid;
  v_business_name text;
  v_user_email text;
  v_user_name text;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, null::timestamptz, 'No autenticado'::text;
    return;
  end if;

  -- Obtener datos de la cancha y negocio
  select c.*, b.timezone, b.slot_duration_minutes, b.hold_duration_minutes,
         b.max_advance_days, b.cancellation_limit_hours, b.name as business_name
  into v_court
  from public.courts c
  join public.businesses b on c.business_id = b.id
  where c.id = p_court_id and c.is_active = true;

  if not found then
    return query select null::uuid, null::text, null::timestamptz, 'Cancha no disponible'::text;
    return;
  end if;

  v_business_id := v_court.business_id;
  v_slot_minutes := v_court.slot_duration_minutes;
  v_hold_minutes := v_court.hold_duration_minutes;
  v_max_advance := v_court.max_advance_days;

  -- Calcular ends_at
  v_ends_at := p_starts_at + (v_slot_minutes || ' minutes')::interval;

  -- Validar que el slot no esté en el pasado
  if p_starts_at <= v_now then
    return query select null::uuid, null::text, null::timestamptz, 'El turno ya pasó'::text;
    return;
  end if;

  -- Validar anticipación máxima
  if p_starts_at > v_now + (v_max_advance || ' days')::interval then
    return query select null::uuid, null::text, null::timestamptz, 'Fecha demasiado lejana'::text;
    return;
  end if;

  -- Tomar un advisory lock para esta cancha+slot (evita doble reserva)
  perform pg_advisory_xact_lock(hashtext(p_court_id::text || p_starts_at::text));

  -- Verificar que no haya reserva activa para este slot
  select * into v_existing
  from public.reservations r
  where r.court_id = p_court_id
    and r.starts_at = p_starts_at
    and (
      (r.status = 'pending' and r.hold_expires_at > v_now)
      or r.status = 'confirmed'
    )
  limit 1;

  if found then
    return query select null::uuid, null::text, null::timestamptz, 'Turno no disponible'::text;
    return;
  end if;

  -- Verificar que no haya excepción/bloqueo
  select * into v_exception
  from public.availability_exceptions ae
  where ae.business_id = v_business_id
    and (ae.court_id is null or ae.court_id = p_court_id)
    and ae.starts_at <= p_starts_at
    and ae.ends_at >= v_ends_at
  limit 1;

  if found then
    return query select null::uuid, null::text, null::timestamptz, 'Turno bloqueado'::text;
    return;
  end if;

  -- Calcular hold_expires_at
  v_hold_expires := v_now + (v_hold_minutes || ' minutes')::interval;

  -- Crear la reserva
  insert into public.reservations (
    business_id, court_id, user_id, starts_at, ends_at,
    status, hold_expires_at, notes
  )
  values (v_business_id, p_court_id, v_user_id, p_starts_at, v_ends_at, 'pending', v_hold_expires, p_notes)
  returning public.reservations.id into v_reservation_id;

  -- Registrar evento
  perform public.log_reservation_event(v_reservation_id, null, 'pending', v_user_id, null);

  -- Obtener datos del usuario para notificación
  select au.email into v_user_email from auth.users au where au.id = v_user_id;
  select p.full_name into v_user_name from public.profiles p where p.id = v_user_id;

  -- Encolar notificación al cliente
  perform public.enqueue_notification(
    'reservation_created_client',
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'business_name', v_court.business_name,
      'court_name', v_court.name,
      'starts_at', p_starts_at,
      'ends_at', v_ends_at
    ),
    'reservation_created_client_' || v_reservation_id::text
  );

  -- Encolar notificación al negocio (obtener email del owner)
  perform public.enqueue_notification(
    'reservation_created_business',
    coalesce(
      (select au.email from public.business_members bm
       join auth.users au on au.id = bm.user_id
       where bm.business_id = v_business_id and bm.role = 'owner'
       limit 1),
      ''
    ),
    v_court.business_name,
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'client_name', v_user_name,
      'client_email', v_user_email,
      'court_name', v_court.name,
      'starts_at', p_starts_at,
      'ends_at', v_ends_at
    ),
    'reservation_created_business_' || v_reservation_id::text
  );

  return query select v_reservation_id, 'pending'::text, v_hold_expires, null::text;
end;
$$;

-- =============================================================================
-- confirm_reservation: el negocio confirma una solicitud
-- =============================================================================
create or replace function public.confirm_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation record;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_user_name text;
  v_business_name text;
  v_court_name text;
begin
  -- Cargar la reserva con bloqueo
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  -- Verificar permisos
  if not public.is_business_member(v_reservation.business_id) then
    raise exception 'Sin permisos para confirmar esta reserva';
  end if;

  -- Solo se pueden confirmar reservas pendientes
  if v_reservation.status != 'pending' then
    raise exception 'Solo se pueden confirmar reservas pendientes';
  end if;

  -- Verificar que el hold no haya expirado
  if v_reservation.hold_expires_at <= now() then
    raise exception 'El tiempo de espera ha expirado';
  end if;

  -- Confirmar
  update public.reservations
  set status = 'confirmed', hold_expires_at = null, decided_by = v_user_id
  where id = p_reservation_id;

  -- Registrar evento
  perform public.log_reservation_event(p_reservation_id, 'pending', 'confirmed', v_user_id, null);

  -- Notificar al cliente
  select email into v_user_email from auth.users where id = v_reservation.user_id;
  select full_name into v_user_name from public.profiles where id = v_reservation.user_id;
  select b.name, c.name into v_business_name, v_court_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.courts c on r.court_id = c.id
  where r.id = p_reservation_id;

  perform public.enqueue_notification(
    'reservation_confirmed',
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'business_name', v_business_name,
      'court_name', v_court_name,
      'starts_at', v_reservation.starts_at,
      'ends_at', v_reservation.ends_at
    ),
    'reservation_confirmed_' || p_reservation_id::text
  );
end;
$$;

-- =============================================================================
-- reject_reservation: el negocio rechaza una solicitud
-- =============================================================================
create or replace function public.reject_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation record;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_user_name text;
  v_business_name text;
  v_court_name text;
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if not public.is_business_member(v_reservation.business_id) then
    raise exception 'Sin permisos para rechazar esta reserva';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'No se puede rechazar una reserva en estado %', v_reservation.status;
  end if;

  update public.reservations
  set status = 'rejected', decided_by = v_user_id, decision_reason = p_reason, hold_expires_at = null
  where id = p_reservation_id;

  perform public.log_reservation_event(p_reservation_id, v_reservation.status, 'rejected', v_user_id, p_reason);

  -- Notificar al cliente
  select email into v_user_email from auth.users where id = v_reservation.user_id;
  select full_name into v_user_name from public.profiles where id = v_reservation.user_id;
  select b.name, c.name into v_business_name, v_court_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.courts c on r.court_id = c.id
  where r.id = p_reservation_id;

  perform public.enqueue_notification(
    'reservation_rejected',
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'business_name', v_business_name,
      'court_name', v_court_name,
      'starts_at', v_reservation.starts_at,
      'reason', p_reason
    ),
    'reservation_rejected_' || p_reservation_id::text
  );
end;
$$;

-- =============================================================================
-- cancel_reservation_by_client: el cliente cancela su reserva
-- =============================================================================
create or replace function public.cancel_reservation_by_client(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation record;
  v_user_id uuid := auth.uid();
  v_cancel_limit integer;
  v_user_email text;
  v_user_name text;
  v_business_name text;
  v_court_name text;
  v_owner_email text;
begin
  select r.*, b.cancellation_limit_hours into v_reservation
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if v_reservation.user_id != v_user_id then
    raise exception 'No puedes cancelar una reserva que no es tuya';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'No se puede cancelar una reserva en estado %', v_reservation.status;
  end if;

  -- Verificar límite de cancelación (solo para confirmadas)
  if v_reservation.status = 'confirmed' then
    if v_reservation.starts_at - (v_reservation.cancellation_limit_hours || ' hours')::interval <= now() then
      raise exception 'Ya no puedes cancelar. El límite es % horas antes del turno.', v_reservation.cancellation_limit_hours;
    end if;
  end if;

  update public.reservations
  set status = 'cancelled_by_client', hold_expires_at = null
  where id = p_reservation_id;

  perform public.log_reservation_event(p_reservation_id, v_reservation.status, 'cancelled_by_client', v_user_id, null);

  -- Notificar al cliente y al negocio
  select email into v_user_email from auth.users where id = v_user_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;
  select b.name, c.name into v_business_name, v_court_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.courts c on r.court_id = c.id
  where r.id = p_reservation_id;

  perform public.enqueue_notification(
    'reservation_cancelled_client',
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'business_name', v_business_name,
      'court_name', v_court_name,
      'starts_at', v_reservation.starts_at
    ),
    'reservation_cancelled_client_' || p_reservation_id::text
  );

  -- Notificar al owner del negocio
  select au.email into v_owner_email
  from public.business_members bm
  join auth.users au on au.id = bm.user_id
  where bm.business_id = v_reservation.business_id and bm.role = 'owner'
  limit 1;

  if v_owner_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_business',
      v_owner_email,
      v_business_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'client_name', v_user_name,
        'court_name', v_court_name,
        'starts_at', v_reservation.starts_at
      ),
      'reservation_cancelled_business_' || p_reservation_id::text
    );
  end if;
end;
$$;

-- =============================================================================
-- expire_pending_reservations: marca como expiradas las reservas pendientes
-- cuyo hold ya venció. Se ejecuta vía cron/scheduled function.
-- =============================================================================
create or replace function public.expire_pending_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select id from public.reservations
    where status = 'pending' and hold_expires_at <= now()
  loop
    update public.reservations set status = 'expired', hold_expires_at = null where id = v_row.id;
    perform public.log_reservation_event(v_row.id, 'pending', 'expired', null, 'Hold expirado');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- =============================================================================
-- Permisos: permitir que usuarios autenticados ejecuten los RPCs públicos
-- =============================================================================
grant execute on function public.get_availability(uuid, date) to anon, authenticated;
grant execute on function public.create_reservation(uuid, timestamptz, text) to authenticated;
grant execute on function public.confirm_reservation(uuid) to authenticated;
grant execute on function public.reject_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_reservation_by_client(uuid) to authenticated;
grant execute on function public.expire_pending_reservations() to service_role;
