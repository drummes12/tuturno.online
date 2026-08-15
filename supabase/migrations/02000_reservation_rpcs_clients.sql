-- =============================================================================
-- 02000: Actualizar RPCs de reservas para usar clients
--
-- - find_or_create_client: helper para buscar o crear un client
-- - get_client_contact: helper para obtener email/nombre/phone de un client
-- - create_reservation: ahora setea client_id
-- - create_reservation_admin: nueva firma con client_id o guest info + email
-- - confirm_reservation: obtiene contacto desde clients
-- - reject_reservation: obtiene contacto desde clients
-- - cancel_reservation_by_client: usa client_id para validación
-- - cancel_reservation_by_business: obtiene contacto desde clients
-- - expire_pending_reservations: obtiene contacto desde clients
-- =============================================================================

-- =============================================================================
-- Helper: buscar o crear un client
-- =============================================================================
create or replace function public.find_or_create_client(
  p_business_id uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_client_id uuid;
  v_clean_phone text;
  v_matched_user_id uuid;
  v_matched_email text;
  v_matched_name text;
begin
  -- 1. Buscar por user_id si se proporciona
  if p_user_id is not null then
    select id into v_client_id
    from public.clients
    where business_id = p_business_id and user_id = p_user_id
    limit 1;

    if v_client_id is not null then
      -- Actualizar datos si vienen nuevos
      update public.clients
      set name = coalesce(nullif(btrim(p_name), ''), name),
          phone = coalesce(nullif(btrim(p_phone), ''), phone),
          email = coalesce(nullif(btrim(p_email), ''), email),
          updated_at = now()
      where id = v_client_id;
      return v_client_id;
    end if;
  end if;

  -- 2. Buscar por email (case-insensitive)
  if p_email is not null and btrim(p_email) <> '' then
    select id into v_client_id
    from public.clients
    where business_id = p_business_id and lower(email) = lower(btrim(p_email))
    limit 1;

    if v_client_id is not null then
      update public.clients
      set name = coalesce(nullif(btrim(p_name), ''), name),
          phone = coalesce(nullif(btrim(p_phone), ''), phone),
          user_id = coalesce(p_user_id, user_id),
          updated_at = now()
      where id = v_client_id;
      return v_client_id;
    end if;
  end if;

  -- 3. Buscar por teléfono (normalizado)
  if p_phone is not null and btrim(p_phone) <> '' then
    v_clean_phone := regexp_replace(btrim(p_phone), '[\s-]', '', 'g');

    select id into v_client_id
    from public.clients
    where business_id = p_business_id
      and phone is not null
      and regexp_replace(phone, '[\s-]', '', 'g') = v_clean_phone
    limit 1;

    if v_client_id is not null then
      update public.clients
      set name = coalesce(nullif(btrim(p_name), ''), name),
          email = coalesce(nullif(btrim(p_email), ''), email),
          user_id = coalesce(p_user_id, user_id),
          updated_at = now()
      where id = v_client_id;
      return v_client_id;
    end if;
  end if;

  -- 4. No encontrado en clients: buscar en auth.users/profiles
  --    Si el teléfono o email coincide con un usuario ya registrado,
  --    creamos el client con user_id seteado para vincular la reserva
  --    a su cuenta inmediatamente.
  v_matched_user_id := p_user_id;

  if v_matched_user_id is null and p_email is not null and btrim(p_email) <> '' then
    select au.id into v_matched_user_id
    from auth.users au
    where lower(au.email) = lower(btrim(p_email))
    limit 1;
  end if;

  if v_matched_user_id is null and p_phone is not null and btrim(p_phone) <> '' then
    v_clean_phone := regexp_replace(btrim(p_phone), '[\s-]', '', 'g');
    select p.id into v_matched_user_id
    from public.profiles p
    where p.phone is not null
      and regexp_replace(p.phone, '[\s-]', '', 'g') = v_clean_phone
    limit 1;
  end if;

  -- Si encontramos un usuario registrado, usar su email y nombre
  if v_matched_user_id is not null then
    select au.email, p.full_name into v_matched_email, v_matched_name
    from auth.users au
    left join public.profiles p on p.id = au.id
    where au.id = v_matched_user_id
    limit 1;
  end if;

  -- 5. Crear nuevo client (con user_id si se encontró un usuario registrado)
  -- Si encontramos un usuario registrado, su nombre real tiene prioridad
  -- sobre lo que escribió el admin, para mantener consistencia con su cuenta
  insert into public.clients (business_id, name, phone, email, user_id)
  values (
    p_business_id,
    case
      when v_matched_user_id is not null and v_matched_name is not null
        then v_matched_name
      else coalesce(nullif(btrim(p_name), ''), 'Cliente')
    end,
    nullif(btrim(p_phone), ''),
    coalesce(nullif(btrim(p_email), ''), v_matched_email),
    v_matched_user_id
  )
  on conflict (business_id, lower(email)) where email is not null
    do update set
      name = coalesce(excluded.name, clients.name),
      phone = coalesce(excluded.phone, clients.phone),
      user_id = coalesce(excluded.user_id, clients.user_id),
      updated_at = now()
  returning id into v_client_id;

  -- Si vinculamos a un usuario registrado, vincular también reservas
  -- guest anteriores del mismo teléfono/email que no tenían user_id
  if v_matched_user_id is not null then
    update public.reservations r
    set user_id = v_matched_user_id
    where r.client_id = v_client_id
      and r.user_id is null;

    -- Vincular otros clients guest del mismo email/teléfono sin user_id
    perform public.link_clients_to_user(
      v_matched_user_id,
      v_matched_email,
      p_phone
    );
  end if;

  return v_client_id;
end;
$$;

-- =============================================================================
-- Helper: obtener contacto del cliente de una reserva
-- =============================================================================
create or replace function public.get_client_contact(p_reservation_id uuid)
returns table(email text, name text, phone text, user_id uuid)
language sql
security definer set search_path = public
stable
as $$
  select c.email, c.name, c.phone, c.user_id
  from public.reservations r
  join public.clients c on c.id = r.client_id
  where r.id = p_reservation_id;
$$;

-- =============================================================================
-- create_reservation: el cliente crea su solicitud — ahora setea client_id
-- =============================================================================
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
  v_ends_at timestamptz;
  v_hold_expires timestamptz;
  v_now timestamptz := now();
  v_existing record;
  v_exception record;
  v_reservation_id uuid;
  v_client_id uuid;
  v_user_email text;
  v_user_name text;
  v_payload jsonb;
begin
  if v_user_id is null then
    return query select null::uuid, null::text, null::timestamptz, 'No autenticado'::text;
    return;
  end if;

  select c.*, b.timezone, b.slot_duration_minutes, b.hold_duration_minutes,
         b.max_advance_days, b.cancellation_limit_hours, b.name as business_name
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
  v_ends_at := p_starts_at + (v_slot_minutes || ' minutes')::interval;

  if p_starts_at <= v_now then
    return query select null::uuid, null::text, null::timestamptz, 'El turno ya pasó'::text;
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

  -- Buscar o crear el client para este usuario
  select au.email, p.full_name into v_user_email, v_user_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = v_user_id;

  v_client_id := public.find_or_create_client(
    v_business_id,
    v_user_name,
    (select p.phone from public.profiles p where p.id = v_user_id),
    v_user_email,
    v_user_id
  );

  insert into public.reservations (
    business_id, resource_id, user_id, client_id, starts_at, ends_at,
    status, hold_expires_at, notes
  )
  values (
    v_business_id, p_resource_id, v_user_id, v_client_id, p_starts_at, v_ends_at,
    'pending', v_hold_expires, p_notes
  )
  returning public.reservations.id into v_reservation_id;

  perform public.log_reservation_event(
    v_reservation_id, null, 'pending', v_user_id, null
  );

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

-- =============================================================================
-- create_reservation_admin: el negocio crea una reserva confirmada
-- Nueva firma: acepta client_id (cliente existente) o guest info (nombre,
-- teléfono, email). Si no hay client_id, busca o crea un client guest.
-- =============================================================================
drop function if exists public.create_reservation_admin(uuid, timestamptz, text, text, text);

create or replace function public.create_reservation_admin(
  p_resource_id uuid,
  p_starts_at timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_client_email text default null,
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
  v_client_id uuid := p_client_id;
  v_client record;
  v_client_email text;
  v_client_name text;
  v_client_phone text;
  v_client_user_id uuid;
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

  -- Resolver el client: usar client_id existente o buscar/crear por info
  if v_client_id is not null then
    select * into v_client from public.clients cl
    where cl.id = v_client_id and cl.business_id = v_business_id;

    if not found then
      return query select null::uuid, null::text, 'Cliente no encontrado en este negocio'::text;
      return;
    end if;

    -- Actualizar datos si vienen nuevos
    update public.clients cl
    set name = coalesce(nullif(btrim(p_client_name), ''), cl.name),
        phone = coalesce(nullif(btrim(p_client_phone), ''), cl.phone),
        email = coalesce(nullif(btrim(p_client_email), ''), cl.email),
        updated_at = now()
    where cl.id = v_client_id;
  else
    -- Buscar o crear guest client
    v_client_id := public.find_or_create_client(
      v_business_id,
      p_client_name,
      p_client_phone,
      p_client_email,
      null
    );

    select * into v_client from public.clients cl where cl.id = v_client_id;
  end if;

  v_client_name := v_client.name;
  v_client_email := v_client.email;
  v_client_phone := v_client.phone;
  v_client_user_id := v_client.user_id;

  insert into public.reservations (
    business_id, resource_id, user_id, client_id, starts_at, ends_at,
    status, hold_expires_at, notes, decided_by
  )
  values (
    v_business_id, p_resource_id, v_client_user_id, v_client_id,
    p_starts_at, v_ends_at,
    'confirmed', null,
    p_notes,
    v_user_id
  )
  returning public.reservations.id into v_reservation_id;

  perform public.log_reservation_event(
    v_reservation_id, null, 'confirmed', v_user_id, 'Creada por admin'
  );

  v_payload := jsonb_build_object(
    'reservation_id', v_reservation_id,
    'client_name', v_client_name,
    'client_email', v_client_email,
    'client_phone', v_client_phone,
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

  -- Si el cliente tiene cuenta, enviar confirmación al cliente
  if v_client_email is not null and v_client_user_id is not null then
    perform public.enqueue_notification(
      'reservation_confirmed',
      v_client_email,
      v_client_name,
      jsonb_build_object(
        'reservation_id', v_reservation_id,
        'business_name', v_resource.business_name,
        'resource_name', v_resource.name,
        'starts_at', p_starts_at,
        'ends_at', v_ends_at
      ),
      'reservation_confirmed_admin_' || v_reservation_id::text
    );
  end if;

  return query select v_reservation_id, 'confirmed'::text, null::text;
end;
$$;

-- =============================================================================
-- confirm_reservation: obtener contacto desde clients
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
  v_client_email text;
  v_client_name text;
  v_business_name text;
  v_resource_name text;
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if not public.is_business_member(v_reservation.business_id) then
    raise exception 'Sin permisos para confirmar esta reserva';
  end if;

  if v_reservation.status != 'pending' then
    raise exception 'Solo se pueden confirmar reservas pendientes';
  end if;

  if v_reservation.hold_expires_at <= now() then
    raise exception 'El tiempo de espera ha expirado';
  end if;

  update public.reservations
  set status = 'confirmed', hold_expires_at = null, decided_by = v_user_id
  where id = p_reservation_id;

  perform public.log_reservation_event(p_reservation_id, 'pending', 'confirmed', v_user_id, null);

  -- Obtener contacto desde clients (fallback a auth.users para reservas antiguas sin client_id)
  select email, name into v_client_email, v_client_name
  from public.clients where id = v_reservation.client_id;

  if v_client_email is null and v_reservation.user_id is not null then
    select au.email into v_client_email from auth.users au where au.id = v_reservation.user_id;
    select p.full_name into v_client_name from public.profiles p where p.id = v_reservation.user_id;
  end if;

  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_client_email is not null then
    perform public.enqueue_notification(
      'reservation_confirmed',
      v_client_email,
      v_client_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'resource_name', v_resource_name,
        'starts_at', v_reservation.starts_at,
        'ends_at', v_reservation.ends_at
      ),
      'reservation_confirmed_' || p_reservation_id::text
    );
  end if;
end;
$$;

-- =============================================================================
-- reject_reservation: obtener contacto desde clients
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
  v_client_email text;
  v_client_name text;
  v_business_name text;
  v_resource_name text;
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

  select email, name into v_client_email, v_client_name
  from public.clients where id = v_reservation.client_id;

  if v_client_email is null and v_reservation.user_id is not null then
    select au.email into v_client_email from auth.users au where au.id = v_reservation.user_id;
    select p.full_name into v_client_name from public.profiles p where p.id = v_reservation.user_id;
  end if;

  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_client_email is not null then
    perform public.enqueue_notification(
      'reservation_rejected',
      v_client_email,
      v_client_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'resource_name', v_resource_name,
        'starts_at', v_reservation.starts_at,
        'reason', p_reason
      ),
      'reservation_rejected_' || p_reservation_id::text
    );
  end if;
end;
$$;

-- =============================================================================
-- cancel_reservation_by_client: validar por user_id o client_id
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

  -- Validar que el usuario sea el dueño de la reserva
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

-- =============================================================================
-- cancel_reservation_by_business: obtener contacto desde clients
-- =============================================================================
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
  v_client_email text;
  v_client_name text;
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

  -- Obtener contacto desde clients (fallback a auth.users)
  select email, name into v_client_email, v_client_name
  from public.clients where id = v_reservation.client_id;

  if v_client_email is null and v_reservation.user_id is not null then
    select au.email into v_client_email from auth.users au where au.id = v_reservation.user_id;
    select p.full_name into v_client_name from public.profiles p where p.id = v_reservation.user_id;
  end if;

  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_client_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_by_business',
      v_client_email,
      v_client_name,
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

-- =============================================================================
-- Permisos
-- =============================================================================
grant execute on function public.find_or_create_client(uuid, text, text, text, uuid) to service_role;
grant execute on function public.get_client_contact(uuid) to service_role;
grant execute on function public.link_clients_to_user(uuid, text, text) to service_role;
grant execute on function public.create_reservation(uuid, timestamptz, text) to authenticated;
grant execute on function public.create_reservation_admin(uuid, timestamptz, uuid, text, text, text, text) to authenticated;
grant execute on function public.confirm_reservation(uuid) to authenticated;
grant execute on function public.reject_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_reservation_by_client(uuid) to authenticated;
grant execute on function public.cancel_reservation_by_business(uuid, text) to authenticated;
