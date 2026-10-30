-- Ortak çıkış planı.
-- Yeni oyun: game_cikis_oyun + game_cikis_oge satırı ekle.
-- tur = tek  → sonuç anında public.game_cikis_cek(kod, haric, izin)
-- tur = carpan → game_cikis_storm_baslat / game_cikis_storm_bitir
-- Admin listesi bu tablodan gelir; yeni satır panelde kendiliğinden görünür.

create table if not exists public.game_cikis_oyun (
  game_code text primary key,
  ad text not null,
  tur text not null check (tur in ('tek', 'carpan')),
  aciklama text not null,
  carpan_bps integer,
  tekrar_engeli boolean not null default false,
  sira integer not null default 0,
  aktif boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint game_cikis_oyun_bps check (
    carpan_bps is null or (carpan_bps >= 0 and carpan_bps <= 3000)
  )
);

create table if not exists public.game_cikis_oge (
  game_code text not null references public.game_cikis_oyun (game_code),
  anahtar text not null,
  ad text not null,
  agirlik integer not null check (agirlik >= 0 and agirlik <= 100000),
  sira integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_code, anahtar)
);

create table if not exists public.game_cikis_kural (
  id uuid primary key default gen_random_uuid(),
  game_code text not null,
  anahtar text not null,
  tarih date,
  hafta_gunu smallint check (hafta_gunu between 1 and 7),
  saat_bas smallint not null check (saat_bas between 0 and 23),
  saat_bit smallint not null check (saat_bit between 1 and 24),
  agirlik integer not null check (agirlik >= 0 and agirlik <= 100000),
  en_fazla integer check (en_fazla is null or (en_fazla >= 0 and en_fazla <= 100000)),
  kullanilan integer not null default 0 check (kullanilan >= 0),
  sayac_gun date,
  aktif boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_cikis_kural_saat check (saat_bit > saat_bas),
  constraint game_cikis_kural_oge
    foreign key (game_code, anahtar)
    references public.game_cikis_oge (game_code, anahtar)
);

create table if not exists public.game_cikis_sira (
  id uuid primary key default gen_random_uuid(),
  game_code text not null,
  konum integer not null,
  anahtar text not null,
  rezerv_token uuid,
  rezerv_bitis timestamptz,
  tuketildi_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint game_cikis_sira_oge
    foreign key (game_code, anahtar)
    references public.game_cikis_oge (game_code, anahtar)
);

create index if not exists game_cikis_sira_bekleyen_idx
  on public.game_cikis_sira (game_code, konum, created_at)
  where tuketildi_at is null;

create index if not exists game_cikis_kural_oyun_idx
  on public.game_cikis_kural (game_code)
  where aktif;

alter table public.game_cikis_oyun enable row level security;
alter table public.game_cikis_oge enable row level security;
alter table public.game_cikis_kural enable row level security;
alter table public.game_cikis_sira enable row level security;

revoke all on public.game_cikis_oyun from anon, authenticated;
revoke all on public.game_cikis_oge from anon, authenticated;
revoke all on public.game_cikis_kural from anon, authenticated;
revoke all on public.game_cikis_sira from anon, authenticated;

insert into public.game_cikis_oyun (game_code, ad, tur, aciklama, carpan_bps, tekrar_engeli, sira)
values
  (
    'fruit_wheel',
    'Meyve',
    'tek',
    'Her turda bir meyve çıkar. Sıra doluysa listedeki meyve kesin gelir. Sıra bitince saat kuralı, o da yoksa normal sıklık seçer.',
    null,
    true,
    1
  ),
  (
    'storm_king',
    'Fırtına',
    'carpan',
    'Çarpan küresi, verdiğin yüzdeye göre çıkar. Değer sıradan gelir; sıra boşsa saat kuralı ve normal sıklık seçer. Yüzdeyi düşürmek büyük kazancı seyrekleştirir.',
    350,
    false,
    2
  )
on conflict (game_code) do update set
  ad = excluded.ad,
  tur = excluded.tur,
  aciklama = excluded.aciklama,
  tekrar_engeli = excluded.tekrar_engeli,
  sira = excluded.sira;

