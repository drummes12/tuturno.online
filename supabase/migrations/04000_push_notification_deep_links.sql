create or replace function public.enqueue_reservation_push_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation record;
  v_client_payload jsonb;
  v_business_payload jsonb;
  v_client_type text;
  v_business_type text;
  v_client_key text;
  v_business_key text;
begin
  if new.to_status not in (
    'pending',
    'confirmed',
    'rejected',
    'cancelled_by_client',
    'cancelled_by_business',
    'expired'
  ) then
    return new;
  end if;

  if new.to_status = 'pending' and new.from_status is not null then
    return new;
  end if;

  select
    r.id,
    r.user_id,
    r.business_id,
    r.starts_at,
    r.ends_at,
    b.name as business_name,
    b.slug as business_slug,
    rs.name as resource_name
  into v_reservation
  from public.reservations r
  join public.businesses b on b.id = r.business_id
  join public.resources rs on rs.id = r.resource_id
  where r.id = new.reservation_id;

  if not found then
    return new;
  end if;

  v_client_payload := jsonb_build_object(
    'reservation_id', v_reservation.id,
    'business_name', v_reservation.business_name,
    'business_slug', v_reservation.business_slug,
    'resource_name', v_reservation.resource_name,
    'starts_at', v_reservation.starts_at,
    'ends_at', v_reservation.ends_at,
    'reason', new.reason,
    'url', '/b/' || v_reservation.business_slug || '/mis-reservas?reservation=' || v_reservation.id::text
  );

  v_business_payload := v_client_payload || jsonb_build_object(
    'url', '/admin/reservas?reservation=' || v_reservation.id::text
  );

  if new.to_status = 'pending' then
    v_client_type := 'reservation_created_client';
    v_business_type := 'reservation_created_business';
    v_client_key := 'reservation_created_client_' || new.id::text;
    v_business_key := 'reservation_created_business_' || new.id::text;
  elsif new.to_status = 'confirmed' and new.from_status is null then
    v_business_type := 'reservation_created_by_business';
    v_business_key := 'reservation_created_by_business_' || new.id::text;
  elsif new.to_status = 'confirmed' then
    v_client_type := 'reservation_confirmed';
    v_client_key := 'reservation_confirmed_' || new.id::text;
  elsif new.to_status = 'rejected' then
    v_client_type := 'reservation_rejected';
    v_client_key := 'reservation_rejected_' || new.id::text;
  elsif new.to_status = 'cancelled_by_client' then
    v_client_type := 'reservation_cancelled_client';
    v_business_type := 'reservation_cancelled_business';
    v_client_key := 'reservation_cancelled_client_' || new.id::text;
    v_business_key := 'reservation_cancelled_business_' || new.id::text;
  elsif new.to_status = 'cancelled_by_business' then
    v_client_type := 'reservation_cancelled_by_business';
    v_client_key := 'reservation_cancelled_by_business_' || new.id::text;
  elsif new.to_status = 'expired' then
    v_client_type := 'reservation_expired';
    v_client_key := 'reservation_expired_' || new.id::text;
  end if;

  if v_client_type is not null and v_reservation.user_id is not null then
    perform public.enqueue_push_notification(
      v_reservation.user_id,
      v_client_type,
      v_client_payload,
      v_client_key
    );
  end if;

  if v_business_type is not null then
    perform public.enqueue_business_members_push_notification(
      v_reservation.business_id,
      v_business_type,
      v_business_payload,
      v_business_key
    );
  end if;

  return new;
exception
  when others then
    raise warning 'Push enqueue failed for reservation event %: %', new.id, sqlerrm;
    return new;
end;
$$;
