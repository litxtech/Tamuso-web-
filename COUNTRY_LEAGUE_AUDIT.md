# COUNTRY_LEAGUE_AUDIT

**Tarih:** 2026-09-24  
**Kapsam:** Ülke Katkısı / Dünya Ülke Ligi — mevcut altyapı taraması (kod yazılmadan önce)  
**Durum:** Audit tamamlandı. Country League henüz yok.

---

## 1. Özet kararlar

| Konu | Bulgu | Karar |
|------|-------|-------|
| Country League | Yok | **Yeni** projection + UI |
| City League | Tam stack mevcut | **Korunacak / genişletilecek** |
| İşlem Hacmi | TRY prestige projection | **Ayrı metrik** — country points olarak kullanma |
| Contribution unit | `contribution_points` yok | **Yeni** points ledger (para birimi toplama yok) |
| `profiles.country_code` | Var, ISO FK | **Reuse** + snapshot at earn time |
| `geo_countries` | TR/DE/US/GB seed; sadece TR profile_enabled | **Seed ISO world list**; league_enabled flag |
| Weekly reset | `sehir_hafta_kodu()` Europe/Istanbul `IYYY-"W"IW` | **Aynı standard** |
| IAP SOT | `coin_purchases` + `ai_music_purchases` | Trigger ile points projection (TV pattern) |
| Duplicate | — | City/TV tablolarını overload etme |

---

## 2. Profiles / country

| Artifact | Konum | Not |
|----------|-------|-----|
| `profiles.country` | `001_initial_schema.sql` | Görünen ad (TR metin) |
| `profiles.country_code` | `046_profil_cinsiyet_dogum_konum.sql` | FK → `geo_countries(code)` |
| Normalize SQL | `091_ulke_kodu_normalize.sql` → `ulke_koduna_normalize` | ISO alpha-2 |
| Normalize TS | `src/ortak/ulke/UlkeKodunaNormalizeEt.ts` | Client mirror |
| Profile update | `profil_guncelle` + `ProfilGuncelle.ts` | Auth-bound |
| Catalog RPC | `profil_konum_katalogu` | `profile_enabled` ülkeler |
| Picker UI | `app/profil-duzenle/index.tsx` | Tek ülke kilidi (`ulkeTek`) |
| Flag emoji | `KisilerYardimcilar.ts` → `ulkeBayragi` | Deterministik regional indicator |
| Localized names | `ulkeGorunenAd` + `Intl.DisplayNames` | People discovery pattern — **league UI için tercih** |
| Hardcoded ISO list | `KISILER_ULKE_KODLARI` (~60 kod) | Tam dünya listesi değil |

**Gap:** Dünya ISO seed yok. Profile picker çoğunlukla TR. Country change cooldown yok. Contribution snapshot yok (ülke değişince geçmiş taşınır riski — yeni sistemde engellenecek).

---

## 3. Geo / şehir sistemi (korunacak)

### Tablolar
- `geo_countries` — `code` PK, `name`, `is_active`, `profile_enabled`, `sort_order`
- `geo_regions`, `geo_cities` — `country_code`, `power_score` (all-time), `supporter_count`
- `user_supported_cities`, `city_roles`, `official_city_rooms`
- `city_league_seasons`, `city_league_standings` — sezon puanı
- `city_power_events` — event ledger (`gift|battle|election|support|manual`)
- `city_user_daily`, `city_missions`, `city_mission_progress`

### Katkı kaynağı (şehir)
**Hediye coin** → primary city (`trg_gift_sehir_gucu` → `sehir_gucu_hediyeden_uygula`).  
IAP satın alma şehir gücüne **bağlı değil**.

### Weekly
```sql
sehir_hafta_kodu() → to_char(now() at time zone 'Europe/Istanbul', 'IYYY-"W"IW')
```
Sezon satırları manuel; otomatik week rollover cron’u yok. `power_score` reset olmaz.

### Feature flags
`city_league_enabled`, `city_battles_enabled`, `city_elections_enabled`

### UI
`/sehir`, `/sehir/lig`, `/sehir/[id]`, home `city_league`, kesfet yükselen serit  
Admin: `/admin/sehirler`, `/admin/sehir-secim`

### Country ilişkisi
Şehirler `country_code` ile bağlı; ürün TR-merkezli. Country League city tab’ı bu join’i kullanabilir.

**Regression kuralı:** City League tabloları/RPC’leri değiştirilmeyecek; country ayrı projection.

---

## 4. İşlem Hacmi (şablon — metrik ayrı)

Migration: `20260923230000_islem_hacmi_sistemi.sql`  
Doc: `docs/odeme/islem-hacmi-rapor.md`

| Parça | Rol |
|-------|-----|
| `transaction_volume_eligibility` | Admin ON/OFF kategori |
| `transaction_volume_contributions` | Idempotent `unique(source_type, source_id)` — **TRY** |
| `user_transaction_volume_summary` | Aggregate + realtime |
| Privacy | FULL / TIER_ONLY / PRIVATE |
| Triggers | `coin_purchases` / `ai_music_purchases` (exception swallow) |
| Eligible | Verified Coin IAP, AI Music IAP |
| Excluded | welcome, admin grant, gifts, game wins, failed |

**Country Contribution bu tabloları kullanmayacak.** Aynı SOT’tan ayrı `contribution_points` projection.

---

## 5. Wallet / IAP / verified purchase

```
Store → iap-receipt-verify / stripe-webhook
  → coin_satin_al_onayla_servis → coin_purchases (completed)
AI Music → ai-music-iap-verify → ai_music_purchases (CREDITED)
```

