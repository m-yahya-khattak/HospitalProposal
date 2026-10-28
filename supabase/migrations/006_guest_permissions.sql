-- Granular visitor permissions + secure load/save RPCs.
-- Guests must not select planning_projects.model directly (quote prices).
-- Run after 005_fix_guest_rls.sql.

alter table public.project_guests
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Backfill from legacy can_scale_beds.
update public.project_guests
set permissions = jsonb_build_object(
  'hospitalSize', case when can_scale_beds then 'write' else 'read' end,
  'departments', 'read',
  'specialties', 'read',
  'theatre', 'read',
  'categories', 'read',
  'items', 'read',
  'formulas', 'read',
  'quotes', 'read',
  'quotePrices', 'read',
  'capexBands', 'read',
  'capexRates', 'read',
  'capexCatalog', 'read'
)
where permissions = '{}'::jsonb or permissions is null;

create or replace function public.normalize_guest_permissions(p jsonb, p_scale boolean default true)
returns jsonb
language plpgsql
immutable
as $$
declare
  v jsonb := jsonb_build_object(
    'hospitalSize', case when p_scale then 'write' else 'read' end,
    'departments', 'read',
    'specialties', 'read',
    'theatre', 'read',
    'categories', 'read',
    'items', 'read',
    'formulas', 'read',
    'quotes', 'read',
    'quotePrices', 'read',
    'capexBands', 'read',
    'capexRates', 'read',
    'capexCatalog', 'read'
  );
  k text;
  val text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return v;
  end if;
  for k in
    select unnest(array[
      'hospitalSize','departments','specialties','theatre','categories',
      'items','formulas','quotes','quotePrices','capexBands','capexRates','capexCatalog'
    ])
  loop
    val := p->>k;
    if val in ('none','read','write') then
      v := jsonb_set(v, array[k], to_jsonb(val));
    end if;
  end loop;
  if v->>'quotePrices' = 'write' then
    v := jsonb_set(v, '{quotePrices}', '"read"');
  end if;
  if v->>'quotes' = 'write' and v->>'quotePrices' = 'none' then
    v := jsonb_set(v, '{quotePrices}', '"read"');
  end if;
  return v;
end;
$$;

create or replace function public.guest_level(p jsonb, p_key text)
returns text
language sql
immutable
as $$
  select coalesce(p->>p_key, 'none');
$$;

