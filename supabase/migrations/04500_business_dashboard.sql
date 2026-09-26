-- =============================================================================
-- 04500: Dashboard de métricas del negocio
--
-- Dos RPCs para poblar el dashboard admin (/admin/metricas):
--
--   1. get_business_dashboard — un solo jsonb con todo lo que pinta la vista:
--      periodo actual vs. anterior, trend diario, SLA de solicitudes de cliente,
--      heatmap en 3 agregaciones (día/semana/mes), origen de reservas con
--      desglose por estado, top 5 clientes, recursos y business_hours.
--
--   2. get_business_dashboard_clients — lista paginada de clientes con sus
--      reservas del periodo, para el sheet "ver todos" (con buscador).
--
-- Convenciones:
--   - El filtro de periodo es por starts_at (ocupación del negocio), en la zona
--     horaria del negocio. p_from/p_to son fechas locales inclusivas.
--   - El periodo anterior es la ventana de igual duración justo antes.
--   - Origen: la reserva se clasifica por su evento de creación
--     (from_status is null): to_status='pending' → cliente; 'confirmed' →
--     negocio. No se usa hold_expires_at porque confirmar/rechazar lo limpia.
--   - SLA: solo reservas de origen 'client'. Desenlace = primer evento
--     pending → confirmed/rejected/expired (no el status actual: una confirmada
--     que luego se completa sí fue respondida). "a tiempo" = decidida dentro
--     del hold configurado. response_minutes = decisión - created_at.
--   - Heatmap: solo confirmed + completed. dow se emite como isodow (1=lun).
-- =============================================================================

create index if not exists idx_reservations_business_starts
  on public.reservations (business_id, starts_at);

-- Los distinct-on de first_ev/decision_ev leen los eventos de cada reserva en
-- orden de created_at; el compuesto evita ordenar por reserva.
create index if not exists idx_reservation_events_res_created
  on public.reservation_events (reservation_id, created_at);

