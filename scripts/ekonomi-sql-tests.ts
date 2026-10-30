/**
 * Ekonomi migration'ları — izole PGlite (bellek içi Postgres) üzerinde SQL testleri.
 * Canlı veritabanına bağlanmaz. Mevcut şemanın yalnızca bu migration'ların dokunduğu
 * kısmı aşağıda sade tablolar olarak kurulur, ardından gerçek migration dosyaları yüklenir.
 * Calistir: npm run test:ekonomi-sql
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = [
  '20261025090000_cuzdan_bakiye_ayrimi.sql',
  '20261025090100_yayinci_gelir_paylasimi.sql',
  '20261025090200_yayinci_odeme.sql',
  '20261025090500_ajans_yukleme_denetim.sql',
];

const STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.test_flags (key text primary key, enabled boolean not null);
create table public.test_kill (key text primary key, active boolean not null);
create table public.test_bildirim (user_id uuid, title text, href text);
create function public.ozellik_bayragi_aktif_mi(p text) returns boolean language sql stable as
  $$ select coalesce((select enabled from public.test_flags where key = p), false) $$;
create function public.kill_switch_aktif_mi(p text) returns boolean language sql stable as
  $$ select coalesce((select active from public.test_kill where key = p), false) $$;
create function public.ben_admin_miyim() returns boolean language sql stable as
  $$ select coalesce(current_setting('test.admin', true), '') = 'on' $$;
create function public.bildirim_kuyruga_ekle(p_user uuid, p_cat text, p_title text, p_body text, p_href text, p_data jsonb)
  returns void language sql as $$ insert into public.test_bildirim values (p_user, p_title, p_href) $$;

create table public.profiles (id uuid primary key, is_guest boolean not null default false, display_name text);
create function public.profil_gosterim_adi(p uuid) returns text language sql stable as
  $$ select display_name from public.profiles where id = p $$;

create table public.agencies (
  id uuid primary key, owner_id uuid, name text, total_gifts bigint not null default 0,
  earnings_penalty_pct numeric not null default 0, gift_earn_disabled boolean not null default false,
  trust_tier text not null default 'Standard', is_coin_distributor boolean not null default true,
  status text not null default 'active'
);
create table public.agency_commission_rates (
  agency_id uuid primary key, host_share numeric, agency_share numeric, platform_share numeric
);
create table public.host_profiles (user_id uuid primary key, agency_id uuid, status text);
create table public.platform_economy_config (
  id smallint primary key, coin_try numeric default 0.10, diamond_try numeric default 0.10,
  gift_host_share numeric default 0.80, default_agency_share numeric default 0.20,
  iap_store_fee_estimate numeric default 0.30, updated_at timestamptz default now(), updated_by uuid
);
create table public.wallets (
  user_id uuid primary key, coins bigint not null default 0, diamonds bigint not null default 0,
  updated_at timestamptz default now()
);
create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid, currency text, delta bigint,
  balance_after bigint, reason text, ref_type text, ref_id uuid, created_at timestamptz default now(), meta jsonb,
  constraint wallet_ledger_currency_check check (currency in ('coins', 'diamonds'))
);
create table public.coin_purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid, coins_added bigint, provider text,
  store text, status text, receipt_payload jsonb
);
create table public.gifts (id uuid primary key, coin_cost bigint, diamond_value bigint, is_active boolean default true);
create table public.gift_transactions (
  id uuid primary key default gen_random_uuid(), room_id uuid, sender_id uuid, receiver_id uuid, gift_id uuid,
  quantity integer, coins_spent bigint, diamonds_earned bigint, created_at timestamptz default now(),
  idempotency_key text, agency_commission_snapshot numeric, agency_id uuid, status_id uuid, live_session_id uuid
);
create table public.rooms (id uuid primary key, total_coins_earned bigint not null default 0);
create table public.live_sessions (
  id uuid primary key, host_id uuid, is_live boolean, started_at timestamptz,
  gift_count integer default 0, total_coins_earned bigint default 0, score bigint default 0
);
create table public.status_posts (id uuid primary key, user_id uuid, deleted_at timestamptz, gift_count integer default 0, updated_at timestamptz);
create table public.finance_idempotency_keys (
  idempotency_key text primary key, user_id uuid, operation text, result_ref uuid, result_payload jsonb,
  created_at timestamptz default now()
);
create table public.pk_matches (
  id uuid primary key, status text, room_a_id uuid, room_b_id uuid, live_a_id uuid, live_b_id uuid,
  ends_at timestamptz, started_at timestamptz
);
create table public.device_sessions (user_id uuid, device_id text, ip_hash text, last_seen_at timestamptz default now());
create table public.device_push_tokens (user_id uuid, device_id text);
create table public.people_discovery_config (id smallint primary key, platform_call_fee numeric, billing_mode text);
insert into public.people_discovery_config values (1, 0.30, 'per_second_ceil');
create table public.direct_calls (
  id uuid primary key default gen_random_uuid(), caller_id uuid, callee_id uuid, status text,
  answered_at timestamptz, ended_at timestamptz, is_paid boolean, price_per_minute_snapshot integer,
  billing_status text, reserved_coins bigint, billable_seconds integer, gross_coin_amount bigint,
  platform_fee_coins bigint, creator_share_coins bigint, billing_finalized_at timestamptz,
  free_seconds_consumed integer default 0
);
create table public.people_call_settings (user_id uuid primary key, free_call_seconds_remaining integer default 0, updated_at timestamptz);
create function public.kisiler_ayar_ensure(p uuid) returns public.people_call_settings language plpgsql as $$
declare r public.people_call_settings%rowtype;
begin
  insert into public.people_call_settings (user_id) values (p) on conflict do nothing;
  select * into r from public.people_call_settings where user_id = p;
  return r;
end $$;
create function public.kisiler_billable_coins(p_seconds int, p_price int, p_mode text) returns bigint
  language sql immutable as $$ select ceil(p_seconds * p_price / 60.0)::bigint $$;
create table public.wallet_accounts (user_id uuid primary key, kyc_status text);
create table public.user_bank_accounts (user_id uuid primary key, account_holder text, bank_name text, iban text);

create table public.agency_coin_transfers (
  id uuid primary key default gen_random_uuid(), agency_id uuid, from_user_id uuid, to_user_id uuid,
  coins bigint, idempotency_key text unique, status text, created_at timestamptz default now()
);
create table public.agency_transfer_limits (
  agency_id uuid primary key, unlimited boolean default false, single_transfer_limit bigint,
  per_user_limit bigint, daily_limit bigint, monthly_limit bigint
);
create function public.agency_assert_feature(p uuid, f text) returns void language sql as $$ select $$;
create function public.agency_verification_financial_gate(p uuid, f text) returns boolean language sql as $$ select true $$;
create function public.ajans_cuzdan_hareket_yaz(p uuid, a text, d bigint, r text, rt text, ri uuid, m jsonb)
  returns void language sql as $$ select $$;
`;

const U = {
  A: '00000000-0000-0000-0000-00000000000a',
  B: '00000000-0000-0000-0000-00000000000b',
  C: '00000000-0000-0000-0000-00000000000c',
  D: '00000000-0000-0000-0000-00000000000d',
  E: '00000000-0000-0000-0000-00000000000e',
  F: '00000000-0000-0000-0000-00000000000f',
  AG_OWNER: '00000000-0000-0000-0000-0000000000a9',
};
const AJANS = '10000000-0000-0000-0000-000000000001';
const HEDIYE = '20000000-0000-0000-0000-000000000001';

let failed = 0;
let passed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  } else {
    passed += 1;
  }
}
function esit(gercek: unknown, beklenen: unknown, msg: string) {
  const ok = String(gercek) === String(beklenen);
  assert(ok, `${msg} (beklenen ${String(beklenen)}, gelen ${String(gercek)})`);
}

const db = new PGlite();

async function tek<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<T>(sql, params);
  return r.rows[0] as T;
}
async function deger(sql: string, params: unknown[] = []): Promise<unknown> {
  const satir = await tek<Record<string, unknown>>(sql, params);
  return satir ? Object.values(satir)[0] : undefined;
}
async function hataBekle(sql: string, params: unknown[], icerik: string, msg: string) {
  try {
    await db.query(sql, params);
    assert(false, `${msg}: hata bekleniyordu (${icerik})`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(m.includes(icerik), `${msg}: beklenen hata "${icerik}", gelen "${m}"`);
  }
}
async function kullanici(uid: string | null) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
}
async function admin(acik: boolean) {
  await db.query(`select set_config('test.admin', $1, false)`, [acik ? 'on' : 'off']);
}
async function hediye(
  gonderen: string,
  alici: string,
  adet: number,
  kaynak: 'purchased' | 'game' | 'bonus',
  anahtar: string | null = null,
) {
  await kullanici(gonderen);
  return tek<{ id: string; coins_spent: string }>(
    `select * from public.send_gift(null, $1, $2, $3, $4, null, null, $5, 'message')`,
    [alici, HEDIYE, adet, anahtar, kaynak],
  );
}
async function kazanc(sourceId: string) {
  return tek<Record<string, string | boolean | null>>(
    `select * from public.creator_earning_entries where source_id = $1`,
    [sourceId],
  );
}
async function cuzdan(uid: string) {
  return tek<{ coins: string; game_coins: string; bonus_coins: string; diamonds: string }>(
    `select coins, game_coins, bonus_coins, diamonds from public.wallets where user_id = $1`,
    [uid],
  );
}

async function kur() {
  await db.exec(STUB);
  const kok = join(__dirname, '..', 'supabase', 'migrations');
  for (const f of MIGRATIONS) {
    try {
      await db.exec(readFileSync(join(kok, f), 'utf8'));
    } catch (e) {
      throw new Error(`${f} yüklenemedi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const profiller = Object.entries(U).map(([ad, id]) => `('${id}', '${ad}')`).join(', ');
  await db.exec(`
    insert into public.profiles (id, display_name) values ${profiller};
    insert into public.test_flags values ('gifts_enabled', true), ('agency_enabled', true), ('withdrawals_enabled', false);
    insert into public.gifts values ('${HEDIYE}', 1000, 1000, true);
    insert into public.agencies (id, owner_id, name) values ('${AJANS}', '${U.AG_OWNER}', 'Test Ajans');
    insert into public.agency_commission_rates values ('${AJANS}', 0.80, 0.20, 0);
    insert into public.agency_transfer_limits values ('${AJANS}', true, 0, 0, 0, 0);
    insert into public.host_profiles values ('${U.C}', '${AJANS}', 'agency');
    insert into public.wallets (user_id, coins) values
      ('${U.A}', 100000), ('${U.D}', 10000), ('${U.E}', 10000);
  `);
}

async function testler() {
  // --- Yapılandırma ve dönemler ---
  const cfg = (await deger(`select public.ekonomi_config_getir()`)) as Record<string, unknown>;
  esit(Number(cfg.creator_share), 0.4, 'yayıncı payı %40');
  esit(Number(cfg.platform_share), 0.6, 'platform payı %60');
  esit(Number(cfg.payout_min_usd), 25, 'minimum ödeme $25');

  const donem = async (t: string) =>
    tek<{ b: string; s: string }>(
      `select public.odeme_donemi_bas($1::timestamptz)::text b, public.odeme_donemi_bit($1::timestamptz)::text s`,
      [t],
    );
  let d = await donem('2026-10-01T00:00:00Z');
  esit(`${d.b}..${d.s}`, '2026-10-01..2026-10-15', 'dönem 1 başlangıcı');
  d = await donem('2026-10-15T23:59:59Z');
  esit(`${d.b}..${d.s}`, '2026-10-01..2026-10-15', 'dönem 1 sonu');
  d = await donem('2026-10-16T00:00:00Z');
  esit(`${d.b}..${d.s}`, '2026-10-16..2026-10-31', 'dönem 2 (31 gün)');
  d = await donem('2027-02-20T12:00:00Z');
  esit(`${d.b}..${d.s}`, '2027-02-16..2027-02-28', 'dönem 2 (şubat)');
  d = await donem('2028-02-29T12:00:00Z');
  esit(`${d.b}..${d.s}`, '2028-02-16..2028-02-29', 'dönem 2 (artık yıl)');

  // --- Kova ayrımı (ertelenmiş tetikleyici) ---
  await db.exec(`
    update public.wallets set coins = coins + 5000 where user_id = '${U.A}';
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
      values ('${U.A}', 'coins', 5000, 105000, 'fruit_wheel_payout', 'game');
  `);
  await db.exec(`
    update public.wallets set coins = coins + 2000 where user_id = '${U.A}';
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
      values ('${U.A}', 'coins', 2000, 102000, 'welcome_bonus', 'system');
  `);
  let w = await cuzdan(U.A);
  esit(w.coins, 100000, 'oyun/ödül kredisi satın alınan kovada kalmaz');
  esit(w.game_coins, 5000, 'oyun kazancı game_coins kovasına');
  esit(w.bonus_coins, 2000, 'hoş geldin bonusu bonus_coins kovasına');

  // --- Satın alınan coin ile hediye: 40/60 ---
  const g1 = await hediye(U.A, U.B, 1, 'purchased');
  let e = await kazanc(g1.id);
  esit(e.gross_usd, '5.0000', '1000 coin → $5 paylaşılabilir gelir');
  esit(e.creator_usd, '2.0000', 'yayıncı %40 = $2');
  esit(e.platform_usd, '3.0000', 'platform %60 = $3');
  esit(e.agency_usd, '0.0000', 'ajanssız yayıncıda ajans payı yok');
  esit(e.net_usd, '2.0000', 'net = yayıncı payı');
  esit(e.channel, 'message', 'kanal mesaj');
  esit(e.eligible, true, 'satın alınan coin uygun');
  w = await cuzdan(U.A);
  esit(w.coins, 99000, 'satın alınan kovadan düşer');
  esit((await cuzdan(U.B)).diamonds, 1000, 'alıcı hediye puanı alır');

  // --- Ajans komisyonu platform payından ---
  const g2 = await hediye(U.A, U.C, 1, 'purchased');
  e = await kazanc(g2.id);
  esit(e.creator_usd, '2.0000', 'ajanslı yayıncının %40 payı kesilmez');
  esit(e.agency_usd, '0.4000', 'ajans payı (%20 × yayıncı payı)');
  esit(e.platform_usd, '2.6000', 'ajans payı platform payından düşer');

  // --- Oyun / ödül coin'i ile hediye: gelir oluşmaz ---
  const g3 = await hediye(U.A, U.B, 1, 'game');
  e = await kazanc(g3.id);
  esit(e.eligible, false, 'oyun coin hediyesi uygun değil');
  esit(e.ineligible_reason, 'game_coins', 'neden game_coins');
  esit(e.creator_usd, '0.0000', 'oyun coin hediyesi kazanç oluşturmaz');
  w = await cuzdan(U.A);
  esit(w.game_coins, 4000, 'oyun kovasından düşer');
  esit(w.coins, 98000, 'satın alınan kova değişmez');

  const g4 = await hediye(U.A, U.B, 1, 'bonus');
  e = await kazanc(g4.id);
  esit(e.ineligible_reason, 'bonus_coins', 'ödül coin hediyesi uygun değil');
  esit((await cuzdan(U.A)).bonus_coins, 1000, 'ödül kovasından düşer');

  await kullanici(U.A);
  await hataBekle(
    `select * from public.send_gift(null, $1, $2, 5, null, null, null, 'game', null)`,
    [U.B, HEDIYE],
    'Insufficient coins',
    'seçilen kova yetersizse diğer kovaya taşmaz',
  );
  esit((await cuzdan(U.A)).coins, 98000, 'başarısız hediye bakiye değiştirmez');

  // --- Çift kazanç engeli ---
  const k1 = await hediye(U.A, U.B, 1, 'purchased', 'tekrar-anahtar-1');
  const k2 = await hediye(U.A, U.B, 1, 'purchased', 'tekrar-anahtar-1');
  esit(k1.id, k2.id, 'aynı idempotency anahtarı aynı işlemi döner');
  esit((await cuzdan(U.A)).coins, 97000, 'tekrar çağrı ikinci kez düşmez');
  esit(
    await deger(`select count(*) from public.creator_earning_entries where source_id = $1`, [k1.id]),
    1,
    'tek kazanç kaydı',
  );
  esit(
    await deger(
      `select public.yayinci_kazanc_kaydi_olustur('gift', $1, $2, $3, 'message', 'purchased', 1000)`,
      [k1.id, U.B, U.A],
    ),
    'null',
    'aynı kaynak ikinci kez kazanca dönüşmez',
  );
  await hataBekle(
    `update public.creator_earning_entries set creator_usd = 99 where source_id = $1`,
    [k1.id],
    'değiştirilemez',
    'kazanç tutarı sonradan değiştirilemez',
  );
  await hataBekle(
    `delete from public.creator_earning_entries where source_id = $1`,
    [k1.id],
    'silinemez',
    'kazanç kaydı silinemez',
  );

  // --- Kendine hediye ---
  await kullanici(U.A);
  await hataBekle(
    `select * from public.send_gift(null, $1, $2, 1, null, null, null, 'purchased', null)`,
    [U.A, HEDIYE],
    'Cannot gift yourself',
    'kendine hediye engellenir',
  );
  const selfId = await deger(
    `select public.yayinci_kazanc_kaydi_olustur('gift', gen_random_uuid(), $1, $1, 'other', 'purchased', 1000)`,
    [U.B],
  );
  esit(
    await deger(`select ineligible_reason from public.creator_earning_entries where id = $1`, [selfId]),
    'self_gift',
    'kendi kendine gelir oluşmaz',
  );

  // --- Güvenlik bekletmeleri ---
  await db.exec(`insert into public.device_sessions (user_id, device_id) values ('${U.E}', 'cihaz-1'), ('${U.F}', 'cihaz-1')`);
  const g5 = await hediye(U.E, U.F, 1, 'purchased');
  e = await kazanc(g5.id);
  esit(e.hold_reason, 'shared_device', 'aynı cihazdaki hesaplar arası hediye bekletilir');
  esit(
    await deger(`select count(*) from public.finance_risk_flags where user_id = $1 and kind = 'shared_device'`, [U.F]),
    1,
    'risk bayrağı oluşur',
  );

  await db.exec(`insert into public.coin_purchases (user_id, coins_added, provider, store, status, receipt_payload)
    values ('${U.D}', 10000, 'apple', 'apple', 'completed', '{"environment":"sandbox"}')`);
  const g6 = await hediye(U.D, U.B, 1, 'purchased');
  esit((await kazanc(g6.id)).hold_reason, 'sandbox_funds', 'sandbox ödemesiyle alınan coin gelir sayılmaz (bekletilir)');

  // --- Ücretli görüşme: aynı 40/60 ---
  const call = await deger(
    `insert into public.direct_calls (caller_id, callee_id, status, answered_at, ended_at, is_paid, price_per_minute_snapshot, billing_status)
     values ($1, $2, 'ended', now() - interval '60 seconds', now(), true, 100, 'RESERVED') returning id`,
    [U.A, U.B],
  );
  const oncekiElmas = Number((await cuzdan(U.B)).diamonds);
  await db.query(`select public.kisiler_gorusme_billing_finalize($1)`, [call]);
  const c = await tek<Record<string, string>>(`select * from public.direct_calls where id = $1`, [call]);
  esit(c.gross_coin_amount, 100, 'görüşme ücreti 100 coin');
  esit(c.platform_fee_coins, 60, 'görüşmede platform %60');
  esit(c.creator_share_coins, 40, 'görüşmede yayıncı %40');
  esit(Number((await cuzdan(U.B)).diamonds) - oncekiElmas, 40, 'alıcıya 40 puan');
  e = await kazanc(String(call));
  esit(e.channel, 'call', 'görüşme kanalı');
  esit(e.creator_usd, '0.2000', 'görüşme kazancı USD %40');
  esit(e.platform_usd, '0.3000', 'görüşme platform payı USD %60');

  // --- Ödeme talebi ---
  const talep = (anahtar: string) =>
    db.query(`select * from public.yayinci_odeme_talebi_olustur($1)`, [anahtar]);
  await kullanici(U.B);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0001'], 'withdrawals_unavailable', 'çekim kapalıyken talep yok');
  await db.exec(`update public.test_flags set enabled = true where key = 'withdrawals_enabled'`);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0001'], 'kyc_required', 'KYC zorunlu');
  await db.exec(`insert into public.wallet_accounts values ('${U.B}', 'approved')`);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0001'], 'bank_account_required', 'banka hesabı zorunlu');
  await db.exec(`insert into public.user_bank_accounts values ('${U.B}', 'Test B', 'Banka', 'TR00 1234 5678 9012 3456 7890 12')`);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0001'], 'below_minimum', 'dönem bitmeden çekilemez');

  let oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.available_usd), 0, 'süren dönem çekilebilir değil');
  assert(Number(oz.pending_usd) > 0, 'süren dönem bekleyen olarak görünür');

  const gecmiseTasi = () =>
    db.exec(`update public.creator_earning_entries
      set period_start = current_date - 20, period_end = current_date - 5
      where creator_id = '${U.B}' and payout_request_id is null and paid_at is null`);
  await gecmiseTasi();
  await kullanici(U.B);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0001'], 'below_minimum', '$25 altı devreder');
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  const dusukBakiye = Number(oz.available_usd);
  assert(dusukBakiye > 0 && dusukBakiye < 25, 'minimum altı bakiye çekilebilir olarak korunur');
  esit(Number(oz.on_hold_usd), 2, 'sandbox bekletmesi ayrı gösterilir');

  await hediye(U.A, U.B, 11, 'purchased');
  await gecmiseTasi();
  await kullanici(U.B);
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  const beklenenTutar = Math.floor((dusukBakiye + 22) * 100) / 100;
  esit(Number(oz.available_usd).toFixed(2), beklenenTutar.toFixed(2), 'yeni kazanç çekilebilire eklenir');

  const r1 = (await talep('anahtar-0001')).rows[0] as Record<string, string>;
  esit(Number(r1.amount_usd).toFixed(2), beklenenTutar.toFixed(2), 'talep tutarı çekilebilir bakiye');
  esit(r1.status, 'pending', 'talep durumu Bekliyor');
  esit(r1.iban_masked, 'TR00 **** 9012', 'IBAN maskelenir');
  const tekrar = (await talep('anahtar-0001')).rows[0] as Record<string, string>;
  esit(tekrar.id, r1.id, 'aynı anahtar aynı talebi döner');
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0002'], 'open_request_exists', 'tek açık talep');
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.available_usd), 0, 'talep sonrası çekilebilir sıfır');
  esit(Number(oz.in_payout_usd).toFixed(2), beklenenTutar.toFixed(2), 'tutar ödeme sürecinde');

  await db.query(`select * from public.yayinci_odeme_talebi_iptal($1)`, [r1.id]);
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.available_usd).toFixed(2), beklenenTutar.toFixed(2), 'iptal edilen talep bakiyeye döner');

  const r2 = (await talep('anahtar-0003')).rows[0] as Record<string, string>;
  await admin(true);
  await hataBekle(`select * from public.admin_yayinci_odeme_durum($1, 'completed')`, [r2.id], 'invalid_transition', 'durum atlanamaz');
  await hataBekle(`select * from public.admin_yayinci_odeme_durum($1, 'on_hold')`, [r2.id], 'note_required', 'bekletme notu zorunlu');
  for (const s of ['under_review', 'approved', 'sent_to_bank', 'completed']) {
    await db.query(`select * from public.admin_yayinci_odeme_durum($1, $2)`, [r2.id, s]);
  }
  esit(
    await deger(`select string_agg(to_status, '>' order by created_at, to_status) from public.creator_payout_events where request_id = $1`, [r2.id]),
    'pending>under_review>approved>sent_to_bank>completed',
    'durum geçmişi kaydedilir',
  );
  await admin(false);
  await kullanici(U.B);
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.paid_usd).toFixed(2), beklenenTutar.toFixed(2), 'tamamlanan ödeme');
  esit(Number(oz.available_usd), 0, 'ödenen tutar tekrar çekilemez');
  esit(
    await deger(`select count(*) from public.test_bildirim where user_id = $1 and href = '/cuzdan/yayinci-kazanclari'`, [U.B]),
    4,
    'her durum değişikliğinde bildirim',
  );

  // --- Başarısız banka transferi bakiyeyi geri verir ---
  await hediye(U.A, U.B, 13, 'purchased');
  await gecmiseTasi();
  await kullanici(U.B);
  const r3 = (await talep('anahtar-0004')).rows[0] as Record<string, string>;
  await admin(true);
  for (const s of ['under_review', 'approved', 'sent_to_bank']) {
    await db.query(`select * from public.admin_yayinci_odeme_durum($1, $2)`, [r3.id, s]);
  }
  await db.query(`select * from public.admin_yayinci_odeme_durum($1, 'failed', 'IBAN hatalı')`, [r3.id]);
  await admin(false);
  await kullanici(U.B);
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.available_usd).toFixed(2), Number(r3.amount_usd).toFixed(2), 'başarısız transfer bakiyeye döner');

  // --- Yüksek riskli güvenlik incelemesi ---
  await admin(true);
  await db.query(`select * from public.admin_finans_risk_bayragi($1, 'manual_review', 'high', 'İnceleme')`, [U.B]);
  await admin(false);
  await kullanici(U.B);
  await hataBekle(`select * from public.yayinci_odeme_talebi_olustur($1)`, ['anahtar-0005'], 'security_review', 'güvenlik incelemesinde talep yok');
  oz = (await deger(`select public.yayinci_kazanc_ozeti()`)) as Record<string, unknown>;
  esit(Number(oz.available_usd), 0, 'incelemedeki tutar çekilebilir görünmez');
  assert(Number(oz.on_hold_usd) >= Number(r3.amount_usd), 'incelemedeki tutar bekletmede görünür');
  esit(Number(oz.paid_usd).toFixed(2), beklenenTutar.toFixed(2), 'ödenmiş tutar etkilenmez');

  // --- Ajans yüklemesi: ödül kovası + denetim ---
  await kullanici(U.AG_OWNER);
  await hataBekle(
    `select * from public.ajans_coin_transfer($1, $2, 500, 'ajans-1', 'paid_sale', null)`,
    [AJANS, U.D],
    'paid_sale_not_permitted',
    'ücretli satış olarak yükleme reddedilir',
  );
  await hataBekle(
    `select * from public.ajans_coin_transfer($1, $2, 500, 'ajans-1', 'operational_correction', null)`,
    [AJANS, U.D],
    'reason_required',
    'düzeltme yüklemesinde açıklama zorunlu',
  );
  const oncekiD = await cuzdan(U.D);
  await db.query(`select * from public.ajans_coin_transfer($1, $2, 500, 'ajans-1', 'promotion', 'Etkinlik ödülü')`, [AJANS, U.D]);
  const sonrakiD = await cuzdan(U.D);
  esit(Number(sonrakiD.bonus_coins) - Number(oncekiD.bonus_coins), 500, 'ajans yüklemesi ödül kovasına');
  esit(sonrakiD.coins, oncekiD.coins, 'ajans yüklemesi satın alınan kovaya yazılmaz');
  const denetim = await tek<Record<string, unknown>>(`select * from public.agency_coin_load_audit where recipient_id = $1`, [U.D]);
  esit(denetim.load_type, 'promotion', 'denetim kaydı yükleme türü');
  esit(denetim.actor_role, 'agency_owner', 'denetim kaydı yükleyen');
  await hataBekle(`delete from public.agency_coin_load_audit where recipient_id = $1`, [U.D], 'silinemez', 'denetim kaydı silinemez');
}

async function main() {
  await kur();
  await testler();
  console.log(`ekonomi-sql: ${passed} başarılı, ${failed} başarısız`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
