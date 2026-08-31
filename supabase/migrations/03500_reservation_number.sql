-- =============================================================================
-- 03500: Número de reserva secuencial por negocio
--
-- Añade un número legible y secuencial por negocio a cada reserva, para que
-- clientes y negocios puedan cruzar información fácilmente ("Reserva #42")
-- sin manejar UUIDs.
--
-- El número es único por (business_id, reservation_number) y se asigna
-- automáticamente al crear la reserva via trigger BEFORE INSERT.
--
-- Usa una tabla de secuencia separada (reservation_sequences) que solo avanza.
-- Esto evita que la eliminación de una reserva cause reutilización de números:
-- aunque se borre la reserva #50, la siguiente será #51, no #50 de nuevo.
-- =============================================================================

alter table public.reservations
  add column if not exists reservation_number integer;

-- Constraint único: no puede haber dos reservas con el mismo número en el mismo negocio.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservations_business_reservation_number_key'
  ) then
    alter table public.reservations
      add constraint reservations_business_reservation_number_key
      unique (business_id, reservation_number);
  end if;
end $$;

comment on column public.reservations.reservation_number is
  'Número secuencial por negocio. Se asigna automáticamente al crear la reserva. Es inmutable: no se reutiliza aunque la reserva se elimine.';

-- =============================================================================
-- Tabla de secuencia: un contador por negocio que solo avanza.
-- =============================================================================

create table if not exists public.reservation_sequences (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  last_number integer not null default 0
);

alter table public.reservation_sequences enable row level security;

comment on table public.reservation_sequences is
  'Contador de reservas por negocio. Solo avanza; nunca retrocede aunque se eliminen reservas.';

-- =============================================================================
-- Función reutilizable: obtiene el siguiente número de reserva para un negocio.
-- Usa pg_advisory_xact_lock para evitar condiciones de carrera y una tabla
-- de secuencia que solo avanza (no reutiliza números de reservas eliminadas).
-- =============================================================================

create or replace function public.next_reservation_number(p_business_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_next integer;
begin
  -- Lock por negocio para que dos reservas simultáneas no obtengan el mismo número.
  perform pg_advisory_xact_lock(hashtext('reservation_number_' || p_business_id::text));

  -- Insertar la fila de secuencia si no existe (upsert).
  insert into public.reservation_sequences (business_id, last_number)
  values (p_business_id, 0)
  on conflict (business_id) do nothing;

  -- Avanzar el contador y devolver el siguiente número.
  update public.reservation_sequences
  set last_number = last_number + 1
  where business_id = p_business_id
  returning last_number into v_next;

  return v_next;
end;
$$;

grant execute on function public.next_reservation_number(uuid) to authenticated;

-- =============================================================================
-- Trigger BEFORE INSERT: asigna el número automáticamente.
-- Se crea ANTES del backfill y del NOT NULL para que ninguna reserva nueva
-- falle por falta de número durante la migración.
-- =============================================================================

create or replace function public.assign_reservation_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.reservation_number is null then
    new.reservation_number := public.next_reservation_number(new.business_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_reservation_number on public.reservations;
create trigger trg_assign_reservation_number
  before insert on public.reservations
  for each row execute function public.assign_reservation_number();

-- =============================================================================
-- Backfill: asignar números secuenciales a las reservas existentes, ordenadas
-- por created_at, agrupadas por negocio. Después inicializa la secuencia con
-- el número más alto asignado para cada negocio.
--
-- Importante: el trigger ya está activo, pero las reservas existentes se
-- actualizan via UPDATE (no INSERT), por lo que el trigger no se dispara.
-- =============================================================================

do $$
declare
  v_business record;
  v_counter integer;
  v_res record;
begin
  for v_business in
    select distinct business_id from public.reservations where reservation_number is null
    order by business_id
  loop
    v_counter := 0;
    for v_res in
      select id from public.reservations
      where business_id = v_business.business_id and reservation_number is null
      order by created_at asc
    loop
      v_counter := v_counter + 1;
      update public.reservations
      set reservation_number = v_counter
      where id = v_res.id;
    end loop;

    -- Inicializar la secuencia con el último número asignado.
    insert into public.reservation_sequences (business_id, last_number)
    values (v_business.business_id, v_counter)
    on conflict (business_id) do update set last_number = greatest(reservation_sequences.last_number, excluded.last_number);
  end loop;
end $$;

-- Hacer la columna NOT NULL después del backfill y con el trigger activo.
-- A partir de aquí, toda reserva nueva obtiene su número via trigger.
alter table public.reservations
  alter column reservation_number set not null;