insert into public.game_cikis_oge (game_code, anahtar, ad, agirlik, sira, meta)
values
  ('fruit_wheel', 'cherry', 'Kiraz', 120, 1, '{}'::jsonb),
  ('fruit_wheel', 'lemon', 'Limon', 120, 2, '{}'::jsonb),
  ('fruit_wheel', 'orange', 'Portakal', 120, 3, '{}'::jsonb),
  ('fruit_wheel', 'watermelon', 'Karpuz', 120, 4, '{}'::jsonb),
  ('fruit_wheel', 'grape', 'Üzüm', 60, 5, '{}'::jsonb),
  ('fruit_wheel', 'strawberry', 'Çilek', 40, 6, '{}'::jsonb),
  ('fruit_wheel', 'pineapple', 'Ananas', 24, 7, '{}'::jsonb),
  ('fruit_wheel', 'kiwi', 'Kivi', 15, 8, '{}'::jsonb),
  ('storm_king', '2', '×2', 300, 1, '{"deger":2}'::jsonb),
  ('storm_king', '3', '×3', 220, 2, '{"deger":3}'::jsonb),
  ('storm_king', '4', '×4', 160, 3, '{"deger":4}'::jsonb),
  ('storm_king', '5', '×5', 120, 4, '{"deger":5}'::jsonb),
  ('storm_king', '6', '×6', 80, 5, '{"deger":6}'::jsonb),
  ('storm_king', '8', '×8', 50, 6, '{"deger":8}'::jsonb),
  ('storm_king', '10', '×10', 30, 7, '{"deger":10}'::jsonb),
  ('storm_king', '15', '×15', 20, 8, '{"deger":15}'::jsonb),
  ('storm_king', '20', '×20', 10, 9, '{"deger":20}'::jsonb),
  ('storm_king', '25', '×25', 7, 10, '{"deger":25}'::jsonb),
  ('storm_king', '50', '×50', 3, 11, '{"deger":50}'::jsonb)
on conflict (game_code, anahtar) do nothing;