-- =============================================================================
-- get_business_dashboard
-- =============================================================================
create or replace function public.get_business_dashboard(
  p_business_id uuid,
  p_from date,
  p_to date,
  p_resource_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_tz text;
  v_hold integer;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_prev_from_ts timestamptz;
  v_prev_to_ts timestamptz;
  v_len integer;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'Sin permisos para ver las métricas de este negocio';
  end if;

  select b.timezone, b.hold_duration_minutes
  into v_tz, v_hold
  from public.businesses b
  where b.id = p_business_id;

  if not found then
    raise exception 'Negocio no encontrado';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido';
  end if;

  -- El dashboard solo consulta presets de hasta 90 días; un rango mayor
  -- inflaría el trend y el escaneo sin aportar nada a la UI.
  if p_to - p_from > 366 then
    raise exception 'El periodo máximo es de 366 días';
  end if;

  -- Límites en la zona horaria del negocio (p_to inclusivo → exclusivo +1d)
  v_from_ts := (p_from::timestamp at time zone v_tz);
  v_to_ts := ((p_to + 1)::timestamp at time zone v_tz);
  v_len := p_to - p_from + 1;             -- días del periodo
  v_prev_to_ts := v_from_ts;
  v_prev_from_ts := v_from_ts - (v_to_ts - v_from_ts);

  with
  -- Reservas del periodo actual y anterior (filtro por starts_at local)
  scoped as materialized (
    select r.id, r.client_id, r.status, r.created_at,
           (r.starts_at at time zone v_tz) as local_start
    from public.reservations r
    where r.business_id = p_business_id
      and r.starts_at >= v_from_ts and r.starts_at < v_to_ts
      and (p_resource_ids is null or r.resource_id = any(p_resource_ids))
  ),
  scoped_prev as materialized (
    select r.id, r.client_id, r.status, r.created_at,
           (r.starts_at at time zone v_tz) as local_start
    from public.reservations r
    where r.business_id = p_business_id
      and r.starts_at >= v_prev_from_ts and r.starts_at < v_prev_to_ts
      and (p_resource_ids is null or r.resource_id = any(p_resource_ids))
  ),
  -- Evento de creación por reserva (from_status is null)
  first_ev as (
    select distinct on (e.reservation_id)
           e.reservation_id, e.to_status
    from public.reservation_events e
    join scoped s on s.id = e.reservation_id
    where e.from_status is null
    order by e.reservation_id, e.created_at
  ),
  first_ev_prev as (
    select distinct on (e.reservation_id)
           e.reservation_id, e.to_status
    from public.reservation_events e
    join scoped_prev s on s.id = e.reservation_id
    where e.from_status is null
    order by e.reservation_id, e.created_at
  ),
  -- Primer evento de decisión tras pending
  decision_ev as (
    select distinct on (e.reservation_id)
           e.reservation_id, e.to_status, e.created_at
    from public.reservation_events e
    join scoped s on s.id = e.reservation_id
    where e.from_status = 'pending'
      and e.to_status in ('confirmed', 'rejected', 'expired', 'cancelled_by_client')
    order by e.reservation_id, e.created_at
  ),
  decision_ev_prev as (
    select distinct on (e.reservation_id)
           e.reservation_id, e.to_status, e.created_at
    from public.reservation_events e
    join scoped_prev s on s.id = e.reservation_id
    where e.from_status = 'pending'
      and e.to_status in ('confirmed', 'rejected', 'expired', 'cancelled_by_client')
    order by e.reservation_id, e.created_at
  ),
  enriched as (
    select s.*,
           case when fe.to_status = 'confirmed' then 'business' else 'client' end as origin,
           de.to_status as decision,
           (extract(epoch from (de.created_at - s.created_at)) / 60.0) as response_minutes,
           (de.created_at is not null
             and de.to_status in ('confirmed', 'rejected')
             and de.created_at <= s.created_at + (v_hold || ' minutes')::interval) as on_time
    from scoped s
    left join first_ev fe on fe.reservation_id = s.id
    left join decision_ev de on de.reservation_id = s.id
  ),
  enriched_prev as (
    select s.*,
           case when fe.to_status = 'confirmed' then 'business' else 'client' end as origin,
           de.to_status as decision,
           (extract(epoch from (de.created_at - s.created_at)) / 60.0) as response_minutes,
           (de.created_at is not null
             and de.to_status in ('confirmed', 'rejected')
             and de.created_at <= s.created_at + (v_hold || ' minutes')::interval) as on_time
    from scoped_prev s
    left join first_ev_prev fe on fe.reservation_id = s.id
    left join decision_ev_prev de on de.reservation_id = s.id
  ),
  -- Jornadas abiertas del periodo por día de semana (isodow), para promedios
  open_dows as (
    select extract(isodow from g.d)::int as dow, count(*)::numeric as n
    from generate_series(p_from, p_to, interval '1 day') g(d)
    join public.business_hours bh
      on bh.business_id = p_business_id
     and bh.is_active
     and bh.day_of_week = extract(dow from g.d)::int
    group by 1
  ),
  open_total as (select coalesce(sum(n), 1) as n from open_dows),
  trend as (
    select to_char(g.d, 'YYYY-MM-DD') as d,
           coalesce(cur.n, 0) as n,
           coalesce(pv.n, 0) as prev
    from generate_series(p_from, p_to, interval '1 day') g(d)
    left join (select local_start::date as d, count(*) as n
               from enriched group by 1) cur on cur.d = g.d::date
    left join (select local_start::date as d, count(*) as n
               from enriched_prev group by 1) pv on pv.d = g.d::date - v_len
    order by g.d
  ),
  status_totals as (
    select jsonb_object_agg(status, n) as j
    from (select status::text as status, count(*) as n
          from enriched group by status) t
  ),
  status_totals_prev as (
    select jsonb_object_agg(status, n) as j
    from (select status::text as status, count(*) as n
          from enriched_prev group by status) t
  ),
  -- SLA: solo solicitudes de origen cliente
  sla_cur as (
    select
      count(*) as requests,
      count(*) filter (where decision = 'confirmed') as confirmed,
      count(*) filter (where decision = 'rejected') as rejected,
      count(*) filter (where decision = 'expired') as expired,
      count(*) filter (where decision = 'cancelled_by_client') as cancelled_by_client,
      count(*) filter (where decision is null) as pending,
      count(*) filter (where on_time) as on_time,
      round((avg(response_minutes)
             filter (where decision in ('confirmed', 'rejected')))::numeric, 1) as avg_minutes,
      round((percentile_cont(0.5) within group (order by response_minutes)
             filter (where decision in ('confirmed', 'rejected')))::numeric, 1) as median_minutes
    from enriched
    where origin = 'client'
  ),
  sla_prev as (
    select
      count(*) as requests,
      round((avg(response_minutes)
             filter (where decision in ('confirmed', 'rejected')))::numeric, 1) as avg_minutes,
      round((percentile_cont(0.5) within group (order by response_minutes)
             filter (where decision in ('confirmed', 'rejected')))::numeric, 1) as median_minutes,
      count(*) filter (where on_time) as on_time
    from enriched_prev
    where origin = 'client'
  ),
  heat_src as (
    select local_start
    from enriched
    where status in ('confirmed', 'completed')
  ),
  heat_day as (
    select extract(hour from local_start)::int as h,
           count(*) as total,
           round(count(*)::numeric / max(ot.n), 1) as avg
    from heat_src, open_total ot
    group by 1
  ),
  heat_week as (
    select extract(isodow from local_start)::int as dow,
           extract(hour from local_start)::int as h,
           count(*) as total,
           round(count(*)::numeric / greatest(coalesce(max(od.n), 1), 1), 1) as avg
    from heat_src
    left join open_dows od on od.dow = extract(isodow from local_start)::int
    group by 1, 2
  ),
  heat_month as (
    select local_start::date::text as d, count(*) as total
    from heat_src
    group by 1
  ),
  origin_stats as (
    select jsonb_build_object(
      'client', coalesce((select jsonb_build_object(
          'total', count(*),
          'confirmed', count(*) filter (where status = 'confirmed'),
          'completed', count(*) filter (where status = 'completed'),
          'pending', count(*) filter (where status = 'pending'),
          'expired', count(*) filter (where status = 'expired'),
          'rejected', count(*) filter (where status = 'rejected'),
          'cancelledByClient', count(*) filter (where status = 'cancelled_by_client'),
          'cancelledByBusiness', count(*) filter (where status = 'cancelled_by_business')
        ) from enriched where origin = 'client'), '{}'::jsonb),
      'business', coalesce((select jsonb_build_object(
          'total', count(*),
          'confirmed', count(*) filter (where status = 'confirmed'),
          'completed', count(*) filter (where status = 'completed'),
          'pending', count(*) filter (where status = 'pending'),
          'expired', count(*) filter (where status = 'expired'),
          'rejected', count(*) filter (where status = 'rejected'),
          'cancelledByClient', count(*) filter (where status = 'cancelled_by_client'),
          'cancelledByBusiness', count(*) filter (where status = 'cancelled_by_business')
        ) from enriched where origin = 'business'), '{}'::jsonb)
    ) as j
  ),
  top_clients as (
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) as j
    from (
      select e.client_id as id, c.name,
             fs.since::text as client_since,
             count(*) as reservations,
             count(*) filter (where e.status = 'confirmed') as confirmed,
             count(*) filter (where e.status = 'completed') as completed
      from enriched e
      join public.clients c on c.id = e.client_id
      join lateral (
        select min(r2.starts_at)::date as since
        from public.reservations r2
        where r2.business_id = p_business_id and r2.client_id = e.client_id
      ) fs on true
      group by e.client_id, c.name, fs.since
      order by reservations desc, c.name
      limit 5
    ) t
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'prevFrom', (p_from - v_len)::date,
      'prevTo', (p_from - 1)::date,
      'timezone', v_tz,
      'holdMinutes', v_hold
    ),
    'resources', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)
                       order by r.sort_order, r.name)
      from public.resources r
      where r.business_id = p_business_id and r.is_active
    ), '[]'::jsonb),
    'businessHours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dow', ((bh.day_of_week + 6) % 7) + 1,  -- pg dow (dom=0) → isodow (lun=1)
               'open', bh.open_time,
               'close', bh.close_time)
             order by ((bh.day_of_week + 6) % 7) + 1)
      from public.business_hours bh
      where bh.business_id = p_business_id and bh.is_active
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'current', (select count(*) from enriched),
      'previous', (select count(*) from enriched_prev)
    ),
    'statusTotals', coalesce((select j from status_totals), '{}'::jsonb),
    'statusTotalsPrev', coalesce((select j from status_totals_prev), '{}'::jsonb),
    'trend', coalesce((select jsonb_agg(row_to_json(t)::jsonb) from trend t), '[]'::jsonb),
    'sla', jsonb_build_object(
      'requests', (select requests from sla_cur),
      'confirmed', (select confirmed from sla_cur),
      'rejected', (select rejected from sla_cur),
      'expired', (select expired from sla_cur),
      'cancelledByClient', (select cancelled_by_client from sla_cur),
      'pending', (select pending from sla_cur),
      'onTime', (select on_time from sla_cur),
      'avgResponseMinutes', (select avg_minutes from sla_cur),
      'medianResponseMinutes', (select median_minutes from sla_cur),
      'avgResponsePctOfHold',
        case when v_hold > 0
          then round(((select avg_minutes from sla_cur) / v_hold) * 100, 1)
          else null end,
      'prev', jsonb_build_object(
        'requests', (select requests from sla_prev),
        'avgResponseMinutes', (select avg_minutes from sla_prev),
        'medianResponseMinutes', (select median_minutes from sla_prev),
        'onTime', (select on_time from sla_prev)
      )
    ),
    'heatmap', jsonb_build_object(
      'day', coalesce((
        select jsonb_agg(jsonb_build_object('hour', h, 'total', total, 'avg', avg)
                         order by h) from heat_day
      ), '[]'::jsonb),
      'week', coalesce((
        select jsonb_agg(jsonb_build_object('dow', dow, 'hour', h, 'total', total, 'avg', avg)
                         order by dow, h) from heat_week
      ), '[]'::jsonb),
      'month', coalesce((
        select jsonb_agg(jsonb_build_object('date', d, 'total', total)
                         order by d) from heat_month
      ), '[]'::jsonb)
    ),
    'origin', (select j from origin_stats),
    'topClients', (select j from top_clients)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_business_dashboard(uuid, date, date, uuid[]) to authenticated;

