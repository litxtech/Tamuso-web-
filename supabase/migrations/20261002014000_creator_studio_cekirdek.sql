-- Tamuso Studio çekirdeği. Varsayılan kapalı. Cüzdan, yayın ve 3D üretimi bu migration'da yok.

insert into public.feature_flags (key, enabled, description) values
  ('studio_enabled', false, 'Tamuso Studio giriş kapısı'),
  ('studio_menu_visible', false, 'Hamburger menüde Tamuso Studio'),
  ('new_game_creation_enabled', false, 'Yeni oyun taslağı'),
  ('game_testing_enabled', false, 'Oyun test oturumu (bu sürümde runtime yok)'),
  ('game_submission_enabled', false, 'İncelemeye gönderme'),
  ('game_publishing_enabled', false, 'Yayınlama'),
  ('ai_generation_enabled', false, 'Oyun planı üretimi'),
  ('meshy_enabled', false, '3D model üretimi'),
  ('elevenlabs_enabled', false, 'Ses üretimi'),
  ('playcanvas_enabled', false, 'Oyun önizleme motoru'),
  ('creator_rewards_enabled', false, 'Creator ödülü')
on conflict (key) do nothing;

create table if not exists public.creator_studio_terms (
  id int primary key default 1 check (id = 1),
  version int not null default 1,
  bodies jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.creator_studio_terms (id, version, bodies)
values (
  1,
  1,
  jsonb_build_object(
    'tr', 'Tamuso Studio ile yapay zekâ destekli araçları kullanarak kendi oyun taslaklarını tasarlayabilir ve önizleme hazır olduğunda görebilirsin. Yayın öncesi içerik incelenebilir. Platform içi sunum koşulları güncel Tamuso Studio şartlarına tabidir. Ödül veya gelir paylaşımı garanti değildir.',
    'en', 'With Tamuso Studio you can design your own game drafts with AI-assisted tools and preview them when preview is available. Games may be reviewed before publishing. In-platform presentation follows the current Tamuso Studio terms. Rewards or revenue share are not guaranteed.',
    'es', 'Con Tamuso Studio puedes diseñar borradores de juegos con herramientas de IA y ver una vista previa cuando exista. Los juegos pueden revisarse antes de publicarse. La presentación en la plataforma sigue las condiciones vigentes. Las recompensas no están garantizadas.',
    'pt', 'No Tamuso Studio você pode criar rascunhos de jogos com ferramentas de IA e ver uma prévia quando ela existir. Os jogos podem ser revisados antes da publicação. A apresentação na plataforma segue os termos vigentes. Recompensas não são garantidas.',
    'ar', 'في Tamuso Studio يمكنك تصميم مسودات ألعاب بأدوات مدعومة بالذكاء الاصطناعي ومعاينتها عند توفر المعاينة. قد تُراجع الألعاب قبل النشر. يخضع العرض داخل المنصة لشروط الاستوديو الحالية. المكافآت أو مشاركة الإيراد ليست مضمونة.',
    'fr', 'Avec Tamuso Studio vous pouvez concevoir des brouillons de jeux avec des outils d’IA et les prévisualiser lorsque l’aperçu existe. Les jeux peuvent être examinés avant publication. La présentation suit les conditions en vigueur. Les récompenses ne sont pas garanties.',
    'fil', 'Sa Tamuso Studio maaari kang magdisenyo ng game draft gamit ang AI tools at i-preview ito kapag available na ang preview. Maaaring suriin ang laro bago i-publish. Sumusunod ang presentasyon sa kasalukuyang terms. Hindi garantisado ang reward o revenue share.'
  )
)
on conflict (id) do nothing;

create table if not exists public.creator_studio_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  terms_version int not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version)
);

