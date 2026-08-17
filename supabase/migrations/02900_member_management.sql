-- =============================================================================
-- 02900: RPCs para gestión de miembros desde el panel de owner
--
-- Los owners pueden invitar managers y eliminarlos desde /admin/equipo.
-- Estas RPCs dan soporte a esa UI sin exponer datos sensibles ni requerir
-- MFA (la RLS de business_members ya valida que el llamante sea owner).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. resolve_member_details: lista los miembros de un negocio con email y
--    nombre. Necesario porque:
--    - auth.users no es accesible vía RLS desde el cliente
--    - profiles solo es legible para perfiles propios o de usuarios que
--      reservaron en el negocio (no de otros miembros)
--    SECURITY DEFINER resuelve ambos sin que RLS filtre filas.
--    Valida que el llamante sea miembro del negocio consultado.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_member_details(p_business_id uuid)
returns table(
  uid uuid,
  role business_role,
  joined_at timestamptz,
  mail text,
  full_name text
)
language plpgsql
security definer set search_path = public, auth
as $$
begin
  -- El llamante debe ser miembro del negocio consultado.
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
  ) then
    raise exception 'Sin permisos.' using errcode = '42501';
  end if;

  return query
  select bm.user_id as uid,
         bm.role as role,
         bm.joined_at as joined_at,
         au.email::text as mail,
         coalesce(p.full_name, '')::text as full_name
  from public.business_members bm
  join auth.users au on au.id = bm.user_id
  left join public.profiles p on p.id = bm.user_id
  where bm.business_id = p_business_id
  order by bm.joined_at asc;
end;
$$;

revoke all on function public.resolve_member_details(uuid) from public;
grant execute on function public.resolve_member_details(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. find_user_for_invite: busca un usuario por email para invitarlo como
--    manager. No requiere MFA (cualquier business member puede buscar).
--    Solo devuelve user_id + email + full_name, no datos sensibles.
--    A diferencia de platform_find_user_by_email, esta no requiere ser
--    platform admin ni MFA — la validación de que el llamante puede
--    añadir al usuario la hace la RLS de business_members al insertar.
-- -----------------------------------------------------------------------------
create or replace function public.find_user_for_invite(p_email text)
returns table(uid uuid, mail text, full_name text)
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;

  -- Normalizar el email de búsqueda
  p_email := lower(btrim(p_email));

  if p_email = '' then
    return;
  end if;

  return query
  select au.id as uid,
         au.email::text as mail,
         coalesce(p.full_name, '')::text as full_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where lower(au.email) = p_email
  limit 1;
end;
$$;

revoke all on function public.find_user_for_invite(text) from public;
grant execute on function public.find_user_for_invite(text) to authenticated;
