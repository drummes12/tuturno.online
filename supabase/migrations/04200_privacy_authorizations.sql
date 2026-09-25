-- Record explicit authorization for business signup requests and reservation data.

alter table public.business_signup_requests
  add column if not exists consent_policy_version text,
  add column if not exists consented_at timestamptz;

revoke all on function public.request_business_signup(text, text, text, text, text, text)
  from public, anon, authenticated;

drop function if exists public.submit_business_signup_request(text, text, text, text, text, text, text);

create function public.submit_business_signup_request(
  p_business_name text,
  p_desired_slug text,
  p_business_type text,
  p_contact_phone text,
  p_city text,
  p_notes text,
  p_policy_version text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada.' using errcode = '42501';
  end if;
  if btrim(coalesce(p_policy_version, '')) = '' then
    raise exception 'Versión de política requerida.' using errcode = '22004';
  end if;

  v_request_id := public.request_business_signup(
    p_business_name,
    p_desired_slug,
    p_business_type,
    p_contact_phone,
    p_city,
    p_notes
  );

  update public.business_signup_requests
  set consent_policy_version = p_policy_version,
      consented_at = now()
  where id = v_request_id and user_id = auth.uid();

  return v_request_id;
end;
$$;

revoke all on function public.submit_business_signup_request(text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.submit_business_signup_request(text, text, text, text, text, text, text)
  to authenticated;

create table if not exists public.reservation_data_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  policy_version text not null,
  source text not null default 'reservation',
  accepted_at timestamptz not null default now()
);

create index if not exists reservation_data_consents_user_idx
  on public.reservation_data_consents (user_id, accepted_at desc);

alter table public.reservation_data_consents enable row level security;
revoke all on public.reservation_data_consents from public, anon, authenticated;

drop function if exists public.record_reservation_data_consent(uuid, text);

create function public.record_reservation_data_consent(
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

  insert into public.reservation_data_consents (user_id, business_id, policy_version)
  values (v_user_id, p_business_id, p_policy_version)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_reservation_data_consent(uuid, text) from public, anon;
grant execute on function public.record_reservation_data_consent(uuid, text) to authenticated;
