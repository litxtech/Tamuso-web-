-- Ajans manuel coin yüklemeleri: denetim kaydı ve tür ayrımı.
--
--   promotion               → promosyon / etkinlik ödülü
--   operational_correction  → operasyonel düzeltme (hatalı işlem telafisi vb.)
--   paid_sale               → ücretli satış. Uyumluluk onayı olmadan KABUL EDİLMEZ.
--
-- Ajans yüklemeleri alıcının ödül coin kovasına yazılır (cuzdan_coin_kaynak_ayir tetikleyicisi):
-- nakde çevrilemez ve hediyede kullanıldığında yayıncı geliri oluşturmaz.

create table if not exists public.agency_coin_load_audit (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null unique references public.agency_coin_transfers(id) on delete restrict,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  actor_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('agency_owner', 'admin')),
  recipient_id uuid not null references public.profiles(id),
  coins bigint not null check (coins > 0),
  load_type text not null check (load_type in ('promotion', 'operational_correction')),
  reason text,
  source text not null default 'agency_distribution_balance',
  needs_review boolean not null default false,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists agency_coin_load_audit_agency_idx
  on public.agency_coin_load_audit (agency_id, created_at desc);

alter table public.agency_coin_load_audit enable row level security;

drop policy if exists agency_coin_load_audit_read on public.agency_coin_load_audit;
create policy agency_coin_load_audit_read on public.agency_coin_load_audit
  for select to authenticated
  using (
    public.ben_admin_miyim()
    or exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
  );

create or replace function public.agency_coin_load_audit_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'agency_coin_load_audit silinemez';
  end if;
  if new.transfer_id <> old.transfer_id or new.coins <> old.coins or new.actor_id <> old.actor_id
     or new.recipient_id <> old.recipient_id or new.load_type <> old.load_type
     or new.created_at <> old.created_at then
    raise exception 'agency_coin_load_audit kayıt alanları değiştirilemez';
  end if;
  return new;
end;
$$;

drop trigger if exists agency_coin_load_audit_immutable_trg on public.agency_coin_load_audit;
create trigger agency_coin_load_audit_immutable_trg
  before update or delete on public.agency_coin_load_audit
  for each row execute function public.agency_coin_load_audit_immutable();

drop function if exists public.ajans_coin_transfer(uuid, uuid, bigint, text);

