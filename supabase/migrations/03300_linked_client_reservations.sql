drop policy if exists "Users can read own reservations" on public.reservations;
create policy "Users can read own reservations"
  on public.reservations for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.clients c
      where c.id = reservations.client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read events for own reservations" on public.reservation_events;
create policy "Users can read events for own reservations"
  on public.reservation_events for select
  using (
    exists (
      select 1
      from public.reservations r
      where r.id = reservation_id
        and (
          r.user_id = auth.uid()
          or exists (
            select 1
            from public.clients c
            where c.id = r.client_id
              and c.user_id = auth.uid()
          )
          or public.is_business_member(r.business_id)
        )
    )
  );

create or replace function public.cancel_reservation_by_client(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation record;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_user_name text;
  v_business_name text;
  v_resource_name text;
  v_payload jsonb;
begin
  select r.*, b.cancellation_limit_hours
  into v_reservation
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if v_user_id is null
    or (
      v_reservation.user_id is distinct from v_user_id
      and not exists (
        select 1
        from public.clients c
        where c.id = v_reservation.client_id
          and c.user_id = v_user_id
      )
    ) then
    raise exception 'No puedes cancelar una reserva que no es tuya';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'No se puede cancelar una reserva en estado %', v_reservation.status;
  end if;

  if v_reservation.status = 'confirmed'
    and v_reservation.starts_at - (v_reservation.cancellation_limit_hours || ' hours')::interval <= now() then
    raise exception 'Ya no puedes cancelar. El límite es % horas antes del turno.', v_reservation.cancellation_limit_hours;
  end if;

  update public.reservations
  set status = 'cancelled_by_client', hold_expires_at = null
  where id = p_reservation_id;

  perform public.log_reservation_event(
    p_reservation_id,
    v_reservation.status,
    'cancelled_by_client',
    v_user_id,
    null
  );

  select email into v_user_email from auth.users where id = v_user_id;
  select full_name into v_user_name from public.profiles where id = v_user_id;
  select b.name, c.name into v_business_name, v_resource_name
  from public.reservations r
  join public.businesses b on r.business_id = b.id
  join public.resources c on r.resource_id = c.id
  where r.id = p_reservation_id;

  if v_user_email is not null then
    perform public.enqueue_notification(
      'reservation_cancelled_client',
      v_user_email,
      v_user_name,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'business_name', v_business_name,
        'resource_name', v_resource_name,
        'starts_at', v_reservation.starts_at
      ),
      'reservation_cancelled_client_' || p_reservation_id::text
    );
  end if;

  v_payload := jsonb_build_object(
    'reservation_id', p_reservation_id,
    'client_name', v_user_name,
    'resource_name', v_resource_name,
    'starts_at', v_reservation.starts_at
  );

  perform public.enqueue_business_members_notification(
    v_reservation.business_id,
    'reservation_cancelled_business',
    v_payload,
    'reservation_cancelled_business_' || p_reservation_id::text
  );
end;
$$;

revoke all on function public.cancel_reservation_by_client(uuid) from public, anon;
grant execute on function public.cancel_reservation_by_client(uuid) to authenticated;
