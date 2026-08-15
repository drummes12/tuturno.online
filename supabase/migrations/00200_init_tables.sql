-- =============================================================================
-- 2. Tablas
-- =============================================================================

-- PROFILES — datos del usuario, enlazado a auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BUSINESSES — el negocio (MVP: uno solo, pero el modelo soporta múltiples)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/Bogota',
  address text,
  phone text,
  slot_duration_minutes integer not null default 60 check (slot_duration_minutes > 0),
  hold_duration_minutes integer not null default 30 check (hold_duration_minutes > 0),
  min_advance_minutes integer not null default 60 check (min_advance_minutes >= 0),
  cancellation_limit_hours integer not null default 2 check (cancellation_limit_hours >= 0),
  max_advance_days integer not null default 30 check (max_advance_days > 0),
  resource_label_singular text not null default 'Espacio' check (char_length(btrim(resource_label_singular)) between 2 and 40),
  resource_label_plural text not null default 'Espacios' check (char_length(btrim(resource_label_plural)) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BUSINESS MEMBERS — quién puede administrar el negocio
create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role business_role not null default 'manager',
  joined_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

-- RESOURCES — unidades/espacios reservables
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BUSINESS HOURS — horario semanal de operación
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  open_time text not null,
  close_time text not null,
  is_active boolean not null default true,
  unique (business_id, day_of_week)
);

-- AVAILABILITY EXCEPTIONS — cierres/bloqueos excepcionales
create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type exception_type not null default 'closed',
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- RESERVATIONS — reservas/solicitudes
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status reservation_status not null default 'pending',
  hold_expires_at timestamptz,
  notes text,
  decision_reason text,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- RESERVATION EVENTS — bitácora inmutable de transiciones
create table if not exists public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  from_status reservation_status,
  to_status reservation_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

-- NOTIFICATION OUTBOX — correos pendientes de envío
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  recipient_email text not null,
  recipient_name text,
  payload jsonb not null default '{}'::jsonb,
  status notification_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  idempotency_key text unique not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
