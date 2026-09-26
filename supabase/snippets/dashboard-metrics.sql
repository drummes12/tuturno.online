-- =============================================================================
-- Snippet: validar manualmente las métricas del dashboard en producción
--
-- Uso (SQL Editor de Supabase):
--   1. Ajusta @slug@ con el slug del negocio a validar (o quítalo para usar
--      el primer negocio no-demo).
--   2. Corre cada bloque. La RPC exige ser miembro del negocio: el bloque 1
--      simula el JWT de un miembro real para que auth.uid() funcione.
-- =============================================================================

-- ── 1. Contexto: negocio + miembro que consulta ───────────────────────────────
-- Devuelve business_id, el user_id de un miembro y fija el JWT simulado.
do $$
declare
  v_business_id uuid;
  v_member_id uuid;
begin
  -- Negocio con al menos un miembro (la RPC exige membresía)
  select b.id into v_business_id
  from public.businesses b
  where b.slug = 'canchas-el-parque'  -- ← cambia el slug aquí
    and exists (select 1 from public.business_members bm
                where bm.business_id = b.id)
  limit 1;

  if v_business_id is null then
    select b.id into v_business_id
    from public.businesses b
    where b.is_demo = false
      and exists (select 1 from public.business_members bm
                  where bm.business_id = b.id)
    order by b.created_at
    limit 1;
  end if;

  if v_business_id is null then
    raise exception 'No hay negocio con miembros';
  end if;

  select bm.user_id into v_member_id
  from public.business_members bm
  where bm.business_id = v_business_id
  order by bm.role = 'owner' desc, bm.joined_at
  limit 1;

  raise notice 'business_id = %, member_id = %', v_business_id, v_member_id;

  -- is_local=false: persiste para los siguientes bloques de la sesión
  perform set_config('app.test_business_id', v_business_id::text, false);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_member_id, 'role', 'authenticated')::text,
    false
  );
end $$;

-- ── 2. Dashboard — "Últimos 30 días" ─────────────────────────────────────────
-- Reutiliza el business_id guardado. Devuelve el jsonb completo.
select public.get_business_dashboard(
  current_setting('app.test_business_id')::uuid,
  current_date - 29,   -- desde
  current_date,        -- hasta (inclusivo)
  null                 -- null = todos los recursos
);

-- ── 3. Otros periodos (mismos presets del UI) ─────────────────────────────────
-- Esta semana (lunes → hoy):
--   date_trunc('week', current_date)::date, current_date
-- Últimos 7 días:
--   current_date - 6, current_date
-- Este mes:
--   date_trunc('month', current_date)::date, current_date
-- Últimos 90 días:
--   current_date - 89, current_date

-- ── 4. Filtrar por recursos concretos ─────────────────────────────────────────
-- select public.get_business_dashboard(
--   current_setting('app.test_business_id')::uuid,
--   current_date - 29,
--   current_date,
--   array['<resource_uuid_1>', '<resource_uuid_2>']::uuid[]
-- );

-- ── 5. Clientes — página 1 (20 por página), con buscador opcional ────────────
select *
from public.get_business_dashboard_clients(
  current_setting('app.test_business_id')::uuid,
  current_date - 29,
  current_date,
  null,      -- recursos
  null,      -- buscador (nombre o teléfono)
  20,        -- limit
  0          -- offset
);
