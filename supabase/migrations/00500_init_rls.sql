-- =============================================================================
-- 5. Row Level Security
-- =============================================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.resources enable row level security;
alter table public.business_hours enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_events enable row level security;
alter table public.notification_outbox enable row level security;

-- =============================================================================
-- PROFILES
-- =============================================================================
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Los admins pueden leer perfiles de usuarios que reservan en su negocio
create policy "Business members can read profiles of their reservations"
  on public.profiles for select
  using (
    exists (
      select 1 from public.reservations r
      where r.user_id = profiles.id
      and public.is_business_member(r.business_id)
    )
  );

-- =============================================================================
-- BUSINESSES
-- =============================================================================
-- Lectura pública: el negocio es visible para que los clientes vean info
create policy "Anyone can read businesses"
  on public.businesses for select
  using (true);

-- Solo miembros pueden actualizar
create policy "Business members can update their business"
  on public.businesses for update
  using (public.is_business_member(id))
  with check (public.is_business_member(id));

-- =============================================================================
-- BUSINESS MEMBERS
-- =============================================================================
create policy "Members can read their memberships"
  on public.business_members for select
  using (user_id = auth.uid() or public.is_business_member(business_id));

-- Solo owners pueden añadir miembros
create policy "Owners can insert members"
  on public.business_members for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
      and bm.user_id = auth.uid()
      and bm.role = 'owner'
    )
  );

-- Owners pueden eliminar miembros
create policy "Owners can delete members"
  on public.business_members for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
      and bm.user_id = auth.uid()
      and bm.role = 'owner'
    )
  );

-- =============================================================================
-- RESOURCES
-- =============================================================================
-- Lectura pública de recursos activas
create policy "Anyone can read active resources"
  on public.resources for select
  using (is_active = true);

-- Miembros del negocio pueden leer todas (incluidas inactivas)
create policy "Business members can read all resources"
  on public.resources for select
  using (public.is_business_member(business_id));

-- Miembros pueden crear/editar recursos
create policy "Business members can insert resources"
  on public.resources for insert
  with check (public.is_business_member(business_id));

create policy "Business members can update resources"
  on public.resources for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Business members can delete resources"
  on public.resources for delete
  using (public.is_business_member(business_id));

-- =============================================================================
-- BUSINESS HOURS
-- =============================================================================
-- Lectura pública: los clientes necesitan saber los horarios
create policy "Anyone can read business hours"
  on public.business_hours for select
  using (true);

create policy "Business members can insert hours"
  on public.business_hours for insert
  with check (public.is_business_member(business_id));

create policy "Business members can update hours"
  on public.business_hours for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Business members can delete hours"
  on public.business_hours for delete
  using (public.is_business_member(business_id));

-- =============================================================================
-- AVAILABILITY EXCEPTIONS
-- =============================================================================
-- Lectura pública: afecta la disponibilidad visible
create policy "Anyone can read exceptions"
  on public.availability_exceptions for select
  using (true);

create policy "Business members can insert exceptions"
  on public.availability_exceptions for insert
  with check (public.is_business_member(business_id));

create policy "Business members can update exceptions"
  on public.availability_exceptions for update
  using (public.is_business_member(business_id));

create policy "Business members can delete exceptions"
  on public.availability_exceptions for delete
  using (public.is_business_member(business_id));

-- =============================================================================
-- RESERVATIONS
-- =============================================================================
-- Los clientes leen solo sus propias reservas
create policy "Users can read own reservations"
  on public.reservations for select
  using (user_id = auth.uid());

-- Los miembros del negocio leen todas las reservas de su negocio
create policy "Business members can read their reservations"
  on public.reservations for select
  using (public.is_business_member(business_id));

-- Los clientes crean reservas (la validación real la hace el RPC)
create policy "Users can insert own reservations"
  on public.reservations for insert
  with check (user_id = auth.uid());

-- Actualizaciones controladas por RPC (RLS permite pero el RPC valida)
create policy "Users can update own reservations"
  on public.reservations for update
  using (user_id = auth.uid() or public.is_business_member(business_id))
  with check (user_id = auth.uid() or public.is_business_member(business_id));

-- =============================================================================
-- RESERVATION EVENTS
-- =============================================================================
create policy "Users can read events for own reservations"
  on public.reservation_events for select
  using (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id
      and (r.user_id = auth.uid() or public.is_business_member(r.business_id))
    )
  );

-- Solo el sistema (RPC security definer) inserta eventos
create policy "System can insert events"
  on public.reservation_events for insert
  with check (true);

-- =============================================================================
-- NOTIFICATION OUTBOX
-- =============================================================================
-- No accesible desde el cliente. Solo Edge Functions con service role.
create policy "Outbox is not accessible from client"
  on public.notification_outbox for all
  using (false)
  with check (false);
