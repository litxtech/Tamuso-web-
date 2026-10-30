# I18N_AUDIT

> Generated: 2026-09-24T11:26:02.290Z
> Phase 1 only — inventory / gap analysis. **No claim of translation completion.**

## === TAMUSO i18n AUDIT ===

| Field | Value |
|-------|-------|
| Toplam Screen (app routes) | **148** |
| Toplam User Screen | **99** |
| Toplam Admin Screen | **49** |
| Toplam Route (same as screens in Expo Router) | **148** |
| Toplam Tab | **8** |
| Toplam Modal (`<Modal` JSX non-admin) | **42** |
| Toplam Bottom Sheet / named Sheet-Modal files | **21** |
| Panel/Sheet-like components | **45** |
| Toplam Alert/Dialog (`Alert.alert`) | **908** |
| Alert non-admin | 545 |
| Alert admin | 363 |
| Hard-coded user-visible string (heuristic props+Alert) | **538** in **142** files |
| Mevcut translation key (approx leaf strings in tr.ts) | **1008** |
| Çevrilmiş ekran (LIKELY_TRANSLATED user) | **14** |
| Kısmi ekran (PARTIAL user) | **49** |
| Eksik ekran (NOT_TRANSLATED user) | **36** |
| Admin NOT_TRANSLATED | **49** / 49 |

## Mevcut localization sistemi

- Libraries: `i18next`, `react-i18next`, `expo-localization` (installed)
- Provider: `src/i18n/DilSaglayici.tsx` wired in `app/_layout.tsx`
- Hook: `src/i18n/useCeviri.ts`
- Locales today: **tr / en / es** as monolithic TS objects under `src/i18n/locales/`
- **ar locale: MISSING**
- Domain JSON namespaces (`locales/tr/common.json` etc.): **NOT YET**
- Persistence: AsyncStorage `ayarlar.dil` + best-effort `profiles.language`

## Mevcut desteklenen diller (code)

- Code: `tr, en, es`
- Runtime fallback in code: **`tr`** (WRONG vs plan — plan requires **en**)
- Default language in code: **tr** (plan wants device detect → unsupported → **en**)
- SYSTEM / MANUAL language_mode: **NOT IMPLEMENTED**
- Device locale auto-detect via expo-localization: **NOT WIRED**
- Arabic RTL / I18nManager: **NOT IMPLEMENTED**
- `check:i18n` CI script: **NOT IMPLEMENTED** (inventory script exists only)

## Eksik localization alanları (priority gaps)

1. **Architecture gaps vs master plan**
   - Fallback language must switch TR → **EN**
   - Add **ar** + RTL
   - Split monolothic locale TS → domain JSON namespaces
   - SYSTEM vs MANUAL language mode + Settings redesign
   - Startup: no language flash; resolve before main UI
   - Completeness script + missing-key logging

2. **Coverage gaps**
   - 36 user routes with zero i18n hook
   - 49 user routes partial (mostly titles only)
   - 49 admin routes untouched (plan now includes admin static UI)
   - ~538 remaining hard-coded UI strings (heuristic; undercount vs full AST)
   - 545 non-admin Alert.alert call sites still mostly hard-coded
   - Overlay/sheet/panel bodies largely untranslated
   - Module UI under `src/moduller/**` still Turkish-first

3. **Country system gaps**
   - `geo_countries` seeded with few countries; profile_enabled historically TR-centric
   - No ISO world country dataset + Intl.DisplayNames localization yet
   - Country picker / search-by-localized-name not production-ready for all countries

4. **Native / push**
   - iOS `CFBundleLocalizations` currently tr/en/es — ar missing
   - Permission strings in `app.config.ts` English-only
   - Push notification localization server-side: not audited in this phase

## Category gap table

| Category | Screens | NOT_TRANSLATED | PARTIAL | LIKELY |
|----------|--------:|---------------:|--------:|-------:|
| AUTH | 7 | 1 | 2 | 4 |
| HOME | 6 | 1 | 4 | 1 |
| PROFILE | 13 | 7 | 4 | 2 |
| MESSAGING | 2 | 1 | 0 | 1 |
| VOICE | 4 | 2 | 1 | 1 |
| LIVE | 3 | 3 | 0 | 0 |
| CALLS | 1 | 1 | 0 | 0 |
| PEOPLE | 2 | 1 | 0 | 1 |
| WALLET | 3 | 0 | 3 | 0 |
| AI_MUSIC | 5 | 0 | 5 | 0 |
| AGENCY | 19 | 15 | 4 | 0 |
| CITY | 6 | 0 | 6 | 0 |
| GAMES | 4 | 0 | 4 | 0 |
| SETTINGS | 6 | 0 | 4 | 2 |
| MODERATION | 4 | 1 | 1 | 2 |
| IDEAS | 4 | 0 | 4 | 0 |
| HOST_KYC | 3 | 0 | 3 | 0 |
| SHARE_PLATFORM | 6 | 2 | 4 | 0 |
| OTHER_USER | 1 | 1 | 0 | 0 |
| ADMIN | 49 | 49 | 0 | 0 |