create or replace function public.game_cikis_yetki(p_yaz boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(public.fruit_wheel_admin_mi(), false) then
    return true;
  end if;
  if p_yaz then
    return public.admin_has_permission('games.algorithm.manage')
      or public.admin_has_permission('games.fruit_wheel.manage');
  end if;
  return public.admin_has_permission('games.algorithm.view')
    or public.admin_has_permission('games.fruit_wheel.view');
end;
$$;

revoke all on function public.game_cikis_yetki(boolean) from public, anon, authenticated;

create or replace function public.game_cikis_gun_sifirla(p_game text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gun date := (timezone('Europe/Istanbul', now()))::date;
begin
  update public.game_cikis_kural
  set kullanilan = 0,
      sayac_gun = v_gun,
      updated_at = now()
  where game_code = p_game
    and aktif
    and sayac_gun is distinct from v_gun;
end;
$$;

revoke all on function public.game_cikis_gun_sifirla(text) from public, anon, authenticated;

create or replace function public.game_cikis_etkin(
  p_game text,
  p_haric text,
  p_izin text[]
)
returns table (
  anahtar text,
  ad text,
  deger integer,
  agirlik integer,
  taban integer,
  kalan integer,
  kural uuid,
  sira integer
)
language sql
volatile
security definer
set search_path = public
as $$
  with gun as (
    select
      (timezone('Europe/Istanbul', now()))::date as tarih,
      extract(hour from timezone('Europe/Istanbul', now()))::int as saat,
      extract(isodow from timezone('Europe/Istanbul', now()))::int as dow
  ),
  secilen as (
    select distinct on (o.anahtar)
      o.anahtar,
      o.ad,
      nullif(o.meta->>'deger', '')::int as deger,
      o.agirlik as taban,
      k.id as kural,
      k.agirlik as k_agirlik,
      case
        when k.id is null or k.en_fazla is null then null
        else greatest(0, k.en_fazla - k.kullanilan)
      end as kalan,
      o.sira
    from public.game_cikis_oge o
    left join public.game_cikis_kural k
      on k.game_code = o.game_code
     and k.anahtar = o.anahtar
     and k.aktif
     and k.saat_bas <= (select saat from gun)
     and (select saat from gun) < k.saat_bit
     and (k.tarih is null or k.tarih = (select tarih from gun))
     and (k.hafta_gunu is null or k.hafta_gunu = (select dow from gun))
     and (k.en_fazla is null or k.kullanilan < k.en_fazla)
    where o.game_code = p_game
      and (p_izin is null or o.anahtar = any (p_izin))
      and (p_haric is null or o.anahtar is distinct from p_haric)
    order by o.anahtar, (k.tarih is not null) desc, (k.hafta_gunu is not null) desc, k.updated_at desc nulls last
  )
  select
    anahtar,
    ad,
    deger,
    coalesce(k_agirlik, taban) as agirlik,
    taban,
    kalan,
    kural,
    sira
  from secilen;
$$;

revoke all on function public.game_cikis_etkin(text, text, text[]) from public, anon, authenticated;

create or replace function public.game_cikis_cek(
  p_game text,
  p_haric text default null,
  p_izin text[] default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oyun public.game_cikis_oyun%rowtype;
  v_id uuid;
  v_key text;
  v_kural uuid;
  v_haric text := p_haric;
  v_sum bigint;
  v_roll bigint;
begin
  select * into v_oyun
  from public.game_cikis_oyun
  where game_code = p_game and aktif and tur = 'tek';
  if v_oyun.game_code is null then
    return null;
  end if;
  if not v_oyun.tekrar_engeli then
    v_haric := null;
  end if;

  perform public.game_cikis_gun_sifirla(p_game);

  select s.id, s.anahtar
    into v_id, v_key
  from public.game_cikis_sira s
  where s.game_code = p_game
    and s.tuketildi_at is null
    and s.rezerv_token is null
    and (p_izin is null or s.anahtar = any (p_izin))
  order by s.konum, s.created_at
  limit 1
  for update skip locked;

  if v_id is not null then
    update public.game_cikis_sira
    set tuketildi_at = now()
    where id = v_id;
    return v_key;
  end if;

  select coalesce(sum(e.agirlik), 0)::bigint
    into v_sum
  from public.game_cikis_etkin(p_game, v_haric, p_izin) e;
  if v_sum <= 0 and v_haric is not null then
    v_haric := null;
    select coalesce(sum(e.agirlik), 0)::bigint
      into v_sum
    from public.game_cikis_etkin(p_game, null, p_izin) e;
  end if;
  if v_sum <= 0 then
    return null;
  end if;

  v_roll := floor(random() * v_sum)::bigint;
  select x.anahtar, x.kural
    into v_key, v_kural
  from (
    select
      e.anahtar,
      e.kural,
      sum(e.agirlik) over (
        order by e.sira, e.anahtar
        rows between unbounded preceding and current row
      ) as acc
    from public.game_cikis_etkin(p_game, v_haric, p_izin) e
    where e.agirlik > 0
  ) x
  where x.acc > v_roll
  order by x.acc
  limit 1;

  if v_kural is not null then
    update public.game_cikis_kural
    set kullanilan = kullanilan + 1,
        sayac_gun = (timezone('Europe/Istanbul', now()))::date,
        updated_at = now()
    where id = v_kural
      and (en_fazla is null or kullanilan < en_fazla);
  end if;

  return v_key;
end;
$$;

revoke all on function public.game_cikis_cek(text, text, text[]) from public, anon, authenticated;
grant execute on function public.game_cikis_cek(text, text, text[]) to service_role;

create or replace function public.game_cikis_storm_baslat(
  p_game text,
  p_adet integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oyun public.game_cikis_oyun%rowtype;
  v_token uuid := gen_random_uuid();
  v_adet integer := least(80, greatest(1, coalesce(p_adet, 40)));
  v_kuyruk jsonb;
  v_ogeler jsonb;
begin
  select * into v_oyun
  from public.game_cikis_oyun
  where game_code = p_game and aktif and tur = 'carpan';
  if v_oyun.game_code is null then
    return jsonb_build_object('ok', false);
  end if;

  perform public.game_cikis_gun_sifirla(p_game);

  update public.game_cikis_sira
  set tuketildi_at = null,
      rezerv_token = null,
      rezerv_bitis = null
  where game_code = p_game
    and rezerv_token is not null
    and rezerv_bitis is not null
    and rezerv_bitis < now();

  with picked as (
    select s.id
    from public.game_cikis_sira s
    where s.game_code = p_game
      and s.tuketildi_at is null
      and s.rezerv_token is null
    order by s.konum, s.created_at
    limit v_adet
    for update skip locked
  )
  update public.game_cikis_sira s
  set rezerv_token = v_token,
      rezerv_bitis = now() + interval '2 minutes',
      tuketildi_at = now()
  from picked
  where s.id = picked.id;

  select coalesce(jsonb_agg(to_jsonb(s.anahtar) order by s.konum, s.created_at), '[]'::jsonb)
    into v_kuyruk
  from public.game_cikis_sira s
  where s.rezerv_token = v_token;

  select coalesce(jsonb_agg(jsonb_build_object(
    'deger', e.deger,
    'agirlik', e.agirlik,
    'taban', e.taban,
    'kalan', e.kalan,
    'kural', e.kural
  ) order by e.sira), '[]'::jsonb)
    into v_ogeler
  from public.game_cikis_etkin(p_game, null, null) e
  where e.deger is not null;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'bps', coalesce(v_oyun.carpan_bps, 350),
    'ogeler', v_ogeler,
    'kuyruk', v_kuyruk
  );
end;
$$;

revoke all on function public.game_cikis_storm_baslat(text, integer) from public, anon, authenticated;
grant execute on function public.game_cikis_storm_baslat(text, integer) to service_role;

create or replace function public.game_cikis_storm_bitir(
  p_token uuid,
  p_kuyruk integer,
  p_kurallar jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer := greatest(0, least(coalesce(p_kuyruk, 0), 400));
  v_item record;
  v_n integer;
begin
  if p_token is not null then
    with ranked as (
      select s.id, row_number() over (order by s.konum, s.created_at) as n
      from public.game_cikis_sira s
      where s.rezerv_token = p_token
    )
    update public.game_cikis_sira s
    set tuketildi_at = case when r.n <= v_used then coalesce(s.tuketildi_at, now()) else null end,
        rezerv_token = null,
        rezerv_bitis = null
    from ranked r
    where s.id = r.id;
  end if;

  if p_kurallar is null or jsonb_typeof(p_kurallar) <> 'object' then
    return;
  end if;

  for v_item in select key, value from jsonb_each(p_kurallar)
  loop
    begin
      v_n := greatest(0, least(trunc(coalesce((v_item.value #>> '{}')::numeric, 0))::int, 400));
    exception when others then
      continue;
    end;
    if v_n = 0 then
      continue;
    end if;
    update public.game_cikis_kural
    set kullanilan = case
          when en_fazla is null then kullanilan + v_n
          else least(en_fazla, kullanilan + v_n)
        end,
        sayac_gun = (timezone('Europe/Istanbul', now()))::date,
        updated_at = now()
    where id::text = v_item.key;
  end loop;
end;
$$;

revoke all on function public.game_cikis_storm_bitir(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.game_cikis_storm_bitir(uuid, integer, jsonb) to service_role;

create or replace function public.game_cikis_pano(p_game text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game text := nullif(trim(coalesce(p_game, '')), '');
  v_oyun public.game_cikis_oyun%rowtype;
  v_ts timestamp := timezone('Europe/Istanbul', now());
  v_tarih date := v_ts::date;
  v_saat int := extract(hour from v_ts)::int;
  v_dow int := extract(isodow from v_ts)::int;
  v_onizleme jsonb := '[]'::jsonb;
  v_haric text;
  v_sum bigint;
  v_roll bigint;
  v_key text;
  v_i int;
begin
  if not public.game_cikis_yetki(false) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;

  if v_game is null or not exists (
    select 1 from public.game_cikis_oyun where game_code = v_game and aktif
  ) then
    select game_code into v_game
    from public.game_cikis_oyun
    where aktif
    order by sira, ad
    limit 1;
  end if;
  if v_game is null then
    return jsonb_build_object('ok', true, 'oyunlar', '[]'::jsonb);
  end if;

  select * into v_oyun from public.game_cikis_oyun where game_code = v_game;
  perform public.game_cikis_gun_sifirla(v_game);

  if v_oyun.tekrar_engeli and v_oyun.game_code = 'fruit_wheel' then
    select winning_fruit_id into v_haric
    from public.fruit_wheel_rounds
    order by created_at desc
    limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'anahtar', s.anahtar,
    'ad', o.ad,
    'kaynak', 'sira'
  ) order by s.konum, s.created_at), '[]'::jsonb)
    into v_onizleme
  from (
    select s.anahtar, s.konum, s.created_at
    from public.game_cikis_sira s
    where s.game_code = v_game
      and s.tuketildi_at is null
      and s.rezerv_token is null
    order by s.konum, s.created_at
    limit 8
  ) s
  join public.game_cikis_oge o
    on o.game_code = v_game and o.anahtar = s.anahtar;

  v_i := coalesce(jsonb_array_length(v_onizleme), 0);
  if v_i > 0 and v_oyun.tekrar_engeli then
    v_haric := v_onizleme->(v_i - 1)->>'anahtar';
  end if;
  while v_i < 8 loop
    select coalesce(sum(e.agirlik), 0)::bigint into v_sum
    from public.game_cikis_etkin(v_game, v_haric, null) e;
    if v_sum <= 0 and v_haric is not null then
      v_haric := null;
      select coalesce(sum(e.agirlik), 0)::bigint into v_sum
      from public.game_cikis_etkin(v_game, null, null) e;
    end if;
    exit when v_sum <= 0;
    v_roll := floor(random() * v_sum)::bigint;
    select x.anahtar into v_key
    from (
      select
        e.anahtar,
        sum(e.agirlik) over (
          order by e.sira, e.anahtar
          rows between unbounded preceding and current row
        ) as acc
      from public.game_cikis_etkin(v_game, v_haric, null) e
      where e.agirlik > 0
    ) x
    where x.acc > v_roll
    order by x.acc
    limit 1;
    exit when v_key is null;
    v_onizleme := v_onizleme || jsonb_build_array(jsonb_build_object(
      'anahtar', v_key,
      'ad', (select ad from public.game_cikis_oge where game_code = v_game and anahtar = v_key),
      'kaynak', 'tahmin'
    ));
    if v_oyun.tekrar_engeli then
      v_haric := v_key;
    end if;
    v_i := v_i + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'simdi', jsonb_build_object(
      'saat', v_saat,
      'gun', v_dow,
      'tarih', v_tarih,
      'etiket', to_char(v_ts, 'DD.MM HH24:MI')
    ),
    'oyunlar', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kod', y.game_code,
        'ad', y.ad,
        'tur', y.tur
      ) order by y.sira, y.ad)
      from public.game_cikis_oyun y
      where y.aktif
    ), '[]'::jsonb),
    'oyun', jsonb_build_object(
      'kod', v_oyun.game_code,
      'ad', v_oyun.ad,
      'tur', v_oyun.tur,
      'aciklama', v_oyun.aciklama,
      'carpanBps', v_oyun.carpan_bps
    ),
    'ogeler', coalesce((
      select jsonb_agg(jsonb_build_object(
        'anahtar', o.anahtar,
        'ad', o.ad,
        'agirlik', o.agirlik
      ) order by o.sira, o.ad)
      from public.game_cikis_oge o
      where o.game_code = v_game
    ), '[]'::jsonb),
    'kurallar', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'anahtar', k.anahtar,
        'ad', o.ad,
        'gun', case
          when k.tarih = v_tarih then 'Bugün'
          when k.tarih is not null then to_char(k.tarih, 'DD.MM')
          when k.hafta_gunu = 1 then 'Her pazartesi'
          when k.hafta_gunu = 2 then 'Her salı'
          when k.hafta_gunu = 3 then 'Her çarşamba'
          when k.hafta_gunu = 4 then 'Her perşembe'
          when k.hafta_gunu = 5 then 'Her cuma'
          when k.hafta_gunu = 6 then 'Her cumartesi'
          when k.hafta_gunu = 7 then 'Her pazar'
          else 'Her gün'
        end,
        'saatBas', k.saat_bas,
        'saatBit', k.saat_bit,
        'agirlik', k.agirlik,
        'enFazla', k.en_fazla,
        'kullanilan', k.kullanilan,
        'uyuyor', (
          k.aktif
          and k.saat_bas <= v_saat
          and v_saat < k.saat_bit
          and (k.tarih is null or k.tarih = v_tarih)
          and (k.hafta_gunu is null or k.hafta_gunu = v_dow)
          and (k.en_fazla is null or k.kullanilan < k.en_fazla)
        )
      ) order by k.created_at desc)
      from public.game_cikis_kural k
      join public.game_cikis_oge o
        on o.game_code = k.game_code and o.anahtar = k.anahtar
      where k.game_code = v_game and k.aktif
    ), '[]'::jsonb),
    'sira', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'anahtar', s.anahtar,
        'ad', o.ad
      ) order by s.konum, s.created_at)
      from public.game_cikis_sira s
      join public.game_cikis_oge o
        on o.game_code = s.game_code and o.anahtar = s.anahtar
      where s.game_code = v_game
        and s.tuketildi_at is null
        and s.rezerv_token is null
    ), '[]'::jsonb),
    'onizleme', v_onizleme
  );
