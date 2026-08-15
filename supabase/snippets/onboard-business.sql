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
-- 2. El operador busca su user_id:
--      select id, email from auth.users where email = 'owner@email.com';
-- 3. Edita SOLO la sección de variables abajo (entre los -- EDITAR).
-- 4. Ejecuta el script completo en el SQL Editor de Supabase.
-- 5. El usuario ya puede entrar a https://tuturno.online/b/{slug} y a /admin.
--
-- REGLAS:
-- - El slug 'demo' está reservado y NO se puede usar aquí.
-- - El slug debe ser único (si ya existe, el script no hace nada).
-- - El owner debe tener cuenta creada antes de ejecutar el script.
-- =============================================================================

-- ┌───────────────────────────────────────────────────────────────────────────
-- │ 1. EDITAR ESTA SECCIÓN — reemplaza los valores entre comillas simples
-- └───────────────────────────────────────────────────────────────────────────

do $$
declare
  -- ═══════════════════════════════════════════════════════════════════════════
  --  OBLIGATORIO — editar estos tres valores
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Nombre visible del negocio
  v_name text := 'business_name';

  -- Slug único para la URL → /b/{slug}
  -- Solo minúsculas, números y guiones. NO usar 'demo'.
  v_slug text := 'business_slug';

  -- User ID del owner (UUID de auth.users)
  v_owner_id uuid := 'owner_user_id';

  -- ═══════════════════════════════════════════════════════════════════════════
  --  OPCIONAL — personalizar (los defaults funcionan para la mayoría)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Etiquetas de recursos (default: 'Espacio' / 'Espacios')
  -- Para canchas: 'Cancha' / 'Canchas' · Para salas: 'Sala' / 'Salas'
  v_label_singular text := 'Espacio';
  v_label_plural   text := 'Espacios';

  -- Zona horaria (default: 'America/Bogota')
  v_timezone text := 'America/Bogota';

  -- Teléfono de contacto (null = sin teléfono)
  v_phone text := null;

  -- Ubicación estructurada (null = no especificada, country default 'Colombia')
  v_street        text   := null;
  v_neighborhood  text   := null;
  v_city          text   := null;
  v_state         text   := null;
  v_country       text   := 'Colombia';

  -- Duración de turnos en minutos (default: 60)
  v_slot_minutes int := 60;

  -- ═══════════════════════════════════════════════════════════════════════════
  --  NO EDITAR DEBAJO DE ESTA LÍNEA
  -- ═══════════════════════════════════════════════════════════════════════════
  v_business_id uuid;
begin
  -- Validar slug reservado
  if v_slug = 'demo' then
    raise exception 'El slug "demo" está reservado y no puede usarse para un negocio real.';
  end if;

  -- Validar que el owner exista en auth.users
  if not exists (select 1 from auth.users where id = v_owner_id) then
    raise exception 'El user_id % no existe en auth.users. Pídele al owner que se registre primero.', v_owner_id;
  end if;

  -- Crear el negocio (idempotente por slug)
  insert into public.businesses (
    name, slug, timezone, phone,
    slot_duration_minutes,
    resource_label_singular, resource_label_plural,
    street, neighborhood, city, state, country,
    is_demo
  ) values (
    v_name, v_slug, v_timezone, v_phone,
    v_slot_minutes,
    v_label_singular, v_label_plural,
    v_street, v_neighborhood, v_city, v_state, v_country,
    false
  )
  on conflict (slug) do nothing;

  -- Obtener el business_id
  select id into v_business_id
  from public.businesses
  where slug = v_slug;

  if not found then
    raise exception 'No se pudo crear ni encontrar el negocio con slug "%".', v_slug;
  end if;

  -- Vincular al owner (idempotente por PK)
  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  -- Confirmación
  raise notice '✓ Negocio "%" creado/vinculado (slug: %)', v_name, v_slug;
  raise notice '✓ Owner vinculado: %', v_owner_id;
  raise notice '✓ URL pública:  https://tuturno.online/b/%', v_slug;
  raise notice '✓ URL admin:    https://tuturno.online/admin';
end
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Verificar resultado (opcional — ejecutar después del DO block)
-- ────────────────────────────────────────────────────────────────────────────
-- select
--   b.id        as business_id,
--   b.name      as business_name,
--   b.slug      as business_slug,
--   b.is_demo   as is_demo,
--   bm.user_id  as owner_user_id,
--   bm.role     as owner_role,
--   'https://tuturno.online/b/' || b.slug as public_url,
--   'https://tuturno.online/admin'         as admin_url
-- from public.businesses b
-- join public.business_members bm on bm.business_id = b.id
-- where b.slug = 'business_slug';

-- =============================================================================
-- Onboarding completo — pasos siguientes (desde la app, por el owner)
-- =============================================================================
-- Una vez creado el negocio, el owner entra a /admin y puede:
--   1. Crear recursos (Canchas/Salas/Consultorios) en /admin/recursos
--   2. Configurar horarios en /admin/horarios
--   3. Configurar cierres/excepciones en /admin/excepciones
--   4. Personalizar etiquetas, teléfono, instrucciones en /admin/configuracion
--   5. Añadir managers adicionales (cuando se implemente el UI de miembros)
--      o manualmente con supabase/snippets/promote-user.sql
-- =============================================================================
