create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can read own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, delete on table public.push_subscriptions to authenticated;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time bigint default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if char_length(btrim(coalesce(p_endpoint, ''))) not between 1 and 2048 then
    raise exception 'Endpoint push inválido';
  end if;

  if char_length(btrim(coalesce(p_p256dh, ''))) not between 1 and 512 then
    raise exception 'Clave p256dh inválida';
  end if;

  if char_length(btrim(coalesce(p_auth, ''))) not between 1 and 512 then
    raise exception 'Clave auth inválida';
  end if;

  insert into public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth_key,
    expiration_time,
    user_agent,
    revoked_at
  )
  values (
    v_user_id,
    btrim(p_endpoint),
    btrim(p_p256dh),
    btrim(p_auth),
    p_expiration_time,
    left(p_user_agent, 512),
    null
  )
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
    expiration_time = excluded.expiration_time,
    user_agent = excluded.user_agent,
    updated_at = now(),
    revoked_at = null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, bigint, text) from public;
grant execute on function public.register_push_subscription(text, text, text, bigint, text) to authenticated;