-- =============================================================================
-- get_business_dashboard_clients — lista paginada para el sheet "ver todos"
-- =============================================================================
create or replace function public.get_business_dashboard_clients(
  p_business_id uuid,
  p_from date,
  p_to date,
  p_resource_ids uuid[] default null,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  client_id uuid,
  name text,
  phone text,
  client_since date,
  reservations bigint,
  confirmed bigint,
  completed bigint,
  cancelled bigint,
  total_count bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_tz text;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'Sin permisos para ver las métricas de este negocio';
  end if;

  select b.timezone into v_tz
  from public.businesses b
  where b.id = p_business_id;

  if not found then
    raise exception 'Negocio no encontrado';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido';
  end if;

  v_from_ts := (p_from::timestamp at time zone v_tz);
  v_to_ts := ((p_to + 1)::timestamp at time zone v_tz);

  return query
  with scoped as (
    select r.client_id, r.status
    from public.reservations r
    where r.business_id = p_business_id
      and r.starts_at >= v_from_ts and r.starts_at < v_to_ts
      and (p_resource_ids is null or r.resource_id = any(p_resource_ids))
      and r.client_id is not null
  ),
  agg as (
    select s.client_id,
           count(*) as n,
           count(*) filter (where s.status = 'confirmed') as confirmed,
           count(*) filter (where s.status = 'completed') as completed,
           count(*) filter (where s.status in ('cancelled_by_client', 'cancelled_by_business', 'rejected', 'expired')) as cancelled
    from scoped s
    group by s.client_id
  )
  select a.client_id,
         c.name,
         c.phone,
         fs.since as client_since,
         a.n,
         a.confirmed,
         a.completed,
         a.cancelled,
         count(*) over () as total_count
  from agg a
  join public.clients c on c.id = a.client_id
  join lateral (
    select min(r2.starts_at)::date as since
    from public.reservations r2
    where r2.business_id = p_business_id and r2.client_id = a.client_id
  ) fs on true
  where (p_search is null or btrim(p_search) = ''
         or c.name ilike '%' || btrim(p_search) || '%'
         or c.phone ilike '%' || btrim(p_search) || '%')
  order by a.n desc, c.name
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.get_business_dashboard_clients(uuid, date, date, uuid[], text, integer, integer) to authenticated;
