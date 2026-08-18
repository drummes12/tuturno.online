-- =============================================================================
-- 03000: Consentimientos de privacidad y marketing
--
-- Alcance mínimo (fase 1):
--   * Evidencia de la aceptación de Términos y Política en el registro.
--   * Consentimiento de marketing por email, separado y por negocio.
--   * Baja sencilla e idempotente.
--   * Los clientes existentes y los guests quedan SIN autorización de
--     marketing hasta que exista un opt-in explícito y registrado.
--
-- Diseño:
--   * Una fila por (subject, purpose, business_id) representa el estado
--     vigente. El estado histórico se conserva insertando una nueva fila
--     y marcando la anterior como withdrawn.
--   * `subject_user_id` identifica al usuario autenticado que dio el
--     consentimiento. `subject_client_id` permite asociar el
--     consentimiento a un cliente sin cuenta (guest) cuando el negocio
--     obtenga autorización demostrable por su propio canal.
--   * `policy_version` permite demostrar qué texto aceptó la persona.
--   * No se captura IP ni user-agent por defecto para no añadir
--     tracking innecesario en esta fase.
-- =============================================================================

create type public.consent_purpose as enum (
  'terms_and_privacy',     -- aceptación obligatoria en el registro
  'marketing_email'        -- promociones por email del propio negocio
);

create type public.consent_status as enum (
  'accepted',
  'withdrawn'
);

create table if not exists public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete set null,
  subject_client_id uuid references public.clients(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  purpose public.consent_purpose not null,
  channel text not null default 'email',
  policy_version text not null,
  status public.consent_status not null default 'accepted',
  source text not null default 'registration',
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  -- El sujeto debe estar definido: usuario o cliente (guest)
  constraint privacy_consents_subject_check
    check (subject_user_id is not null or subject_client_id is not null),
  -- El consentimiento de términos es global (sin negocio)
  -- El consentimiento de marketing siempre tiene negocio
  constraint privacy_consents_business_check
    check (
      (purpose = 'terms_and_privacy' and business_id is null)
      or (purpose = 'marketing_email' and business_id is not null)
    )
);

-- Índices para los accesos principales
create index if not exists privacy_consents_user_idx
  on public.privacy_consents (subject_user_id);
create index if not exists privacy_consents_client_idx
  on public.privacy_consents (subject_client_id);
create index if not exists privacy_consents_business_purpose_idx
  on public.privacy_consents (business_id, purpose);
create index if not exists privacy_consents_active_idx
  on public.privacy_consents (subject_user_id, purpose, business_id)
  where status = 'accepted';

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.privacy_consents enable row level security;

-- Un usuario lee sus propios consentimientos
create policy "Users can read own consents"
  on public.privacy_consents for select
  using (subject_user_id = auth.uid());

-- Los miembros del negocio leen los consentimientos de marketing
-- asociados a clientes de su negocio
create policy "Business members can read marketing consents for their clients"
  on public.privacy_consents for select
  using (
    purpose = 'marketing_email'
    and business_id is not null
    and public.is_business_member(business_id)
  );

-- Inserción y actualización solo vía RPC (SECURITY DEFINER)
-- No exponemos insert/update/delete directamente desde el cliente.
revoke all on public.privacy_consents from authenticated, anon;

