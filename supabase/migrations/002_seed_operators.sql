-- Seed Control studio operators. Run in the Supabase SQL editor after 001_planning.sql.
-- Login (name or email) / password:
--   Ahmed  (ahmed@hospitalplan.com) / Ahmed2026!
--   Yahya  (yahya@hospitalplan.com) / Yahya2026!

create extension if not exists pgcrypto with schema extensions;

create or replace function public.seed_operator(
  p_email text,
  p_password text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);

  if uid is null then
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      lower(p_email),
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('name', p_name, 'full_name', p_name),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_build_object('name', p_name, 'full_name', p_name),
      updated_at = now()
    where id = uid;
  end if;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    uid,
    uid::text,
    jsonb_build_object(
      'sub', uid::text,
      'email', lower(p_email),
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
  set
    identity_data = excluded.identity_data,
    updated_at = now();

  return uid;
end;
$$;

select public.seed_operator('ahmed@hospitalplan.com', 'Ahmed2026!', 'Ahmed');
select public.seed_operator('yahya@hospitalplan.com', 'Yahya2026!', 'Yahya');

revoke all on function public.seed_operator(text, text, text) from public, anon, authenticated;
drop function public.seed_operator(text, text, text);

-- Planning model: capacity, catalog, formulas, and CAPEX live in 001_planning.sql.
do $$
begin
  if not exists (
    select 1
    from public.planning_models
    where id = 'default'
      and jsonb_typeof(model->'items') = 'array'
      and jsonb_array_length(model->'items') > 0
  ) then
    raise notice 'Planning model is empty. Run supabase/migrations/001_planning.sql to seed all areas.';
  end if;
end;
$$;
