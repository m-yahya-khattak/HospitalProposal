-- Fixes infinite recursion: planning_projects guest policy was reading
-- project_guests, whose policy read planning_projects. Run after 004.

drop policy if exists planning_projects_select_guest on public.planning_projects;
drop policy if exists project_guests_select on public.project_guests;

create policy project_guests_select
on public.project_guests
for select
to authenticated
using (user_id = auth.uid() or created_by = auth.uid());

create or replace function public.is_project_guest(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_guests g
    where g.project_id = p_project_id
      and g.user_id = auth.uid()
      and g.revoked_at is null
      and g.expires_at > now()
  );
$$;

create policy planning_projects_select_guest
on public.planning_projects
for select
to authenticated
using (public.is_project_guest(id));

grant execute on function public.is_project_guest(uuid) to authenticated;

notify pgrst, 'reload schema';
