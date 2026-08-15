-- =============================================================================
-- 8. Seed — negocio de demostración y datos de ejemplo
-- =============================================================================
-- Negocio demo: permite a los visitantes probar la experiencia de TuTurno
-- sin crear reservas reales. El flag is_demo bloquea reservas a nivel RPC.
-- El owner real se debe crear desde la app de registro y luego
-- vincular manualmente con el business_id.

insert into public.businesses (name, slug, timezone, address, phone, resource_label_singular, resource_label_plural, is_demo)
values ('TuTurno Demo', 'demo', 'America/Bogota', 'Bogotá, Colombia', '+57 300 000 0000', 'Cancha', 'Canchas', true)
on conflict (slug) do nothing;

-- Recursos iniciales del negocio de demostración
insert into public.resources (business_id, name, description, sort_order)
select b.id, 'Cancha 1', 'Cancha techada con iluminación', 1
from public.businesses b where b.slug = 'demo'
and not exists (select 1 from public.resources where business_id = b.id and name = 'Cancha 1');

insert into public.resources (business_id, name, description, sort_order)
select b.id, 'Cancha 2', 'Cancha al aire libre', 2
from public.businesses b where b.slug = 'demo'
and not exists (select 1 from public.resources where business_id = b.id and name = 'Cancha 2');

-- Horario semanal: lunes a viernes 8:00-22:00, sábado 9:00-20:00, domingo cerrado
insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 1, '08:00', '22:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 2, '08:00', '22:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 3, '08:00', '22:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 4, '08:00', '22:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 5, '08:00', '22:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 6, '09:00', '20:00', true from public.businesses b where b.slug = 'demo'
on conflict (business_id, day_of_week) do nothing;

-- Domingo (0) cerrado: no insertar o insertar con is_active = false

-- =============================================================================
-- Negocio real de ejemplo (no demo) — para tests e integración
-- =============================================================================
insert into public.businesses (name, slug, timezone, address, phone, resource_label_singular, resource_label_plural, is_demo)
values ('Canchas El Parque', 'canchas-el-parque', 'America/Bogota', 'Calle 123 #45-67, Medellín', '+57 300 111 2233', 'Cancha', 'Canchas', false)
on conflict (slug) do nothing;

insert into public.resources (business_id, name, description, sort_order)
select b.id, 'Cancha A', 'Cancha de fútbol 5', 1
from public.businesses b where b.slug = 'canchas-el-parque'
and not exists (select 1 from public.resources where business_id = b.id and name = 'Cancha A');

insert into public.resources (business_id, name, description, sort_order)
select b.id, 'Cancha B', 'Cancha de fútbol 7', 2
from public.businesses b where b.slug = 'canchas-el-parque'
and not exists (select 1 from public.resources where business_id = b.id and name = 'Cancha B');

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 1, '08:00', '22:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 2, '08:00', '22:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 3, '08:00', '22:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 4, '08:00', '22:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 5, '08:00', '22:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;

insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_active)
select b.id, 6, '09:00', '20:00', true from public.businesses b where b.slug = 'canchas-el-parque'
on conflict (business_id, day_of_week) do nothing;
