# Tamuso — Ekonomi migration'ları: yedekleme, uygulama sırası, doğrulama ve geri dönüş

Bu belgedeki hiçbir adım çalıştırılmadı. Canlı veritabanına yalnızca okuma sorguları yapıldı.

## 0. Ön koşullar

- Supabase panelinde **Point-in-Time Recovery** veya en az bir **manuel yedek** alınmış olmalı (Database → Backups).
- Uygulama sırasında bakım penceresi: `kill_gift_send`, `kill_withdrawal`, `kill_agency_coin_transfer` kill switch'leri kısa süre açılabilir (opsiyonel; migration'lar tek transaction içinde çalışır).
- Edge function sırları tanımlı olmalı (yoksa `iap-receipt-verify` 503 döner, coin satın alımı çalışmaz):
  `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_BUNDLE_ID`, `APPLE_IAP_PRIVATE_KEY`,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`.

## 1. Yedekleme (migration'lardan hemen önce)

```sql
-- Tablo anlık görüntüleri (aynı veritabanında, RLS kapalı şema)
create schema if not exists yedek_20261025;
create table yedek_20261025.wallets              as select * from public.wallets;
create table yedek_20261025.wallet_ledger_son    as select * from public.wallet_ledger where created_at > now() - interval '120 days';
create table yedek_20261025.feature_flags        as select * from public.feature_flags;
create table yedek_20261025.platform_economy_config as select * from public.platform_economy_config;
create table yedek_20261025.coin_packages        as select * from public.coin_packages;
create table yedek_20261025.coin_trade_offers    as select * from public.coin_trade_offers;
create table yedek_20261025.game_cikis_oyun      as select * from public.game_cikis_oyun;
create table yedek_20261025.people_discovery_config as select * from public.people_discovery_config;
create table yedek_20261025.game_control_configs as select * from public.game_control_configs;
revoke all on all tables in schema yedek_20261025 from anon, authenticated;

-- Değişecek fonksiyonların CANLI tanımları (geri dönüşte birebir yeniden oluşturmak için)
create table yedek_20261025.fonksiyonlar as
select p.oid::regprocedure::text as imza, pg_get_functiondef(p.oid) as tanim
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'send_gift', 'kisiler_gorusme_billing_finalize', 'ekonomi_config_getir',
  'storm_king_settle', 'storm_king_abort', 'fruit_wheel_pick',
  'game_cikis_cek', 'game_cikis_storm_baslat', 'game_cikis_storm_bitir',
  'ajans_coin_transfer'
);

-- Fonksiyon yetkileri (085900 ve 090400 geri alınırsa)
create table yedek_20261025.fonksiyon_yetkileri as
select p.oid::regprocedure::text as imza, p.proacl::text as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';
```

Ön kontrol değerleri (kaydedin):

```sql
select count(*) cuzdan, sum(coins) coin, sum(diamonds) elmas from public.wallets;
select count(*) from public.coin_trade_offers where status = 'pending_buyer';
select status, count(*) from public.coin_trade_offers group by 1;
```

## 2. Uygulama sırası

| Sıra | Migration | Ne zaman |
|---|---|---|
| 1 | `20261025085900_acil_finans_yetki_kapatma` | **Hemen** (bağımsız güvenlik düzeltmesi; veri değiştirmez) |
| 2 | `20261025090000_cuzdan_bakiye_ayrimi` | Bakım penceresinde, 3–8 ile birlikte |
| 3 | `20261025090100_yayinci_gelir_paylasimi` | |
| 4 | `20261025090200_yayinci_odeme` | |
| 5 | `20261025090300_oyun_seffaflik` | |
| 6 | `20261025090400_pasif_finans_kapat` | |
| 7 | `20261025090500_ajans_yukleme_denetim` | |
| 8 | `20261025090600_coin_paket_tarife` | Aktif paketleri değiştirmez |

Ardından edge function'lar: `iap-receipt-verify`, `storm-king-spin` (ve `_shared/iap`, `_shared/storm-king`).
En son yeni uygulama sürümü. **Yeni istemci, migration'lar uygulanmadan yayımlanmamalı**: istemci `send_gift`'e
`p_coin_source`/`p_channel`, `ajans_coin_transfer`'e `p_load_type`/`p_reason` gönderir ve
`yayinci_kazanc_ozeti`, `fruit_wheel_olasiliklar` RPC'lerini çağırır.

Önerilen ilk adım: migration'ları bir **Supabase branch** veya yedekten açılmış kopya veritabanında çalıştırıp
aşağıdaki doğrulamayı orada yapmak.

## 3. Doğrulama (her migration grubundan sonra)

```sql
-- Toplam coin korunur (090000 yalnızca kovalara ayırır)
select sum(w.coins + w.game_coins + w.bonus_coins) yeni_toplam,
       (select sum(coins) from yedek_20261025.wallets) eski_toplam
