-- =============================================================================
-- Dynamic User Title System (presentation only — NOT RBAC)
-- Titles are admin-designed; app build not required for new titles.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('user_titles_enabled', true, 'Dinamik kullanıcı ünvan (title badge) sistemi'),
  ('title_animations_enabled', true, 'Ünvan badge animasyonları (performans kill switch)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Title catalog
-- ---------------------------------------------------------------------------
create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  -- Localized names: {"tr":"Kurucu","en":"Founder",...}
  name_i18n jsonb not null default '{}'::jsonb,
  -- Whitelisted design tokens (validated in RPC)
  design jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  archived_at timestamptz,
  -- When true, assigned user cannot change away from this title (admin forced)
  selection_locked boolean not null default false,
  priority integer not null default 100,
  version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_titles_slug_len check (char_length(slug) between 2 and 64),
  constraint user_titles_name_len check (char_length(name) between 1 and 48),
  constraint user_titles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists user_titles_slug_uidx
  on public.user_titles (slug)
  where archived_at is null;

create index if not exists user_titles_active_idx
  on public.user_titles (is_active, priority desc)
  where archived_at is null;

create index if not exists user_titles_updated_idx
  on public.user_titles (updated_at desc);

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------
create table if not exists public.user_title_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.user_titles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  assignment_source text not null default 'ADMIN'
    check (assignment_source in (
      'ADMIN', 'ACHIEVEMENT', 'EVENT', 'SYSTEM', 'AGENCY', 'CITY', 'COUNTRY'
    )),
  -- When true for this assignment, user cannot deselect/hide this title
  selection_locked boolean not null default false,
  reason text,
  notify_user boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uta_user_active_idx
  on public.user_title_assignments (user_id, is_active)
  where revoked_at is null;

create index if not exists uta_title_active_idx
  on public.user_title_assignments (title_id, is_active)
  where revoked_at is null;

create index if not exists uta_expires_idx
  on public.user_title_assignments (expires_at)
  where is_active and revoked_at is null and expires_at is not null;

-- One active (non-revoked) assignment per user+title
create unique index if not exists uta_user_title_active_uidx
  on public.user_title_assignments (user_id, title_id)
  where revoked_at is null and is_active;

-- ---------------------------------------------------------------------------
-- Selected title on profile (presentation preference)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists selected_title_id uuid references public.user_titles(id) on delete set null;

create index if not exists profiles_selected_title_idx
  on public.profiles (selected_title_id)
  where selected_title_id is not null;

-- ---------------------------------------------------------------------------
-- Storage: custom title icons (PNG/WebP only — no SVG)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'title-icons',
  'title-icons',
  true,
  512000,
  array['image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "title_icons_public_read" on storage.objects;
create policy "title_icons_public_read"
  on storage.objects for select to public
  using (bucket_id = 'title-icons');

drop policy if exists "title_icons_admin_write" on storage.objects;
create policy "title_icons_admin_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'title-icons' and public.ben_admin_miyim());

drop policy if exists "title_icons_admin_update" on storage.objects;
create policy "title_icons_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'title-icons' and public.ben_admin_miyim())
  with check (bucket_id = 'title-icons' and public.ben_admin_miyim());

drop policy if exists "title_icons_admin_delete" on storage.objects;
create policy "title_icons_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'title-icons' and public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_titles enable row level security;
alter table public.user_title_assignments enable row level security;

drop policy if exists "user_titles_public_read" on public.user_titles;
create policy "user_titles_public_read"
  on public.user_titles for select to authenticated
  using (
    public.ben_admin_miyim()
    or (is_active = true and archived_at is null)
  );

-- No direct client writes — all via SECURITY DEFINER RPCs
drop policy if exists "user_titles_no_direct_write" on public.user_titles;

drop policy if exists "uta_own_read" on public.user_title_assignments;
create policy "uta_own_read"
  on public.user_title_assignments for select to authenticated
  using (
    auth.uid() = user_id
    or public.ben_admin_miyim()
  );

-- Public may need to know which title another user displays — via RPC only.
-- Direct SELECT of others' assignment history is denied (privacy).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_titles_feature_on()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.feature_flags where key = 'user_titles_enabled'),
    false
  );
$$;

create or replace function public._user_title_color_ok(p text)
returns boolean
language sql
immutable
as $$
  select p is null
    or p ~ '^#[0-9A-Fa-f]{6}$'
    or p ~ '^#[0-9A-Fa-f]{8}$'
    or p ~ '^rgba?\([0-9]+,\s*[0-9]+,\s*[0-9]+(,\s*[0-9.]+)?\)$';
$$;

create or replace function public._user_title_design_sanitize(p_design jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v jsonb := coalesce(p_design, '{}'::jsonb);
  v_shape text;
  v_bg text;
  v_anim text;
  v_size text;
  v_icon_type text;
  v_icon_pos text;
  v_fw text;
  v_glow text;
  v_dir text;
  v_out jsonb := '{}'::jsonb;
begin
  v_shape := upper(coalesce(v->>'shape', 'SOFT_PILL'));
  if v_shape not in (
    'PILL','SOFT_PILL','ROUNDED_RECT','COMPACT','CAPSULE',
    'CUT_CORNER','DIAMOND_EDGE','HEX','MINIMAL','OUTLINE'
  ) then
    raise exception 'INVALID_SHAPE';
  end if;

  v_bg := upper(coalesce(v->>'backgroundType', 'SOLID'));
  if v_bg not in ('SOLID','LINEAR_GRADIENT','SUBTLE_GRADIENT','TRANSPARENT','GLASS') then
    raise exception 'INVALID_BACKGROUND';
  end if;

  v_anim := upper(coalesce(v->>'animationType', 'NONE'));
  if v_anim not in ('NONE','SHIMMER','SOFT_GLOW','GRADIENT_SHIFT','SPARKLE') then
    raise exception 'INVALID_ANIMATION';
  end if;

  v_size := upper(coalesce(v->>'size', 'NORMAL'));
  if v_size not in ('COMPACT','NORMAL','PROMINENT') then
    raise exception 'INVALID_SIZE';
  end if;

  v_icon_type := lower(coalesce(v->>'iconType', 'library'));
  if v_icon_type not in ('library','emoji','custom','none') then
    raise exception 'INVALID_ICON_TYPE';
  end if;

  v_icon_pos := upper(coalesce(v->>'iconPosition', 'LEFT'));
  if v_icon_pos not in ('LEFT','RIGHT') then
    raise exception 'INVALID_ICON_POSITION';
  end if;

  v_fw := lower(coalesce(v->>'fontWeight', 'semibold'));
  if v_fw not in ('medium','semibold','bold') then
    raise exception 'INVALID_FONT_WEIGHT';
  end if;

  v_glow := lower(coalesce(v->>'glowIntensity', 'off'));
  if v_glow not in ('off','soft','medium','strong') then
    raise exception 'INVALID_GLOW';
  end if;

  v_dir := upper(coalesce(v->>'gradientDirection', 'LEFT_RIGHT'));
  if v_dir not in ('LEFT_RIGHT','RIGHT_LEFT','TOP_BOTTOM','DIAGONAL') then
    raise exception 'INVALID_GRADIENT_DIRECTION';
  end if;

  if not public._user_title_color_ok(v->>'backgroundColor') then raise exception 'INVALID_COLOR'; end if;
  if not public._user_title_color_ok(v->>'backgroundColor2') then raise exception 'INVALID_COLOR'; end if;
  if not public._user_title_color_ok(v->>'backgroundColor3') then raise exception 'INVALID_COLOR'; end if;
  if not public._user_title_color_ok(v->>'textColor') then raise exception 'INVALID_COLOR'; end if;
  if not public._user_title_color_ok(v->>'borderColor') then raise exception 'INVALID_COLOR'; end if;
  if not public._user_title_color_ok(v->>'glowColor') then raise exception 'INVALID_COLOR'; end if;

  -- Custom icon: only allow https title-icons paths (no arbitrary JS/HTML)
  if v_icon_type = 'custom' then
    if coalesce(v->>'iconValue', '') !~ '^https://.+/(title-icons)/.+\.(png|webp)(\?.*)?$'
       and coalesce(v->>'iconValue', '') !~ '^title-icons/.+\.(png|webp)$' then
      raise exception 'INVALID_CUSTOM_ICON';
    end if;
  end if;

  if v_icon_type = 'library' then
    if coalesce(v->>'iconValue', '') !~ '^[a-z0-9_-]{1,48}$' then
      raise exception 'INVALID_LIBRARY_ICON';
    end if;
  end if;

  if v_icon_type = 'emoji' then
    if char_length(coalesce(v->>'iconValue', '')) > 8 then
      raise exception 'INVALID_EMOJI';
    end if;
  end if;

  v_out := jsonb_build_object(
    'shape', v_shape,
    'backgroundType', v_bg,
    'backgroundColor', coalesce(v->>'backgroundColor', '#7C3AED'),
    'backgroundColor2', v->>'backgroundColor2',
    'backgroundColor3', v->>'backgroundColor3',
    'gradientDirection', v_dir,
    'textColor', coalesce(v->>'textColor', '#FFFFFF'),
    'borderEnabled', coalesce((v->>'borderEnabled')::boolean, false),
    'borderColor', coalesce(v->>'borderColor', '#FFFFFF'),
    'borderWidth', least(greatest(coalesce((v->>'borderWidth')::numeric, 1), 0), 3),
    'borderOpacity', least(greatest(coalesce((v->>'borderOpacity')::numeric, 1), 0), 1),
    'cornerRadius', case
      when v ? 'cornerRadius' and (v->>'cornerRadius') is not null
        then least(greatest((v->>'cornerRadius')::numeric, 0), 24)
      else null
    end,
    'glowEnabled', coalesce((v->>'glowEnabled')::boolean, false) and v_glow <> 'off',
    'glowColor', coalesce(v->>'glowColor', '#A78BFA'),
    'glowIntensity', v_glow,
    'animationType', v_anim,
    'fontWeight', v_fw,
    'iconType', v_icon_type,
    'iconValue', coalesce(v->>'iconValue', ''),
    'iconPosition', v_icon_pos,
    'size', v_size,
    'paddingH', least(greatest(coalesce((v->>'paddingH')::int, 8), 4), 16),
    'paddingV', least(greatest(coalesce((v->>'paddingV')::int, 3), 1), 8)
  );

  return v_out;
end;
$$;

-- Assignment currently valid (server clock)
create or replace function public.user_title_assignment_gecerli_mi(
  p_assignment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_title_assignments a
    join public.user_titles t on t.id = a.title_id
    where a.id = p_assignment_id
      and a.is_active
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and t.is_active
      and t.archived_at is null
  );
$$;

create or replace function public.user_title_kullaniciya_aktif_mi(
  p_user_id uuid,
  p_title_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_title_assignments a
    join public.user_titles t on t.id = a.title_id
    where a.user_id = p_user_id
      and a.title_id = p_title_id
      and a.is_active
      and a.revoked_at is null
      and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and t.is_active
      and t.archived_at is null
  );
$$;

-- Resolve which title_id should display for a user (forced lock > selected)
create or replace function public.user_title_gorunen_id(p_user_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_forced uuid;
  v_selected uuid;
begin
  if not public.user_titles_feature_on() then
    return null;
  end if;

  -- Highest-priority locked active assignment wins
  select a.title_id into v_forced
  from public.user_title_assignments a
  join public.user_titles t on t.id = a.title_id
  where a.user_id = p_user_id
    and a.is_active
    and a.revoked_at is null
    and a.starts_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and t.is_active
    and t.archived_at is null
    and (a.selection_locked or t.selection_locked)
  order by t.priority desc, a.assigned_at desc
  limit 1;

  if v_forced is not null then
    return v_forced;
  end if;

  select p.selected_title_id into v_selected
  from public.profiles p
  where p.id = p_user_id;

  if v_selected is not null
     and public.user_title_kullaniciya_aktif_mi(p_user_id, v_selected) then
    return v_selected;
  end if;

  return null;
end;
$$;

create or replace function public.user_title_public_presentation(p_title_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_title_id is null or not public.user_titles_feature_on() then
    return null;
  end if;

  select t.id, t.slug, t.name, t.name_i18n, t.design, t.version, t.priority
  into v
  from public.user_titles t
  where t.id = p_title_id
    and t.is_active
    and t.archived_at is null;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v.id,
    'slug', v.slug,
    'name', v.name,
    'name_i18n', coalesce(v.name_i18n, '{}'::jsonb),
    'design', coalesce(v.design, '{}'::jsonb),
    'version', v.version,
    'priority', v.priority
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public catalog (active titles only — for client registry cache)
-- ---------------------------------------------------------------------------
create or replace function public.user_titles_katalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.user_titles_feature_on() then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'name', t.name,
        'name_i18n', coalesce(t.name_i18n, '{}'::jsonb),
        'design', coalesce(t.design, '{}'::jsonb),
        'version', t.version,
        'priority', t.priority,
        'updated_at', t.updated_at
      )
      order by t.priority desc, t.name
    )
    from public.user_titles t
    where t.is_active and t.archived_at is null
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.user_titles_katalog() to authenticated;

-- Catalog version watermark for cache invalidation
create or replace function public.user_titles_katalog_surum()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'max_updated_at', coalesce(max(updated_at), 'epoch'::timestamptz),
    'max_version', coalesce(max(version), 0),
    'count', count(*)::int
  )
  from public.user_titles
  where is_active and archived_at is null;
$$;

grant execute on function public.user_titles_katalog_surum() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: create / update / archive / clone
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_title_kaydet(
  p_id uuid default null,
  p_slug text default null,
  p_name text default null,
  p_description text default null,
  p_name_i18n jsonb default null,
  p_design jsonb default null,
  p_is_active boolean default true,
  p_selection_locked boolean default false,
  p_priority integer default 100,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_design jsonb;
  v_id uuid;
  v_row public.user_titles%rowtype;
  v_slug text;
  v_name text;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null or char_length(v_name) > 48 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz ünvan adı', 'error_code', 'invalid_name');
  end if;
  if char_length(v_name) > 24 then
    -- Soft UX limit: still allow up to 48 but flag
    null;
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' then
    v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz slug', 'error_code', 'invalid_slug');
  end if;

  begin
    v_design := public._user_title_design_sanitize(p_design);
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz tasarım: ' || SQLERRM, 'error_code', 'invalid_design');
  end;

  if p_id is null then
    insert into public.user_titles (
      slug, name, description, name_i18n, design, is_active,
      selection_locked, priority, created_by, updated_by, metadata
    ) values (
      v_slug, v_name, nullif(trim(coalesce(p_description, '')), ''),
      coalesce(p_name_i18n, '{}'::jsonb), v_design, coalesce(p_is_active, true),
      coalesce(p_selection_locked, false), coalesce(p_priority, 100),
      v_uid, v_uid, coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_row;

    perform public.admin_audit_yaz(
      null, 'TITLE_CREATED',
      'Ünvan oluşturuldu: ' || v_row.name,
      jsonb_build_object('title_id', v_row.id, 'slug', v_row.slug)
    );

    return jsonb_build_object('ok', true, 'title', row_to_json(v_row)::jsonb);
  end if;

  update public.user_titles t set
    slug = v_slug,
    name = v_name,
    description = nullif(trim(coalesce(p_description, '')), ''),
    name_i18n = coalesce(p_name_i18n, t.name_i18n),
    design = v_design,
    is_active = coalesce(p_is_active, t.is_active),
    selection_locked = coalesce(p_selection_locked, t.selection_locked),
    priority = coalesce(p_priority, t.priority),
    metadata = coalesce(p_metadata, t.metadata),
    version = t.version + 1,
    updated_by = v_uid,
    updated_at = now()
  where t.id = p_id and t.archived_at is null
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ünvan bulunamadı', 'error_code', 'not_found');
  end if;

  perform public.admin_audit_yaz(
    null, 'TITLE_UPDATED',
    'Ünvan güncellendi: ' || v_row.name,
    jsonb_build_object('title_id', v_row.id, 'version', v_row.version)
  );

  return jsonb_build_object('ok', true, 'title', row_to_json(v_row)::jsonb);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Slug zaten kullanılıyor', 'error_code', 'slug_taken');
end;
$$;

grant execute on function public.admin_user_title_kaydet(
  uuid, text, text, text, jsonb, jsonb, boolean, boolean, integer, jsonb
) to authenticated;

create or replace function public.admin_user_title_arsivle(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  update public.user_titles
  set archived_at = now(), is_active = false, updated_by = v_uid, updated_at = now(),
      version = version + 1
  where id = p_id and archived_at is null
  returning name into v_name;

  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'Ünvan bulunamadı', 'error_code', 'not_found');
  end if;

  -- Clear selections pointing at archived title
  update public.profiles set selected_title_id = null where selected_title_id = p_id;

  perform public.admin_audit_yaz(
    null, 'TITLE_ARCHIVED',
    'Ünvan arşivlendi: ' || v_name,
    jsonb_build_object('title_id', p_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_user_title_arsivle(uuid) to authenticated;

create or replace function public.admin_user_title_kopyala(p_id uuid, p_new_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_src public.user_titles%rowtype;
  v_name text;
  v_slug text;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  select * into v_src from public.user_titles where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ünvan bulunamadı', 'error_code', 'not_found');
  end if;

  v_name := coalesce(nullif(trim(p_new_name), ''), v_src.name || ' (kopya)');
  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  return public.admin_user_title_kaydet(
    null, v_slug, v_name, v_src.description, v_src.name_i18n, v_src.design,
    false, v_src.selection_locked, v_src.priority, v_src.metadata
  );
end;
$$;

grant execute on function public.admin_user_title_kopyala(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin list + detail
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_titles_liste(
  p_q text default null,
  p_filter text default 'all',
  p_sort text default 'newest',
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb)
      from (
        select
          t.*,
          (
            select count(*)::int from public.user_title_assignments a
            where a.title_id = t.id and a.revoked_at is null and a.is_active
              and a.starts_at <= now()
              and (a.expires_at is null or a.expires_at > now())
          ) as active_user_count,
          (
            select count(*)::int from public.user_title_assignments a
            where a.title_id = t.id
          ) as total_assignment_count
        from public.user_titles t
        where t.archived_at is null
          and (
            p_q is null or length(trim(p_q)) = 0
            or t.name ilike '%' || trim(p_q) || '%'
            or t.slug ilike '%' || trim(p_q) || '%'
          )
          and (
            coalesce(p_filter, 'all') = 'all'
            or (p_filter = 'active' and t.is_active)
            or (p_filter = 'inactive' and not t.is_active)
          )
        order by
          case when p_sort = 'name' then t.name end asc,
          case when p_sort = 'priority' then t.priority end desc,
          case when p_sort = 'most_assigned' then (
            select count(*) from public.user_title_assignments a where a.title_id = t.id and a.revoked_at is null
          ) end desc,
          t.created_at desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_user_titles_liste(text, text, text, integer, integer) to authenticated;

create or replace function public.admin_user_title_detay(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title jsonb;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  select row_to_json(t)::jsonb into v_title
  from public.user_titles t where t.id = p_id;

  if v_title is null then
    return jsonb_build_object('ok', false, 'error', 'Ünvan bulunamadı', 'error_code', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'title', v_title,
    'stats', jsonb_build_object(
      'active_users', (
        select count(*)::int from public.user_title_assignments a
        where a.title_id = p_id and a.revoked_at is null and a.is_active
          and a.starts_at <= now()
          and (a.expires_at is null or a.expires_at > now())
      ),
      'total_assignments', (
        select count(*)::int from public.user_title_assignments a where a.title_id = p_id
      ),
      'timed_assignments', (
        select count(*)::int from public.user_title_assignments a
        where a.title_id = p_id and a.expires_at is not null and a.revoked_at is null and a.is_active
      ),
      'selected_users', (
        select count(*)::int from public.profiles p where p.selected_title_id = p_id
      )
    )
  );
end;
$$;

grant execute on function public.admin_user_title_detay(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Assign / revoke / batch
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_title_ata(
  p_user_id uuid,
  p_title_id uuid,
  p_starts_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_set_selected boolean default true,
  p_selection_locked boolean default false,
  p_reason text default null,
  p_notify_user boolean default false,
  p_assignment_source text default 'ADMIN'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title public.user_titles%rowtype;
  v_asg public.user_title_assignments%rowtype;
  v_source text;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  if p_user_id is null or p_title_id is null then
    return jsonb_build_object('ok', false, 'error', 'Eksik parametre', 'error_code', 'invalid');
  end if;

  select * into v_title from public.user_titles
  where id = p_title_id and archived_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Ünvan yok', 'error_code', 'title_not_found');
  end if;
  if not v_title.is_active then
    return jsonb_build_object('ok', false, 'error', 'Ünvan pasif', 'error_code', 'title_inactive');
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    return jsonb_build_object('ok', false, 'error', 'Kullanıcı yok', 'error_code', 'user_not_found');
  end if;

  if p_expires_at is not null and p_expires_at <= coalesce(p_starts_at, now()) then
    return jsonb_build_object('ok', false, 'error', 'Bitiş başlangıçtan sonra olmalı', 'error_code', 'invalid_expiry');
  end if;

  v_source := upper(coalesce(p_assignment_source, 'ADMIN'));
  if v_source not in ('ADMIN','ACHIEVEMENT','EVENT','SYSTEM','AGENCY','CITY','COUNTRY') then
    v_source := 'ADMIN';
  end if;

  -- Soft-revoke previous active same title
  update public.user_title_assignments
  set is_active = false, revoked_at = now(), revoked_by = v_uid, updated_at = now()
  where user_id = p_user_id and title_id = p_title_id and revoked_at is null and is_active;

  insert into public.user_title_assignments (
    user_id, title_id, assigned_by, starts_at, expires_at,
    selection_locked, reason, notify_user, assignment_source
  ) values (
    p_user_id, p_title_id, v_uid,
    coalesce(p_starts_at, now()), p_expires_at,
    coalesce(p_selection_locked, false) or v_title.selection_locked,
    nullif(trim(coalesce(p_reason, '')), ''),
    coalesce(p_notify_user, false),
    v_source
  )
  returning * into v_asg;

  if coalesce(p_set_selected, true) then
    update public.profiles set selected_title_id = p_title_id, updated_at = now()
    where id = p_user_id;
  end if;

  perform public.admin_audit_yaz(
    p_user_id, 'TITLE_ASSIGNED',
    'Ünvan atandı: ' || v_title.name,
    jsonb_build_object(
      'title_id', p_title_id,
      'assignment_id', v_asg.id,
      'expires_at', p_expires_at,
      'selection_locked', v_asg.selection_locked
    )
  );

  -- Optional in-app notification
  if coalesce(p_notify_user, false) then
    begin
      insert into public.user_notifications (
        user_id, category, title, body, deep_link, payload, actor_id
      ) values (
        p_user_id,
        'title_received',
        'Yeni ünvan',
        'Yeni bir ünvan kazandın: ' || v_title.name,
        '/ayarlar/unvanlarim',
        jsonb_build_object(
          'title_id', p_title_id,
          'assignment_id', v_asg.id
        ),
        v_uid
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'assignment', row_to_json(v_asg)::jsonb);
end;
$$;

grant execute on function public.admin_user_title_ata(
  uuid, uuid, timestamptz, timestamptz, boolean, boolean, text, boolean, text
) to authenticated;

create or replace function public.admin_user_title_toplu_ata(
  p_user_ids uuid[],
  p_title_id uuid,
  p_starts_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_set_selected boolean default true,
  p_selection_locked boolean default false,
  p_reason text default null,
  p_notify_user boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ok int := 0;
  v_fail int := 0;
  v_res jsonb;
  v_ids uuid[];
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  v_ids := coalesce(p_user_ids, array[]::uuid[]);
  if array_length(v_ids, 1) is null or array_length(v_ids, 1) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Kullanıcı seçilmedi', 'error_code', 'empty');
  end if;
  if array_length(v_ids, 1) > 100 then
    return jsonb_build_object('ok', false, 'error', 'En fazla 100 kullanıcı', 'error_code', 'batch_limit');
  end if;

  foreach v_id in array v_ids loop
    v_res := public.admin_user_title_ata(
      v_id, p_title_id, p_starts_at, p_expires_at,
      p_set_selected, p_selection_locked, p_reason, p_notify_user, 'ADMIN'
    );
    if coalesce((v_res->>'ok')::boolean, false) then
      v_ok := v_ok + 1;
    else
      v_fail := v_fail + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'success_count', v_ok, 'fail_count', v_fail);
end;
$$;

grant execute on function public.admin_user_title_toplu_ata(
  uuid[], uuid, timestamptz, timestamptz, boolean, boolean, text, boolean
) to authenticated;

create or replace function public.admin_user_title_geri_al(
  p_assignment_id uuid default null,
  p_user_id uuid default null,
  p_title_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_asg public.user_title_assignments%rowtype;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  if p_assignment_id is not null then
    update public.user_title_assignments
    set is_active = false, revoked_at = now(), revoked_by = v_uid, updated_at = now()
    where id = p_assignment_id and revoked_at is null
    returning * into v_asg;
  elsif p_user_id is not null and p_title_id is not null then
    update public.user_title_assignments
    set is_active = false, revoked_at = now(), revoked_by = v_uid, updated_at = now()
    where user_id = p_user_id and title_id = p_title_id and revoked_at is null and is_active
    returning * into v_asg;
  else
    return jsonb_build_object('ok', false, 'error', 'Eksik parametre', 'error_code', 'invalid');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Atama bulunamadı', 'error_code', 'not_found');
  end if;

  -- Clear selection if it pointed to this title
  update public.profiles
  set selected_title_id = null, updated_at = now()
  where id = v_asg.user_id and selected_title_id = v_asg.title_id;

  perform public.admin_audit_yaz(
    v_asg.user_id, 'TITLE_REVOKED',
    'Ünvan geri alındı',
    jsonb_build_object('title_id', v_asg.title_id, 'assignment_id', v_asg.id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_user_title_geri_al(uuid, uuid, uuid) to authenticated;

create or replace function public.admin_user_title_atananlar(
  p_title_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb)
      from (
        select
          a.id as assignment_id,
          a.user_id,
          a.assigned_at,
          a.starts_at,
          a.expires_at,
          a.is_active,
          a.revoked_at,
          a.selection_locked,
          a.assignment_source,
          a.reason,
          p.display_name,
          p.username,
          p.avatar_url,
          p.public_user_id,
          (p.selected_title_id = a.title_id) as is_selected
        from public.user_title_assignments a
        join public.profiles p on p.id = a.user_id
        where a.title_id = p_title_id
        order by a.assigned_at desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_user_title_atananlar(uuid, integer, integer) to authenticated;

create or replace function public.admin_kullanici_unvanlari(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'error', 'Yetkisiz', 'error_code', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'selected_title_id', (select selected_title_id from public.profiles where id = p_user_id),
    'display_title_id', public.user_title_gorunen_id(p_user_id),
    'assignments', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.assigned_at desc)
      from (
        select
          a.*,
          t.name as title_name,
          t.slug as title_slug,
          t.design as title_design,
          t.is_active as title_is_active,
          (
            a.is_active and a.revoked_at is null
            and a.starts_at <= now()
            and (a.expires_at is null or a.expires_at > now())
            and t.is_active and t.archived_at is null
          ) as currently_valid
        from public.user_title_assignments a
        join public.user_titles t on t.id = a.title_id
        where a.user_id = p_user_id
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_kullanici_unvanlari(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- User: my titles + select
-- ---------------------------------------------------------------------------
create or replace function public.user_titles_benimkiler()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.user_titles_feature_on() then
    return jsonb_build_object('ok', true, 'enabled', false, 'items', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok', true,
    'enabled', true,
    'selected_title_id', (select selected_title_id from public.profiles where id = v_uid),
    'display_title_id', public.user_title_gorunen_id(v_uid),
    'items', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.priority desc, x.assigned_at desc)
      from (
        select
          a.id as assignment_id,
          a.title_id,
          a.assigned_at,
          a.starts_at,
          a.expires_at,
          a.selection_locked or t.selection_locked as selection_locked,
          a.assignment_source,
          t.name,
          t.slug,
          t.name_i18n,
          t.design,
          t.priority,
          t.version,
          (
            a.is_active and a.revoked_at is null
            and a.starts_at <= now()
            and (a.expires_at is null or a.expires_at > now())
            and t.is_active and t.archived_at is null
          ) as currently_valid,
          (a.expires_at is not null and a.expires_at <= now()) as expired
        from public.user_title_assignments a
        join public.user_titles t on t.id = a.title_id
        where a.user_id = v_uid
          and a.revoked_at is null
      ) x
      where x.currently_valid or x.expired
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.user_titles_benimkiler() to authenticated;

create or replace function public.user_title_sec(p_title_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_forced uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated', 'error_code', 'auth');
  end if;
  if not public.user_titles_feature_on() then
    return jsonb_build_object('ok', false, 'error', 'Özellik kapalı', 'error_code', 'feature_off');
  end if;

  -- Forced lock blocks user change
  select a.title_id into v_forced
  from public.user_title_assignments a
  join public.user_titles t on t.id = a.title_id
  where a.user_id = v_uid
    and a.is_active and a.revoked_at is null
    and a.starts_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and t.is_active and t.archived_at is null
    and (a.selection_locked or t.selection_locked)
  order by t.priority desc
  limit 1;

  if v_forced is not null then
    if p_title_id is distinct from v_forced then
      return jsonb_build_object('ok', false, 'error', 'Bu ünvan değiştirilemez', 'error_code', 'selection_locked');
    end if;
  end if;

  -- Hide title
  if p_title_id is null then
    if v_forced is not null then
      return jsonb_build_object('ok', false, 'error', 'Zorunlu ünvan gizlenemez', 'error_code', 'selection_locked');
    end if;
    update public.profiles set selected_title_id = null, updated_at = now() where id = v_uid;
    return jsonb_build_object('ok', true, 'selected_title_id', null);
  end if;

  if not public.user_title_kullaniciya_aktif_mi(v_uid, p_title_id) then
    return jsonb_build_object('ok', false, 'error', 'Bu ünvana sahip değilsin', 'error_code', 'not_owned');
  end if;

  update public.profiles set selected_title_id = p_title_id, updated_at = now() where id = v_uid;
  return jsonb_build_object('ok', true, 'selected_title_id', p_title_id);
end;
$$;

grant execute on function public.user_title_sec(uuid) to authenticated;

-- Batch resolve display titles for a set of users (feed/comments N+1 avoidance)
create or replace function public.user_titles_batch_gorunen(p_user_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '{}'::jsonb;
  end if;
  if not public.user_titles_feature_on() then
    return '{}'::jsonb;
  end if;

  return coalesce((
    select jsonb_object_agg(u::text, public.user_title_gorunen_id(u))
    from unnest(coalesce(p_user_ids, array[]::uuid[])) as u
  ), '{}'::jsonb);
end;
$$;

grant execute on function public.user_titles_batch_gorunen(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Extend durum RPCs with selected_title_id (display-resolved)
-- ---------------------------------------------------------------------------
create or replace function public.durum_akisi(p_limit integer default 40, p_before timestamp with time zone default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        s.id,
        s.user_id,
        s.media_type,
        s.media_url,
        s.caption,
        s.like_count,
        s.comment_count,
        coalesce(s.gift_count, 0) as gift_count,
        coalesce(s.view_count, 0) as view_count,
        coalesce(s.share_count, 0) as share_count,
        coalesce(s.post_kind, 'media') as post_kind,
        coalesce(s.payload, '{}'::jsonb) as payload,
        s.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        public.user_title_gorunen_id(s.user_id) as selected_title_id,
        exists(
          select 1 from public.status_likes l
          where l.status_id = s.id and l.user_id = v_uid
        ) as liked_by_me,
        (s.user_id = v_uid) as is_mine
      from public.status_posts s
      join public.profiles p on p.id = s.user_id
      where s.deleted_at is null
        and p.deleted_at is null
        and p.banned_at is null
        and public.takip_icerik_gorunur_mu(v_uid, s.user_id)
        and (p_before is null or s.created_at < p_before)
      order by s.created_at desc
      limit least(greatest(coalesce(p_limit, 40), 1), 80)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_akisi_takip(p_limit integer default 40, p_before timestamp with time zone default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        s.id,
        s.user_id,
        s.media_type,
        s.media_url,
        s.caption,
        s.like_count,
        s.comment_count,
        coalesce(s.gift_count, 0) as gift_count,
        coalesce(s.view_count, 0) as view_count,
        coalesce(s.share_count, 0) as share_count,
        coalesce(s.post_kind, 'media') as post_kind,
        coalesce(s.payload, '{}'::jsonb) as payload,
        s.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        public.user_title_gorunen_id(s.user_id) as selected_title_id,
        exists(
          select 1 from public.status_likes l
          where l.status_id = s.id and l.user_id = v_uid
        ) as liked_by_me,
        false as is_mine
      from public.follows f
      join public.status_posts s
        on s.user_id = f.following_id
       and s.deleted_at is null
       and (p_before is null or s.created_at < p_before)
      join public.profiles p on p.id = s.user_id
      where f.follower_id = v_uid
        and p.deleted_at is null
        and p.banned_at is null
        and not public.kullanicilar_engelli_mi(v_uid, s.user_id)
      order by s.created_at desc
      limit least(greatest(coalesce(p_limit, 40), 1), 80)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_yorumlari(p_status_id uuid, p_limit integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at asc)
    from (
      select
        c.id,
        c.user_id,
        c.body,
        c.parent_id,
        c.media_url,
        c.like_count,
        c.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        public.user_title_gorunen_id(c.user_id) as selected_title_id,
        (c.user_id = v_uid) as is_mine,
        exists (
          select 1 from public.status_comment_likes l
          where l.comment_id = c.id and l.user_id = v_uid
        ) as liked_by_me
      from public.status_comments c
      join public.profiles p on p.id = c.user_id
      where c.status_id = p_status_id and c.deleted_at is null
      order by c.created_at asc
      limit least(greatest(coalesce(p_limit, 60), 1), 200)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_detay(p_status_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select s.user_id into v_owner
  from public.status_posts s
  where s.id = p_status_id and s.deleted_at is null;
  if v_owner is null then raise exception 'Durum yok'; end if;
  if not public.takip_icerik_gorunur_mu(v_uid, v_owner) then
    raise exception 'Durum yok';
  end if;

  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'media_type', s.media_type,
    'media_url', s.media_url,
    'caption', s.caption,
    'like_count', s.like_count,
    'comment_count', s.comment_count,
    'gift_count', coalesce(s.gift_count, 0),
    'view_count', coalesce(s.view_count, 0),
    'share_count', coalesce(s.share_count, 0),
    'post_kind', coalesce(s.post_kind, 'media'),
    'payload', coalesce(s.payload, '{}'::jsonb),
    'created_at', s.created_at,
    'display_name', coalesce(p.display_name, p.username, 'Kullanıcı'),
    'username', p.username,
    'avatar_url', p.avatar_url,
    'public_user_id', p.public_user_id,
    'is_verified', coalesce(p.is_verified, false),
    'selected_title_id', public.user_title_gorunen_id(s.user_id),
    'liked_by_me', exists(
      select 1 from public.status_likes l
      where l.status_id = s.id and l.user_id = v_uid
    ),
    'is_mine', (s.user_id = v_uid)
  )
  into v_row
  from public.status_posts s
  join public.profiles p on p.id = s.user_id
  where s.id = p_status_id and s.deleted_at is null;

  if v_row is null then raise exception 'Durum yok'; end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime publication (scoped — clients filter by user_id / id)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.user_titles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.user_title_assignments;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Seed starter titles (data — not hard-coded in app)
-- ---------------------------------------------------------------------------
insert into public.user_titles (slug, name, description, name_i18n, design, is_active, selection_locked, priority)
select * from (values
  (
    'kurucu',
    'Kurucu',
    'Platform kurucu ünvanı',
    '{"tr":"Kurucu","en":"Founder","es":"Fundador","pt":"Fundador","ar":"المؤسس","fr":"Fondateur","fil":"Founder"}'::jsonb,
    '{
      "shape":"PILL",
      "backgroundType":"LINEAR_GRADIENT",
      "backgroundColor":"#F6C453",
      "backgroundColor2":"#B98217",
      "gradientDirection":"LEFT_RIGHT",
      "textColor":"#FFF4CE",
      "borderEnabled":true,
      "borderColor":"#FFD976",
      "borderWidth":1,
      "borderOpacity":0.9,
      "glowEnabled":true,
      "glowColor":"#F6C453",
      "glowIntensity":"soft",
      "animationType":"SOFT_GLOW",
      "fontWeight":"semibold",
      "iconType":"library",
      "iconValue":"crown",
      "iconPosition":"LEFT",
      "size":"NORMAL",
      "paddingH":8,
      "paddingV":3
    }'::jsonb,
    true, true, 1000
  ),
  (
    'moderator',
    'Moderatör',
    'Resmî moderatör ünvanı (görsel — yetki vermez)',
    '{"tr":"Moderatör","en":"Moderator","es":"Moderador","pt":"Moderador","ar":"مشرف","fr":"Modérateur","fil":"Moderator"}'::jsonb,
    '{
      "shape":"SOFT_PILL",
      "backgroundType":"LINEAR_GRADIENT",
      "backgroundColor":"#7C3AED",
      "backgroundColor2":"#4C1D95",
      "gradientDirection":"LEFT_RIGHT",
      "textColor":"#EDE9FE",
      "borderEnabled":true,
      "borderColor":"#A78BFA",
      "borderWidth":1,
      "borderOpacity":0.35,
      "glowEnabled":true,
      "glowColor":"#8B5CF6",
      "glowIntensity":"soft",
      "animationType":"NONE",
      "fontWeight":"semibold",
      "iconType":"library",
      "iconValue":"shield",
      "iconPosition":"LEFT",
      "size":"NORMAL",
      "paddingH":8,
      "paddingV":3
    }'::jsonb,
    true, true, 800
  ),
  (
    'host',
    'Host',
    'Host ünvanı (görsel — oda yetkisi vermez)',
    '{"tr":"Host","en":"Host","es":"Host","pt":"Host","ar":"مضيف","fr":"Hôte","fil":"Host"}'::jsonb,
    '{
      "shape":"SOFT_PILL",
      "backgroundType":"LINEAR_GRADIENT",
      "backgroundColor":"#EC4899",
      "backgroundColor2":"#9D174D",
      "gradientDirection":"LEFT_RIGHT",
      "textColor":"#FCE7F3",
      "borderEnabled":false,
      "borderColor":"#F9A8D4",
      "borderWidth":1,
      "borderOpacity":1,
      "glowEnabled":false,
      "glowColor":"#EC4899",
      "glowIntensity":"off",
      "animationType":"NONE",
      "fontWeight":"semibold",
      "iconType":"library",
      "iconValue":"mic",
      "iconPosition":"LEFT",
      "size":"NORMAL",
      "paddingH":8,
      "paddingV":3
    }'::jsonb,
    true, false, 500
  ),
  (
    'vip',
    'VIP',
    'VIP ünvanı',
    '{"tr":"VIP","en":"VIP","es":"VIP","pt":"VIP","ar":"VIP","fr":"VIP","fil":"VIP"}'::jsonb,
    '{
      "shape":"PILL",
      "backgroundType":"LINEAR_GRADIENT",
      "backgroundColor":"#67E8F9",
      "backgroundColor2":"#0891B2",
      "gradientDirection":"DIAGONAL",
      "textColor":"#ECFEFF",
      "borderEnabled":true,
      "borderColor":"#A5F3FC",
      "borderWidth":1,
      "borderOpacity":0.5,
      "glowEnabled":true,
      "glowColor":"#22D3EE",
      "glowIntensity":"medium",
      "animationType":"SHIMMER",
      "fontWeight":"bold",
      "iconType":"library",
      "iconValue":"diamond",
      "iconPosition":"LEFT",
      "size":"NORMAL",
      "paddingH":8,
      "paddingV":3
    }'::jsonb,
    true, false, 600
  )
) as v(slug, name, description, name_i18n, design, is_active, selection_locked, priority)
where not exists (select 1 from public.user_titles where slug = v.slug);

-- Sanitize seeded designs through validator (ensures consistent shape)
do $$
declare
  r record;
begin
  for r in select id, design from public.user_titles where slug in ('kurucu','moderator','host','vip') loop
    update public.user_titles
    set design = public._user_title_design_sanitize(r.design)
    where id = r.id;
  end loop;
end $$;
