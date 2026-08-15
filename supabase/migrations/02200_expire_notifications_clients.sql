-- =============================================================================
-- 02200: expire_pending_reservations obtiene contacto desde clients
--
-- La versión de 01600 obtenía el email/nombre directamente desde auth.users.
-- Con la tabla clients (01800), el contacto del cliente puede estar ahí
-- incluso para guests sin cuenta. Esta versión prioriza clients y mantiene
-- el fallback a auth.users para reservas antiguas sin client_id.
-- =============================================================================

create or replace function public.expire_pending_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
  v_client_email text;
  v_client_name text;
begin
  for v_row in
    select
      r.id,
      r.user_id,
      r.client_id,
      r.starts_at,
      r.ends_at,
      c.name as court_name,
      b.name as business_name,
      au.email as user_email,
      p.full_name as user_name
    from public.reservations r
    join public.courts c on c.id = r.court_id
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

    -- Priorizar contacto desde clients; fallback a auth.users
    v_client_email := v_row.user_email;
    v_client_name := v_row.user_name;

    if v_row.client_id is not null then
      select cl.email, cl.name into v_client_email, v_client_name
      from public.clients cl where cl.id = v_row.client_id;
    end if;

    if v_client_email is not null and btrim(v_client_email) <> '' then
      perform public.enqueue_notification(
        'reservation_expired',
        v_client_email,
        v_client_name,
        jsonb_build_object(
          'reservation_id', v_row.id,
          'business_name', v_row.business_name,
          'court_name', v_row.court_name,
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
