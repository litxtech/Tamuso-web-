# === TAMUSO COUNTRY LEAGUE REPORT ===

**Tarih:** 2026-09-24  
**Audit:** `COUNTRY_LEAGUE_AUDIT.md`  
**Migration (local):** `supabase/migrations/20260924175718_country_league_sistemi.sql`  
**Remote:** schema + engine + RPCs applied; ISO 249 countries seeded.

---

## AUDIT
- Existing city system: **Korundu** (`geo_cities.power_score`, `city_league_*`, gift→city trigger). Üzerine ayrı country projection.
- Existing leaderboard: City season standings + unused `leaderboard_snapshots` city stubs — country için **yeni** totals/snapshots.
- Existing transaction ledger: `coin_purchases` + `ai_music_purchases` SOT; İşlem Hacmi TRY projection **ayrı** bırakıldı.
- Existing country fields: `profiles.country_code` + `geo_countries` + `ulke_koduna_normalize` **reuse**.

## COUNTRIES
- Total countries: **249** ISO 3166-1 alpha-2 (`league_enabled=true`)
- ISO validation: code length 2 + `geo_countries` FK
- Flags: `ulkeBayragi` (regional indicators) — custom URL yok; RTL mirror yok
- TR/EN/ES/AR names: UI `Intl.DisplayNames` + `ulkeGorunenAd` (DB name canonical EN/`Türkiye`)

## CONTRIBUTION
- Eligible sources (default ON): `coin_iap`, `stripe_coin`, `ai_music_iap`, `stripe_ai_music`
- Excluded (default OFF): admin_grant, promo_reward, game_win, gift, welcome_bonus
- Server calculation: `cl_resolve_points(product_id)` → admin `country_contribution_product_map`
- Transaction snapshot: `country_contribution_events.country_code` immutable at earn
- Idempotency: unique `(source_type, source_transaction_id)` for EARN
- Refund: REFUND event; closed-week policy → **all_time corrected; weekly only if same open week**; historical snapshot immutable
- Chargeback: same path as refund via purchase `status=refunded` (store webhook otomasyonu yok — mevcut platform)

## WORLD LEAGUE
- Weekly: `cl_week_id()` = `sehir_hafta_kodu()` Europe/Istanbul `IYYY-"W"IW`
- All-time: `country_contribution_totals.all_time_points`
- Ranking: points DESC, `reached_at` ASC, `country_code` ASC
- Tie-break: deterministic (reached_at + code)
- Rank movement: önceki `country_league_week_snapshots` varsa `rank_delta`
- History: week snapshots via `admin_country_league_close_week`

## COUNTRY DETAIL
- Hero: `UlkeHeroKart` (CamArkaplan + glass)
- Contributors: privacy-gated RPC pagination
- Cities: `geo_cities` by `country_code` / `power_score` (existing city data)
- Current user card: `UlkeKullaniciKart` on world list

## PRIVACY
- Contribution opt-in/out: `include_in_totals`
- Leaderboard visibility: `show_on_leaderboard`
- Profile visibility: `show_on_profile` + `show_country_on_profile`
- Private API projection: raw events admin-only RLS; public via SECURITY DEFINER RPCs

## CITY INTEGRATION
- World → Country → City → User hierarchy preserved
- Existing City League regression: city tables/RPCs untouched

## ADMIN
- Global switch: `country_league_*` feature flags + `kill_country_league_display`
- Source config: eligibility toggles
- Product mapping: editable points
- Country enable/disable: `geo_countries.league_enabled` + audit
- Audit: `country_league_audit`
- Screen: `/admin/ulke-ligi`
- Promo: `PROMOTIONAL` event type (not real purchase)

## SECURITY
- RLS: aggregates readable; events admin; settings own
- RPC: `get_country_*`, `get_my_*`, `set_*`, `admin_*`
- Server authority: client cannot write points
- Client manipulation test: **TEST EDİLEMEDİ** (device)

## REALTIME
- Country totals: `country_contribution_totals` in `supabase_realtime`
- User contribution: focus refresh / my RPC
- Ranking refresh: pull-to-refresh + focus

## i18n
- TR / EN / ES: `ulkeLigi` namespace
- AR: `ar.json` `ulkeLigi`
- RTL: flag/numbers LTR writingDirection; row-reverse layout

## PERFORMANCE
- Indexes: weekly/all-time rank indexes on totals + user×country
- Pagination: cursor rank / keyset contributors
- Cache: client DisplayNames; server aggregates
- N+1: batch RPC rows (no per-row profile fetch on country board)

## BUILD
- TypeScript: **TEST EDİLEMEDİ** (full `tsc`)
- Lint: touched modules — agent ReadLints pending session
- Tests: SQL smoke OK (feature_on, pack1=400 pts, board enabled empty)
- iOS / Android device: **TEST EDİLEMEDİ**

## MIGRATIONS
- Local: `20260924175718_country_league_sistemi.sql`
- Remote applied pieces: `country_league_schema`, helpers/triggers/RPCs (via MCP parts), ISO seed via execute_sql (249)

## CHANGED FILES (özet)
- `COUNTRY_LEAGUE_AUDIT.md`
- `supabase/migrations/20260924175718_country_league_sistemi.sql`
- `src/moduller/ulke-ligi/**`
- `app/ulke/index.tsx`, `app/ulke/[code].tsx`
- `app/admin/ulke-ligi/index.tsx`
- `app/admin/index.tsx`, `app/kesfet.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`
- `app/ayarlar/gizlilik.tsx`
- `src/moduller/ozellik-bayraklari/*`, `AdminOzellikEtiketleri.ts`
- `src/i18n/locales/{tr,en,es}.ts`, `ar.json`

## UNVERIFIED / TEST EDİLEMEDİ
1. Gerçek Apple/Google IAP → contribution EARN (device)
2. Refund webhook otomasyonu (platformda yok)
3. Country change TR→ES contribution stay (manual SQL/user flow)
4. Duplicate webhook retry idempotency under load
5. Concurrent aggregate lost-update stress
6. Full RTL visual QA on device
7. Feature OFF route hard-block beyond UI+RPC `enabled:false`
8. Week close + rank movement UI with real previous snapshot
9. Full `tsc` / EAS build
10. Live User A→B privacy leak RPC test

## POLICY NOTE (refund after week closed)
All-time aggregate **always** adjusted. Live weekly adjusted **only if** earn `week_id` equals current `cl_week_id()`. Historical `country_league_week_snapshots` **not rewritten**.

## SMOKE (remote)
- `cl_feature_on` = true  
- `coin_iap` eligibility = true  
- `tamuso_coin_pack_1` → **400** contribution points  
- `get_country_leaderboard` → enabled, week `2026-W39`, rows []  
- `geo_countries` = **249** / league **249**
