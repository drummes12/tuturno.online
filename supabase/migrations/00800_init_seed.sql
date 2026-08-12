-- =============================================================================
-- 8. Seed — negocio inicial y datos de ejemplo
-- =============================================================================
-- NOTA: El owner real se debe crear desde la app de registro y luego
-- vincular manualmente con el business_id. Este seed crea el negocio
-- y las canchas iniciales.

insert into public.businesses (name, slug, timezone, address, phone)
values ('Cancha Fútbol 5', 'cancha-futbol-5', 'America/Bogota', 'Bogotá, Colombia', '+57 300 000 0000')
on conflict (slug) do nothing;

-- Canchas iniciales
insert into public.courts (business_id, name, description, sort_order)
select b.id, 'Cancha 1', 'Cancha techada con iluminación', 1
from public.businesses b where b.slug = 'cancha-futbol-5'
and not exists (select 1 from public.courts where business_id = b.id and name = 'Cancha 1');

insert into public.courts (business_id, name, description, sort_order)
select b.id, 'Cancha 2', 'Cancha al aire libre', 2
from public.businesses b where b.slug = 'cancha-futbol-5'
and not exists (select 1 from public.courts where business_id = b.id and name = 'Cancha 2');

-- Horario semanal: lunes a viernes 8:00-22:00, sábado 9:00-20:00, domingo cerrado
insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 1, '08:00', '22:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 2, '08:00', '22:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 3, '08:00', '22:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 4, '08:00', '22:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 5, '08:00', '22:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 6, '09:00', '20:00', true from public.businesses b where b.slug = 'cancha-futbol-5'
on conflict (business_id, day_of_week) do nothing;

-- Domingo (0) cerrado: no insertar o insertar con is_active = false
