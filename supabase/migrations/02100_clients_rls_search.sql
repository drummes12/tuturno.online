-- =============================================================================
-- 02100: RLS, grants y búsqueda de clients
-- =============================================================================

-- RLS en clients
alter table public.clients enable row level security;

-- Un cliente puede leer su propio registro en clients
create policy "Users can read own client profile"
  on public.clients for select
  using (user_id = auth.uid());

-- Los miembros del negocio pueden leer todos los clients de su negocio
create policy "Business members can read their clients"
  on public.clients for select
  using (public.is_business_member(business_id));

-- Los miembros del negocio pueden crear/editar clients
create policy "Business members can insert clients"
  on public.clients for insert
  with check (public.is_business_member(business_id));

create policy "Business members can update clients"
  on public.clients for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Business members can delete clients"
  on public.clients for delete
  using (public.is_business_member(business_id));

-- Grants
grant select on public.clients to authenticated;
grant insert on public.clients to authenticated;
grant update on public.clients to authenticated;
grant delete on public.clients to authenticated;

-- =============================================================================
-- search_clients: busca clientes por nombre, teléfono o email
-- Solo accesible por miembros del negocio
--
-- Busca en dos fuentes:
-- 1. clients: clientes existentes (con o sin cuenta)
-- 2. profiles + auth.users: usuarios registrados que aún no tienen un client
--    en este negocio (para que el negocio pueda verlos y seleccionarlos)
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
  select * from (
    -- 1. Clients existentes en este negocio
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

    union all

    -- 2. Usuarios registrados sin client en este negocio
    select
      null::uuid,
      p.full_name,
      p.phone,
      au.email,
      au.id,
      true
    from public.profiles p
    join auth.users au on au.id = p.id
    left join public.clients c on c.user_id = p.id and c.business_id = p_business_id
    where c.id is null
      and (
        p.full_name ilike '%' || p_query || '%'
        or p.phone ilike '%' || p_query || '%'
        or au.email ilike '%' || p_query || '%'
      )
  ) combined
  order by
    case when name ilike p_query || '%' then 0 else 1 end,
    name
  limit 20;
$$;

grant execute on function public.search_clients(uuid, text) to authenticated;
