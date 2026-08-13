# Reservas Canchas — Guía del proyecto

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

## Estructura
- `src/lib/` — cliente Supabase y utilidades
- `src/services/` — capa de servicios (toda consulta a Supabase va aquí, nunca directa desde páginas/hooks)
- `src/stores/` — stores de zustand
- `src/hooks/` — hooks personalizados
- `src/types/` — tipos compartidos
- `src/components/{common,layout,auth,client,admin}/` — componentes
- `src/pages/{auth,client,admin}/` — páginas
- `supabase/migrations/` — migraciones SQL (numeradas)
- `supabase/functions/` — Edge Functions

## Configuración
1. Crear `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Ejecutar migraciones en Supabase
3. Configurar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en secrets de Supabase
4. Deployar la Edge Function `send-notifications`
5. Configurar cron en Supabase para ejecutar `expire_pending_reservations` y `send-notifications`

## Convenciones
- Mobile-first en todas las vistas, incluida administración
- Targets táctiles mínimos de 44px (clase `touch-target`)
- Estados con texto + icono + color, nunca solo color
- RLS en todas las tablas; operaciones sensibles vía RPC
- Zona horaria: `America/Bogota` (almacenar UTC, mostrar local)
