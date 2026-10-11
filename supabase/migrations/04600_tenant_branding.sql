-- 46. Tenant branding (co-branding)
-- =============================================================================
-- Cada negocio configura un solo color HEX de marca y un logo; el front
-- genera automáticamente variantes, contraste on-primary y validación
-- WCAG (src/lib/tenant-theme.ts). Ambos campos son opcionales: sin ellos
-- la app usa el fallback verde TuTurno.
-- =============================================================================

alter table public.businesses
  add column if not exists brand_color text
    check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists logo_url text;
