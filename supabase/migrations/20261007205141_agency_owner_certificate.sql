-- Ajans sahibi sertifikası.
-- Eşikler admin tarafından değişir. Para transferi yok; metin hediyeyi bildirir.
-- İstemci tabloya yazamaz.

create table if not exists public.agency_owner_award_settings (
  id int primary key default 1 check (id = 1),
  member_threshold int not null default 100,
  live_minutes_threshold bigint not null default 1000000,
  coin_sales_threshold bigint not null default 50000000,
  gift_usd int not null default 1000,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint agency_owner_award_settings_positive check (
    member_threshold > 0
    and live_minutes_threshold > 0
    and coin_sales_threshold > 0
    and gift_usd >= 0
  )
);

insert into public.agency_owner_award_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.agency_owner_certificates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique references public.agencies(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_legal_name text not null,
  agency_name text not null,
  member_count bigint not null,
  live_minutes bigint not null,
  coin_sales bigint not null,
  gift_usd int not null,
  member_threshold int not null,
  live_minutes_threshold bigint not null,
  coin_sales_threshold bigint not null,
  issued_at timestamptz not null default now()
);

alter table public.agency_owner_award_settings enable row level security;
alter table public.agency_owner_certificates enable row level security;

revoke all on public.agency_owner_award_settings from public, anon, authenticated;
revoke all on public.agency_owner_certificates from public, anon, authenticated;

create or replace function public.agency_owner_award_adi(p_agency_id uuid, p_owner_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(trim(concat_ws(' ', d.holder_first_name, d.holder_last_name)), '')
      from public.verification_documents d
      where d.subject_type = 'AGENCY'
        and d.subject_id = p_agency_id
        and d.status = 'VERIFIED'
        and nullif(trim(concat_ws(' ', d.holder_first_name, d.holder_last_name)), '') is not null
      order by d.created_at desc
      limit 1
    ),
    (
      select nullif(trim(concat_ws(' ', a.contact_first_name, a.contact_last_name)), '')
      from public.agency_applications a
      where a.agency_id = p_agency_id
      order by a.created_at desc
      limit 1
    ),
    (
      select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), '—')
      from public.profiles p
      where p.id = p_owner_id
    ),
    '—'
  );
$$;

create or replace function public.agency_owner_award_durum(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency public.agencies%rowtype;
  v_settings public.agency_owner_award_settings%rowtype;
  v_members bigint := 0;
  v_minutes bigint := 0;
  v_coins bigint := 0;
  v_ready boolean := false;
  v_cert public.agency_owner_certificates%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  select * into v_agency from public.agencies where id = p_agency_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_agency.owner_id is distinct from v_uid and not public.ben_admin_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_settings from public.agency_owner_award_settings where id = 1;
  if not found then raise exception 'NOT_FOUND'; end if;

  select count(*)::bigint into v_members
  from public.host_profiles hp
  where hp.agency_id = p_agency_id and hp.status = 'agency';

  select coalesce(floor(sum(greatest(extract(epoch from (
    coalesce(ls.ended_at, case when ls.is_live then now() else ls.started_at end) - ls.started_at
  )), 0)) / 60), 0)::bigint into v_minutes
  from public.live_sessions ls
  join public.host_profiles hp
    on hp.user_id = ls.host_id
   and hp.agency_id = p_agency_id
   and hp.status = 'agency';

  select coalesce(w.lifetime_coins_sold, 0) into v_coins
  from public.agency_wallets w
  where w.agency_id = p_agency_id;
  v_coins := coalesce(v_coins, 0);

  v_ready := v_members >= v_settings.member_threshold
    and v_minutes >= v_settings.live_minutes_threshold
    and v_coins >= v_settings.coin_sales_threshold;

  select * into v_cert from public.agency_owner_certificates where agency_id = p_agency_id;

  if v_ready and v_cert.id is null and v_agency.owner_id is not null then
    v_name := public.agency_owner_award_adi(p_agency_id, v_agency.owner_id);
    insert into public.agency_owner_certificates (
      agency_id, owner_id, owner_legal_name, agency_name,
      member_count, live_minutes, coin_sales, gift_usd,
      member_threshold, live_minutes_threshold, coin_sales_threshold
    ) values (
      p_agency_id, v_agency.owner_id, v_name, v_agency.name,
      v_members, v_minutes, v_coins, v_settings.gift_usd,
      v_settings.member_threshold, v_settings.live_minutes_threshold, v_settings.coin_sales_threshold
    )
    on conflict (agency_id) do nothing;
    select * into v_cert from public.agency_owner_certificates where agency_id = p_agency_id;
  end if;

  return jsonb_build_object(
    'agency_id', v_agency.id,
    'agency_name', coalesce(v_cert.agency_name, v_agency.name),
    'owner_name', coalesce(
      v_cert.owner_legal_name,
      public.agency_owner_award_adi(p_agency_id, v_agency.owner_id)
    ),
    'members', v_members,
    'live_minutes', v_minutes,
    'coin_sales', v_coins,
    'member_threshold', coalesce(v_cert.member_threshold, v_settings.member_threshold),
    'live_minutes_threshold', coalesce(v_cert.live_minutes_threshold, v_settings.live_minutes_threshold),
    'coin_sales_threshold', coalesce(v_cert.coin_sales_threshold, v_settings.coin_sales_threshold),
    'gift_usd', coalesce(v_cert.gift_usd, v_settings.gift_usd),
    'ready', v_cert.id is not null,
    'issued_at', v_cert.issued_at,
    'is_owner', v_agency.owner_id = v_uid
  );
end;
$$;

create or replace function public.admin_agency_owner_award_ayarla(
  p_members int,
  p_minutes bigint,
  p_coins bigint,
  p_gift_usd int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;
  if p_members is null or p_members < 1 or p_members > 1000000 then
    raise exception 'TITLE';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 1000000000000 then
    raise exception 'TITLE';
  end if;
  if p_coins is null or p_coins < 1 or p_coins > 1000000000000000 then
    raise exception 'TITLE';
  end if;
  if p_gift_usd is null or p_gift_usd < 0 or p_gift_usd > 1000000 then
    raise exception 'TITLE';
  end if;

  update public.agency_owner_award_settings set
    member_threshold = p_members,
    live_minutes_threshold = p_minutes,
    coin_sales_threshold = p_coins,
    gift_usd = p_gift_usd,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;

  return jsonb_build_object(
    'member_threshold', p_members,
    'live_minutes_threshold', p_minutes,
    'coin_sales_threshold', p_coins,
    'gift_usd', p_gift_usd
  );
end;
$$;

create or replace function public.admin_agency_owner_award_oku()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.agency_owner_award_settings%rowtype;
begin
  if not public.ben_admin_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;
  select * into s from public.agency_owner_award_settings where id = 1;
  return jsonb_build_object(
    'member_threshold', s.member_threshold,
    'live_minutes_threshold', s.live_minutes_threshold,
    'coin_sales_threshold', s.coin_sales_threshold,
    'gift_usd', s.gift_usd
  );
end;
$$;

revoke all on function public.agency_owner_award_adi(uuid, uuid) from public, anon, authenticated;
grant execute on function public.agency_owner_award_durum(uuid) to authenticated;
grant execute on function public.admin_agency_owner_award_ayarla(int, bigint, bigint, int) to authenticated;
grant execute on function public.admin_agency_owner_award_oku() to authenticated;
