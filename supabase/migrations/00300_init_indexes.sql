-- =============================================================================
-- 3. Índices
-- =============================================================================

-- Resources
create index if not exists idx_resources_business on public.resources(business_id);
create index if not exists idx_resources_active on public.resources(is_active) where is_active = true;

-- Business hours
create index if not exists idx_business_hours_business on public.business_hours(business_id);
create index if not exists idx_business_hours_day on public.business_hours(business_id, day_of_week);

-- Availability exceptions
create index if not exists idx_exceptions_business on public.availability_exceptions(business_id);
create index if not exists idx_exceptions_resource on public.availability_exceptions(resource_id);
create index if not exists idx_exceptions_range on public.availability_exceptions(starts_at, ends_at);

-- Reservations
create index if not exists idx_reservations_business on public.reservations(business_id);
create index if not exists idx_reservations_resource on public.reservations(resource_id);
create index if not exists idx_reservations_user on public.reservations(user_id);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_reservations_starts_at on public.reservations(starts_at);
create index if not exists idx_reservations_resource_time on public.reservations(resource_id, starts_at, ends_at);
create index if not exists idx_reservations_active on public.reservations(resource_id, starts_at)
  where status in ('pending', 'confirmed');

-- Reservation events
create index if not exists idx_events_reservation on public.reservation_events(reservation_id);

-- Notification outbox
create index if not exists idx_outbox_status on public.notification_outbox(status) where status = 'pending';
create index if not exists idx_outbox_created on public.notification_outbox(created_at);
