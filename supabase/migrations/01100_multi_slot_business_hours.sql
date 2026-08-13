-- =============================================================================
-- 11. Múltiples franjas de horario por día
-- =============================================================================
-- Permite que un día tenga varios rangos horarios (ej: 06:00-12:00 + 14:00-22:00)
-- Remover el constraint unique (business_id, day_of_week) y reemplazarlo
-- por uno que permita múltiples registros por día.

-- 1. Remover constraint unique existente
alter table public.business_hours
  drop constraint if exists business_hours_business_id_day_of_week_key;

-- 2. Agregar constraint unique por (business_id, day_of_week, open_time, close_time)
--    Permite múltiples franjas por día pero no duplicados exactos
alter table public.business_hours
  add constraint business_hours_unique_franja
  unique (business_id, day_of_week, open_time, close_time);

-- 3. Agregar índice para acelerar la consulta de get_availability
create index if not exists idx_business_hours_lookup
  on public.business_hours (business_id, day_of_week, is_active);

-- 4. Otorgar permisos (la tabla ya tiene RLS, solo aseguramos grants)
grant select, insert, update, delete on public.business_hours to authenticated;
