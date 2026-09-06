-- Per-user hospital projects. Run after 001_planning.sql.
-- The old planning_models.default row is left in place; the app no longer uses it.

create table if not exists public.planning_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  model jsonb not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists planning_projects_owner_idx
  on public.planning_projects (owner_id);

create or replace function public.set_planning_project_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  if tg_op = 'INSERT' and new.owner_id is null then
    new.owner_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists planning_projects_set_updated on public.planning_projects;
create trigger planning_projects_set_updated
before insert or update on public.planning_projects
for each row
execute function public.set_planning_project_updated();

alter table public.planning_projects enable row level security;

drop policy if exists planning_projects_select_public on public.planning_projects;
create policy planning_projects_select_public
on public.planning_projects
for select
to anon, authenticated
using (is_public = true);

drop policy if exists planning_projects_select_own on public.planning_projects;
create policy planning_projects_select_own
on public.planning_projects
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists planning_projects_insert_own on public.planning_projects;
create policy planning_projects_insert_own
on public.planning_projects
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists planning_projects_update_own on public.planning_projects;
create policy planning_projects_update_own
on public.planning_projects
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists planning_projects_delete_own on public.planning_projects;
create policy planning_projects_delete_own
on public.planning_projects
for delete
to authenticated
using (owner_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.planning_projects;
exception
  when duplicate_object then null;
end;
$$;
