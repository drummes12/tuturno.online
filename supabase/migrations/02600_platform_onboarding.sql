-- =============================================================================
-- 02600: Onboarding de negocios controlado desde la plataforma
--
-- Reemplaza los snippets manuales (onboard-business.sql / promote-user.sql) por
-- datos + RPCs auditables:
--   - business_signup_requests: el usuario solicita su negocio desde la app
--   - platform_admins: operadores de la plataforma (sembrados solo con service_role)
--   - RPCs security definer que crean el negocio, promueven miembros y auditan
--
-- Seguridad: cada RPC de plataforma revalida al llamante con assert_platform_admin(),
-- que exige membresía en platform_admins y un JWT con aal2 (MFA) cuando la llamada
-- llega por HTTP. Ocultar la ruta en el frontend no protege nada; esto sí.
-- =============================================================================

-- =============================================================================
-- Enum de estados de solicitud
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'signup_request_status') then
    create type public.signup_request_status as enum (
      'pending', 'approved', 'rejected', 'cancelled'
    );
  end if;
end
$$;

-- =============================================================================
-- Operadores de la plataforma
-- =============================================================================
-- Sin policies ni grants: la tabla solo es accesible con service_role (SQL Editor).
-- No existe ninguna ruta desde la app para auto-promoverse a operador.
create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

comment on table public.platform_admins is
  'Operadores de la plataforma. Solo se siembra con service_role desde el SQL Editor.';

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- Valida al llamante de cualquier RPC de plataforma.
-- Cuando la llamada llega por PostgREST exige aal2 (segundo factor verificado);
-- desde el SQL Editor (session_user = 'postgres') no hay claims de JWT y la
-- validación de MFA no aplica. Cualquier otra sesión sin JWT claims se rechaza
-- (fail-closed) para evitar que un SECURITY DEFINER, cron o conexión directa
-- bypass la verificación.
create or replace function public.assert_platform_admin()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
begin
  if v_claims is not null then
    if v_uid is null then
      raise exception 'Requiere sesión iniciada.' using errcode = '42501';
    end if;

    if not exists (select 1 from public.platform_admins where user_id = v_uid) then
      raise exception 'Requiere permisos de operador de plataforma.' using errcode = '42501';
    end if;

    if coalesce(v_claims::jsonb ->> 'aal', 'aal1') <> 'aal2' then
      raise exception 'Requiere verificación en dos pasos (MFA).' using errcode = '42501';
    end if;
  else
    -- Sin JWT claims: solo se permite desde el SQL Editor (sesión de postgres).
    -- session_user refleja el usuario de login real (no se ve afectado por
    -- SECURITY DEFINER, que solo cambia current_user).
    if session_user <> 'postgres' then
      raise exception 'Requiere sesión iniciada.' using errcode = '42501';
    end if;
  end if;

  return v_uid;
end;
$$;

-- Como is_platform_admin() pero además exige aal2 (MFA verificada).
-- Se usa en las policies de SELECT de business_signup_requests y
-- platform_audit_log para que un operador con contraseña robada (sin
-- segundo factor) no pueda leer datos de solicitantes ni la bitácora.
create or replace function public.is_platform_admin_mfa()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin()
     and coalesce(
       nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal',
       'aal1'
     ) = 'aal2';
$$;

-- =============================================================================
-- Bitácora de acciones de plataforma
-- =============================================================================
create table if not exists public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_created
  on public.platform_audit_log (created_at desc);

alter table public.platform_audit_log enable row level security;

drop policy if exists "Platform admins can read the audit log" on public.platform_audit_log;
create policy "Platform admins can read the audit log"
  on public.platform_audit_log for select
  using (public.is_platform_admin_mfa());

grant select on public.platform_audit_log to authenticated;

