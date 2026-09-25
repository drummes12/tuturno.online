-- =============================================================================
-- 04300: Evidencia de autorización de datos de clientes invitados
--
-- Cuando un negocio registra datos de una persona (guest) al crear una
-- reserva, el negocio declara contar con la autorización de esa persona.
-- Esa declaración queda registrada una sola vez por (cliente, negocio) en
-- reservation_data_consents con source = 'business_attested' y
-- attested_by = miembro del negocio que la declaró.
--
-- Es idempotente: reservas posteriores del mismo cliente en el mismo
-- negocio no duplican la fila.
-- =============================================================================

alter table public.reservation_data_consents
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists attested_by uuid references auth.users(id) on delete set null;

create index if not exists reservation_data_consents_client_idx
  on public.reservation_data_consents (client_id)
  where client_id is not null;

create unique index if not exists reservation_data_consents_attested_uk
  on public.reservation_data_consents (client_id)
  where client_id is not null and source = 'business_attested';

-- =============================================================================
-- create_reservation_admin: nueva firma con p_policy_version.
-- Mismo cuerpo que 02000 + registro de la declaración de autorización.
-- =============================================================================
drop function if exists public.create_reservation_admin(uuid, timestamptz, uuid, text, text, text, text);

create or replace function public.create_reservation_admin(
  p_resource_id uuid,
  p_starts_at timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_client_email text default null,
  p_notes text default null,
  p_policy_version text default null
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
         b.max_advance_days, b.name as business_name, b.is_demo
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

  -- Bloquear reservas en negocios de demostración (antes del check de permisos)
  if v_resource.is_demo then
    return query select null::uuid, null::text, 'Este negocio está en modo demostración y no acepta reservas reales.'::text;
    return;
  end if;

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

  -- Teléfono del cliente: formato válido cuando se proporciona
  -- (E.164: 7-15 dígitos tras el +) y obligatorio para clientes nuevos,
  -- porque es el canal de contacto del negocio.
  if public.normalize_phone(p_client_phone) is not null
     and public.normalize_phone(p_client_phone) !~ '^\+[1-9]\d{6,14}$' then
    return query select null::uuid, null::text, 'Número de teléfono inválido'::text;
    return;
  end if;

  if v_client_id is null
     and public.normalize_phone(p_client_phone) is null then
    return query select null::uuid, null::text, 'El teléfono del cliente es obligatorio'::text;
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

  -- Evidencia de que el negocio declara tener autorización del cliente
  -- para registrar sus datos. Una sola fila por cliente: reservas
  -- posteriores no duplican. Solo si el frontend envía la versión de
  -- política vigente (llamadas viejas simplemente no registran).
  if btrim(coalesce(p_policy_version, '')) <> '' then
    insert into public.reservation_data_consents (
      business_id, client_id, attested_by, policy_version, source
    )
    values (v_business_id, v_client_id, v_user_id, p_policy_version, 'business_attested')
    on conflict (client_id) where client_id is not null and source = 'business_attested'
    do nothing;
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

revoke all on function public.create_reservation_admin(uuid, timestamptz, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_reservation_admin(uuid, timestamptz, uuid, text, text, text, text, text) to authenticated;
