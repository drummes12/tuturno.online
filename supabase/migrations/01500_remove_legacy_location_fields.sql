-- =============================================================================
-- 01500: Eliminar campos de ubicación que ya no se utilizan
--
-- La ubicación se gestiona mediante campos estructurados y un enlace a Google
-- Maps generado por texto. No se requiere una API ni coordenadas almacenadas.
-- =============================================================================

alter table public.businesses
  drop column if exists address,
  drop column if exists latitude,
  drop column if exists longitude;
