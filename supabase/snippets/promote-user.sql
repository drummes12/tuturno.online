-- =============================================================================
-- Promover un usuario a admin (owner/manager) en producción
-- =============================================================================
-- USO:
--   1. El usuario debe registrarse primero desde la app
--   2. Edita los 3 valores marcados con ← EDITAR abajo
--   3. Ejecuta en el SQL Editor de Supabase Studio
--
-- ROLES:
--   owner   — acceso completo + puede añadir/eliminar miembros
--   manager — acceso admin completo pero NO puede gestionar miembros
-- =============================================================================

-- Insertar o actualizar el membership
-- (ON CONFLICT permite re-ejecutar sin error y actualizar el rol si ya existía)
insert into public.business_members (business_id, user_id, role)
select
  b.id,                                    -- business_id
  u.id,                                    -- user_id
  'owner'::public.business_role            -- ← EDITAR: 'owner' o 'manager'
from
  auth.users u
  cross join public.businesses b
where
  u.email = 'tu@email.com'                 -- ← EDITAR: email del usuario
  and b.slug = 'cancha-futbol-5'           -- ← EDITAR: slug del negocio (default: cancha-futbol-5)
on conflict (business_id, user_id)
do update set role = excluded.role;

-- Verificación: mostrar el resultado
select
  u.email,
  bm.role,
  b.name as business,
  b.slug
from auth.users u
join public.business_members bm on bm.user_id = u.id
join public.businesses b on b.id = bm.business_id
where u.email = 'tu@email.com'             -- ← EDITAR: mismo email de arriba
order by u.email;

-- =============================================================================
-- REMOVER ACCESO ADMIN (dejar como cliente nuevamente)
-- =============================================================================
-- Descomenta y ejecuta si necesitas quitar el acceso admin:
--
-- delete from public.business_members
-- where
--   user_id = (select id from auth.users where email = 'tu@email.com')
--   and business_id = (select id from public.businesses where slug = 'cancha-futbol-5');
-- =============================================================================