end;
$$;

revoke all on function public.game_cikis_pano(text) from public, anon;
grant execute on function public.game_cikis_pano(text) to authenticated;

create or replace function public.game_cikis_sira_kaydet(p_game text, p_liste text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int;
  v_key text;
begin
  if not public.game_cikis_yetki(true) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;
  if not exists (select 1 from public.game_cikis_oyun where game_code = p_game and aktif) then
    return jsonb_build_object('ok', false, 'message', 'Oyun yok');
  end if;
  if coalesce(cardinality(p_liste), 0) > 48 then
    return jsonb_build_object('ok', false, 'message', 'Sıra en fazla 48 adım');
  end if;

  if p_liste is not null then
    foreach v_key in array p_liste loop
      if not exists (
        select 1 from public.game_cikis_oge
        where game_code = p_game and anahtar = v_key
      ) then
        return jsonb_build_object('ok', false, 'message', 'Listede tanımsız öğe var');
      end if;
    end loop;
  end if;

  delete from public.game_cikis_sira
  where game_code = p_game
    and tuketildi_at is null
    and rezerv_token is null;

  if p_liste is not null then
    v_i := 1;
    foreach v_key in array p_liste loop
      insert into public.game_cikis_sira (game_code, konum, anahtar, created_by)
      values (p_game, v_i, v_key, auth.uid());
      v_i := v_i + 1;
    end loop;
  end if;

  return public.game_cikis_pano(p_game);
end;
$$;

revoke all on function public.game_cikis_sira_kaydet(text, text[]) from public, anon;
grant execute on function public.game_cikis_sira_kaydet(text, text[]) to authenticated;

create or replace function public.game_cikis_kural_ekle(
  p_game text,
  p_anahtar text,
  p_gun text,
  p_saat_bas integer,
  p_saat_bit integer,
  p_agirlik integer,
  p_en_fazla integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gun text := lower(trim(coalesce(p_gun, '')));
  v_tarih date;
  v_hafta smallint;
begin
  if not public.game_cikis_yetki(true) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;
  if not exists (
    select 1 from public.game_cikis_oge
    where game_code = p_game and anahtar = p_anahtar
  ) then
    return jsonb_build_object('ok', false, 'message', 'Öğe yok');
  end if;
  if p_saat_bas is null or p_saat_bit is null
     or p_saat_bas < 0 or p_saat_bas > 23
     or p_saat_bit < 1 or p_saat_bit > 24
     or p_saat_bit <= p_saat_bas then
    return jsonb_build_object('ok', false, 'message', 'Saat aralığı geçersiz. Bitiş, başlangıçtan büyük olmalı.');
  end if;
  if p_agirlik is null or p_agirlik < 0 or p_agirlik > 100000 then
    return jsonb_build_object('ok', false, 'message', 'Sıklık 0 ile 100000 arasında olmalı');
  end if;
  if p_en_fazla is not null and (p_en_fazla < 0 or p_en_fazla > 100000) then
    return jsonb_build_object('ok', false, 'message', 'En fazla sayısı geçersiz');
  end if;

  if v_gun = 'bugun' then
    v_tarih := (timezone('Europe/Istanbul', now()))::date;
    v_hafta := null;
  elsif v_gun = 'her' then
    v_tarih := null;
    v_hafta := null;
  elsif v_gun ~ '^[1-7]$' then
    v_tarih := null;
    v_hafta := v_gun::smallint;
  else
    return jsonb_build_object('ok', false, 'message', 'Gün seç');
  end if;

  insert into public.game_cikis_kural (
    game_code, anahtar, tarih, hafta_gunu, saat_bas, saat_bit,
    agirlik, en_fazla, sayac_gun, created_by
  ) values (
    p_game, p_anahtar, v_tarih, v_hafta, p_saat_bas, p_saat_bit,
    p_agirlik, p_en_fazla, (timezone('Europe/Istanbul', now()))::date, auth.uid()
  );

  return public.game_cikis_pano(p_game);
end;
$$;

revoke all on function public.game_cikis_kural_ekle(text, text, text, integer, integer, integer, integer)
  from public, anon;
grant execute on function public.game_cikis_kural_ekle(text, text, text, integer, integer, integer, integer)
  to authenticated;

create or replace function public.game_cikis_kural_sil(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game text;
begin
  if not public.game_cikis_yetki(true) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;
  select game_code into v_game from public.game_cikis_kural where id = p_id;
  if v_game is null then
    return jsonb_build_object('ok', false, 'message', 'Kural yok');
  end if;
  delete from public.game_cikis_kural where id = p_id;
  return public.game_cikis_pano(v_game);
end;
$$;

revoke all on function public.game_cikis_kural_sil(uuid) from public, anon;
grant execute on function public.game_cikis_kural_sil(uuid) to authenticated;

create or replace function public.game_cikis_taban_kaydet(p_game text, p_ogeler jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_key text;
  v_w int;
begin
  if not public.game_cikis_yetki(true) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;
  if jsonb_typeof(p_ogeler) <> 'array' then
    return jsonb_build_object('ok', false, 'message', 'Liste geçersiz');
  end if;

  for v_row in select value from jsonb_array_elements(p_ogeler)
  loop
    v_key := v_row->>'anahtar';
    v_w := nullif(v_row->>'agirlik', '')::int;
    if v_w is null or v_w < 0 or v_w > 100000 then
      return jsonb_build_object('ok', false, 'message', 'Sıklık 0 ile 100000 arasında olmalı');
    end if;
    update public.game_cikis_oge
    set agirlik = v_w, updated_at = now()
    where game_code = p_game and anahtar = v_key;
  end loop;

  return public.game_cikis_pano(p_game);
end;
$$;

revoke all on function public.game_cikis_taban_kaydet(text, jsonb) from public, anon;
grant execute on function public.game_cikis_taban_kaydet(text, jsonb) to authenticated;

create or replace function public.game_cikis_bps_kaydet(p_game text, p_bps integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.game_cikis_yetki(true) then
    return jsonb_build_object('ok', false, 'message', 'Yetki yok');
  end if;
  if p_bps is null or p_bps < 0 or p_bps > 3000 then
    return jsonb_build_object('ok', false, 'message', 'Yüzde 0 ile 30 arasında olmalı');
  end if;
  update public.game_cikis_oyun
  set carpan_bps = p_bps, updated_at = now()
  where game_code = p_game and tur = 'carpan';
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Bu oyunda çarpan yüzdesi yok');
  end if;
  return public.game_cikis_pano(p_game);
end;
$$;

revoke all on function public.game_cikis_bps_kaydet(text, integer) from public, anon;
grant execute on function public.game_cikis_bps_kaydet(text, integer) to authenticated;

create or replace function public.fruit_wheel_create_round()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_cfg public.fruit_wheel_config_versions%rowtype;
  v_test_force text;
  v_plan text;
  v_force text;
  v_izin text[];
  v_haric text;
  v_pick jsonb;
  v_id uuid;
  v_open timestamptz := now();
begin
  select * into v_pol from public.fruit_wheel_policy where id = 1 for update;
  select * into v_cfg
  from public.fruit_wheel_config_versions
  where is_current
  order by version desc
  limit 1;
  if v_cfg.id is null then
    raise exception 'fruit wheel config missing';
  end if;

  v_test_force := case
    when v_pol.economy_mode = 'TEST_BALANCE' then v_pol.force_next_fruit_id
    else null
  end;

  v_plan := null;
  if v_test_force is null then
    select coalesce(array_agg(x.id), array[]::text[])
      into v_izin
    from (
      select value->>'id' as id
      from jsonb_array_elements(v_cfg.fruits)
      where coalesce((value->>'enabled')::boolean, true)
    ) x;
    select winning_fruit_id into v_haric
    from public.fruit_wheel_rounds
    order by created_at desc
    limit 1;
    begin
      v_plan := public.game_cikis_cek('fruit_wheel', v_haric, v_izin);
    exception when others then
      v_plan := null;
    end;
  end if;

  v_force := coalesce(v_test_force, v_plan);
  v_pick := public.fruit_wheel_pick(v_cfg.fruits, v_force);

  if v_test_force is not null then
    update public.fruit_wheel_policy
    set force_next_fruit_id = null, updated_at = now()
    where id = 1;
    insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
    values (
      null,
      'force_consumed',
      jsonb_build_object('force', v_test_force),
      jsonb_build_object('picked', v_pick->>'id')
    );
  end if;

  insert into public.fruit_wheel_rounds (
    status, config_version, economy_mode, config_snapshot, limits_snapshot,
    opens_at, locks_at, result_at, reveal_until, next_at,
    winning_fruit_id, segment_index, multiplier, presentation_tier, rng_seed
  ) values (
    'OPEN',
    v_cfg.version,
    v_pol.economy_mode,
    jsonb_build_object('fruits', v_cfg.fruits, 'version', v_cfg.version),
    jsonb_build_object(
      'minimumSelection', v_pol.minimum_selection,
      'maximumSelectionPerFruit', v_pol.maximum_selection_per_fruit,
      'maximumTotalPerRound', v_pol.maximum_total_per_round,
      'quickAmounts', v_pol.quick_amounts,
      'displayName', v_pol.display_name,
      'openSeconds', v_pol.open_seconds,
      'lockCountdownSeconds', v_pol.lock_countdown_seconds
    ),
    v_open,
    v_open + make_interval(secs => v_pol.open_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds + 1),
    v_pick->>'id',
    (v_pick->>'index')::int,
    (v_pick->>'multiplier')::numeric,
    v_pick->>'tier',
    v_pick->>'seed'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.fruit_wheel_create_round() from public, anon, authenticated;

create or replace function public.fruit_wheel_admin_publish_fruits(p_fruits jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err text;
  v_ver int;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  v_err := public.fruit_wheel_validate_fruits(p_fruits);
  if v_err is not null then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'message', v_err);
  end if;
  select coalesce(max(version), 0) + 1 into v_ver
  from public.fruit_wheel_config_versions;
  update public.fruit_wheel_config_versions set is_current = false where is_current;
  insert into public.fruit_wheel_config_versions (version, fruits, created_by, is_current)
  values (v_ver, p_fruits, auth.uid(), true);
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'config_publish', null, jsonb_build_object('version', v_ver));

  update public.game_cikis_oge o
  set agirlik = greatest(0, least(100000, f.weight)),
      updated_at = now()
  from (
    select value->>'id' as id, trunc((value->>'weight')::numeric)::int as weight
    from jsonb_array_elements(p_fruits)
    where (value->>'weight') ~ '^[0-9]+(\.[0-9]+)?$'
  ) f
  where o.game_code = 'fruit_wheel'
    and o.anahtar = f.id;

  return jsonb_build_object('ok', true, 'version', v_ver);
end;
$$;

revoke all on function public.fruit_wheel_admin_publish_fruits(jsonb) from public, anon;
grant execute on function public.fruit_wheel_admin_publish_fruits(jsonb) to authenticated;
