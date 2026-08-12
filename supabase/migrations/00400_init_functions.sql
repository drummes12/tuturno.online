-- =============================================================================
-- 4. Funciones auxiliares y triggers
-- =============================================================================

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger para ejecutar la creación de perfil
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_profile();

-- Función: actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers de updated_at
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_businesses_updated on public.businesses;
create trigger trg_businesses_updated
  before update on public.businesses
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_courts_updated on public.courts;
create trigger trg_courts_updated
  before update on public.courts
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_reservations_updated on public.reservations;
create trigger trg_reservations_updated
  before update on public.reservations
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- Función: verificar si el usuario es miembro de un negocio
-- =============================================================================
create or replace function public.is_business_member(b_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.business_members
    where business_id = b_id and user_id = auth.uid()
  );
$$;

-- Función: obtener el business_id del usuario actual (primer negocio)
create or replace function public.get_user_business_id()
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select business_id from public.business_members
  where user_id = auth.uid()
  limit 1;
$$;

-- =============================================================================
-- Función: registrar evento de reserva
-- =============================================================================
create or replace function public.log_reservation_event(
  p_reservation_id uuid,
  p_from_status reservation_status,
  p_to_status reservation_status,
  p_actor_id uuid default null,
  p_reason text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.reservation_events (reservation_id, from_status, to_status, actor_id, reason)
  values (p_reservation_id, p_from_status, p_to_status, p_actor_id, p_reason);
end;
$$;

-- =============================================================================
-- Función: encolar notificación (idempotente)
-- =============================================================================
create or replace function public.enqueue_notification(
  p_type text,
  p_recipient_email text,
  p_recipient_name text default null,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key := coalesce(p_idempotency_key, gen_random_uuid()::text);

  insert into public.notification_outbox (type, recipient_email, recipient_name, payload, idempotency_key)
  values (p_type, p_recipient_email, p_recipient_name, p_payload, v_key)
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.notification_outbox where idempotency_key = v_key;
  end if;

  return v_id;
end;
$$;
