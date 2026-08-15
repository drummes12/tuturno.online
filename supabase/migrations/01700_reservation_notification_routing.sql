-- =============================================================================
-- 01700: Routing coherente de notificaciones de reservas
--
-- Cada evento tiene un tipo distinto según el destinatario. Esto evita enviar
-- al cliente un correo que describe una cancelación hecha por el cliente, por
-- ejemplo.
-- =============================================================================

-- Reclasificar notificaciones pendientes de cancelaciones hechas por el negocio.
-- El flujo anterior usaba reservation_cancelled_business para ambos casos; el
-- payload antiguo de una cancelación del negocio contiene `reason`.
update public.notification_outbox
set type = 'reservation_cancelled_by_business'
where type = 'reservation_cancelled_business'
  and status = 'pending'
  and payload ? 'reason';

-- Envía una notificación a todos los owners y managers de un negocio.
create or replace function public.enqueue_business_members_notification(
  p_business_id uuid,
  p_type text,
  p_payload jsonb,
  p_idempotency_prefix text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select bm.user_id, au.email, p.full_name
    from public.business_members bm
    join auth.users au on au.id = bm.user_id
    left join public.profiles p on p.id = bm.user_id
    where bm.business_id = p_business_id
      and bm.role in ('owner', 'manager')
      and au.email is not null
  loop
    perform public.enqueue_notification(
      p_type,
      v_member.email,
      v_member.full_name,
      p_payload,
      p_idempotency_prefix || '_' || v_member.user_id::text
    );
  end loop;
end;
$$;

-- Cliente crea una solicitud: recibe el cliente y reciben todos los owners/managers.
create or replace function public.create_reservation(
  p_resource_id uuid,
  p_starts_at timestamptz,
  p_notes text default null
)
returns table(id uuid, status text, hold_expires_at timestamptz, error text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_resource record;
  v_business_id uuid;
  v_slot_minutes integer;
  v_hold_minutes integer;
  v_max_advance integer;
  v_min_advance_minutes integer;
  v_ends_at timestamptz;
  v_hold_expires timestamptz;
  v_now timestamptz := now();
  v_existing record;
  v_exception record;
  v_reservation_id uuid;
  v_user_email text;
  v_user_name text;
  v_payload jsonb;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, null::timestamptz, 'No autenticado'::text;
    return;
  end if;

  select c.*, b.timezone, b.slot_duration_minutes, b.hold_duration_minutes,
         b.max_advance_days, b.min_advance_minutes, b.cancellation_limit_hours, b.name as business_name
  into v_resource
  from public.resources c
  join public.businesses b on c.business_id = b.id
  where c.id = p_resource_id and c.is_active = true;

  if not found then
    return query select null::uuid, null::text, null::timestamptz, 'Recurso no disponible'::text;
    return;
  end if;

  v_business_id := v_resource.business_id;
  v_slot_minutes := v_resource.slot_duration_minutes;
  v_hold_minutes := v_resource.hold_duration_minutes;
  v_max_advance := v_resource.max_advance_days;
  v_min_advance_minutes := v_resource.min_advance_minutes;
  v_ends_at := p_starts_at + (v_slot_minutes || ' minutes')::interval;

  if p_starts_at <= v_now then
    return query select null::uuid, null::text, null::timestamptz, 'El turno ya pasó'::text;
    return;
  end if;

  if p_starts_at < v_now + (v_min_advance_minutes || ' minutes')::interval then
    return query select null::uuid, null::text, null::timestamptz, format('Debes reservar con al menos %s minutos de anticipación', v_min_advance_minutes);
    return;
  end if;

  if p_starts_at > v_now + (v_max_advance || ' days')::interval then
    return query select null::uuid, null::text, null::timestamptz, 'Fecha demasiado lejana'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_resource_id::text || p_starts_at::text));

  select * into v_existing
  from public.reservations r
  where r.resource_id = p_resource_id
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

  select * into v_exception
  from public.availability_exceptions ae
  where ae.business_id = v_business_id
    and (ae.resource_id is null or ae.resource_id = p_resource_id)
    and ae.starts_at <= p_starts_at
    and ae.ends_at >= v_ends_at
  limit 1;

  if found then
    return query select null::uuid, null::text, null::timestamptz, 'Turno bloqueado'::text;
    return;
  end if;

  v_hold_expires := v_now + (v_hold_minutes || ' minutes')::interval;

  insert into public.reservations (
    business_id, resource_id, user_id, starts_at, ends_at,
    status, hold_expires_at, notes
  )
  values (
    v_business_id, p_resource_id, v_user_id, p_starts_at, v_ends_at,
    'pending', v_hold_expires, p_notes
  )
  returning public.reservations.id into v_reservation_id;

  perform public.log_reservation_event(
    v_reservation_id, null, 'pending', v_user_id, null
  );

  select au.email into v_user_email
  from auth.users au
  where au.id = v_user_id;

  select p.full_name into v_user_name
  from public.profiles p
  where p.id = v_user_id;

  if v_user_email is not null then
    perform public.enqueue_notification(
      'reservation_created_client',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', v_reservation_id,
        'business_name', v_resource.business_name,
        'resource_name', v_resource.name,
        'starts_at', p_starts_at,
        'ends_at', v_ends_at
      ),
      'reservation_created_client_' || v_reservation_id::text
    );
  end if;

  v_payload := jsonb_build_object(
    'reservation_id', v_reservation_id,
    'client_name', v_user_name,
    'client_email', v_user_email,
    'resource_name', v_resource.name,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at
  );

  perform public.enqueue_business_members_notification(
    v_business_id,
    'reservation_created_business',
    v_payload,
    'reservation_created_business_' || v_reservation_id::text
  );

  return query select v_reservation_id, 'pending'::text, v_hold_expires, null::text;