create table if not exists public.creator_games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  prompt text not null default '',
  options jsonb not null default '{}'::jsonb,
  plan jsonb,
  status text not null default 'draft' check (status = 'draft'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_games_creator_idx
  on public.creator_games (creator_id, updated_at desc);

create table if not exists public.creator_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.creator_games(id) on delete cascade,
  kind text not null default 'GAME_PLAN',
  status text not null check (status in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists creator_studio_jobs_user_idx
  on public.creator_studio_jobs (user_id, created_at desc);

create unique index if not exists creator_studio_jobs_running_one
  on public.creator_studio_jobs (game_id)
  where status = 'RUNNING';

alter table public.creator_studio_terms enable row level security;
alter table public.creator_studio_acceptances enable row level security;
alter table public.creator_games enable row level security;
alter table public.creator_studio_jobs enable row level security;

drop policy if exists creator_games_kendi on public.creator_games;
create policy creator_games_kendi
  on public.creator_games
  for select
  to authenticated
  using (creator_id = auth.uid());

revoke all on public.creator_studio_terms from public, anon, authenticated;
revoke all on public.creator_studio_acceptances from public, anon, authenticated;
revoke all on public.creator_studio_jobs from public, anon, authenticated;
grant select on public.creator_games to authenticated;

create or replace function public.creator_studio_bayrak(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.feature_flags where key = p_key), false);
$$;

revoke all on function public.creator_studio_bayrak(text) from public, anon, authenticated;

create or replace function public.creator_studio_durum(p_dil text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_terms public.creator_studio_terms%rowtype;
  v_dil text := lower(split_part(coalesce(p_dil, 'en'), '-', 1));
  v_metin text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_terms from public.creator_studio_terms where id = 1;
  v_metin := coalesce(
    v_terms.bodies ->> v_dil,
    v_terms.bodies ->> 'en',
    v_terms.bodies ->> 'tr',
    ''
  );
  return jsonb_build_object(
    'studio_enabled', public.creator_studio_bayrak('studio_enabled'),
    'new_game', public.creator_studio_bayrak('new_game_creation_enabled'),
    'ai', public.creator_studio_bayrak('ai_generation_enabled'),
    'meshy', public.creator_studio_bayrak('meshy_enabled'),
    'audio', public.creator_studio_bayrak('elevenlabs_enabled'),
    'preview', public.creator_studio_bayrak('playcanvas_enabled'),
    'rewards', public.creator_studio_bayrak('creator_rewards_enabled'),
    'terms_version', coalesce(v_terms.version, 1),
    'accepted', exists (
      select 1 from public.creator_studio_acceptances a
      where a.user_id = v_uid and a.terms_version = v_terms.version
    ),
    'terms', v_metin
  );
end;
$$;

revoke all on function public.creator_studio_durum(text) from public, anon;
grant execute on function public.creator_studio_durum(text) to authenticated;

create or replace function public.creator_studio_kabul_et()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ver int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then
    raise exception 'STUDIO_CLOSED';
  end if;
  select version into v_ver from public.creator_studio_terms where id = 1;
  insert into public.creator_studio_acceptances (user_id, terms_version)
  values (v_uid, v_ver)
  on conflict (user_id, terms_version) do nothing;
  return jsonb_build_object('ok', true, 'terms_version', v_ver);
end;
$$;

revoke all on function public.creator_studio_kabul_et() from public, anon;
grant execute on function public.creator_studio_kabul_et() to authenticated;

create or replace function public.creator_oyun_kaydet(
  p_id uuid,
  p_prompt text,
  p_options jsonb,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ver int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then
    raise exception 'STUDIO_CLOSED';
  end if;
  select version into v_ver from public.creator_studio_terms where id = 1;
  if not exists (
    select 1 from public.creator_studio_acceptances a
    where a.user_id = v_uid and a.terms_version = v_ver
  ) then
    raise exception 'TERMS_REQUIRED';
  end if;

  if p_id is null then
    if not public.creator_studio_bayrak('new_game_creation_enabled') then
      raise exception 'CREATE_DISABLED';
    end if;
    insert into public.creator_games (creator_id, title, prompt, options)
    values (
      v_uid,
      left(trim(coalesce(p_title, '')), 80),
      left(trim(coalesce(p_prompt, '')), 2000),
      coalesce(p_options, '{}'::jsonb)
    )
    returning id into v_id;
  else
    update public.creator_games
    set
      title = left(trim(coalesce(p_title, title)), 80),
      prompt = left(trim(coalesce(p_prompt, prompt)), 2000),
      options = coalesce(p_options, options),
      updated_at = now()
    where id = p_id and creator_id = v_uid
    returning id into v_id;
    if v_id is null then raise exception 'Forbidden'; end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.creator_oyun_kaydet(uuid, text, jsonb, text) from public, anon;
grant execute on function public.creator_oyun_kaydet(uuid, text, jsonb, text) to authenticated;

create or replace function public.creator_oyunlarim()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then
    raise exception 'STUDIO_CLOSED';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.updated_at desc)
    from (
      select g.id, g.title, g.prompt, g.status, g.updated_at, (g.plan is not null) as has_plan
      from public.creator_games g
      where g.creator_id = auth.uid()
      order by g.updated_at desc
      limit 40
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.creator_oyunlarim() from public, anon;
grant execute on function public.creator_oyunlarim() to authenticated;

create or replace function public.creator_oyun_oku(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_row from public.creator_games where id = p_id and creator_id = auth.uid();
  if v_row.id is null then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'prompt', v_row.prompt,
    'options', v_row.options,
    'plan', v_row.plan,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.creator_oyun_oku(uuid) from public, anon;
grant execute on function public.creator_oyun_oku(uuid) to authenticated;

create or replace function public.creator_studio_plan_baslat(p_game_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_bugun int;
begin
  if p_user_id is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled')
     or not public.creator_studio_bayrak('ai_generation_enabled') then
    raise exception 'AI_DISABLED';
  end if;
  if not exists (
    select 1 from public.creator_games g
    where g.id = p_game_id and g.creator_id = p_user_id
  ) then
    raise exception 'Forbidden';
  end if;
  if exists (
    select 1 from public.creator_studio_jobs j
    where j.game_id = p_game_id and j.status = 'RUNNING'
  ) then
    raise exception 'ALREADY_RUNNING';
  end if;
  select count(*)::int into v_bugun
  from public.creator_studio_jobs j
  where j.user_id = p_user_id
    and j.kind = 'GAME_PLAN'
    and j.created_at > now() - interval '1 day';
  if v_bugun >= 15 then
    raise exception 'QUOTA';
  end if;
  insert into public.creator_studio_jobs (user_id, game_id, kind, status)
  values (p_user_id, p_game_id, 'GAME_PLAN', 'RUNNING')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.creator_studio_plan_baslat(uuid, uuid) from public, anon, authenticated;
grant execute on function public.creator_studio_plan_baslat(uuid, uuid) to service_role;

create or replace function public.creator_studio_plan_bitir(
  p_job_id uuid,
  p_user_id uuid,
  p_plan jsonb,
  p_hata text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.creator_studio_jobs%rowtype;
  v_baslik text;
begin
  select * into v_job from public.creator_studio_jobs where id = p_job_id and user_id = p_user_id;
  if v_job.id is null then raise exception 'Forbidden'; end if;

  if p_plan is null then
    update public.creator_studio_jobs
    set status = 'FAILED', error_code = left(coalesce(p_hata, 'FAILED'), 40), finished_at = now()
    where id = p_job_id;
    return;
  end if;

  v_baslik := left(trim(coalesce(p_plan->>'title', '')), 80);
  update public.creator_games
  set plan = p_plan, title = case when v_baslik = '' then title else v_baslik end, updated_at = now()
  where id = v_job.game_id and creator_id = p_user_id;

  update public.creator_studio_jobs
  set status = 'COMPLETED', finished_at = now()
  where id = p_job_id;
end;
$$;

revoke all on function public.creator_studio_plan_bitir(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.creator_studio_plan_bitir(uuid, uuid, jsonb, text) to service_role;
