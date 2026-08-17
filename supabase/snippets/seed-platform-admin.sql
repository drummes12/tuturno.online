-- =============================================================================
-- Sembrar un operador de plataforma
--
-- Se ejecuta UNA sola vez por operador desde el SQL Editor de Supabase (que
-- corre con service_role). No existe ninguna ruta desde la app para insertar
-- en platform_admins: es la única forma de crear un operador.
--
-- Requisito previo: el operador debe estar registrado en la app y tener MFA
-- (TOTP) activo, porque los RPCs de plataforma exigen un JWT con aal2.
-- =============================================================================

insert into public.platform_admins (user_id, note)
select id, 'Operador de la plataforma'
from auth.users
where email = 'drummes.12@gmail.com'
on conflict (user_id) do nothing;

-- Verificar
select pa.user_id, au.email, pa.created_at
from public.platform_admins pa
join auth.users au on au.id = pa.user_id;

-- Revocar acceso de operador:
-- delete from public.platform_admins where user_id = '<user_id>'::uuid;
