# TuTurno — Guía del proyecto

## Stack
- **Frontend:** React 19 + Vite + TypeScript
- **Ruteo:** wouter
- **Estado global:** zustand
- **Estilos:** Tailwind CSS v4 (vía @tailwindcss/vite)
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Correo:** Resend (vía Edge Function)
- **Gestor de paquetes:** pnpm

## Comandos
- `pnpm dev` — servidor de desarrollo
- `pnpm build` — build de producción (tsc + vite)
- `pnpm lint` — lint con oxlint
- `pnpm preview` — previsualizar build
- `pnpm test` — tests con Vitest (watch)
- `pnpm test:run` — tests sin watch (CI)
- `pnpm test:coverage` — tests con cobertura
- `bash supabase/seed-dev-users.sh` — crea 3 usuarios de prueba (owner, admin, cliente) con contraseña `123456`

## Estructura
- `src/lib/` — cliente Supabase y utilidades
- `src/services/` — capa de servicios (toda consulta a Supabase va aquí, nunca directa desde páginas/hooks)
- `src/stores/` — stores de zustand
- `src/hooks/` — hooks personalizados
- `src/types/` — tipos compartidos
- `src/components/{common,layout,auth,client,admin}/` — componentes
- `src/pages/{auth,client,admin}/` — páginas
- `src/test/` — infraestructura de tests (setup, mocks, helper de BD)
- `supabase/migrations/` — migraciones SQL (numeradas)
- `supabase/functions/` — Edge Functions
- `supabase/seed-dev-users.sh` — script de seed para desarrollo local

## Configuración
1. Crear `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Ejecutar migraciones en Supabase
3. Configurar secrets de Supabase:
   - `RESEND_API_KEY` — API key de Resend
   - `RESEND_FROM_EMAIL` — email remitente (ej: `hola@tuturno.online`)
   - `APP_URL` — URL pública del frontend (ej: `https://tuturno.online`)
   - `SUPABASE_BASE_URL` — URL del proyecto Supabase (ej: `https://xxx.supabase.co`)
   - `SERVICE_ROLE_KEY` — service role key para el cron
4. Cargar secrets en vault (desde el SQL Editor de Supabase):
   ```sql
   select vault.create_secret('https://xxx.supabase.co', 'supabase_base_url');
   select vault.create_secret('sb_secret_xxx', 'service_role_key');
   ```
5. Deployar la Edge Function `send-notifications`
6. Los crons se configuran automáticamente con las migraciones:
   - `expire-pending-reservations` (cada 5 min) — migración 01000
   - `complete-past-reservations` (cada 5 min) — migración 03200
   - `send-notifications` (cada 2 min) — migración 01300, invoca la Edge Function vía pg_net

## Convenciones
- Mobile-first en todas las vistas, incluida administración
- Targets táctiles mínimos de 44px (clase `touch-target`)
- Estados con texto + icono + color, nunca solo color
- RLS en todas las tablas; operaciones sensibles vía RPC
- Zona horaria: `America/Bogota` (almacenar UTC, mostrar local)

## Roles y permisos
- **`business_role`** es un enum PostgreSQL con dos valores: `owner` y `manager`
- La tabla `business_members` vincula usuarios a negocios con un rol
- `is_business_member(business_id)` verifica si el usuario actual (`auth.uid()`) es miembro de un negocio (cualquier rol)
- El frontend determina `isAdmin` consultando si el usuario tiene un registro en `business_members` (vía `fetchBusinessId`)
- **owner**: puede añadir/eliminar miembros del negocio (RLS lo restringe)
- **manager**: puede administrar canchas, horarios, reservas, pero NO añadir miembros
- Ambos roles tienen acceso al panel admin (confirmar/rechazar/cancelar reservas ambos, editar canchas, horarios, configuración solo owner)
- Un cliente normal (sin membership) solo puede ver disponibilidad y crear/cancelar sus propias reservas

### Operador de plataforma
- `platform_admins` lista a los operadores; solo se siembra con service_role (`supabase/snippets/seed-platform-admin.sql`)
- `is_platform_admin()` se usa en RLS; `assert_platform_admin()` se usa dentro de cada RPC sensible y además exige `aal2` (MFA) cuando la llamada viene por HTTP
- Toda aprobación, rechazo o cambio de rol queda en `platform_audit_log`
- El panel vive en `/plataforma` y se envuelve con `MfaGate`; el guard del frontend es cosmético, el límite real es el RPC

### Cómo crear una nueva organización en producción
1. El usuario se registra desde la app (`https://tuturno.online/registro`) y envía su solicitud en `/crear-negocio`
2. Se crea una fila en `business_signup_requests` y se encola el aviso al operador (el correo es solo la alerta; la fuente de verdad es la tabla)
3. El operador aprueba desde `/plataforma`: `approve_business_signup` crea el negocio, vincula al owner y notifica
4. El usuario ya puede entrar a `https://tuturno.online/b/{slug}` y a `/admin`

Los snippets `onboard-business.sql` / `promote-user.sql` quedan como plan B si el panel no está disponible.

### Cómo añadir un manager a una organización existente
1. El nuevo manager se registra desde la app
2. Un owner existente lo añade desde el panel (cuando se implemente) o manualmente:
   ```sql
   insert into public.business_members (business_id, user_id, role)
   select b.id, '<manager_user_id>'::uuid, 'manager'
   from public.businesses b where b.slug = '<slug>'
   on conflict (business_id, user_id) do update set role = 'manager';
   ```
3. Para promover a owner:
   ```sql
   insert into public.business_members (business_id, user_id, role)
   select b.id, '<user_id>'::uuid, 'owner'
   from public.businesses b where b.slug = '<slug>'
   on conflict (business_id, user_id) do update set role = 'owner';
   ```

### URLs
- Landing: `https://tuturno.online/`
- Demo: `https://tuturno.online/b/demo`
- Negocio real: `https://tuturno.online/b/{slug}`
- Admin: `https://tuturno.online/admin`

## Testing
- **Stack:** Vitest + @testing-library/react + jsdom + pg (para tests de BD)
- **Tests unitarios:** `src/lib/*.test.ts`, `src/services/*.test.ts`, `src/stores/*.test.ts`
- **Tests de hooks:** `src/hooks/*.test.ts`
- **Tests de componentes:** `src/components/common/*.test.tsx`
- **Tests de backend (PostgreSQL):** `src/test/rpc-*.test.ts` — requieren Supabase local corriendo; se saltan automáticamente si no hay BD
- **Tests de Edge Functions:** `src/test/edge-templates.test.ts` — testea las plantillas de email sin necesidad de Deno
- **Helper de BD:** `src/test/db.ts` — pool de pg con transacciones auto-rollback
- **Mock de Supabase:** `src/test/supabase-mock.ts` — para tests unitarios sin BD
