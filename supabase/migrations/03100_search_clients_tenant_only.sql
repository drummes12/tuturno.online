-- =============================================================================
-- 03100: Restringir search_clients al negocio actual
--
-- Antes, search_clients consultaba también profiles + auth.users para
-- encontrar usuarios registrados sin client en el negocio. Eso permitía
-- a un miembro de un negocio enumerar usuarios de toda la plataforma
-- por nombre, teléfono o email.
--
-- Ahora la búsqueda se limita a los clients del propio negocio. Para
-- invitar a un usuario externo como manager se mantiene find_user_for_invite
-- (búsqueda puntual por email exacto, no enumeración).
-- =============================================================================

create or replace function public.search_clients(
  p_business_id uuid,
  p_query text
)
returns table(
  id uuid,
  name text,
  phone text,
  email text,
  user_id uuid,
  has_account boolean
)
language sql
security definer set search_path = public
stable
as $$
  select
    c.id,
    c.name,
    c.phone,
    c.email,
    c.user_id,
    c.user_id is not null as has_account
  from public.clients c
  where c.business_id = p_business_id
    and (
      c.name ilike '%' || p_query || '%'
      or c.phone ilike '%' || p_query || '%'
      or c.email ilike '%' || p_query || '%'
    )
  order by
    case when c.name ilike p_query || '%' then 0 else 1 end,
    c.name
  limit 20;
$$;

-- El grant ya existe desde 02100; lo reafirmamos por si acaso.
revoke all on function public.search_clients(uuid, text) from public;
grant execute on function public.search_clients(uuid, text) to authenticated;
