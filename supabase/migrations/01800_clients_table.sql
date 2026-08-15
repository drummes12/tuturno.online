-- =============================================================================
-- 01800: Tabla clients — clientes con o sin cuenta
--
-- Permite que el negocio cree reservas a nombre de clientes que aún no se han
-- registrado. Cuando el cliente se registra, un trigger vincula su cuenta a
-- los registros de clients existentes (por email, y luego por teléfono),
-- heredando automáticamente todas las reservas pasadas.
--
-- Esto habilita el onboarding: el negocio carga reservas mientras los clientes
-- se registran a su ritmo, y la data queda estructurada para futuras features
-- (contador de reservas, promociones, fidelización).
-- =============================================================================

-- =============================================================================
-- 1. Tabla clients
-- =============================================================================

-- Extensión para búsqueda fuzzy por nombre
create extension if not exists pg_trgm;
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email único por negocio (case-insensitive, solo cuando no es null)
create unique index if not exists clients_business_email_uidx
  on public.clients (business_id, lower(email))
  where email is not null;

-- Teléfono único por negocio (solo cuando no es null)
create unique index if not exists clients_business_phone_uidx
  on public.clients (business_id, phone)
  where phone is not null;

-- Índices para búsqueda
create index if not exists clients_business_idx on public.clients (business_id);
create index if not exists clients_user_idx on public.clients (user_id);
create index if not exists clients_name_trgm_idx on public.clients using gin (name gin_trgm_ops);

-- updated_at trigger
drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated
  before update on public.clients
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 2. Agregar client_id a reservations y hacer user_id nullable
-- =============================================================================
alter table public.reservations
  add column if not exists client_id uuid references public.clients(id) on delete set null;

-- user_id deja de ser obligatorio: las reservas de guests no tienen user_id
alter table public.reservations
  alter column user_id drop not null;

-- Índice para buscar reservas por client_id
create index if not exists reservations_client_idx on public.reservations (client_id);

-- =============================================================================
-- 3. Backfill: crear un client por cada usuario que ya tiene reservas
-- =============================================================================
insert into public.clients (business_id, name, phone, email, user_id)
select distinct
  r.business_id,
  coalesce(p.full_name, 'Cliente'),
  p.phone,
  au.email,
  r.user_id
from public.reservations r
join public.profiles p on p.id = r.user_id
join auth.users au on au.id = r.user_id
where r.user_id is not null
  and not exists (
    select 1 from public.clients c
    where c.business_id = r.business_id
      and c.user_id = r.user_id
  )
on conflict do nothing;

-- Vincular las reservas existentes a su client_id
update public.reservations r
set client_id = c.id
from public.clients c
where r.client_id is null
  and r.user_id is not null
  and r.business_id = c.business_id
  and r.user_id = c.user_id;
