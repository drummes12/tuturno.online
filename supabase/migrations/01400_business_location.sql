-- =============================================================================
-- 01400: Campos de ubicación estructurada para businesses
--
-- Reemplaza el campo único 'address' por campos estructurados + coordenadas
-- para mostrar mapas interactivos (Leaflet/OpenStreetMap, sin API keys).
-- El campo 'address' original se mantiene por compatibilidad (fallback).
-- =============================================================================

-- Añadir campos de ubicación estructurada
alter table public.businesses
  add column if not exists street text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text default 'Colombia',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Índice para búsquedas por ciudad (futuro: directorio de negocios)
create index if not exists idx_businesses_city
  on public.businesses (city)
  where city is not null;

-- Comentario para documentación
comment on column public.businesses.street is 'Calle/carrera y número (ej: Calle 123 #45-67)';
comment on column public.businesses.neighborhood is 'Barrio o zona (ej: El Poblado)';
comment on column public.businesses.city is 'Ciudad (ej: Medellín)';
comment on column public.businesses.state is 'Departamento o estado (ej: Antioquia)';
comment on column public.businesses.country is 'País (default: Colombia)';
comment on column public.businesses.latitude is 'Latitud para mapa (ej: 6.217)';
comment on column public.businesses.longitude is 'Longitud para mapa (ej: -75.567)';
