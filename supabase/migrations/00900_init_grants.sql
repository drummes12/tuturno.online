-- =============================================================================
-- 9. Grants base a roles anon y authenticated
-- =============================================================================
-- RLS filtra filas, pero los GRANT dan permiso sobre la tabla en sí.
-- Sin GRANT, Postgres rechaza con "permission denied for table" antes de
-- evaluar las policies. El nuevo default de Supabase NO auto-expone tablas
-- nuevas, por eso hay que declarar los grants explícitamente.
-- Los grants se alinean 1:1 con las policies de 00500_init_rls.sql:
--   - Lo que tiene policy SELECT → grant select
--   - Lo que tiene policy INSERT/UPDATE/DELETE → grant write a authenticated
--   - notification_outbox: sin acceso desde el cliente (policy using(false))
-- =============================================================================

-- PROFILES
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;

-- BUSINESSES
grant select on public.businesses to anon, authenticated;
grant update on public.businesses to authenticated;

-- BUSINESS MEMBERS
grant select on public.business_members to authenticated;
grant insert on public.business_members to authenticated;
grant delete on public.business_members to authenticated;

-- RESOURCES
grant select on public.resources to anon, authenticated;
grant insert on public.resources to authenticated;
grant update on public.resources to authenticated;
grant delete on public.resources to authenticated;

-- BUSINESS HOURS
grant select on public.business_hours to anon, authenticated;
grant insert on public.business_hours to authenticated;
grant update on public.business_hours to authenticated;
grant delete on public.business_hours to authenticated;

-- AVAILABILITY EXCEPTIONS
grant select on public.availability_exceptions to anon, authenticated;
grant insert on public.availability_exceptions to authenticated;
grant update on public.availability_exceptions to authenticated;
grant delete on public.availability_exceptions to authenticated;

-- RESERVATIONS
grant select on public.reservations to authenticated;
grant insert on public.reservations to authenticated;
grant update on public.reservations to authenticated;

-- RESERVATION EVENTS
grant select on public.reservation_events to authenticated;
grant insert on public.reservation_events to authenticated;

-- NOTIFICATION OUTBOX
-- Sin grants a anon/authenticated: solo la Edge Function (service_role / secret)
-- accede a esta tabla. La policy "using (false)" refuerza el bloqueo desde cliente.
