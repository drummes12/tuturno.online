-- =============================================================================
-- 12. Gap entre turnos
-- =============================================================================
-- Permite configurar un descanso/gap entre turnos consecutivos.
-- Por defecto es 0 (turnos seguidos). Ej: 15 min de limpieza entre reservas.

alter table public.businesses
  add column if not exists gap_minutes integer not null default 0
  check (gap_minutes >= 0);
