-- Admin oyun aç/kapat: uygulamanın listelediği durum (game_control_configs) ile
-- bahis/spin kapısı (feature_flags, fruit_wheel_policy) aynı işlemde değişir.

create or replace function public.oyun_bayrak_anahtari(p_game_code text)
returns text
language sql
immutable
as $$
  select case p_game_code
    when 'fruit_wheel' then 'fruit_wheel_enabled'
    when 'storm_king' then 'storm_king_enabled'
    when 'zeus' then 'zeus_enabled'
    when 'nox_reels' then 'nox_reels_enabled'
    when 'kozmik_kaskad' then 'kozmik_kaskad_enabled'
  end
$$;

create or replace function public.admin_oyun_gorunurluk_ayarla(
  p_game_code text,
  p_acik boolean,
  p_reason text default null
)
returns public.game_control_configs
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.game_control_configs%rowtype;
  v_new public.game_control_configs%rowtype;
  v_bayrak text := public.oyun_bayrak_anahtari(p_game_code);
begin
  if v_uid is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  if p_acik is null then
    raise exception 'p_acik required';
  end if;

  select * into v_old from public.game_control_configs where game_code = p_game_code for update;
  if not found then raise exception 'Config not found'; end if;

  update public.game_control_configs set
    is_enabled = p_acik,
    mode = case
      when not p_acik then 'MAINTENANCE'
      when mode = 'MAINTENANCE' then 'NORMAL'
      else mode
    end,
    updated_by = v_uid,
    updated_at = now()
  where game_code = p_game_code
  returning * into v_new;

  if v_bayrak is not null then
    update public.feature_flags set enabled = p_acik, updated_at = now() where key = v_bayrak;
  end if;

  if p_game_code = 'fruit_wheel' then
    update public.fruit_wheel_policy
    set game_enabled = p_acik, updated_at = now(), updated_by = v_uid
    where id = 1;
  end if;

  insert into public.game_admin_audit_logs (admin_user_id, game_code, action, old_value, new_value, reason)
  values (
    v_uid, p_game_code, case when p_acik then 'enable' else 'disable' end,
    to_jsonb(v_old), to_jsonb(v_new), p_reason
  );

  return v_new;
end;
$$;

revoke all on function public.admin_oyun_gorunurluk_ayarla(text, boolean, text) from public, anon;
grant execute on function public.admin_oyun_gorunurluk_ayarla(text, boolean, text) to authenticated;

-- Her oyun için uygulamanın gördüğü ve sunucunun uyguladığı durum.
create or replace function public.admin_oyun_kapi_durumu()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'game_code', c.game_code,
      'liste_acik', c.is_enabled and c.mode <> 'MAINTENANCE',
      'bayrak', b.key,
      'bayrak_acik', b.enabled,
      'politika_acik', case when c.game_code = 'fruit_wheel'
        then (select p.game_enabled from public.fruit_wheel_policy p where p.id = 1)
      end
    ) order by c.game_code)
    from public.game_control_configs c
    left join public.feature_flags b on b.key = public.oyun_bayrak_anahtari(c.game_code)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_oyun_kapi_durumu() from public, anon;
grant execute on function public.admin_oyun_kapi_durumu() to authenticated;

-- Fruit Wheel ekranındaki anahtar da modu senkron tutsun; aksi halde
-- MAINTENANCE'ta kalan oyun açılsa bile uygulamada görünmez.
create or replace function public.fruit_wheel_admin_set_enabled(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_old boolean;
begin
  if not public.fruit_wheel_admin_mi() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select game_enabled into v_old from public.fruit_wheel_policy where id = 1;
  update public.fruit_wheel_policy set game_enabled = coalesce(p_enabled, false), updated_at = now(), updated_by = auth.uid() where id = 1;
  update public.game_control_configs set
    is_enabled = coalesce(p_enabled, false),
    mode = case
      when not coalesce(p_enabled, false) then 'MAINTENANCE'
      when mode = 'MAINTENANCE' then 'NORMAL'
      else mode
    end,
    updated_at = now()
  where game_code = 'fruit_wheel';
  update public.feature_flags set enabled = coalesce(p_enabled, false), updated_at = now() where key = 'fruit_wheel_enabled';
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value) values (auth.uid(), 'game_enabled', jsonb_build_object('enabled', v_old), jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true);
end; $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_control_configs'
  ) then
    alter publication supabase_realtime add table public.game_control_configs;
  end if;
end $$;