-- =============================================================================
-- RPC: record_registration_consent
--
-- Registra la aceptación obligatoria de Términos y Política durante el
-- registro. Usa auth.uid() para identificar al usuario, por lo que
-- requiere sesión activa. Se invoca:
--   * tras signUp cuando devuelve sesión (email confirmation desactivada)
--   * tras signIn como fallback idempotente (cuando el signUp no dejó
--     sesión porque requería confirmación por email)
-- Es idempotente: si ya existe una aceptación vigente para ese usuario y
-- versión, no duplica.
-- =============================================================================
create or replace function public.record_registration_consent(
  p_policy_version text,
  p_source text default 'registration'
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
  if btrim(coalesce(p_policy_version, '')) = '' then
    raise exception 'Versión de política requerida.' using errcode = '22004';
  end if;

  -- Si ya existe una aceptación vigente con la misma versión, no duplicar
  select id into v_id
  from public.privacy_consents
  where subject_user_id = v_user_id
    and purpose = 'terms_and_privacy'
    and policy_version = p_policy_version
    and status = 'accepted'
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  -- Si existe una aceptación previa (otra versión o retirada), queda
  -- reemplazada por la nueva fila vigente.
  insert into public.privacy_consents (
    subject_user_id, purpose, policy_version, source, status
  )
  values (
    v_user_id, 'terms_and_privacy', p_policy_version, p_source,
    'accepted'::public.consent_status
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_registration_consent(text, text) from public;
grant execute on function public.record_registration_consent(text, text) to authenticated;

-- =============================================================================
-- RPC: set_marketing_consent
--
-- Registra el opt-in de marketing por email para un negocio.
-- Solo lo puede dar el propio usuario autenticado (no el negocio por él).
-- Idempotente: si ya está aceptado con la misma versión, no duplica.
-- =============================================================================
create or replace function public.set_marketing_consent(
  p_business_id uuid,
  p_policy_version text,
  p_accept boolean default true,
  p_source text default 'reservation'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_status public.consent_status;
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;
  if p_business_id is null then
    raise exception 'Negocio requerido.' using errcode = '22004';
  end if;
  if btrim(coalesce(p_policy_version, '')) = '' then
    raise exception 'Versión de política requerida.' using errcode = '22004';
  end if;

  v_status := (case when p_accept then 'accepted' else 'withdrawn' end)::public.consent_status;

  -- Buscar el estado vigente actual
  select id, status into v_id, v_status
  from public.privacy_consents
  where subject_user_id = auth.uid()
    and purpose = 'marketing_email'
    and business_id = p_business_id
  order by created_at desc
  limit 1;

  -- Si ya está en el estado solicitado con la misma versión, no hacer nada
  if v_id is not null then
    if (p_accept and v_status = 'accepted') or (not p_accept and v_status = 'withdrawn') then
      return v_id;
    end if;
  end if;

  -- Marcar la fila anterior como withdrawn si estaba aceptada y ahora se retira
  if v_id is not null and p_accept = false then
    update public.privacy_consents
      set status = 'withdrawn', withdrawn_at = now()
      where id = v_id and status = 'accepted';
  end if;

  -- Insertar el nuevo estado
  insert into public.privacy_consents (
    subject_user_id, business_id, purpose, channel,
    policy_version, source, status,
    accepted_at, withdrawn_at
  )
  values (
    auth.uid(), p_business_id, 'marketing_email', 'email',
    p_policy_version, p_source,
    (case when p_accept then 'accepted' else 'withdrawn' end)::public.consent_status,
    case when p_accept then now() else null end,
    case when p_accept then null else now() end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.set_marketing_consent(uuid, text, boolean, text) from public;
grant execute on function public.set_marketing_consent(uuid, text, boolean, text) to authenticated;

-- =============================================================================
-- RPC: withdraw_marketing_consent
--
-- Retira el consentimiento de marketing para un negocio. Idempotente.
-- =============================================================================
create or replace function public.withdraw_marketing_consent(
  p_business_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;

  update public.privacy_consents
    set status = 'withdrawn', withdrawn_at = now()
    where subject_user_id = auth.uid()
      and purpose = 'marketing_email'
      and business_id = p_business_id
      and status = 'accepted';
end;
$$;

revoke all on function public.withdraw_marketing_consent(uuid) from public;
grant execute on function public.withdraw_marketing_consent(uuid) to authenticated;

-- =============================================================================
-- RPC: get_my_marketing_consents
--
-- Devuelve el estado vigente de marketing por negocio para el usuario actual.
-- =============================================================================
create or replace function public.get_my_marketing_consents()
returns table(
  business_id uuid,
  business_name text,
  status public.consent_status,
  accepted_at timestamptz,
  withdrawn_at timestamptz,
  policy_version text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;

  return query
  select distinct on (pc.business_id)
    pc.business_id,
    b.name::text as business_name,
    pc.status,
    pc.accepted_at,
    pc.withdrawn_at,
    pc.policy_version
  from public.privacy_consents pc
  join public.businesses b on b.id = pc.business_id
  where pc.subject_user_id = auth.uid()
    and pc.purpose = 'marketing_email'
  order by pc.business_id, pc.created_at desc;
end;
$$;

revoke all on function public.get_my_marketing_consents() from public;
grant execute on function public.get_my_marketing_consents() to authenticated;

-- =============================================================================
-- RPC: has_marketing_consent
--
-- Verifica si un cliente (por user_id o client_id) tiene consentimiento
-- vigente de marketing para un negocio. Útil para que el backend decida
-- si puede enviar promociones.
-- =============================================================================
create or replace function public.has_marketing_consent(
  p_business_id uuid,
  p_user_id uuid default null,
  p_client_id uuid default null
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.privacy_consents
    where business_id = p_business_id
      and purpose = 'marketing_email'
      and status = 'accepted'
      and (
        (p_user_id is not null and subject_user_id = p_user_id)
        or (p_client_id is not null and subject_client_id = p_client_id)
      )
  );
$$;

revoke all on function public.has_marketing_consent(uuid, uuid, uuid) from public;
grant execute on function public.has_marketing_consent(uuid, uuid, uuid) to authenticated;