create or replace function public.log_platform_action(
  p_actor_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.platform_audit_log (actor_id, action, target_type, target_id, payload)
  values (p_actor_id, p_action, p_target_type, p_target_id, p_payload);
end;
$$;

-- =============================================================================
-- Slugs reservados
-- =============================================================================
-- Hasta ahora 'demo' solo estaba protegido dentro del snippet de onboarding, así
-- que nada impedía que un negocio tomara un slug que choca con una ruta de la app.
create table if not exists public.reserved_slugs (
  slug text primary key,
  reason text
);

insert into public.reserved_slugs (slug, reason) values
  ('demo', 'Negocio de demostración'),
  ('admin', 'Ruta del panel'),
  ('plataforma', 'Ruta del panel de operador'),
  ('api', 'Reservado'),
  ('app', 'Reservado'),
  ('www', 'Reservado'),
  ('b', 'Prefijo de rutas públicas'),
  ('login', 'Ruta de la app'),
  ('registro', 'Ruta de la app'),
  ('crear-negocio', 'Ruta de la app'),
  ('recuperar-password', 'Ruta de la app'),
  ('mis-reservas', 'Ruta de la app'),
  ('reservar', 'Ruta de la app'),
  ('invitacion', 'Ruta de la app'),
  ('soporte', 'Reservado'),
  ('ayuda', 'Reservado'),
  ('blog', 'Reservado')
on conflict (slug) do nothing;

alter table public.reserved_slugs enable row level security;

drop policy if exists "Anyone can read reserved slugs" on public.reserved_slugs;
create policy "Anyone can read reserved slugs"
  on public.reserved_slugs for select
  using (true);

grant select on public.reserved_slugs to anon, authenticated;

create or replace function public.is_valid_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and char_length(p_slug) between 3 and 40;
$$;

-- Valida formato, lista de reservados y unicidad en una sola llamada.
create or replace function public.check_slug_availability(p_slug text)
returns table (available boolean, reason text)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.is_valid_slug(v_slug) then
    return query select false, 'invalid_format'::text;
    return;
  end if;

  if exists (select 1 from public.reserved_slugs where slug = v_slug) then
    return query select false, 'reserved'::text;
    return;
  end if;

  if exists (select 1 from public.businesses where slug = v_slug) then
    return query select false, 'taken'::text;
    return;
  end if;

  return query select true, null::text;
end;
$$;

grant execute on function public.check_slug_availability(text) to anon, authenticated;

-- Refuerza las reglas de slug también a nivel de fila: ningún camino de escritura
-- (RPC, SQL Editor o cliente) puede crear un negocio con un slug inválido.
create or replace function public.enforce_business_slug()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.slug := lower(btrim(new.slug));

  if not public.is_valid_slug(new.slug) then
    raise exception 'Slug inválido: "%". Usa minúsculas, números y guiones (3-40 caracteres).', new.slug;
  end if;

  if not coalesce(new.is_demo, false)
     and exists (select 1 from public.reserved_slugs where slug = new.slug) then
    raise exception 'El slug "%" está reservado por la plataforma.', new.slug;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_businesses_slug on public.businesses;
create trigger trg_businesses_slug
  before insert or update of slug on public.businesses
  for each row execute function public.enforce_business_slug();

-- =============================================================================
-- Solicitudes de negocio
-- =============================================================================
create table if not exists public.business_signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 2 and 80),
  desired_slug text not null,
  business_type text,
  contact_phone text,
  city text,
  notes text check (notes is null or char_length(notes) <= 1000),
  status signup_request_status not null default 'pending',
  rejection_reason text,
  business_id uuid references public.businesses(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola solicitud abierta por usuario: evita spam y ambigüedad al aprobar.
create unique index if not exists uq_signup_request_pending_per_user
  on public.business_signup_requests (user_id)
  where status = 'pending';

create index if not exists idx_signup_requests_status
  on public.business_signup_requests (status, created_at desc);

drop trigger if exists trg_signup_requests_updated on public.business_signup_requests;
create trigger trg_signup_requests_updated
  before update on public.business_signup_requests
  for each row execute function public.handle_updated_at();

alter table public.business_signup_requests enable row level security;

-- Lectura: el solicitante ve la suya, el operador ve todas (con MFA).
-- No hay policies de escritura: todo pasa por los RPCs de abajo.
drop policy if exists "Requesters and platform admins can read requests" on public.business_signup_requests;
create policy "Requesters and platform admins can read requests"
  on public.business_signup_requests for select
  using (user_id = auth.uid() or public.is_platform_admin_mfa());

grant select on public.business_signup_requests to authenticated;

-- =============================================================================
-- RPC: el usuario solicita su negocio
-- =============================================================================
create or replace function public.request_business_signup(
  p_business_name text,
  p_desired_slug text,
  p_business_type text default null,
  p_contact_phone text default null,
  p_city text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_desired_slug, '')));
  v_name text := btrim(coalesce(p_business_name, ''));
  v_business_type text := nullif(btrim(coalesce(p_business_type, '')), '');
  v_contact_phone text := nullif(btrim(coalesce(p_contact_phone, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_available boolean;
  v_reason text;
  v_request_id uuid;
  v_admin record;
begin
  if v_uid is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'El nombre del negocio es obligatorio.';
  end if;

  select available, reason into v_available, v_reason
  from public.check_slug_availability(v_slug);

  if not v_available then
    raise exception 'El slug "%" no está disponible (%).', v_slug, v_reason;
  end if;

  if exists (
    select 1 from public.business_signup_requests
    where user_id = v_uid and status = 'pending'
  ) then
    raise exception 'Ya tienes una solicitud en revisión.';
  end if;

  insert into public.business_signup_requests (
    user_id, business_name, desired_slug, business_type, contact_phone, city, notes
  ) values (
    v_uid, v_name, v_slug, v_business_type, v_contact_phone, v_city, v_notes
  )
  returning id into v_request_id;

  -- Aviso a cada operador. El correo es solo la alerta: la fuente de verdad es la tabla.
  -- El payload usa los valores normalizados (trim + nullif) para que el correo
  -- coincida con lo que se almacenó en la fila.
  for v_admin in
    select pa.user_id, au.email, p.full_name
    from public.platform_admins pa
    join auth.users au on au.id = pa.user_id
    left join public.profiles p on p.id = pa.user_id
    where au.email is not null
  loop
    perform public.enqueue_notification(
      'business_signup_requested',
      v_admin.email,
      v_admin.full_name,
      jsonb_build_object(
        'business_name', v_name,
        'desired_slug', v_slug,
        'city', v_city,
        'business_type', v_business_type,
        'contact_phone', v_contact_phone,
        'notes', v_notes
      ),
      'signup_requested_' || v_request_id::text || '_' || v_admin.user_id::text
    );
  end loop;

  return v_request_id;
end;
$$;

-- El solicitante puede retirar su solicitud pendiente.
create or replace function public.cancel_business_signup_request(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.business_signup_requests
  set status = 'cancelled'
  where id = p_request_id and user_id = v_uid and status = 'pending';

  if not found then
    raise exception 'No se encontró una solicitud pendiente tuya con ese id.';
  end if;
end;
$$;

-- =============================================================================
-- RPC: crear negocio con su owner (equivale a onboard-business.sql)
-- =============================================================================
create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_timezone text default 'America/Bogota',
  p_phone text default null,
  p_city text default null,
  p_label_singular text default 'Espacio',
  p_label_plural text default 'Espacios',
  p_slot_minutes integer default 60
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor uuid := public.assert_platform_admin();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_available boolean;
  v_reason text;
  v_business_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_owner_user_id) then
    raise exception 'El usuario % no existe. Pídele que se registre primero.', p_owner_user_id;
  end if;

  select available, reason into v_available, v_reason
  from public.check_slug_availability(v_slug);

  if not v_available then
    raise exception 'El slug "%" no está disponible (%).', v_slug, v_reason;
  end if;

  insert into public.businesses (
    name, slug, timezone, phone, city,
    slot_duration_minutes,
    resource_label_singular, resource_label_plural,
    is_demo
  ) values (
    btrim(p_name), v_slug, p_timezone, p_phone, p_city,
    p_slot_minutes,
    p_label_singular, p_label_plural,
    false
  )
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, p_owner_user_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  perform public.log_platform_action(
    v_actor,
    'business_created',
    'business',
    v_business_id,
    jsonb_build_object('slug', v_slug, 'name', p_name, 'owner_user_id', p_owner_user_id)
  );

  return v_business_id;
end;
$$;

-- =============================================================================
-- RPC: aprobar / rechazar una solicitud
-- =============================================================================
create or replace function public.approve_business_signup(
  p_request_id uuid,
  p_slug_override text default null,
  p_label_singular text default 'Espacio',
  p_label_plural text default 'Espacios'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor uuid := public.assert_platform_admin();
  v_request public.business_signup_requests%rowtype;
  v_slug text;
  v_business_id uuid;
  v_owner_email text;
  v_owner_name text;
begin
  select * into v_request
  from public.business_signup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud % no encontrada.', p_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'La solicitud ya fue procesada (estado: %).', v_request.status;
  end if;

  v_slug := coalesce(nullif(lower(btrim(coalesce(p_slug_override, ''))), ''), v_request.desired_slug);

  -- Validar etiquetas antes de llegar al INSERT (la tabla businesses tiene
  -- un check constraint de 2-40 caracteres; sin esto el operador vería un
  -- mensaje crudo de violación de constraint).
  if char_length(btrim(coalesce(p_label_singular, ''))) not between 2 and 40 then
    raise exception 'La etiqueta singular debe tener entre 2 y 40 caracteres.';
  end if;

  if char_length(btrim(coalesce(p_label_plural, ''))) not between 2 and 40 then
    raise exception 'La etiqueta plural debe tener entre 2 y 40 caracteres.';
  end if;

  v_business_id := public.create_business_with_owner(
    v_request.business_name,
    v_slug,
    v_request.user_id,
    'America/Bogota',
    v_request.contact_phone,
    v_request.city,
    p_label_singular,
    p_label_plural
  );

  update public.business_signup_requests
  set status = 'approved',
      business_id = v_business_id,
      desired_slug = v_slug,
      reviewed_by = v_actor,
      reviewed_at = now()
  where id = p_request_id;

  select au.email, p.full_name into v_owner_email, v_owner_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = v_request.user_id;

  if v_owner_email is not null then
    perform public.enqueue_notification(
      'business_approved',
      v_owner_email,
      v_owner_name,
      jsonb_build_object('business_name', v_request.business_name, 'slug', v_slug),
      'signup_approved_' || p_request_id::text
    );
  end if;

  perform public.log_platform_action(
    v_actor,
    'signup_approved',
    'signup_request',
    p_request_id,
    jsonb_build_object('business_id', v_business_id, 'slug', v_slug)
  );

  return v_business_id;
end;
$$;

create or replace function public.reject_business_signup(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor uuid := public.assert_platform_admin();
  v_request public.business_signup_requests%rowtype;
  v_owner_email text;
  v_owner_name text;
begin
  select * into v_request
  from public.business_signup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud % no encontrada.', p_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'La solicitud ya fue procesada (estado: %).', v_request.status;
  end if;

  update public.business_signup_requests
  set status = 'rejected',
      rejection_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      reviewed_by = v_actor,
      reviewed_at = now()
  where id = p_request_id;

  select au.email, p.full_name into v_owner_email, v_owner_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = v_request.user_id;

  if v_owner_email is not null then
    perform public.enqueue_notification(
      'business_rejected',
      v_owner_email,
      v_owner_name,
      jsonb_build_object(
        'business_name', v_request.business_name,
        'reason', nullif(btrim(coalesce(p_reason, '')), '')
      ),
      'signup_rejected_' || p_request_id::text
    );
  end if;

  perform public.log_platform_action(
    v_actor,
    'signup_rejected',
    'signup_request',
    p_request_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

-- =============================================================================
-- RPC: promoción de emergencia (equivale a promote-user.sql)
-- =============================================================================
-- El alta de managers la hace cada owner desde su panel; esto queda para cuando
-- un negocio pierde acceso a su cuenta owner.
create or replace function public.platform_set_member_role(
  p_business_id uuid,
  p_user_id uuid,
  p_role business_role
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor uuid := public.assert_platform_admin();
begin
  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'El negocio % no existe.', p_business_id;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'El usuario % no existe.', p_user_id;
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (p_business_id, p_user_id, p_role)
  on conflict (business_id, user_id) do update set role = excluded.role;

  perform public.log_platform_action(
    v_actor,
    'member_role_set',
    'business',
    p_business_id,
    jsonb_build_object('user_id', p_user_id, 'role', p_role)
  );
end;
$$;

-- Búsqueda por email exacto: el panel necesita resolver un usuario sin exponer
-- un listado completo de cuentas.
create or replace function public.platform_find_user_by_email(p_email text)
returns table (user_id uuid, email text, full_name text, created_at timestamptz)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  perform public.assert_platform_admin();

  return query
  select au.id, au.email::text, p.full_name, au.created_at
  from auth.users au
  left join public.profiles p on p.id = au.id
  where lower(au.email) = lower(btrim(coalesce(p_email, '')));
end;
$$;

-- Resumen de negocios para el panel de operador.
create or replace function public.platform_business_overview()
returns table (
  business_id uuid,
  name text,
  slug text,
  is_demo boolean,
  member_count bigint,
  resource_count bigint,
  reservation_count bigint,
  last_reservation_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  perform public.assert_platform_admin();

  return query
  select
    b.id,
    b.name,
    b.slug,
    b.is_demo,
    (select count(*) from public.business_members bm where bm.business_id = b.id),
    (select count(*) from public.resources r where r.business_id = b.id),
    (select count(*) from public.reservations rs where rs.business_id = b.id),
    (select max(rs.created_at) from public.reservations rs where rs.business_id = b.id),
    b.created_at
  from public.businesses b
  order by b.created_at desc;
end;
$$;

-- =============================================================================
-- Integridad: un negocio nunca se queda sin owner
-- =============================================================================
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Al borrar el negocio o la cuenta del usuario, las filas llegan aquí por
  -- cascada: ahí no hay nada que proteger y bloquearlo impediría dar de baja
  -- una cuenta. La regla aplica solo a quitar o degradar a un miembro.
  if tg_op = 'DELETE' and (
       not exists (select 1 from public.businesses where id = old.business_id)
       or not exists (select 1 from public.profiles where id = old.user_id)
     ) then
    return old;
  end if;

  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and (
       select count(*) from public.business_members
       where business_id = old.business_id and role = 'owner'
     ) <= 1
  then
    raise exception 'El negocio debe conservar al menos un owner.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_business_members_last_owner on public.business_members;
create trigger trg_business_members_last_owner
  before update or delete on public.business_members
  for each row execute function public.prevent_last_owner_removal();

-- =============================================================================
-- Grants de ejecución
-- =============================================================================
-- Postgres otorga EXECUTE a public por defecto; los RPCs de plataforma se
-- revocan explícitamente y solo quedan disponibles para sesiones autenticadas
-- (el permiso real lo impone assert_platform_admin dentro de cada función).
revoke all on function public.assert_platform_admin() from public;
revoke all on function public.create_business_with_owner(text, text, uuid, text, text, text, text, text, integer) from public;
revoke all on function public.approve_business_signup(uuid, text, text, text) from public;
revoke all on function public.reject_business_signup(uuid, text) from public;
revoke all on function public.platform_set_member_role(uuid, uuid, business_role) from public;
revoke all on function public.platform_find_user_by_email(text) from public;
revoke all on function public.platform_business_overview() from public;
revoke all on function public.log_platform_action(uuid, text, text, uuid, jsonb) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_admin_mfa() to authenticated;
grant execute on function public.create_business_with_owner(text, text, uuid, text, text, text, text, text, integer) to authenticated;
grant execute on function public.approve_business_signup(uuid, text, text, text) to authenticated;
grant execute on function public.reject_business_signup(uuid, text) to authenticated;
grant execute on function public.platform_set_member_role(uuid, uuid, business_role) to authenticated;
grant execute on function public.platform_find_user_by_email(text) to authenticated;
grant execute on function public.platform_business_overview() to authenticated;
grant execute on function public.request_business_signup(text, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_business_signup_request(uuid) to authenticated;