create or replace function public.strip_quote_prices(p_model jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_quotes jsonb := '[]'::jsonb;
  q jsonb;
begin
  for q in select * from jsonb_array_elements(coalesce(p_model->'quotes', '[]'::jsonb))
  loop
    v_quotes := v_quotes || jsonb_build_array(
      (q - 'originalPrice' - 'usdUnit' - 'fxRate' - 'fxAsOf')
      || jsonb_build_object('priceHidden', true)
    );
  end loop;
  return jsonb_set(p_model, '{quotes}', v_quotes);
end;
$$;

-- Guests load only through this RPC (sanitized model).
create or replace function public.get_guest_project(p_slug text)
returns table (
  project_id uuid,
  name text,
  model jsonb,
  permissions jsonb,
  expires_at timestamptz,
  guest_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select
    p.id as project_id,
    p.name,
    p.model,
    g.permissions,
    g.expires_at,
    g.id as guest_id,
    g.can_scale_beds,
    g.revoked_at
  into v_row
  from public.planning_projects p
  join public.project_guests g
    on g.project_id = p.id
   and g.user_id = v_uid
  where p.slug = p_slug
  limit 1;

  if v_row.project_id is null then
    raise exception 'Project not found';
  end if;
  if v_row.revoked_at is not null or v_row.expires_at <= now() then
    raise exception 'Visitor access expired';
  end if;

  project_id := v_row.project_id;
  name := v_row.name;
  permissions := public.normalize_guest_permissions(v_row.permissions, v_row.can_scale_beds);
  expires_at := v_row.expires_at;
  guest_id := v_row.guest_id;
  model := v_row.model;
  if public.guest_level(permissions, 'quotePrices') = 'none' then
    model := public.strip_quote_prices(model);
  end if;
  if public.guest_level(permissions, 'quotes') = 'none' then
    model := jsonb_set(model, '{quotes}', '[]'::jsonb);
  end if;
  return next;
end;
$$;

-- Merge helper: keep existing ids, allow append, never shrink.
create or replace function public.merge_json_array_by_id(
  p_current jsonb,
  p_incoming jsonb,
  p_allow_new boolean,
  p_item_merge jsonb -- unused placeholder for clarity
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_out jsonb := '[]'::jsonb;
  cur jsonb;
  inc jsonb;
  found boolean;
  cur_id text;
begin
  for cur in select * from jsonb_array_elements(coalesce(p_current, '[]'::jsonb))
  loop
    cur_id := cur->>'id';
    found := false;
    for inc in select * from jsonb_array_elements(coalesce(p_incoming, '[]'::jsonb))
    loop
      if inc->>'id' = cur_id then
        v_out := v_out || jsonb_build_array(inc);
        found := true;
        exit;
      end if;
    end loop;
    if not found then
      v_out := v_out || jsonb_build_array(cur);
    end if;
  end loop;

  if p_allow_new then
    for inc in select * from jsonb_array_elements(coalesce(p_incoming, '[]'::jsonb))
    loop
      found := false;
      for cur in select * from jsonb_array_elements(coalesce(p_current, '[]'::jsonb))
      loop
        if cur->>'id' = inc->>'id' then
          found := true;
          exit;
        end if;
      end loop;
      if not found then
        v_out := v_out || jsonb_build_array(inc);
      end if;
    end loop;
  end if;
  return v_out;
end;
$$;

create or replace function public.apply_guest_patch(
  p_project_id uuid,
  p_model jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest record;
  v_perms jsonb;
  v_current jsonb;
  v_next jsonb;
  v_level text;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if p_model is null or jsonb_typeof(p_model) <> 'object' then
    raise exception 'Invalid model';
  end if;

  select g.*, p.model as project_model, p.owner_id
  into v_guest
  from public.project_guests g
  join public.planning_projects p on p.id = g.project_id
  where g.project_id = p_project_id
    and g.user_id = v_uid
  limit 1;

  if v_guest.id is null then
    raise exception 'Not a visitor on this project';
  end if;
  if v_guest.revoked_at is not null or v_guest.expires_at <= now() then
    raise exception 'Visitor access expired';
  end if;

  v_perms := public.normalize_guest_permissions(v_guest.permissions, v_guest.can_scale_beds);
  v_current := v_guest.project_model;
  v_next := v_current;

  -- hospitalSize: totalBeds + department beds/shares (scale)
  if public.guest_level(v_perms, 'hospitalSize') = 'write' then
    if p_model ? 'totalBeds' then
      v_next := jsonb_set(v_next, '{totalBeds}', p_model->'totalBeds');
    end if;
  end if;

  -- departments
  v_level := public.guest_level(v_perms, 'departments');
  if v_level = 'write' or public.guest_level(v_perms, 'hospitalSize') = 'write' then
    -- Merge department objects by id; allow new only with departments write.
    declare
      v_depts jsonb := '[]'::jsonb;
      cur jsonb;
      inc jsonb;
      merged jsonb;
      found boolean;
      allow_new boolean := (v_level = 'write');
      allow_beds boolean := (
        v_level = 'write' or public.guest_level(v_perms, 'hospitalSize') = 'write'
      );
      allow_furniture boolean := (v_level = 'write');
    begin
      for cur in select * from jsonb_array_elements(coalesce(v_current->'departments', '[]'::jsonb))
      loop
        found := false;
        for inc in select * from jsonb_array_elements(coalesce(p_model->'departments', '[]'::jsonb))
        loop
          if inc->>'id' = cur->>'id' then
            merged := cur;
            if allow_beds then
              if inc ? 'beds' then
                merged := jsonb_set(merged, '{beds}', inc->'beds');
              end if;
              if inc ? 'sharePercent' then
                merged := jsonb_set(merged, '{sharePercent}', inc->'sharePercent');
              end if;
            end if;
            if allow_furniture and inc ? 'furniture' then
              merged := jsonb_set(merged, '{furniture}', inc->'furniture');
            end if;
            if v_level = 'write' and inc ? 'name' then
              merged := jsonb_set(merged, '{name}', inc->'name');
            end if;
            v_depts := v_depts || jsonb_build_array(merged);
            found := true;
            exit;
          end if;
        end loop;
        if not found then
          v_depts := v_depts || jsonb_build_array(cur);
        end if;
      end loop;
      if allow_new then
        for inc in select * from jsonb_array_elements(coalesce(p_model->'departments', '[]'::jsonb))
        loop
          found := false;
          for cur in select * from jsonb_array_elements(coalesce(v_current->'departments', '[]'::jsonb))
          loop
            if cur->>'id' = inc->>'id' then
              found := true;
              exit;
            end if;
          end loop;
          if not found then
            v_depts := v_depts || jsonb_build_array(inc);
          end if;
        end loop;
      end if;
      v_next := jsonb_set(v_next, '{departments}', v_depts);
    end;
  end if;

  -- specialties
  if public.guest_level(v_perms, 'specialties') = 'write' then
    declare
      v_specs jsonb := '[]'::jsonb;
      cur jsonb;
      inc jsonb;
      merged jsonb;
      found boolean;
    begin
      for cur in select * from jsonb_array_elements(coalesce(v_current->'specialties', '[]'::jsonb))
      loop
        found := false;
        for inc in select * from jsonb_array_elements(coalesce(p_model->'specialties', '[]'::jsonb))
        loop
          if inc->>'id' = cur->>'id' then
            merged := cur;
            if inc ? 'enabled' then
              merged := jsonb_set(merged, '{enabled}', inc->'enabled');
            end if;
            if inc ? 'name' then
              merged := jsonb_set(merged, '{name}', inc->'name');
            end if;
            v_specs := v_specs || jsonb_build_array(merged);
            found := true;
            exit;
          end if;
        end loop;
        if not found then
          v_specs := v_specs || jsonb_build_array(cur);
        end if;
      end loop;
      for inc in select * from jsonb_array_elements(coalesce(p_model->'specialties', '[]'::jsonb))
      loop
        found := false;
        for cur in select * from jsonb_array_elements(coalesce(v_current->'specialties', '[]'::jsonb))
        loop
          if cur->>'id' = inc->>'id' then
            found := true;
            exit;
          end if;
        end loop;
        if not found then
          v_specs := v_specs || jsonb_build_array(inc);
        end if;
      end loop;
      v_next := jsonb_set(v_next, '{specialties}', v_specs);
    end;
  end if;

  -- theatre
  if public.guest_level(v_perms, 'theatre') = 'write' and p_model ? 'theatre' then
    v_next := jsonb_set(v_next, '{theatre}', p_model->'theatre');
  end if;

  -- categories
  if public.guest_level(v_perms, 'categories') = 'write' then
    if p_model ? 'categories' then
      v_next := jsonb_set(v_next, '{categories}', p_model->'categories');
    end if;
    if p_model ? 'categoryLabels' then
      v_next := jsonb_set(v_next, '{categoryLabels}', p_model->'categoryLabels');
    end if;
    if p_model ? 'hiddenCategories' then
      v_next := jsonb_set(v_next, '{hiddenCategories}', p_model->'hiddenCategories');
    end if;
  end if;

  -- items + formulas
  if public.guest_level(v_perms, 'items') = 'write'
     or public.guest_level(v_perms, 'formulas') = 'write' then
    declare
      v_items jsonb := '[]'::jsonb;
      cur jsonb;
      inc jsonb;
      merged jsonb;
      found boolean;
      allow_items boolean := public.guest_level(v_perms, 'items') = 'write';
      allow_formulas boolean := public.guest_level(v_perms, 'formulas') = 'write';
    begin
      for cur in select * from jsonb_array_elements(coalesce(v_current->'items', '[]'::jsonb))
      loop
        found := false;
        for inc in select * from jsonb_array_elements(coalesce(p_model->'items', '[]'::jsonb))
        loop
          if inc->>'id' = cur->>'id' then
            merged := cur;
            if allow_items then
              if inc ? 'name' then merged := jsonb_set(merged, '{name}', inc->'name'); end if;
              if inc ? 'category' then merged := jsonb_set(merged, '{category}', inc->'category'); end if;
              if inc ? 'premiumUnit' then merged := jsonb_set(merged, '{premiumUnit}', inc->'premiumUnit'); end if;
              if inc ? 'budgetUnit' then merged := jsonb_set(merged, '{budgetUnit}', inc->'budgetUnit'); end if;
              if inc ? 'enabled' then merged := jsonb_set(merged, '{enabled}', inc->'enabled'); end if;
              if inc ? 'premiumQuoteIds' then merged := jsonb_set(merged, '{premiumQuoteIds}', inc->'premiumQuoteIds'); end if;
              if inc ? 'budgetQuoteIds' then merged := jsonb_set(merged, '{budgetQuoteIds}', inc->'budgetQuoteIds'); end if;
              if inc ? 'premiumQuoteId' then merged := jsonb_set(merged, '{premiumQuoteId}', inc->'premiumQuoteId'); end if;
              if inc ? 'budgetQuoteId' then merged := jsonb_set(merged, '{budgetQuoteId}', inc->'budgetQuoteId'); end if;
            end if;
            if allow_formulas and inc ? 'contributions' then
              merged := jsonb_set(merged, '{contributions}', inc->'contributions');
            end if;
            v_items := v_items || jsonb_build_array(merged);
            found := true;
            exit;
          end if;
        end loop;
        if not found then
          v_items := v_items || jsonb_build_array(cur);
        end if;
      end loop;
      if allow_items then
        for inc in select * from jsonb_array_elements(coalesce(p_model->'items', '[]'::jsonb))
        loop
          found := false;
          for cur in select * from jsonb_array_elements(coalesce(v_current->'items', '[]'::jsonb))
          loop
            if cur->>'id' = inc->>'id' then
              found := true;
              exit;
            end if;
          end loop;
          if not found then
            v_items := v_items || jsonb_build_array(inc);
          end if;
        end loop;
      end if;
      v_next := jsonb_set(v_next, '{items}', v_items);
    end;
  end if;

  -- quotes (append/update by id, never delete)
  if public.guest_level(v_perms, 'quotes') = 'write' then
    v_next := jsonb_set(
      v_next,
      '{quotes}',
      public.merge_json_array_by_id(
        coalesce(v_current->'quotes', '[]'::jsonb),
        coalesce(p_model->'quotes', '[]'::jsonb),
        true,
        '{}'::jsonb
      )
    );
  end if;

  -- capex
  if public.guest_level(v_perms, 'capexBands') = 'write'
     and p_model->'capex' ? 'areaBands' then
    v_next := jsonb_set(v_next, '{capex,areaBands}', p_model->'capex'->'areaBands');
  end if;
  if public.guest_level(v_perms, 'capexRates') = 'write' then
    if p_model->'capex' ? 'lines' then
      v_next := jsonb_set(v_next, '{capex,lines}', p_model->'capex'->'lines');
    end if;
    if p_model->'capex' ? 'landExcluded' then
      v_next := jsonb_set(v_next, '{capex,landExcluded}', p_model->'capex'->'landExcluded');
    end if;
  end if;
  if public.guest_level(v_perms, 'capexCatalog') = 'write'
     and p_model->'capex' ? 'excludedCategories' then
    v_next := jsonb_set(v_next, '{capex,excludedCategories}', p_model->'capex'->'excludedCategories');
  end if;

  update public.planning_projects
  set model = v_next
  where id = p_project_id;

  -- Return sanitized model for the visitor.
  if public.guest_level(v_perms, 'quotePrices') = 'none' then
    v_next := public.strip_quote_prices(v_next);
  end if;
  if public.guest_level(v_perms, 'quotes') = 'none' then
    v_next := jsonb_set(v_next, '{quotes}', '[]'::jsonb);
  end if;
  return v_next;
end;
$$;

-- Recreate create_project_guest with permissions arg.
drop function if exists public.create_project_guest(uuid, text, integer, boolean);

create or replace function public.create_project_guest(
  p_project_id uuid,
  p_label text default 'Visitor',
  p_days integer default 7,
  p_permissions jsonb default null
)
returns table (
  guest_id uuid,
  login_email text,
  password text,
  expires_at timestamptz,
  permissions jsonb
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
  v_perms jsonb;
  v_scale boolean;
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

  v_perms := public.normalize_guest_permissions(p_permissions, true);
  v_scale := (v_perms->>'hospitalSize') = 'write';

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
      'can_scale_beds', v_scale,
      'permissions', v_perms
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
    permissions,
    expires_at
  )
  values (
    v_guest,
    p_project_id,
    v_uid,
    auth.uid(),
    v_label,
    v_email,
    v_scale,
    v_perms,
    v_expires
  );

  guest_id := v_guest;
  login_email := v_email;
  password := v_password;
  expires_at := v_expires;
  permissions := v_perms;
  return next;
end;
$$;

create or replace function public.update_project_guest_permissions(
  p_guest_id uuid,
  p_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
declare
  v_owner uuid;
  v_user uuid;
  v_perms jsonb;
  v_meta jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select p.owner_id, g.user_id
  into v_owner, v_user
  from public.project_guests g
  join public.planning_projects p on p.id = g.project_id
  where g.id = p_guest_id;

  if v_user is null then
    raise exception 'Visitor not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the project owner can update visitors';
  end if;

  v_perms := public.normalize_guest_permissions(p_permissions, true);

  update public.project_guests
  set
    permissions = v_perms,
    can_scale_beds = (v_perms->>'hospitalSize') = 'write'
  where id = p_guest_id;

  select raw_app_meta_data into v_meta from auth.users where id = v_user;
  v_meta := coalesce(v_meta, '{}'::jsonb)
    || jsonb_build_object(
      'permissions', v_perms,
      'can_scale_beds', (v_perms->>'hospitalSize') = 'write'
    );
  update auth.users
  set raw_app_meta_data = v_meta, updated_at = now()
  where id = v_user;

  return v_perms;
end;
$$;

-- Block direct guest reads of planning_projects (use get_guest_project instead).
drop policy if exists planning_projects_select_guest on public.planning_projects;

revoke all on function public.get_guest_project(text) from public, anon;
revoke all on function public.apply_guest_patch(uuid, jsonb) from public, anon;
revoke all on function public.create_project_guest(uuid, text, integer, jsonb) from public, anon;
revoke all on function public.update_project_guest_permissions(uuid, jsonb) from public, anon;

grant execute on function public.get_guest_project(text) to authenticated;
grant execute on function public.apply_guest_patch(uuid, jsonb) to authenticated;
grant execute on function public.create_project_guest(uuid, text, integer, jsonb) to authenticated;
grant execute on function public.update_project_guest_permissions(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