end;
$$;

-- El negocio crea una reserva confirmada: solo reciben owners y managers.
create or replace function public.create_reservation_admin(
  p_resource_id uuid,
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
  v_resource record;
  v_business_id uuid;
  v_slot_minutes integer;
  v_max_advance integer;
  v_ends_at timestamptz;
  v_now timestamptz := now();
  v_existing record;
  v_exception record;
  v_reservation_id uuid;
  v_client_user_id uuid;
  v_client_email text;
  v_client_profile_name text;
  v_client_name text;
  v_payload jsonb;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, 'No autenticado'::text;
    return;
  end if;

  select c.*, b.timezone, b.slot_duration_minutes,
         b.max_advance_days, b.name as business_name
  into v_resource
  from public.resources c
  join public.businesses b on c.business_id = b.id
  where c.id = p_resource_id and c.is_active = true;

  if not found then
    return query select null::uuid, null::text, 'Recurso no disponible'::text;
    return;
  end if;

  v_business_id := v_resource.business_id;
  v_slot_minutes := v_resource.slot_duration_minutes;
  v_max_advance := v_resource.max_advance_days;

  if not public.is_business_member(v_business_id) then
    return query select null::uuid, null::text, 'Sin permisos para crear reservas en este negocio'::text;
    return;
  end if;

  v_ends_at := p_starts_at + (v_slot_minutes || ' minutes')::interval;

  if p_starts_at <= v_now then
    return query select null::uuid, null::text, 'El turno ya pasó'::text;
    return;
  end if;

  if p_starts_at > v_now + (v_max_advance || ' days')::interval then
    return query select null::uuid, null::text, 'Fecha demasiado lejana'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_resource_id::text || p_starts_at::text));

  select * into v_existing
  from public.reservations r
  where r.resource_id = p_resource_id
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

  select * into v_exception
  from public.availability_exceptions ae
  where ae.business_id = v_business_id
    and (ae.resource_id is null or ae.resource_id = p_resource_id)
    and ae.starts_at <= p_starts_at
    and ae.ends_at >= v_ends_at
  limit 1;

  if found then
    return query select null::uuid, null::text, 'Turno bloqueado'::text;
    return;
  end if;

  if p_client_phone is not null then
    select p.id into v_client_user_id
    from public.profiles p
    where p.phone = p_client_phone
    limit 1;
  end if;

  if v_client_user_id is null then
    v_client_user_id := v_user_id;
  end if;

  insert into public.reservations (
    business_id, resource_id, user_id, starts_at, ends_at,
    status, hold_expires_at, notes, decided_by
  )
  values (
    v_business_id, p_resource_id, v_client_user_id, p_starts_at, v_ends_at,
    'confirmed', null,
    coalesce(p_notes, '') ||
      case when p_client_name is not null then ' | Cliente: ' || p_client_name else '' end,
    v_user_id
  )
  returning public.reservations.id into v_reservation_id;

  perform public.log_reservation_event(
    v_reservation_id, null, 'confirmed', v_user_id, 'Creada por admin'
  );

  if v_client_user_id != v_user_id then
    select au.email, p.full_name
    into v_client_email, v_client_profile_name
    from auth.users au
    left join public.profiles p on p.id = au.id
    where au.id = v_client_user_id;
  end if;

  v_client_name := coalesce(nullif(btrim(p_client_name), ''), v_client_profile_name, 'Cliente');
  v_payload := jsonb_build_object(
    'reservation_id', v_reservation_id,
    'client_name', v_client_name,
    'client_email', v_client_email,
    'resource_name', v_resource.name,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at
  );

  perform public.enqueue_business_members_notification(
    v_business_id,
    'reservation_created_by_business',
    v_payload,
    'reservation_created_by_business_' || v_reservation_id::text
  );

  return query select v_reservation_id, 'confirmed'::text, null::text;
