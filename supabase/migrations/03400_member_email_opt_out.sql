-- =============================================================================
-- 03400: Bandera de opt-out de emails por miembro de negocio
--
-- Permite a cada owner/manager silenciar los correos de actividad de un
-- negocio específico. Útil para operadores de plataforma que son owners
-- de todas las organizaciones pero no necesitan recibir cada notificación.
--
-- La bandera es por (business_id, user_id): se puede silenciar un negocio
-- concreto sin afectar otros. Default true para no cambiar el comportamiento
-- existente de los miembros actuales.
-- =============================================================================

alter table public.business_members
  add column if not exists email_notifications_enabled boolean not null default true;

comment on column public.business_members.email_notifications_enabled is
  'Si false, este miembro no recibe correos de actividad del negocio (reservas, cancelaciones, etc.).';

-- =============================================================================
-- Actualizar enqueue_business_members_notification para respetar la bandera.
-- Solo se encola notificación a miembros con email_notifications_enabled = true.
-- =============================================================================

create or replace function public.enqueue_business_members_notification(
  p_business_id uuid,
  p_type text,
  p_payload jsonb,
  p_idempotency_prefix text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select bm.user_id, au.email, p.full_name
    from public.business_members bm
    join auth.users au on au.id = bm.user_id
    left join public.profiles p on p.id = bm.user_id
    where bm.business_id = p_business_id
      and bm.role in ('owner', 'manager')
      and bm.email_notifications_enabled = true
      and au.email is not null
  loop
    perform public.enqueue_notification(
      p_type,
      v_member.email,
      v_member.full_name,
      p_payload,
      p_idempotency_prefix || '_' || v_member.user_id::text
    );
  end loop;
end;
$$;

grant update (email_notifications_enabled) on public.business_members
  to authenticated;