from public.wallets w;

-- Kullanıcı bazında fark olmamalı (0 satır)
select w.user_id from public.wallets w
join yedek_20261025.wallets y using (user_id)
where w.coins + w.game_coins + w.bonus_coins <> y.coins;

-- Sınıflandırma raporu (manuel inceleme)
select needs_review, count(*), sum(purchased_after), sum(game_after), sum(bonus_after)
from public.coin_bakiye_gecis_incelemesi group by 1;

-- Pay oranları
select public.ekonomi_config_getir();          -- creator_share 0.40, platform_share 0.60, payout_min_usd 25
select platform_call_fee from public.people_discovery_config where id = 1;  -- 0.60

-- Kapatılan özellikler
select key, enabled from public.feature_flags
where key in ('wallet_exchange_enabled','wallet_sell_enabled','wallet_withdraw_enabled','withdrawals_enabled');
select * from public.coin_takas_kapatma_incelemesi order by created_at;

-- Yetki kapatma (085900): authenticated false olmalı
select has_function_privilege('authenticated',
  'public.coin_satin_al_onayla_servis(uuid,uuid,text,text,text,text,numeric,jsonb)', 'execute');
```

Canlı veriden okuma ile yapılan ön izleme (25 Ekim 2026):
- Coin bakiyesi olan 18 cüzdan var; toplam korunuyor.
- Doğrulanmış satın alma kaydı olan tek kaynak 2 Stripe ödemesi (1.980 coin). 14 Apple alımı `sandbox_skip` (test parası).
- Bu nedenle bakiyelerin çoğu ödül kovasına ayrılır (oyun kazancı 21.578.545 coin oyun kovasına).
  Bir hesapta yaklaşık 1e17 coin var (test/admin hesabı olmalı); ödül kovasına geçer, gelir oluşturmaz.
  Hiçbir bakiye silinmez veya sıfırlanmaz; kayıtlar `coin_bakiye_gecis_incelemesi` tablosunda incelemeye açıktır.

## 4. Geri dönüş

Genel kural: kazanç defteri (`creator_earning_entries`), denetim tabloları ve inceleme tabloları **silinmez**;
geri dönüş yalnızca davranışı eski haline getirir.

| Migration | Geri dönüş |
|---|---|
| 085900 | Önerilmez (açık bir güvenlik açığını yeniden açar). Gerekirse `yedek_20261025.fonksiyon_yetkileri`'ndeki ACL'ler geri yazılır. |
| 090000 | Kovalar birleştirilir, toplam korunur: `update public.wallets set coins = coins + game_coins + bonus_coins, game_coins = 0, bonus_coins = 0;` ve `drop trigger wallet_ledger_coin_kaynak_trg on public.wallet_ledger;` (eski istemci yalnızca `coins` okur). Sütunlar kalabilir. |
| 090100 | `yedek_20261025.fonksiyonlar`'daki `send_gift(...)` ve `kisiler_gorusme_billing_finalize` tanımları çalıştırılır; yeni 9 parametreli `send_gift` düşürülür; `gift_tx_agency_commission_trg` tetikleyicisi 008 migration'ındaki tanımla yeniden oluşturulur; `people_discovery_config.platform_call_fee` yedekteki değere döner. |
| 090200 | Kullanıcı RPC'lerinin `execute` yetkisi kaldırılır. Açık talepler admin tarafından `cancelled` yapılır (kazançlar bakiyeye döner). |
| 090300 | `storm_king_settle`/`storm_king_abort`/`fruit_wheel_pick` yedek tanımlardan geri yüklenir. Admin sonuç planı (`game_cikis_*`) **yeniden açılmamalıdır**. Oyun bayrakları ve `game_control_configs` yedekten geri yazılabilir. Storm King'i açmadan önce ödeme tablosu düzeltilmeli. |
| 090400 | Takas/transfer fonksiyonlarına yetki yedek ACL ile geri verilir, bayraklar yedekten geri yazılır. Yapılmış iadeler geri alınmaz. |
| 090500 | Yedekteki 4 parametreli `ajans_coin_transfer` tanımı yeniden oluşturulur, 6 parametreli sürüm düşürülür. Denetim tablosu kalır. |
| 090600 | Aktif paketleri değiştirmediği için geri dönüş gerekmez. Plan uygulandıysa `yedek_20261025.coin_packages`'tan geri yazılır. |

Edge function'lar: Supabase panelinden önceki sürüme dönülebilir (`iap-receipt-verify` v74, `storm-king-spin` v6 şu an canlı).
