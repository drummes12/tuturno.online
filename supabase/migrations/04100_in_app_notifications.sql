-- =============================================================================
-- Centro de notificaciones in-app
--
-- Reutiliza push_notification_outbox como bandeja de avisos del usuario:
-- cada fila ya está dirigida a un user_id y describe un evento de reserva.
-- Se añaden read_at / archived_at para gestionar leídas y borrar antiguas,
-- lectura propia vía RLS (necesaria para Realtime) y RPCs para mutar.
-- =============================================================================

alter table public.push_notification_outbox
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists idx_push_notification_outbox_inbox
  on public.push_notification_outbox (user_id, created_at desc)
  where archived_at is null;

drop policy if exists "Users can read own notifications"
  on public.push_notification_outbox;

create policy "Users can read own notifications"
  on public.push_notification_outbox for select
  using (user_id = auth.uid());

grant select on table public.push_notification_outbox to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'push_notification_outbox'
  ) then
    alter publication supabase_realtime add table public.push_notification_outbox;
  end if;
end;
$$;

-- Listado de la bandeja del usuario con el estado actual de la reserva
-- asociada, para distinguir avisos que aún requieren acción (pendientes).
create or replace function public.list_my_notifications(
  p_limit integer default 50
)
returns table (
  id uuid,
  type text,
  payload jsonb,
  created_at timestamptz,
  read_at timestamptz,
  reservation_id uuid,
  reservation_status reservation_status,
  reservation_number integer
)
language sql
security definer set search_path = public
stable
as $$
  select
    n.id,
    n.type,
    n.payload,
    n.created_at,
    n.read_at,
    r.id as reservation_id,
    r.status as reservation_status,
    r.reservation_number
  from public.push_notification_outbox n
  left join public.reservations r
    on r.id = nullif(n.payload->>'reservation_id', '')::uuid
  where n.user_id = auth.uid()
    and n.archived_at is null
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.list_my_notifications(integer) from public, anon;
grant execute on function public.list_my_notifications(integer) to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.push_notification_outbox
  set read_at = coalesce(read_at, now())
  where id = p_id
    and user_id = auth.uid();
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.push_notification_outbox
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and archived_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Borrado lógico: la fila sigue existiendo para el cron de envío y la
-- idempotencia, pero desaparece de la bandeja del usuario.
create or replace function public.archive_notification(p_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.push_notification_outbox
  set archived_at = now(),
      read_at = coalesce(read_at, now())
  where id = p_id
    and user_id = auth.uid();
$$;

revoke all on function public.archive_notification(uuid) from public, anon;
grant execute on function public.archive_notification(uuid) to authenticated;

create or replace function public.archive_read_notifications()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.push_notification_outbox
  set archived_at = now()
  where user_id = auth.uid()
    and read_at is not null
    and archived_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.archive_read_notifications() from public, anon;
grant execute on function public.archive_read_notifications() to authenticated;
