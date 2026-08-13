-- =============================================================================
-- 01000: Cron auto-expire + admin auto-confirm + cancel by business
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. pg_cron: auto-expirar reservas pendientes cada 5 minutos
--    Requiere extensión pg_cron (activa en Supabase por defecto)
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

-- Eliminar job previo si existe (idempotente)
do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'expire-pending-reservations'
  ) then
    perform cron.unschedule('expire-pending-reservations');
  end if;
end$$;

-- Programar cada 5 minutos
select cron.schedule(
  'expire-pending-reservations',
  '*/5 * * * *',
  $$select public.expire_pending_reservations();$$
);


-- -----------------------------------------------------------------------------
-- 2. create_reservation_admin: permite que un miembro del negocio cree una
--    reserva directamente confirmada (sin hold, sin necesidad de confirmación).
--    El admin provee nombre y teléfono del cliente (no se autentica al cliente).
--    Si el cliente ya tiene cuenta (por teléfono), se vincula su user_id.
--    Si no, user_id queda como el del admin (la reserva la gestiona el negocio).
-- -----------------------------------------------------------------------------
create or replace function public.create_reservation_admin(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_client_name text default null,
  p_client_phone text default null,
  p_notes text default null
)
returns table(id uuid, status text, error text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_court record;
  v_business_id uuid;
  v_slot_minutes integer;
  v_max_advance integer;
  v_ends_at timestamptz;
  v_now timestamptz := now();
  v_existing record;
  v_exception record;
  v_reservation_id uuid;
  v_client_user_id uuid := null;
  v_business_name text;
  v_user_email text;
  v_user_name text;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, 'No autenticado'::text;
    return;
  end if;

  -- Obtener datos de la cancha y negocio
  select c.*, b.timezone, b.slot_duration_minutes,
         b.max_advance_days, b.name as business_name
  into v_court
  from public.courts c
  join public.businesses b on c.business_id = b.id
  where c.id = p_court_id and c.is_active = true;

  if not found then
    return query select null::uuid, null::text, 'Cancha no disponible'::text;
    return;
  end if;

  v_business_id := v_court.business_id;
  v_slot_minutes := v_court.slot_duration_minutes;
  v_max_advance := v_court.max_advance_days;

  -- Verificar que el usuario sea miembro del negocio
  if not public.is_business_member(v_business_id) then
    return query select null::uuid, null::text, 'Sin permisos para crear reservas en este negocio'::text;
    return;
  end if;

  -- Calcular ends_at
  v_ends_at := p_starts_at + (v_slot_minutes || ' minutes')::interval;

  -- Validar que el slot no esté en el pasado
  if p_starts_at <= v_now then
    return query select null::uuid, null::text, 'El turno ya pasó'::text;
    return;
  end if;

  -- Validar anticipación máxima
  if p_starts_at > v_now + (v_max_advance || ' days')::interval then
    return query select null::uuid, null::text, 'Fecha demasiado lejana'::text;
    return;
  end if;

  -- Advisory lock
  perform pg_advisory_xact_lock(hashtext(p_court_id::text || p_starts_at::text));

  -- Verificar que no haya reserva activa
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
    return query select null::uuid, null::text, 'Turno no disponible'::text;
    return;
  end if;

  -- Verificar excepciones
  select * into v_exception
  from public.availability_exceptions ae
  where ae.business_id = v_business_id
    and (ae.court_id is null or ae.court_id = p_court_id)
    and ae.starts_at <= p_starts_at
    and ae.ends_at >= v_ends_at
  limit 1;

  if found then
    return query select null::uuid, null::text, 'Turno bloqueado'::text;
    return;
  end if;

  -- Intentar vincular cliente por teléfono (si existe profile con ese phone)
  if p_client_phone is not null then
    select p.id into v_client_user_id
    from public.profiles p
    where p.phone = p_client_phone
    limit 1;
  end if;

  -- Si no se encontró por teléfono, el user_id es el del admin
  if v_client_user_id is null then
    v_client_user_id := v_user_id;
  end if;

  -- Crear la reserva directamente confirmada
  insert into public.reservations (
    business_id, court_id, user_id, starts_at, ends_at,
    status, hold_expires_at, notes, decided_by
  )
  values (
    v_business_id, p_court_id, v_client_user_id, p_starts_at, v_ends_at,
    'confirmed', null,
    coalesce(p_notes, '') ||
      case when p_client_name is not null then ' | Cliente: ' || p_client_name else '' end,
    v_user_id
  )
  returning public.reservations.id into v_reservation_id;

  -- Registrar evento
  perform public.log_reservation_event(v_reservation_id, null, 'confirmed', v_user_id, 'Creada por admin');

  -- Notificar al cliente si tiene cuenta
  select au.email into v_user_email from auth.users au where au.id = v_client_user_id;
  select p.full_name into v_user_name from public.profiles p where p.id = v_client_user_id;

  if v_user_email is not null and v_client_user_id != v_user_id then
    perform public.enqueue_notification(
      'reservation_confirmed',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', v_reservation_id,
        'business_name', v_court.business_name,
        'court_name', v_court.name,
        'starts_at', p_starts_at,
        'ends_at', v_ends_at
      ),
      'reservation_admin_created_' || v_reservation_id::text
    );
  end if;

  return query select v_reservation_id, 'confirmed'::text, null::text;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. cancel_reservation_by_business: el negocio cancela una reserva confirmada.
--    Motivo obligatorio. Notifica al cliente.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_reservation_by_business(
  p_reservation_id uuid,
  p_reason text
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
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo de cancelación es obligatorio';
  end if;

  select * into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if not public.is_business_member(v_reservation.business_id) then
    raise exception 'Sin permisos para cancelar esta reserva';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'No se puede cancelar una reserva en estado %', v_reservation.status;
  end if;

  update public.reservations
  set status = 'cancelled_by_business',
      decided_by = v_user_id,
      decision_reason = p_reason,
      hold_expires_at = null
  where id = p_reservation_id;

  perform public.log_reservation_event(
    p_reservation_id,
    v_reservation.status,
    'cancelled_by_business',
    v_user_id,
    p_reason
  );

  -- Notificar al cliente
  select au.email into v_user_email from auth.users au where au.id = v_reservation.user_id;
  select p.full_name into v_user_name from public.profiles p where p.id = v_reservation.user_id;
  select b.name, c.name into v_business_name, v_court_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.courts c on r.court_id = c.id
  where r.id = p_reservation_id;

  if v_user_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_business',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'court_name', v_court_name,
        'starts_at', v_reservation.starts_at,
        'reason', p_reason
      ),
      'reservation_cancelled_business_client_' || p_reservation_id::text
    );
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos para los nuevos RPCs
-- -----------------------------------------------------------------------------
grant execute on function public.create_reservation_admin(uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.cancel_reservation_by_business(uuid, text) to authenticated;