## Top hard-coded files (heuristic)

| Hits | File |
|-----:|------|
| 26 | `app/cuzdan/takas.tsx` |
| 21 | `app/ajans/[id]/ayarlar.tsx` |
| 18 | `app/ajans/index.tsx` |
| 18 | `app/room/[id].tsx` |
| 15 | `app/mesaj/[id].tsx` |
| 14 | `src/moduller/oda-muzik/bilesenler/AdminMuzikPaneli.tsx` |
| 13 | `app/ai-muzik/[id].tsx` |
| 11 | `app/ai-muzik/index.tsx` |
| 11 | `app/fikirler/olustur.tsx` |
| 11 | `app/host/index.tsx` |
| 11 | `src/moduller/ses-odalari/bilesenler/OdaKapakDuzenlePaneli.tsx` |
| 8 | `app/ajans/[id]/islemler.tsx` |
| 8 | `app/kullanici/[id].tsx` |
| 8 | `app/kyc/index.tsx` |
| 8 | `app/sehir/[id].tsx` |
| 7 | `app/ajans/profil/[id]/index.tsx` |
| 7 | `app/canli/index.tsx` |
| 7 | `app/durum/[id].tsx` |
| 7 | `app/platform/index.tsx` |
| 7 | `app/sehir/secim/[id].tsx` |
| 6 | `app/ajans/[id]/gorevler.tsx` |
| 6 | `app/ajans/[id]/uyeler/[userId].tsx` |
| 6 | `app/sehir/index.tsx` |
| 6 | `src/moduller/oda-muzik/bilesenler/OdaMuzikKutuphanesiSheet.tsx` |
| 5 | `app/ai-muzik/kutuphane.tsx` |
| 5 | `app/ajans/[id]/canli.tsx` |
| 5 | `app/ajans/[id]/davetler.tsx` |
| 5 | `app/hesap-sil/index.tsx` |
| 5 | `src/moduller/ai-muzik/bilesenler/AiMuzikSatinAlmaSheet.tsx` |
| 5 | `src/moduller/ai-muzik/bilesenler/AiMuzikSeekCubugu.tsx` |
| 5 | `src/moduller/cuzdan/bilesenler/CuzdanBankaKarti.tsx` |
| 5 | `src/moduller/cuzdan/islemler/useCoinYuklePaneli.ts` |
| 5 | `src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti.tsx` |
| 5 | `src/moduller/oda-sohbeti/bilesenler/OdaCanliYorumComposer.tsx` |
| 5 | `src/moduller/ses-odalari/bilesenler/OdaProfilKartiPaneli.tsx` |
| 4 | `app/ajans/teklifler.tsx` |
| 4 | `app/ajans/[id]/analitik.tsx` |
| 4 | `app/ajans/[id]/etkinlikler.tsx` |
| 4 | `app/ajans/[id]/guvenlik.tsx` |
| 4 | `app/bildir/index.tsx` |

## Current i18n namespaces (monolithic tr.ts)

- `ortak`
- `sekmeler`
- `ayarlar`
- `auth`
- `profil`
- `profilDuzenle`
- `misafirHesap`
- `mesajlar`
- `odalar`
- `cuzdan`
- `durum`
- `bildirimler`
- `bildirimAyar`
- `destek`
- `guvenlik`
- `politika`
- `takip`
- `ajans`
- `sehir`
- `oyun`
- `aiMuzik`
- `fikirler`
- `kyc`
- `canli`
- `host`
- `siralamalar`
- `kesfet`
- `modlar`
- `kisiler`
- `engellenen`
- `hesapSil`
- `islemHacmi`
- `gizlilik`
- `kisilerAyar`
- `satinAlma`
- `bildir`
- `raporlarim`
- `duyuru`
- `pk`
- `paylasim`
- `sertifikasyon`
- `platform`
- `takas`
- `anaSayfa`
- `cuzdanX`
- `profilTab`
- `olusturTab`
- `cihazlar`
- `genel`

## Next phase order (per master plan §131)

1. ~~ENVANTER~~ ← this document
2. i18n MİMARİSİ (en fallback, ar+RTL, SYSTEM/MANUAL, domain namespaces, no flash)
3. ÇEVİRİ (all screens/modals/alerts — stop claiming done early)
4. RTL
5. ÜLKE SİSTEMİ
6. HARD-CODE SWEEP
7. TEST + `check:i18n`
8. FINAL RAPOR

## Honesty notes

- Prior piecemeal translation (title-only `t()` wiring) is **PARTIAL**, not complete.
- Hard-coded scanner is regex heuristic — will undercount dynamic strings and overcount some technical strings. Final phase needs AST/CI scanner.
- No screen marked TESTED — no device QA in this phase.
- Toast/Snackbar library usage: none found; toasts appear as custom Views in games.
