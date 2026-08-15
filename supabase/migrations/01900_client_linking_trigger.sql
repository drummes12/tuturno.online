-- =============================================================================
-- 01900: Vinculación automática de clients al registrar una cuenta
--
-- Cuando un usuario se registra (auth.users insert), busca registros en
-- public.clients que coincidan por email (case-insensitive) y que no tengan
-- user_id asignado, y los vincula. Si no hay match por email, intenta por
-- teléfono usando el phone de los metadatos del registro.
--
-- También vincula cuando un profile actualiza su teléfono (por si el usuario
-- se registró sin teléfono y lo agrega después).
-- =============================================================================

-- Función que vincula clients por email y/o teléfono a un user_id
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
  v_clean_phone text;
begin
  -- Vincular por email (case-insensitive)
  if p_email is not null and btrim(p_email) <> '' then
    update public.clients
    set user_id = p_user_id, updated_at = now()
    where lower(email) = lower(btrim(p_email))
      and user_id is null;

    get diagnostics v_count = row_count;
  end if;

  -- Vincular por teléfono si no se vinculó nada por email
  -- Normalizar: quitar espacios y guiones para comparar
  if v_count = 0 and p_phone is not null and btrim(p_phone) <> '' then
    v_clean_phone := regexp_replace(btrim(p_phone), '[\s-]', '', 'g');

    update public.clients
    set user_id = p_user_id, updated_at = now()
    where regexp_replace(coalesce(phone, ''), '[\s-]', '', 'g') = v_clean_phone
      and user_id is null;

    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;

-- Trigger: vincular al crear un nuevo usuario
-- Se ejecuta DESPUÉS de handle_new_profile para que el profile ya exista
create or replace function public.handle_new_user_client_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.link_clients_to_user(
    new.id,
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_client_link on auth.users;
create trigger on_auth_user_client_link
  after insert on auth.users
  for each row execute function public.handle_new_user_client_link();

-- Trigger: vincular cuando un profile actualiza su teléfono
create or replace function public.handle_profile_update_client_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text;
begin
  if new.phone is distinct from old.phone then
    select email into v_email from auth.users where id = new.id;

    perform public.link_clients_to_user(
      new.id,
      v_email,
      new.phone
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_client_link on public.profiles;
create trigger trg_profiles_client_link
  after update of phone on public.profiles
  for each row execute function public.handle_profile_update_client_link();
