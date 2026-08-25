create index if not exists idx_reservations_confirmed_ends_at
  on public.reservations (ends_at)
  where status = 'confirmed';

create or replace function public.complete_past_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select id
    from public.reservations
    where status = 'confirmed'
      and ends_at <= now()
    for update skip locked
  loop
    update public.reservations
    set status = 'completed', hold_expires_at = null
    where id = v_row.id
      and status = 'confirmed'
      and ends_at <= now();

    if found then
      perform public.log_reservation_event(
        v_row.id,
        'confirmed',
        'completed',
        null,
        'Turno finalizado'
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.complete_past_reservations() from public, anon, authenticated;
grant execute on function public.complete_past_reservations() to service_role;

select public.complete_past_reservations();

do $cron$
begin
  if exists (
    select 1 from cron.job where jobname = 'complete-past-reservations'
  ) then
    perform cron.unschedule('complete-past-reservations');
  end if;

  perform cron.schedule(
    'complete-past-reservations',
    '*/5 * * * *',
    $job$select public.complete_past_reservations();$job$
  );
end$cron$;
