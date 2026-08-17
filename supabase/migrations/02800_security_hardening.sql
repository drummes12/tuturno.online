-- =============================================================================
-- 02800: Endurecimiento de seguridad tras auditoría del PR de plataforma
--
-- Tres correcciones puntuales:
--   1. Slugs reservados: eliminar el bypass vía is_demo y proteger is_demo
--      como atributo administrativo (no modificable por business members).
--   2. Audit log de cambios de rol: registrar old_role además de new_role.
--   3. Eliminación de cuenta: bloquear si el usuario es el único owner de
--      uno o más negocios activos.
-- =============================================================================

-- =============================================================================
-- 1. SLUGS RESERVADOS + is_demo
-- =============================================================================

-- 1a. Trigger de slug: la protección de reserved_slugs aplica siempre,
--     con una única excepción explícita y documentada: el negocio demo
--     con slug='demo' e is_demo=true (creado por el seed). Ningún otro
--     slug reservado puede usarse, sin importar is_demo.
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

  -- Excepción explícita y única: el negocio demo del seed usa slug='demo'
  -- con is_demo=true. Cualquier otro slug reservado es rechazado sin
  -- importar el valor de is_demo.
  if exists (select 1 from public.reserved_slugs where slug = new.slug)
     and not (new.is_demo and new.slug = 'demo') then
    raise exception 'El slug "%" está reservado por la plataforma.', new.slug;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_businesses_slug on public.businesses;
create trigger trg_businesses_slug
  before insert or update of slug on public.businesses
  for each row execute function public.enforce_business_slug();

-- 1b. Proteger is_demo como atributo administrativo: un business member
--     (owner o manager) no puede cambiar is_demo desde el cliente. Solo
--     service_role (Edge Functions) y postgres (SQL Editor) pueden hacerlo.
create or replace function public.prevent_is_demo_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_jwt_role text;
begin
  if new.is_demo is distinct from old.is_demo then
    -- Extraer el rol del JWT. Si no hay JWT (SQL Editor con postgres),
    -- v_jwt_role es NULL → se permite. Si el rol es 'service_role'
    -- (Edge Functions internas) → se permite. Si es 'authenticated'
    -- (business member desde la app) → se bloquea.
    v_jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';

    if v_jwt_role = 'authenticated' then
      raise exception
        'is_demo es un atributo administrativo y no puede modificarse desde la aplicación.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_businesses_is_demo on public.businesses;
create trigger trg_businesses_is_demo
  before update of is_demo on public.businesses
  for each row execute function public.prevent_is_demo_change();

-- =============================================================================
-- 2. AUDIT LOG: old_role en cambios de rol
-- =============================================================================
-- Modifica platform_set_member_role para capturar el rol anterior antes
-- del UPSERT e incluirlo en el payload del audit log. Si la operación
-- falla (ej. trigger de último owner), la excepción aborta la transacción
-- y no se inserta ninguna entrada de auditoría.
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
  v_old_role business_role;
begin
  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'El negocio % no existe.', p_business_id;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'El usuario % no existe.', p_user_id;
  end if;

  -- Capturar el rol anterior antes del UPSERT. Si el usuario no era
  -- miembro, v_old_role queda NULL (alta nueva).
  select role into v_old_role
  from public.business_members
  where business_id = p_business_id and user_id = p_user_id;

  insert into public.business_members (business_id, user_id, role)
  values (p_business_id, p_user_id, p_role)
  on conflict (business_id, user_id) do update set role = excluded.role;

  perform public.log_platform_action(
    v_actor,
    'member_role_set',
    'business',
    p_business_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'old_role', v_old_role,
      'new_role', p_role
    )
  );
end;
$$;

-- Re-aplicar grants (CREATE OR REPLACE resetea los grants de la función).
revoke all on function public.platform_set_member_role(uuid, uuid, business_role) from public;
grant execute on function public.platform_set_member_role(uuid, uuid, business_role) to authenticated;

-- =============================================================================
-- 3. ELIMINACIÓN DE CUENTA: bloquear si es único owner de negocio activo
-- =============================================================================
-- Trigger BEFORE DELETE en auth.users: si el usuario es el único owner de
-- uno o más negocios, la eliminación se rechaza. El operador debe asignar
-- otro owner primero. Esto cierra el camino de cascada:
--   auth.users DELETE → profiles DELETE → business_members DELETE → 0 owners
--
-- No afecta:
--   - eliminación de negocios completos (no dispara este trigger);
--   - eliminación de usuarios que no son owners;
--   - eliminación de usuarios que son owners pero hay otro owner en el negocio.
create or replace function public.prevent_sole_owner_account_deletion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_blocked_count integer;
  v_blocked_list text;
begin
  -- Contar negocios donde este usuario es el único owner.
  -- Todos los negocios en la tabla se consideran activos (no existe
  -- columna is_active); si se añade en el futuro, se filtra aquí.
  select count(*), string_agg(b.name, ', ' order by b.name)
  into v_blocked_count, v_blocked_list
  from public.business_members bm
  join public.businesses b on b.id = bm.business_id
  where bm.user_id = old.id
    and bm.role = 'owner'
    and (
      select count(*) from public.business_members bm2
      where bm2.business_id = bm.business_id and bm2.role = 'owner'
    ) = 1;

  if v_blocked_count > 0 then
    raise exception
      'No se puede eliminar la cuenta: es el único owner de % negocio(s): [%]. Asigna o promueve otro owner antes de eliminar la cuenta.',
      v_blocked_count, v_blocked_list;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_sole_owner_deletion on auth.users;
create trigger trg_prevent_sole_owner_deletion
  before delete on auth.users
  for each row execute function public.prevent_sole_owner_account_deletion();