- `coin_packages` / `ai_music_products` — `price_try` + store product IDs
- **product_id → contribution_points mapping yok** → oluşturulacak
- Refund: schema `refunded` / TV REFUNDED; store webhook otomasyonu yok (manuel status)
- Gifts: `gift_transactions` + `send_gift` — city power; country default **hariç**
- Agency transfers / welcome / admin grants — country default **hariç**

---

## 6. Leaderboard geneli

- `leaderboard_snapshots` — host/gifter/recharge; city board stub (kullanılmıyor)
- City weekly = `city_league_standings` + active season
- City all-time = `geo_cities.power_score`
- Realtime: city league yok; TV summary var

Country için: aggregate totals + weekly snapshot/archive (city season pattern + TV idempotency).

---

## 7. Feature flags / admin / i18n / privacy / notifications

| Alan | Pattern | Country için |
|------|---------|--------------|
| Flags | `feature_flags` + `OzellikBayragiAnahtarlari.ts` | `country_league_*` + kill |
| Admin hub | `app/admin/index.tsx` + islem-hacmi clone | `/admin/ulke-ligi` |
| i18n | `src/i18n/locales/{tr,en,es,ar}.ts` | `ulkeLigi` namespace |
| Privacy | `user_privacy_settings` + TV settings table | Ayrı country privacy settings |
| Push | `bildirim_kuyruga_ekle` + prefs | Opsiyonel; spam yok |
| Module layout | `src/moduller/islem-hacmi`, `sehir-ligi` | `src/moduller/ulke-ligi` |

---

## 8. Extend vs create

### Extend / reuse
- `geo_countries` (+ ISO seed, `league_enabled`)
- `profiles.country_code` + normalize helpers
- `ulkeBayragi` / `ulkeGorunenAd` / DisplayNames
- `sehir_hafta_kodu` timezone/week format
- IAP credit triggers pattern (TV)
- Feature flag + admin module + privacy settings pattern
- City `country_code` for Cities tab
- Home/menu entry pattern (`city_league`)

### Create (yeni)
- `country_contribution_eligibility`
- `country_contribution_product_map` (product_id → points)
- `country_contribution_events` (immutable EARN/REFUND/REVERSAL/ADJUSTMENT/PROMOTIONAL)
- `country_contribution_totals` (weekly + all-time aggregates)
- `country_user_contribution_totals` (per user×country weekly/all-time)
- `country_contribution_user_settings` (opt-in / leaderboard / profile)
- `country_league_week_snapshots` (history + rank movement)
- `country_league_audit`
- RPCs: leaderboard, detail, contributors, my contribution, settings, admin_*
- Triggers from verified purchases (country_code snapshot)
- UI: World league, country detail, feed entry, profile card
- Admin control center
- i18n TR/EN/ES/AR
- Country change cooldown config

### Do not create / do not reuse wrongly
- Duplicate payment ledger
- Sum TRY/USD/EUR into league score
- Overload `transaction_volume_*` or `city_power_events`
- Bundle all world cities into app
- GPS/IP auto-overwrite of profile country
- Aggressive purchase CTAs on league screens

---

## 9. Önerilen attribution modeli

1. Verified purchase finalize anında `profiles.country_code` **snapshot** → event satırı.
2. `product_id` → admin `contribution_points` mapping (yoksa eligibility OFF / 0).
3. Idempotent `(source_type, source_transaction_id)`.
4. Aggregate atomic increment: country totals + user×country totals.
5. Ülke değişimi geçmiş event’leri taşımaz.
6. Privacy: include_in_totals ON + show_on_leaderboard OFF → aggregate artar, identity gizlenir.
7. Refund → REFUND/REVERSAL event + aggregate düzeltme (geçmiş EARN sessiz edit yok).
8. Closed week refund: **all-time düzeltilir**; historical weekly snapshot **korunur**, canlı weekly sadece açık hafta etkilenir (TV/city tutarlı politika — raporda belgelenecek).

---

## 10. Uygulama sırası (spec ile uyumlu)

1. ~~Audit~~ ← bu dosya  
2. Data model + migration  
3. Server/RPC + contribution engine  
4. Leaderboard + city integration  
5. UI  
6. Admin  
7. Privacy/RLS  
8. Realtime  
9. i18n/RTL  
10. Test + final report  

---

## 11. Riskler / bilinçli gap’ler

| Risk | Not |
|------|-----|
| Store refund webhook yok | Manuel `refunded` + trigger; otomasyon ileride |
| City season auto-rollover yok | Country week snapshot cron/RPC eklenecek; city’ye dokunulmayacak |
| Profile sadece TR enabled | League için `geo_countries` league_enabled açılır; profile_enabled ayrı kalabilir |
| IAP skip-verify env | Mevcut platform durumu; country engine completed/CREDITED’e güvenir |
| 200+ country seed | Client localization DisplayNames; DB code list |

---

## 12. Dosya referansları (hızlı)

```
supabase/migrations/009_faz8_sehir.sql
supabase/migrations/083_sehir_gucu_sistemi.sql
supabase/migrations/085_sehir_modern_platform.sql
supabase/migrations/086_sehir_modern_rpcler.sql
supabase/migrations/046_profil_cinsiyet_dogum_konum.sql
supabase/migrations/091_ulke_kodu_normalize.sql
supabase/migrations/20260923230000_islem_hacmi_sistemi.sql
src/moduller/sehir-ligi/
src/moduller/sehirler/
src/moduller/islem-hacmi/
src/moduller/kisiler-kesif/utils/KisilerYardimcilar.ts
src/ortak/ulke/UlkeKodunaNormalizeEt.ts
app/sehir/lig.tsx
app/islem-hacmi/index.tsx
app/admin/islem-hacmi/index.tsx
docs/odeme/islem-hacmi-rapor.md
```
