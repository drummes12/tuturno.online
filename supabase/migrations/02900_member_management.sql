-- =============================================================================
-- 02900: RPCs para gestión de miembros desde el panel de owner
--
-- Los owners pueden invitar managers y eliminarlos desde /admin/equipo.
-- Estas RPCs dan soporte a esa UI sin exponer datos sensibles ni requerir
-- MFA (la RLS de business_members ya valida que el llamante sea owner).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. resolve_member_emails: dado un array de user_ids, devuelve sus emails.
--    Necesario porque auth.users no es accesible vía RLS desde el cliente
--    para usuarios arbitrarios. SECURITY DEFINER para leer auth.users.
--    Valida que el llamante sea miembro de al menos un negocio en común
--    con los user_ids consultados, para no exponer emails arbitrarios.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_member_emails(p_user_ids uuid[])
returns table(uid uuid, mail text)
language plpgsql
security definer set search_path = public, auth
as $$
begin
  -- El llamante debe ser miembro de algún negocio. Si no lo es, no tiene
  -- razón para ver emails de nadie.
  if not exists (
    select 1 from public.business_members bm where bm.user_id = auth.uid()
  ) then
    raise exception 'Sin permisos.' using errcode = '42501';
  end if;

  return query
  select au.id as uid, au.email::text as mail
  from auth.users au
  where au.id = any(p_user_ids)
    -- Solo devolver emails de usuarios que son miembros de algún negocio
    -- del que el llamante también es miembro. Esto evita que un owner
    -- del negocio A vea emails de miembros del negocio B.
    and exists (
      select 1 from public.business_members bm_c
      join public.business_members bm_t
        on bm_t.business_id = bm_c.business_id
      where bm_c.user_id = auth.uid()
        and bm_t.user_id = au.id
    );
end;
$$;

revoke all on function public.resolve_member_emails(uuid[]) from public;
grant execute on function public.resolve_member_emails(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. find_user_for_invite: busca un usuario por email para invitarlo como
--    manager. No requiere MFA (cualquier business member puede buscar).
--    Solo devuelve user_id + email + full_name, no datos sensibles.
--    A diferencia de platform_find_user_by_email, esta no requiere ser
--    platform admin ni MFA — la validación de que el llamante puede
--    añadir al usuario la hace la RLS de business_members al insertar.
-- -----------------------------------------------------------------------------
create or replace function public.find_user_for_invite(p_email text)
returns table(user_id uuid, email text, full_name text)
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
  select au.id as user_id,
         au.email::text as email,
         p.full_name::text as full_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where lower(au.email) = p_email
  limit 1;
end;
$$;

revoke all on function public.find_user_for_invite(text) from public;
grant execute on function public.find_user_for_invite(text) to authenticated;
