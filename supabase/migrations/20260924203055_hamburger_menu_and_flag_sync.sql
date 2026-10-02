-- Hamburger menü remote config + public flag snapshot RPC

create table if not exists public.hamburger_menu_items (
  item_key text primary key,
  enabled boolean not null default true,
  sort_order int not null default 100,
  group_id text not null default 'kesfet'
    check (group_id in ('yayin', 'kesfet', 'hesap', 'yardim', 'yonetim')),
  updated_at timestamptz not null default now()
);

alter table public.hamburger_menu_items enable row level security;

drop policy if exists "Hamburger menu readable" on public.hamburger_menu_items;
create policy "Hamburger menu readable"
  on public.hamburger_menu_items for select to authenticated
  using (true);

drop policy if exists "Hamburger menu admin write" on public.hamburger_menu_items;
create policy "Hamburger menu admin write"
  on public.hamburger_menu_items for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

grant select on public.hamburger_menu_items to authenticated;
grant select, insert, update, delete on public.hamburger_menu_items to authenticated;

-- Seed: mevcut drawer anahtarları
insert into public.hamburger_menu_items (item_key, enabled, sort_order, group_id) values
  ('live', true, 10, 'yayin'),
  ('pk', true, 20, 'yayin'),
  ('agency_manage', true, 30, 'hesap'),
  ('host', true, 40, 'hesap'),
  ('ranks', true, 50, 'kesfet'),
  ('ulke_ligi', true, 60, 'kesfet'),
  ('city_league', true, 70, 'kesfet'),
  ('official_city_rooms', true, 80, 'kesfet'),
  ('events', true, 90, 'kesfet'),
  ('creators_for_you', true, 100, 'kesfet'),
  ('ai_muzik', true, 110, 'kesfet'),
  ('kisiler', true, 120, 'kesfet'),
  ('fikir', true, 130, 'yardim'),
  ('destek', true, 140, 'yardim'),
  ('bildir', true, 150, 'yardim'),
  ('admin_oyun_test', true, 160, 'yonetim'),
  ('admin_panel', true, 170, 'yonetim')
on conflict (item_key) do nothing;

-- Public snapshot — authenticated herkes okur (UI canlı sync)
create or replace function public.ozellik_bayraklari_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'flags', coalesce((
      select jsonb_object_agg(key, enabled) from public.feature_flags
    ), '{}'::jsonb),
    'kills', coalesce((
      select jsonb_object_agg(key, active) from public.kill_switches
    ), '{}'::jsonb),
    'updated_at', now()
  );
end;
$$;

grant execute on function public.ozellik_bayraklari_snapshot() to authenticated;
grant execute on function public.ozellik_bayraklari_snapshot() to anon;

create or replace function public.hamburger_menu_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'item_key', item_key,
        'enabled', enabled,
        'sort_order', sort_order,
        'group_id', group_id
      )
      order by sort_order asc, item_key asc
    )
    from public.hamburger_menu_items
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.hamburger_menu_get() to authenticated;

create or replace function public.admin_hamburger_menu_kaydet(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_key text;
  v_enabled boolean;
  v_order int;
  v_group text;
  v_count int := 0;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items array required';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_key := nullif(trim(v_item->>'item_key'), '');
    if v_key is null then
      continue;
    end if;
    v_enabled := coalesce((v_item->>'enabled')::boolean, true);
    v_order := coalesce((v_item->>'sort_order')::int, 100);
    v_group := coalesce(nullif(trim(v_item->>'group_id'), ''), 'kesfet');
    if v_group not in ('yayin', 'kesfet', 'hesap', 'yardim', 'yonetim') then
      v_group := 'kesfet';
    end if;

    insert into public.hamburger_menu_items (item_key, enabled, sort_order, group_id, updated_at)
    values (v_key, v_enabled, v_order, v_group, now())
    on conflict (item_key) do update set
      enabled = excluded.enabled,
      sort_order = excluded.sort_order,
      group_id = excluded.group_id,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  perform public.admin_audit_yaz(
    null,
    'hamburger_menu',
    'Hamburger menü güncellendi (' || v_count || ' öğe)',
    jsonb_build_object('count', v_count)
  );

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.admin_hamburger_menu_kaydet(jsonb) to authenticated;

-- Realtime için publication (yoksa ekle)
do $$
begin
  begin
    alter publication supabase_realtime add table public.feature_flags;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.kill_switches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.hamburger_menu_items;
  exception when duplicate_object then null;
  end;
end $$;
