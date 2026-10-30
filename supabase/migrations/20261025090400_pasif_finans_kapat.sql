-- Uygulamada sunulmayan finansal özellikler sunucuda da kapatılır; tek bir bayrakla
-- yeniden açılamaz. Yeniden sunulmaları yeni migration + yeni uygulama sürümü gerektirir.
--
--   Coin takası / satışı (kullanıcı ↔ kullanıcı / ajans, banka dekontu ile)
--   Cüzdan numarasıyla kullanıcılar arası coin transferi
--   Elmas → banka çekimi (eski cekim_talebi_olustur; yerini USD yayıncı ödemeleri aldı)
--
-- Admin tarafındaki okuma ve mevcut kayıtların sonuçlandırılması korunur.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.coin_takas_teklif_olustur(text,uuid,uuid,bigint,text)',
    'public.coin_takas_alici_yanit(uuid,boolean)',
    'public.coin_takas_odeme_bilgisi_kaydet(uuid,bigint,text)',
    'public.coin_takas_dekont_yukle(uuid,text)',
    'public.cuzdan_no_ile_coin_transfer(text,text,text,bigint,text)',
    'public.cuzdan_no_ile_alici_getir(text)',
    'public.cekim_talebi_olustur(bigint,text,jsonb,text)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

update public.feature_flags
  set enabled = false, updated_at = now()
  where key in ('wallet_exchange_enabled', 'wallet_sell_enabled', 'wallet_withdraw_enabled');

-- Alıcı yanıtı bekleyen teklifler: iptal + kilitli coin iadesi.
-- İade, kaynağı doğrulanamadığı için ödül coin kovasına yapılır ve inceleme listesine yazılır.
create table if not exists public.coin_takas_kapatma_incelemesi (
  offer_id uuid primary key,
  seller_id uuid not null,
  coins bigint not null,
  previous_status text not null,
  action text not null check (action in ('cancelled_refunded', 'cancelled_no_hold', 'manual_review')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.coin_takas_kapatma_incelemesi enable row level security;

drop policy if exists coin_takas_kapatma_admin on public.coin_takas_kapatma_incelemesi;
create policy coin_takas_kapatma_admin on public.coin_takas_kapatma_incelemesi
  for select to authenticated
  using (public.ben_admin_miyim());

do $$
declare
  r record;
begin
  for r in
    select * from public.coin_trade_offers
    where status = 'pending_buyer'
    for update
  loop
    if coalesce(r.coins_held, false) then
      update public.wallets
        set bonus_coins = bonus_coins + r.coins, updated_at = now()
        where user_id = r.seller_id;
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, meta)
      values (r.seller_id, 'bonus_coins', r.coins,
        (select bonus_coins from public.wallets where user_id = r.seller_id),
        'trade_hold_refund', 'coin_trade',
        jsonb_build_object('offer_id', r.id, 'reason', 'feature_retired'));
    end if;

    update public.coin_trade_offers
      set status = 'cancelled', coins_held = false, updated_at = now()
      where id = r.id;

    insert into public.coin_takas_kapatma_incelemesi (offer_id, seller_id, coins, previous_status, action)
    values (r.id, r.seller_id, r.coins, r.status,
      case when coalesce(r.coins_held, false) then 'cancelled_refunded' else 'cancelled_no_hold' end)
    on conflict (offer_id) do nothing;
  end loop;

  -- Alıcı onayı sonrası (ödeme yapılmış olabilir) teklifler otomatik kapatılmaz.
  insert into public.coin_takas_kapatma_incelemesi (offer_id, seller_id, coins, previous_status, action, note)
  select o.id, o.seller_id, o.coins, o.status, 'manual_review',
    'Alıcı onaylamış; dış ödeme yapılmış olabilir. Admin sonuçlandırmalı.'
  from public.coin_trade_offers o
  where o.status in ('pending_platform', 'pending_payment_info', 'pending_receipt', 'receipt_overdue')
  on conflict (offer_id) do nothing;
end $$;
