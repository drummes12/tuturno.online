-- =============================================================================
-- 04400: Consulta de consentimiento de reserva ya registrado
--
-- Permite al frontend saber si el usuario ya autorizó el tratamiento de
-- datos para reservas en un negocio con la versión de política vigente,
-- para no volver a pedirla en cada reserva.
--
-- También hace record_reservation_data_consent idempotente por
-- (usuario, negocio, versión): repetir la llamada con la misma versión no
-- duplica la fila; una versión nueva sí crea evidencia nueva.
-- =============================================================================

create or replace function public.has_reservation_data_consent(
  p_business_id uuid,
  p_policy_version text
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.reservation_data_consents
    where user_id = auth.uid()
      and business_id = p_business_id
      and source = 'reservation'
      and policy_version = p_policy_version
  );
$$;

revoke all on function public.has_reservation_data_consent(uuid, text) from public, anon;
grant execute on function public.has_reservation_data_consent(uuid, text) to authenticated;

create or replace function public.record_reservation_data_consent(
  p_business_id uuid,
  p_policy_version text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;
  if p_business_id is null or not exists (
    select 1 from public.businesses where id = p_business_id and not is_demo
  ) then
    raise exception 'Negocio inválido.' using errcode = '22004';
  end if;
  if btrim(coalesce(p_policy_version, '')) = '' then
    raise exception 'Versión de política requerida.' using errcode = '22004';
  end if;

  select rdc.id into v_id
  from public.reservation_data_consents rdc
  where rdc.user_id = v_user_id
    and rdc.business_id = p_business_id
    and rdc.source = 'reservation'
    and rdc.policy_version = p_policy_version
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.reservation_data_consents (user_id, business_id, policy_version)
  values (v_user_id, p_business_id, p_policy_version)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_reservation_data_consent(uuid, text) from public, anon;
grant execute on function public.record_reservation_data_consent(uuid, text) to authenticated;
