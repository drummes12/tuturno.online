-- =============================================================================
-- 3. Índices
-- =============================================================================

-- Courts
create index if not exists idx_courts_business on public.courts(business_id);
create index if not exists idx_courts_active on public.courts(is_active) where is_active = true;

-- Business hours
create index if not exists idx_business_hours_business on public.business_hours(business_id);
create index if not exists idx_business_hours_day on public.business_hours(business_id, day_of_week);

-- Availability exceptions
create index if not exists idx_exceptions_business on public.availability_exceptions(business_id);
create index if not exists idx_exceptions_court on public.availability_exceptions(court_id);
create index if not exists idx_exceptions_range on public.availability_exceptions(starts_at, ends_at);

-- Reservations
create index if not exists idx_reservations_business on public.reservations(business_id);
create index if not exists idx_reservations_court on public.reservations(court_id);
create index if not exists idx_reservations_user on public.reservations(user_id);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_reservations_starts_at on public.reservations(starts_at);
create index if not exists idx_reservations_court_time on public.reservations(court_id, starts_at, ends_at);
create index if not exists idx_reservations_active on public.reservations(court_id, starts_at)
  where status in ('pending', 'confirmed');

-- Reservation events
create index if not exists idx_events_reservation on public.reservation_events(reservation_id);

-- Notification outbox
create index if not exists idx_outbox_status on public.notification_outbox(status) where status = 'pending';
create index if not exists idx_outbox_created on public.notification_outbox(created_at);
