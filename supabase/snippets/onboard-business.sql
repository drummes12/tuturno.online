-- =============================================================================
-- Onboarding de una nueva organización (negocio) en producción
-- =============================================================================
-- Este script es OPERADOR-ONLY: lo ejecuta el dueño de la plataforma
-- desde el SQL Editor de Supabase (o psql) para crear una nueva organización
-- y vincular al primer owner.
--
-- Es IDEMPOTENTE: se puede re-ejecutar sin duplicar datos.
--
-- CÓMO USAR:
-- 1. El usuario se registra normalmente desde la app (https://tuturno.online/registro)
--    Esto crea su fila en auth.users y public.profiles.
-- 2. El operador busca su user_id (ver sección "Cómo obtener el user_id" abajo).
-- 3. Edita las variables de abajo (name, slug, owner_user_id, etc.).
-- 4. Ejecuta este script en el SQL Editor de Supabase.
-- 5. El usuario ya puede entrar a https://tuturno.online/b/{slug} y a /admin.
--
-- REGLAS:
-- - El slug 'demo' está reservado y NO se puede usar aquí.
-- - El slug debe ser único (si ya existe, el script no hace nada).
-- - El owner debe tener cuenta creada antes de ejecutar el script.
-- =============================================================================

-- ┌───────────────────────────────────────────────────────────────────────────
-- │ 1. EDITAR ESTAS VARIABLES ANTES DE EJECUTAR
-- └───────────────────────────────────────────────────────────────────────────

-- Nombre visible del negocio (ej: 'Canchas El Parque')
-- :business_name

-- Slug único para la URL (ej: 'canchas-el-parque' → /b/canchas-el-parque)
-- Solo minúsculas, números y guiones. NO usar 'demo' (reservado).
-- :business_slug

-- User ID del owner (UUID de auth.users). Ver abajo cómo obtenerlo.
-- :owner_user_id

-- ────────────────────────────────────────────────────────────────────────────
-- OPCIONAL: personalizar etiquetas y configuración
-- (descomentar y editar si se necesitan valores distintos a los defaults)
-- ────────────────────────────────────────────────────────────────────────────

-- Etiquetas de recursos (default: 'Espacio' / 'Espacios')
-- Para canchas: 'Cancha' / 'Canchas'
-- Para salas: 'Sala' / 'Salas'
-- :resource_label_singular   -- ej: 'Cancha'
-- :resource_label_plural     -- ej: 'Canchas'

-- Zona horaria (default: 'America/Bogota')
-- :timezone                  -- ej: 'America/Bogota'

-- Teléfono de contacto (default: null)
-- :phone                     -- ej: '+57 300 123 4567'

-- Dirección (default: null)
-- :address                   -- ej: 'Calle 123 #45-67, Medellín'

-- Ubicación estructurada (default: null excepto country='Colombia')
-- :street                    -- ej: 'Calle 123 #45-67'
-- :neighborhood              -- ej: 'El Poblado'
-- :city                      -- ej: 'Medellín'
-- :state                     -- ej: 'Antioquia'
-- :country                   -- ej: 'Colombia'

-- Duración de turnos en minutos (default: 60)
-- :slot_duration_minutes     -- ej: 90

-- ┌───────────────────────────────────────────────────────────────────────────
-- │ 2. SCRIPT — NO EDITAR DEBAJO DE ESTA LÍNEA
-- └───────────────────────────────────────────────────────────────────────────

-- Validar que el slug no sea 'demo' (reservado)
do $$
begin
  if :'business_slug' = 'demo' then
    raise exception 'El slug "demo" está reservado y no puede usarse para un negocio real.';
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2a. Crear el negocio (idempotente por slug)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.businesses (
  name, slug, timezone, address, phone,
  resource_label_singular, resource_label_plural,
  street, neighborhood, city, state, country,
  is_demo
) values (
  :'business_name',
  :'business_slug',
  coalesce(nullif(:'timezone', ''), 'America/Bogota'),
  nullif(:'address', ''),
  nullif(:'phone', ''),
  coalesce(nullif(:'resource_label_singular', ''), 'Espacio'),
  coalesce(nullif(:'resource_label_plural', ''), 'Espacios'),
  nullif(:'street', ''),
  nullif(:'neighborhood', ''),
  nullif(:'city', ''),
  nullif(:'state', ''),
  coalesce(nullif(:'country', ''), 'Colombia'),
  false
)
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- 2b. Vincular al owner (idempotente por PK business_id + user_id)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.business_members (business_id, user_id, role)
select b.id, :'owner_user_id'::uuid, 'owner'
from public.businesses b
where b.slug = :'business_slug'
on conflict (business_id, user_id) do update set role = 'owner';

-- ────────────────────────────────────────────────────────────────────────────
-- 2c. Verificar resultado
-- ────────────────────────────────────────────────────────────────────────────
select
  b.id           as business_id,
  b.name         as business_name,
  b.slug         as business_slug,
  b.is_demo      as is_demo,
  bm.user_id     as owner_user_id,
  bm.role        as owner_role,
  ('https://tuturno.online/b/' || b.slug) as public_url,
  ('https://tuturno.online/admin')         as admin_url
from public.businesses b
join public.business_members bm on bm.business_id = b.id
where b.slug = :'business_slug'
  and bm.user_id = :'owner_user_id'::uuid;

-- =============================================================================
-- Cómo obtener el user_id del owner
-- =============================================================================
-- Opción A — desde el SQL Editor:
--   select id, email from auth.users where email = 'owner@email.com';
--
-- Opción B — desde el Dashboard:
--   Authentication → Users → buscar el email → copiar el UID
--
-- =============================================================================
-- Onboarding completo — pasos siguientes (opcionales, desde la app)
-- =============================================================================
-- Una vez creado el negocio, el owner puede desde /admin:
--   1. Crear recursos (Canchas/Salas/Consultorios) en /admin/recursos
--   2. Configurar horarios en /admin/horarios
--   3. Configurar cierres/excepciones en /admin/excepciones
--   4. Personalizar etiquetas, teléfono, instrucciones en /admin/configuracion
--   5. Añadir managers adicionales (cuando se implemente el UI de miembros)
--      o manualmente:
--        insert into public.business_members (business_id, user_id, role)
--        select b.id, '<manager_user_id>'::uuid, 'manager'
--        from public.businesses b where b.slug = '<slug>'
--        on conflict (business_id, user_id) do update set role = 'manager';
-- =============================================================================
