-- =============================================================================
-- 02300: Normalizar teléfonos a formato E.164
--
-- Los teléfonos se guardaban con espacios y guiones (ej: "+57 300 111 2222").
-- E.164 es el estándar: solo + y dígitos, sin espacios ni guiones
-- (ej: "+573001112222").
--
-- Esta migración:
-- 1. Crea una función helper normalize_phone(text) -> text
-- 2. Actualiza los datos existentes en clients y profiles
-- 3. Actualiza find_or_create_client para normalizar al guardar y comparar
-- 4. Actualiza link_clients_to_user para normalizar al comparar
-- =============================================================================

-- =============================================================================
-- 1. Función helper: normalizar a E.164
-- =============================================================================
create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
strict
as $$
  select case
    when p_phone is null or btrim(p_phone) = '' then null
    -- Qitar todo lo que no sea + o dígitos
    else '+' || regexp_replace(regexp_replace(btrim(p_phone), '[^\d+]', '', 'g'), '^\+', '')
  end
$$;

grant execute on function public.normalize_phone(text) to authenticated, service_role;

-- =============================================================================
-- 2. Backfill: normalizar teléfonos existentes
-- =============================================================================
update public.clients
set phone = public.normalize_phone(phone)
where phone is not null and phone != public.normalize_phone(phone);

update public.profiles
set phone = public.normalize_phone(phone)
where phone is not null and phone != public.normalize_phone(phone);

-- =============================================================================
-- 3. Actualizar find_or_create_client para normalizar al guardar y comparar
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
  v_normalized_phone text;
  v_matched_user_id uuid;
  v_matched_email text;
  v_matched_name text;
begin
  v_normalized_phone := public.normalize_phone(p_phone);

  -- 1. Buscar por user_id si se proporciona
  if p_user_id is not null then
    select id into v_client_id
    from public.clients
    where business_id = p_business_id and user_id = p_user_id
    limit 1;

    if v_client_id is not null then
      update public.clients
      set name = coalesce(nullif(btrim(p_name), ''), name),
          phone = coalesce(v_normalized_phone, phone),
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
          phone = coalesce(v_normalized_phone, phone),
          user_id = coalesce(p_user_id, user_id),
          updated_at = now()
      where id = v_client_id;
      return v_client_id;
    end if;
  end if;

  -- 3. Buscar por teléfono (E.164 exacto)
  if v_normalized_phone is not null then
    select id into v_client_id
    from public.clients
    where business_id = p_business_id
      and phone = v_normalized_phone
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
  v_matched_user_id := p_user_id;

  if v_matched_user_id is null and p_email is not null and btrim(p_email) <> '' then
    select au.id into v_matched_user_id
    from auth.users au
    where lower(au.email) = lower(btrim(p_email))
    limit 1;
  end if;

  if v_matched_user_id is null and v_normalized_phone is not null then
    select p.id into v_matched_user_id
    from public.profiles p
    where p.phone = v_normalized_phone
    limit 1;
  end if;

  if v_matched_user_id is not null then
    select au.email, p.full_name into v_matched_email, v_matched_name
    from auth.users au
    left join public.profiles p on p.id = au.id
    where au.id = v_matched_user_id
    limit 1;
  end if;

  -- 5. Crear nuevo client (con user_id si se encontró un usuario registrado)
  insert into public.clients (business_id, name, phone, email, user_id)
  values (
    p_business_id,
    case
      when v_matched_user_id is not null and v_matched_name is not null
        then v_matched_name
      else coalesce(nullif(btrim(p_name), ''), 'Cliente')
    end,
    v_normalized_phone,
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

  if v_matched_user_id is not null then
    update public.reservations r
    set user_id = v_matched_user_id
    where r.client_id = v_client_id
      and r.user_id is null;

    perform public.link_clients_to_user(
      v_matched_user_id,
      v_matched_email,
      v_normalized_phone
    );
  end if;

  return v_client_id;
end;
$$;

-- =============================================================================
-- 4. Actualizar link_clients_to_user para normalizar al comparar
-- =============================================================================
create or replace function public.link_clients_to_user(
  p_user_id uuid,
  p_email text default null,
  p_phone text default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_normalized_phone text;
begin
  -- Vincular por email (case-insensitive)
  if p_email is not null and btrim(p_email) <> '' then
    update public.clients
    set user_id = p_user_id, updated_at = now()
    where lower(email) = lower(btrim(p_email))
      and user_id is null;

    get diagnostics v_count = row_count;
  end if;

  -- Vincular por teléfono E.164
  if v_count = 0 and p_phone is not null and btrim(p_phone) <> '' then
    v_normalized_phone := public.normalize_phone(p_phone);

    update public.clients
    set user_id = p_user_id, updated_at = now()
    where phone = v_normalized_phone
      and user_id is null;

    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;

-- =============================================================================
-- 5. Trigger para normalizar phones automáticamente al insertar/actualizar
-- =============================================================================

-- Normalizar phone en clients
create or replace function public.normalize_clients_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_clients_normalize_phone on public.clients;
create trigger trg_clients_normalize_phone
  before insert or update of phone on public.clients
  for each row execute function public.normalize_clients_phone();

-- Normalizar phone en profiles
create or replace function public.normalize_profiles_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_phone on public.profiles;
create trigger trg_profiles_normalize_phone
  before insert or update of phone on public.profiles
  for each row execute function public.normalize_profiles_phone();

grant execute on function public.normalize_clients_phone() to service_role;
grant execute on function public.normalize_profiles_phone() to service_role;
