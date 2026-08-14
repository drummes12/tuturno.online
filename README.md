# TuTurno

Aplicación web para agendar espacios en un negocio (primer caso: cancha de fútbol 5). Permite consultar disponibilidad pública, solicitar turnos de 60 minutos, y al negocio confirmar o rechazar reservas manualmente.

## Stack

- React 19 + Vite + TypeScript
- wouter (ruteo) + zustand (estado global)
- Tailwind CSS v4
- Supabase (Postgres, Auth, Edge Functions, Realtime)
- Resend (correo transaccional)
- pnpm

## Configuración

### 1. Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 2. Base de datos

Ejecuta las migraciones en orden en el SQL Editor de Supabase:

```
supabase/migrations/00100_init_extensions.sql
supabase/migrations/00200_init_tables.sql
supabase/migrations/00300_init_indexes.sql
supabase/migrations/00400_init_functions.sql
supabase/migrations/00500_init_rls.sql
supabase/migrations/00600_init_rpc.sql
supabase/migrations/00700_init_realtime.sql
supabase/migrations/00800_init_seed.sql
```

### 3. Correos con Resend

Configura los secrets en Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM_EMAIL=hola@tuturno.online
```

Deploya la Edge Function:

```bash
supabase functions deploy send-notifications
```

Configura un cron en Supabase Dashboard para ejecutar la función cada 5 minutos.

### 4. Admin inicial

1. Regístrate desde la app (`/registro`)
2. En el SQL Editor, vincula tu usuario como owner del negocio:

```sql
insert into public.business_members (business_id, user_id, role)
select b.id, '<tu-user-id-uuid>', 'owner'
from public.businesses b where b.slug = 'cancha-futbol-5';
```

### 5. Desarrollo

```bash
pnpm install
pnpm dev
```

## Características

- Consulta de disponibilidad pública sin registro
- Registro/login con email y contraseña
- Solicitud de reservas con bloqueo temporal (30 min)
- Panel administrativo mobile-first con cola de pendientes
- Confirmar/rechazar reservas con motivo
- Cancelación por parte del cliente (2 horas antes)
- Notificaciones por correo (Resend)
- Concurrencia protegida con advisory locks
- RLS en todas las tablas

## Licencia

Este proyecto está bajo la licencia **GNU Affero General Public License v3.0** (AGPL v3). Consulta el archivo [LICENSE](./LICENSE) para más detalles.

En resumen: puedes usar, modificar y distribuir este software, pero **debes compartir tus modificaciones** bajo la misma licencia. Si ofreces el software como servicio web (SaaS), también debes poner el código fuente modificado a disposición de los usuarios del servicio.

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Abre un issue antes de empezar a trabajar en un cambio grande
2. Crea un fork y una rama con tu cambio (`feat/mi-mejora` o `fix/mi-fix`)
3. Asegúrate de que `pnpm build` y `pnpm lint` pasen sin errores
4. Envía un pull request describiendo el cambio y la motivación

Al contribuir, aceptas que tus cambios se publiquen bajo la misma licencia AGPL v3.