end;
$$;

-- El cliente cancela: recibe confirmación y reciben todos los owners/managers.
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
  v_user_email text;
  v_user_name text;
  v_business_name text;
  v_resource_name text;
  v_payload jsonb;
begin
  select r.*, b.cancellation_limit_hours
  into v_reservation
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

  if v_reservation.status = 'confirmed'
    and v_reservation.starts_at - (v_reservation.cancellation_limit_hours || ' hours')::interval <= now() then
    raise exception 'Ya no puedes cancelar. El límite es % horas antes del turno.', v_reservation.cancellation_limit_hours;
  end if;

  update public.reservations
  set status = 'cancelled_by_client', hold_expires_at = null
  where id = p_reservation_id;

  perform public.log_reservation_event(
    p_reservation_id,
    v_reservation.status,
    'cancelled_by_client',
    v_user_id,
    null
  );

  select email into v_user_email from auth.users where id = v_user_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;
  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_user_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_client',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'resource_name', v_resource_name,
        'starts_at', v_reservation.starts_at
      ),
      'reservation_cancelled_client_' || p_reservation_id::text
    );
  end if;

  v_payload := jsonb_build_object(
    'reservation_id', p_reservation_id,
    'client_name', v_user_name,
    'resource_name', v_resource_name,
    'starts_at', v_reservation.starts_at
  );

  perform public.enqueue_business_members_notification(
    v_reservation.business_id,
    'reservation_cancelled_business',
    v_payload,
    'reservation_cancelled_business_' || p_reservation_id::text
  );
end;
$$;

-- El negocio cancela: el cliente recibe un correo que identifica correctamente
-- al negocio como actor e incluye el motivo.
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
  v_resource_name text;
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

  select au.email into v_user_email
  from auth.users au
  where au.id = v_reservation.user_id;

  select p.full_name into v_user_name
  from public.profiles p
  where p.id = v_reservation.user_id;

  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_user_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_by_business',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'resource_name', v_resource_name,
        'starts_at', v_reservation.starts_at,
        'reason', p_reason
      ),
      'reservation_cancelled_by_business_' || p_reservation_id::text
    );
  end if;
end;
$$;

grant execute on function public.enqueue_business_members_notification(uuid, text, jsonb, text) to service_role;
grant execute on function public.create_reservation_admin(uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.cancel_reservation_by_business(uuid, text) to authenticated;
