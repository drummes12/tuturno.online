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
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

En Vercel debes crear estas mismas variables en **Settings → Environment Variables** y marcar al menos **Production**. Vite las inyecta durante el build, por lo que después de guardarlas debes hacer un nuevo deploy; un refresh no es suficiente.

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
supabase/migrations/00900_init_grants.sql
supabase/migrations/01000_cron_admin_cancel.sql
supabase/migrations/01100_multi_slot_business_hours.sql
supabase/migrations/01200_gap_minutes.sql
supabase/migrations/01300_cron_send_notifications.sql
supabase/migrations/01400_business_location.sql
supabase/migrations/01500_remove_legacy_location_fields.sql
supabase/migrations/01600_expired_reservation_notifications.sql
supabase/migrations/01700_reservation_notification_routing.sql
supabase/migrations/01800_clients_table.sql
supabase/migrations/01900_client_linking_trigger.sql
supabase/migrations/02000_reservation_rpcs_clients.sql
supabase/migrations/02100_clients_rls_search.sql
supabase/migrations/02200_expire_notifications_clients.sql
supabase/migrations/02300_normalize_phones_e164.sql
supabase/migrations/02400_reservation_instructions.sql
supabase/migrations/02500_whatsapp_link.sql
supabase/migrations/02600_platform_onboarding.sql
supabase/migrations/02700_notification_processing_state.sql
supabase/migrations/02800_security_hardening.sql
supabase/migrations/02900_member_management.sql
supabase/migrations/03000_privacy_consents.sql
supabase/migrations/03100_search_clients_tenant_only.sql
```

### Privacidad y consentimiento

TuTurno incluye una capa mínima de privacidad y consentimiento (fase 1):

- **Páginas legales públicas:** `/privacidad` y `/terminos`.
- **Aceptación obligatoria en el registro:** checkbox no preseleccionado que bloquea el registro si no se acepta. Se registra en `privacy_consents` con versión y timestamp.
- **Marketing por email separado por negocio:** opt-in opcional en el flujo de reserva, no preseleccionado. La reserva funciona aunque se rechace.
- **Baja sencilla:** desde `/preferencias` el usuario puede darse de baja o reactivar el marketing por negocio.
- **Clientes existentes y guests:** quedan sin autorización de marketing hasta que exista un opt-in explícito.
- **Aislamiento de búsqueda:** `search_clients` solo busca dentro de los clientes del negocio; ya no enumera usuarios globales.

**Antes de production**, reemplaza los placeholders `[ ]` en `/privacidad` y `/terminos` con los datos reales del responsable (nombre, identificación, domicilio, correo de privacidad). Revisa el texto final con un abogado colombiano.

La versión vigente de los documentos se define en `CURRENT_POLICY_VERSION` (`src/types/index.ts`). Increméntala al cambiar el contenido de las políticas.

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

### 4. Crear una nueva organización (onboarding)

El onboarding de nuevas organizaciones es controlado por el operador de la plataforma.

Alta única del operador (una sola vez, desde el SQL Editor con service_role):

1. Regístrate en la app y activa MFA (TOTP) al entrar a `/plataforma`
2. Ejecuta `supabase/snippets/seed-platform-admin.sql` con tu email

No hay ninguna ruta desde la app para insertar en `platform_admins`, y todos los
RPCs de plataforma exigen membresía en esa tabla **más** un JWT con `aal2`.

Flujo de alta de un negocio:

1. El usuario se registra desde la app (`/registro`) y envía su solicitud en `/crear-negocio`
2. La solicitud queda en `business_signup_requests` y se encola un correo de aviso al operador
3. El operador abre `/plataforma`, revisa la solicitud, corrige el slug si hace falta y aprueba
4. `approve_business_signup` crea el negocio, vincula al owner, avisa por correo y deja registro en `platform_audit_log`
5. El owner ya puede acceder a:
   - Página pública: `https://tuturno.online/b/{slug}`
   - Panel admin: `https://tuturno.online/admin`

El slug se valida en el servidor (formato, unicidad y `reserved_slugs`), así que
`demo` y las rutas de la app no se pueden tomar desde ningún camino de escritura.

Los snippets `onboard-business.sql` y `promote-user.sql` quedan solo como plan B
si el panel no está disponible; el camino normal es el panel.

### 5. Desarrollo

```bash
pnpm install
pnpm dev
```

## Características

- Consulta de disponibilidad pública sin registro
- Registro/login con email y contraseña
- Solicitud de reservas con bloqueo temporal y anticipación mínima configurables por negocio
- Panel administrativo mobile-first con cola de pendientes
- Confirmar/rechazar reservas con motivo
- Cancelación por parte del cliente (2 horas antes)
- Notificaciones por correo (Resend)
- Concurrencia protegida con advisory locks
- RLS en todas las tablas
- Recursos reservables configurables (canchas, salas, consultorios, mesas, cabinas u otros espacios)
- Cierres temporales configurables por el propietario (todo el negocio o recurso específico, con opción de día completo)
- Instrucciones de abono/confirmación en Markdown (máx 1000 caracteres) visibles para el cliente antes de reservar
- Botón de WhatsApp post-reserva con mensaje prellenado y enlace fallback
- Tutorial guiado interactivo con Driver.js para clientes (visitantes y autenticados), con botón "Guía" en el header para volver a iniciarlo

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

