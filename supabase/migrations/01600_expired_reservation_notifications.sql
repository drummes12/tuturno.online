-- =============================================================================
-- 01600: Notificar reservas expiradas automáticamente
--
-- La expiración actualizaba el estado y registraba el evento, pero no encolaba
-- el correo de reservation_expired. Esta versión crea la notificación idempotente
-- para cada cliente con email.
-- =============================================================================

create or replace function public.expire_pending_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select
      r.id,
      r.user_id,
      r.starts_at,
      r.ends_at,
      c.name as resource_name,
      b.name as business_name,
      au.email as user_email,
      p.full_name as user_name
    from public.reservations r
    join public.resources c on c.id = r.resource_id
    join public.businesses b on b.id = r.business_id
    left join auth.users au on au.id = r.user_id
    left join public.profiles p on p.id = r.user_id
    where r.status = 'pending'
      and r.hold_expires_at <= now()
  loop
    update public.reservations
    set status = 'expired', hold_expires_at = null
    where id = v_row.id;

    perform public.log_reservation_event(
      v_row.id,
      'pending',
      'expired',
      null,
      'Hold expirado'
    );

    if v_row.user_email is not null and btrim(v_row.user_email) <> '' then
      perform public.enqueue_notification(
        'reservation_expired',
        v_row.user_email,
        v_row.user_name,
        jsonb_build_object(
          'reservation_id', v_row.id,
          'business_name', v_row.business_name,
          'resource_name', v_row.resource_name,
          'starts_at', v_row.starts_at,
          'ends_at', v_row.ends_at
        ),
        'reservation_expired_' || v_row.id::text
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_pending_reservations() to service_role;
