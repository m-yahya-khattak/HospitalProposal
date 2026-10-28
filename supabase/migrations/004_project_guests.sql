-- Time-limited visitor logins, locked to one project. Run after 003.
-- Owners call create_project_guest / revoke_project_guest. Visitors cannot write the model.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.project_guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.planning_projects (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Visitor',
  login_email text not null,
  can_scale_beds boolean not null default true,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_guests_project_idx
  on public.project_guests (project_id);

create index if not exists project_guests_user_idx
  on public.project_guests (user_id);

alter table public.project_guests enable row level security;

drop policy if exists project_guests_select on public.project_guests;
create policy project_guests_select
on public.project_guests
for select
to authenticated
using (
  user_id = auth.uid()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.planning_projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists planning_projects_select_guest on public.planning_projects;
create policy planning_projects_select_guest
on public.planning_projects
for select
to authenticated
using (
  exists (
    select 1
    from public.project_guests g
    where g.project_id = planning_projects.id
      and g.user_id = auth.uid()
      and g.revoked_at is null
      and g.expires_at > now()
  )
);

create or replace function public._insert_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_name text,
  p_app_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
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
    p_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    p_app_meta,
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
    p_id,
    p_id::text,
    jsonb_build_object(
      'sub', p_id::text,
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
end;
$$;

create or replace function public.create_project_guest(
  p_project_id uuid,
  p_label text default 'Visitor',
  p_days integer default 7,
  p_can_scale_beds boolean default true
)
returns table (
  guest_id uuid,
  login_email text,
  password text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
declare
  v_owner uuid;
  v_slug text;
  v_uid uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
  v_days int := p_days;
  v_label text;
  v_email text;
  v_password text;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select owner_id, slug into v_owner, v_slug
  from public.planning_projects
  where id = p_project_id;

  if v_owner is null then
    raise exception 'Project not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the project owner can create visitors';
  end if;

  if v_days not in (1, 3, 7, 14) then
    v_days := 7;
  end if;

  v_label := left(trim(coalesce(p_label, '')), 80);
  if v_label = '' then
    v_label := 'Visitor';
  end if;

  v_email := 'visitor-' || substr(replace(v_uid::text, '-', ''), 1, 10) || '@guest.hospitalplan.com';
  v_password := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
    || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  v_expires := now() + make_interval(days => v_days);

  perform public._insert_auth_user(
    v_uid,
    v_email,
    v_password,
    v_label,
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', 'visitor',
      'project_id', p_project_id,
      'project_slug', v_slug,
      'guest_id', v_guest,
      'expires_at', v_expires,
      'can_scale_beds', coalesce(p_can_scale_beds, true)
    )
  );

  insert into public.project_guests (
    id,
    project_id,
    user_id,
    created_by,
    label,
    login_email,
    can_scale_beds,
    expires_at
  )
  values (
    v_guest,
    p_project_id,
    v_uid,
    auth.uid(),
    v_label,
    v_email,
    coalesce(p_can_scale_beds, true),
    v_expires
  );

  guest_id := v_guest;
  login_email := v_email;
  password := v_password;
  expires_at := v_expires;
  return next;
end;
$$;

create or replace function public.revoke_project_guest(p_guest_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
declare
  v_user uuid;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select g.user_id, p.owner_id
  into v_user, v_owner
  from public.project_guests g
  join public.planning_projects p on p.id = g.project_id
  where g.id = p_guest_id;

  if v_user is null then
    raise exception 'Visitor not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the project owner can revoke visitors';
  end if;

  update public.project_guests
  set revoked_at = now()
  where id = p_guest_id;

  delete from auth.identities where user_id = v_user;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public._insert_auth_user(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.create_project_guest(uuid, text, integer, boolean)
  from public, anon;
revoke all on function public.revoke_project_guest(uuid)
  from public, anon;

grant execute on function public.create_project_guest(uuid, text, integer, boolean)
  to authenticated;
grant execute on function public.revoke_project_guest(uuid)
  to authenticated;

notify pgrst, 'reload schema';