create or replace function public.ajans_coin_transfer(
  p_agency_id uuid,
  p_to_user_id uuid,
  p_coins bigint,
  p_idempotency_key text,
  p_load_type text default null,
  p_reason text default null
)
returns public.agency_coin_transfers
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_agency public.agencies%rowtype;
  v_limits public.agency_transfer_limits%rowtype;
  v_tx public.agency_coin_transfers%rowtype;
  v_daily bigint;
  v_monthly bigint;
  v_unlimited boolean := false;
  v_agency_name text;
  v_reason text;
  v_load_type text := nullif(trim(coalesce(p_load_type, '')), '');
  v_note text := nullif(trim(coalesce(p_reason, '')), '');
  v_is_admin boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if public.kill_switch_aktif_mi('kill_agency_coin_transfer') then
    raise exception 'Agency transfers temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('agency_enabled') then
    raise exception 'Agency feature disabled';
  end if;
  if v_load_type = 'paid_sale' then
    raise exception 'paid_sale_not_permitted';
  end if;
  if v_load_type is not null and v_load_type not in ('promotion', 'operational_correction') then
    raise exception 'invalid_load_type';
  end if;
  if v_load_type = 'operational_correction' and v_note is null then
    raise exception 'reason_required';
  end if;

  perform public.agency_assert_feature(p_agency_id, 'coin_transfer');

  if not public.agency_verification_financial_gate(p_agency_id, 'can_manage_financial_distribution') then
    raise exception 'Ajans dogrulama gerekli (finansal dagitim)';
  end if;

  if p_coins is null or p_coins <= 0 then raise exception 'Invalid coins'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;
  if p_to_user_id is null or p_to_user_id = v_uid then
    raise exception 'invalid_recipient';
  end if;

  select * into v_tx from public.agency_coin_transfers where idempotency_key = p_idempotency_key;
  if found then return v_tx; end if;

  select * into v_agency from public.agencies where id = p_agency_id for update;
  if not found then raise exception 'Agency not found'; end if;
  v_is_admin := public.ben_admin_miyim();
  if v_agency.owner_id <> v_uid and not v_is_admin then
    raise exception 'Not agency owner';
  end if;
  if not v_agency.is_coin_distributor then raise exception 'Not authorized distributor'; end if;
  if v_agency.trust_tier in ('Restricted', 'Suspended') or v_agency.status <> 'active' then
    raise exception 'Agency not allowed to transfer';
  end if;

  v_agency_name := coalesce(nullif(trim(v_agency.name), ''), 'Ajans');
  v_reason := 'agency_distribution:' || left(v_agency_name, 80);

  select * into v_limits from public.agency_transfer_limits where agency_id = p_agency_id;
  if not found then raise exception 'Limits missing'; end if;
  v_unlimited := coalesce(v_limits.unlimited, false);

  if not v_unlimited then
    if p_coins > v_limits.single_transfer_limit then raise exception 'Tek sefer limit asildi'; end if;
    if p_coins > v_limits.per_user_limit then raise exception 'Kullanici limit asildi'; end if;

    select coalesce(sum(coins), 0) into v_daily from public.agency_coin_transfers
    where agency_id = p_agency_id and status = 'completed'
      and created_at >= date_trunc('day', now());
    if v_daily + p_coins > v_limits.daily_limit then raise exception 'Gunluk limit asildi'; end if;

    select coalesce(sum(coins), 0) into v_monthly from public.agency_coin_transfers
    where agency_id = p_agency_id and status = 'completed'
      and created_at >= date_trunc('month', now());
    if v_monthly + p_coins > v_limits.monthly_limit then raise exception 'Aylik limit asildi'; end if;
  end if;

  insert into public.agency_coin_transfers (
    agency_id, from_user_id, to_user_id, coins, idempotency_key, status
  ) values (
    p_agency_id, v_uid, p_to_user_id, p_coins, p_idempotency_key, 'completed'
  ) returning * into v_tx;

  insert into public.agency_coin_load_audit (
    transfer_id, agency_id, actor_id, actor_role, recipient_id, coins, load_type, reason, needs_review
  ) values (
    v_tx.id, p_agency_id, v_uid,
    case when v_agency.owner_id = v_uid then 'agency_owner' else 'admin' end,
    p_to_user_id, p_coins, coalesce(v_load_type, 'promotion'), v_note,
    v_load_type is null or v_note is null
  );

  perform public.ajans_cuzdan_hareket_yaz(
    p_agency_id, 'distribution', -p_coins, 'distribution_out', 'agency_transfer', v_tx.id,
    jsonb_build_object('to_user_id', p_to_user_id, 'coins', p_coins,
      'load_type', coalesce(v_load_type, 'promotion'))
  );

  insert into public.wallets (user_id, coins)
  values (p_to_user_id, 0)
  on conflict (user_id) do nothing;

  update public.wallets set bonus_coins = bonus_coins + p_coins, updated_at = now()
  where user_id = p_to_user_id;

  insert into public.wallet_ledger (
    user_id, currency, delta, balance_after, reason, ref_type, ref_id, meta
  ) values (
    p_to_user_id, 'bonus_coins', p_coins,
    (select bonus_coins from public.wallets where user_id = p_to_user_id),
    v_reason, 'agency_transfer', v_tx.id,
    jsonb_build_object(
      'agency_id', p_agency_id,
      'agency_name', v_agency_name,
      'from_user_id', v_uid,
      'coins', p_coins,
      'type', 'agency_topup',
      'load_type', coalesce(v_load_type, 'promotion'),
      'reason', v_note
    )
  );

  perform public.bildirim_kuyruga_ekle(
    p_to_user_id, 'wallet', 'Ajans coin yüklemesi',
    v_agency_name || ' sana ' || p_coins::text || ' ödül coin yükledi',
    '/(tabs)/wallet',
    jsonb_build_object('agency_id', p_agency_id, 'coins', p_coins, 'transfer_id', v_tx.id)
  );

  return v_tx;
end;
$$;

revoke all on function public.ajans_coin_transfer(uuid, uuid, bigint, text, text, text) from public, anon;
grant execute on function public.ajans_coin_transfer(uuid, uuid, bigint, text, text, text) to authenticated;

-- Eski yüklemeler için geriye dönük denetim kaydı (needs_review = true)
insert into public.agency_coin_load_audit (
  transfer_id, agency_id, actor_id, actor_role, recipient_id, coins, load_type, reason,
  source, needs_review, created_at
)
select t.id, t.agency_id, t.from_user_id,
  case when a.owner_id = t.from_user_id then 'agency_owner' else 'admin' end,
  t.to_user_id, t.coins, 'promotion', null, 'legacy_backfill', true, t.created_at
from public.agency_coin_transfers t
join public.agencies a on a.id = t.agency_id
where t.coins > 0
  and t.from_user_id is not null
  and t.to_user_id is not null
on conflict (transfer_id) do nothing;
