# TAMUSO — Ödeme, Coin ve Oyun Denetimi

- **Tarih:** 30 Ekim 2026
- **Veri kaynağı:** Production Supabase (`vdkqrqtrftzhbtquzked`) üzerinde **yalnızca okuma** sorguları + kaynak kod + Build 35 `main.jsbundle`
- **Kural:** Hiçbir yazma işlemi yapılmadı; hiçbir bayrak/RPC değiştirilmedi.

---

## 0. Yönetici özeti (en kritik 5 bulgu)

| # | Bulgu | Kanıt | Kural | Risk |
|---|---|---|---|---|
| P1 | Gerçek para kazancı (`USD`, banka havalesi, çekim ücreti, min. tutar) iOS cüzdanında **görünür ve "çekilebilir"** yazıyor; fakat `cekim_talebi_olustur` yetkisi **revoke** | `host_earnings_ledger=247`, `withdrawal_requests=0`, RPC `auth_exec=false` | 2.3.1 / 5.6 | **Kritik** |
| P2 | Ajans kanalı **TRY fiyatlı** coin satıyor (`99–2499 TL`), iOS dışında; canlıda 2 transfer tamamlanmış | `agency_coin_packages` (10 paket), `agency_coin_transfers=2` | 3.1.1 | **Yüksek** |
| P3 | Stripe sunucuda **açık** (`stripe_enabled=true`), `payment_orders=10`; iOS istemcisi stub | canlı bayrak + `payment_orders` | 3.1.1 | Yüksek |
| P4 | Oyun sonucu belirleme altyapısı (`game_cikis_*`, `fruit_wheel_admin_force_next`) hâlâ veritabanında; **kapalı** ama binary'de ekranı var | migration `20261025090300`, RPC yetkileri | 2.5.19 / 5.6 | Yüksek |
| P5 | Production'da **1e17 coin** admin yüklemesi ve 25 Ekim'de **39 satırlık `legacy_source_split`** ile coin türü yeniden sınıflandırması | `wallet_ledger` | 5.6 / finansal bütünlük | Yüksek |

---

## 1. Ödeme mimarisi (katman katman)

```text
┌──────────────────────────────────────────────────────────────┐
│ iOS istemci (Build 35)                                       │
│  CoinPaketiSatinAl()                                          │
│   ├─ iOS/Android  → IapIleCoinSatinAl()      → StoreKit      │
│   ├─ web          → StripeCheckoutBaslat()   → Stripe        │
│   └─ __DEV__      → CoinSatinAlOnayla(manual) → RPC          │
└──────────────────────────────────────────────────────────────┘
            │                          │
            ▼                          ▼
   iap-receipt-verify          stripe/webhook
            │                          │
            └────────► wallets / wallet_ledger ◄──── ajans-pay
```

```ts
// src/moduller/iap/islemler/CoinPaketiSatinAl.ts:16-53 (özet)
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  const iap = await IapIleCoinSatinAl(pkg);
  ...
}
// Web / diğer: Stripe
if (!(await OzellikBayragiAktifMiSunucu('stripe_enabled'))) { ... }
const stripe = await StripeCheckoutBaslat({ packageId: pkg.id });
```

**Değerlendirme:** Dijital coin için iOS'ta doğru yol (IAP) seçilmiş. Sorun, **diğer kanalların arka planda açık kalması** ve **iOS UI'ının bunları hâlâ göstermesi**.

---

## 2. IAP — çalışıyor (doğrulandı)

| Ölçüm | Değer |
|---|---|
| `coin_packages` toplam | **70** |
| Aktif paket | 4 |
| `apple_product_id` boş | **0** |
| `google_product_id` boş | **0** |
| Fiyat aralığı | `$0.00` – `$9999.99` (63 farklı fiyat) |
| `coin_purchases`: `apple/completed` | **14** |
| `coin_purchases`: `manual/completed` | **2** (geliştirme testi) |

**Yorum:**
- IAP akışı production'da gerçekten çalışmış (14 tamamlanmış Apple satın alımı, `iap-receipt-verify` ile doğrulanmış).
- Ancak **70 paketin 66'sı pasif** ve fiyatlar `$0.00` ile `$9999.99` arasında. `$9999.99` bir coin paketi, inceleme sırasında "aşırı yüksek fiyat" olarak dikkat çekebilir (2.3.1 değil, ama 3.1.1 fiyat şeffaflığı açısından soru işareti).
- `manual` satırlar `__DEV__` fallback'inden geliyor; production binary'de `__DEV__=false` olduğu için erişilemez (**D**).

---

## 3. Stripe — iOS'ta stub, sunucuda açık

| Katman | Durum | Kanıt |
|---|---|---|
| iOS UI | **Kapalı** | `StripeUygulamaIciOdemeYap.ios.ts` stub |
| Ajans satış linki (iOS) | **Kapalı** | `AjansSatisLinkAcilisEkrani.ios.tsx` → "Harici ödeme yok" |
| Bayrak | **AÇIK** | `stripe_enabled = true` |
| Edge function | **Canlı** | `supabase/functions/stripe-webhook`, `stripe-checkout` |
| Ödeme kaydı | **10** | `payment_orders` |
| Binary'de metin | **Var** | `en.ts` içinde `stripe`, harici ödeme uyarıları |

**Risk:** Apple, sunucu tarafını göremez; ama:
1. Review notunda "external payments removed" yazıp bayrağın `true` olması **5.6 çelişkisi**.
2. iOS kullanıcısı bir **web linkine** (bio, banner, mesaj) tıklayıp Stripe ile coin alabilir; uygulama içinde "harici ödeme yok" demek bunu engellemez.
3. `payment_orders` tablosunda 10 sipariş, kanalın **gerçekten kullanıldığını** gösteriyor.

**Doğrulanamadı (E):** Bu 10 siparişin iOS kullanıcılarına mı ait olduğu (cihaz/UA bilgisi yok).

---

## 4. Ajans kanalı — TRY fiyatlı, IAP dışı

```sql
-- agency_coin_packages (canlı)
ajans_p01  "Başlangıç"   99.00 TL   990 coin
ajans_p02  "Standart"   249.00 TL  2490 coin
ajans_p03  "Standart"   499.00 TL  4990 coin
ajans_p04  "Popüler"    999.00 TL  9990 coin
ajans_p05  "Popüler"   2499.00 TL 24990 coin
```

- **10 TL = 100 coin** sabit oran; `indirim_yuzde=20`.
- `agency_coin_transfers`: **2 tamamlanmış** transfer (50.000 coin, 5.000 coin).
- `agency_wallet_ledger`: 1 satır.
- Edge function: `ajans-pay`.
- iOS'ta `/ajans/satis/[kod]` **stub** → uygulama içinden satın alma yok (**D**).

**Ama:** Ajans, kullanıcıya **kendi kanalından** (havale/EFT, WhatsApp, web) coin yükleyebiliyor. Bu coinler iOS uygulamasında harcanabiliyor. Apple bunu **3.1.1** (dijital içerik için IAP zorunluluğu) kapsamında değerlendirebilir; özellikle "reader app" istisnası yok.

**Doğrulanamadı (E):** Ajans ödemelerinin uygulama içinden mi yoksa tamamen harici mi yapıldığı. iOS stub'ı **uygulama içi** satın almayı engelliyor; **harici** satın almayı engellemiyor.

---

## 5. Gerçek para: yayıncı kazançları ve çekim

Bu, Apple açısından **en hassas** bölüm.

### 5.1 Veri modeli (canlı kod)

```ts
// src/moduller/cuzdan/yayinci/YayinciKazancIslemleri.ts:49-64
available_usd: number;
in_payout_usd: number;
paid_usd: number;
creator_share: number;
platform_share: number;
payout_min_usd: number;
payout_fee_usd: number;
withdrawals_enabled: boolean;
payout_method: 'bank_transfer';
```

- Gelir kalemleri: `source_type: 'gift' | 'call'`, `coin_source: 'purchased' | 'game' | 'bonus'`.
- Kesintiler: `deductions_usd`, `agency_usd`, `platform_usd`.
- Ödeme yöntemi: **banka havalesi**.

### 5.2 Gerçek hacim

| Tablo | Satır |
|---|---|
| `host_earnings_ledger` | **247** |
| `agency_earnings_ledger` | **35** |
| `wallet_ledger` `gift_sent` | 300 işlem, **−31.159.699 coin** |
| `wallet_ledger` `gift_received` | 212 işlem, **+24.702.322 elmas** |
| `withdrawal_requests` | **0** |

**Yorum:** Hediye gönderiminde **~%20,7** coin→elmas kaybı var (31,16M → 24,70M). Bu, platform + ajans payıdır. Kullanıcıya bu oranın açıkça gösterilip gösterilmediği **doğrulanamadı (E)** — kodda `show_platform_share` ayarı var, varsayılan `true`, ama canlı UI'da görünürlüğü test edilmedi.

### 5.3 Kritik çelişki: "çekilebilir" yazıyor, çekim çalışmıyor

```tsx
// src/moduller/cuzdan/bilesenler/CuzdanimBolumleri.tsx:157-171
{!ozet.withdrawals_enabled ? (
  <Text>{t('cuzdanY.cekimKullanilamiyor')}</Text>
) : bekleyenUsd > 0 ? (
  <Text>{t('cuzdanY.bekleyen')}: {UsdYazi(bekleyenUsd, locale)}</Text>
) : (
  <Text>{t('cuzdanY.cekilebilir')}</Text>   // ← "çekilebilir"
)}
```

Canlı bayraklar:

```
withdrawals_enabled       = true    ← UI'yı açan bayrak
wallet_withdraw_enabled   = false   ← ikinci bayrak
```

Sunucu RPC yetkisi:

```
cekim_talebi_olustur   auth_exec = false   (revoke edilmiş)
cekim_wallet_bayrak_kontrol  → çağrılabilir
```

**Sonuç:** Kullanıcı cüzdanda **"$X çekilebilir"** görüyor, IBAN formunu dolduruyor, gönderdiğinde RPC yetkisiz olduğu için hata alıyor. `withdrawal_requests` tablosunun **0 satır** olması bunu doğruluyor: hiçbir çekim tamamlanmamış.

**Apple açısından:**
- 2.3.1: Uygulama "para kazandırır/çekebilirsin" diyor ama çalışmıyor → **yanıltıcı**.
- 5.6: Review notunda "payout removed" denirse, UI'da "çekilebilir" yazması **doğrudan çelişki**.
- 3.1.1: Gerçek para kazancı, uygulama içi satın alınan coinlerden üretiliyor → dijital içerik + nakit çıkışı kombinasyonu.

---

## 6. Oyunlar

### 6.1 Envanter ve canlı durum

| Oyun | Rota | `game_control_configs.is_enabled` | Bayrak | Ledger |
|---|---|---|---|---|
| Fruit Wheel | `app/oyun/fruit-wheel.tsx` | **true** (NORMAL) | `fruit_wheel_enabled=true` | 233 tur |
| Storm King | `app/oyun/storm-king.tsx` | **false** | `storm_king_enabled=false` | 133 bet / 73 win |
| Zeus | `app/oyun/zeus.tsx` | **false** | `zeus_enabled=false` | 615 bet |
| Kozmik Kaskad | `app/oyun/kaskad.tsx` | **false** (MAINTENANCE) | `kozmik_kaskad_enabled=false` | 554 bet |
| Nox Reels | `app/oyun/nox.tsx` | **false** (MAINTENANCE) | `nox_reels_enabled=false` | — |
| Fair Spin | `app/oyun/fair-spin.tsx` | — | `fair_spin_enabled=false` | 83 bet |
| Astral Falls | `app/oyun/astral-falls.tsx` | — | `astral_falls_enabled=false` | 62 bet |
| Match3 | — | false (MAINTENANCE) | — | — |

**Geçmiş hacim (kapatılmadan önce):** Kaskad 1,84M coin bahis, Storm King 4,6M coin kazanç, Fair Spin/Astral/Zeus toplam ~180K coin. Yani bu oyunlar **gerçek kullanıcılarla oynanmış**, sadece test değil.

### 6.2 Fruit Wheel — şeffaflık (iyi uygulama)

Canlı `fruit_wheel_olasiliklar()` çıktısı:

| Meyve | Çarpan | Olasılık | RTP |
|---|---|---|---|
| cherry / lemon / orange / watermelon | 5× | 0,193861 | 0,969305 |
| grape | 10× | 0,096931 | 0,969305 |
| strawberry | 15× | 0,064620 | 0,969305 |
| pineapple | 25× | 0,038772 | 0,969305 |
| kiwi | 40× | 0,024233 | 0,969305 |

```
version: 3
independent_rounds: true
admin_outcome_control: false
```

Politika: `economy_mode = PLATFORM_APPROVED_COIN`, `minimum_age_policy = 18`, `minimum_selection = 10`, `maximum_total_per_round = 500000`, `force_next_fruit_id = null`.

**Değerlendirme:** Olasılık ve RTP **kamuya açık RPC** ile yayımlanıyor; `app/oyun/fruit-wheel-kurallar.tsx` ekranı da var. Bu, 5.3/5.6 açısından **güçlü bir savunma malzemesidir**. Ancak:
- Pratik ledger oranı: `fruit_wheel_payout / fruit_wheel_selection = 14.068.810 / 17.844.444 = %78,8`. Teorik %96,93 ile fark var. **Neden:** 148 seçim / 59 ödeme satırı var; tur bazlı mutabakat yapılmadan bu fark **yorumlanamaz (B)**. Rapora "kanıtlanmış sapma" olarak yazılmamalıdır.
- `minimum_age_policy = 18` iken App Store yaş derecelendirmesi **17+** olmalı. ASC'ye erişim yok (**E**), ancak daha düşük bir derecelendirme girildiyse **2.3.1** ihlali olur.

### 6.3 Sonuç belirleme altyapısı — kapalı ama yerinde

25 Ekim migration'ı (`20261025090300_oyun_seffaflik.sql`) ile:

| İşlem | Sonuç |
|---|---|
| `game_cikis_oyun.aktif = false` | Plan devre dışı |
| `game_cikis_cek()` → `null` | Sonuç plandan okunamaz |
| `game_cikis_storm_baslat/bitir` → no-op | Kuyruk üretilemez |
| `game_cikis_sira_kaydet`, `kural_ekle`, `taban_kaydet`, `bps_kaydet`, `yetki` → **revoke** | Admin dahi çağıramaz |
| `fruit_wheel_pick(force)` sadece `TEST_BALANCE` | `PLATFORM_APPROVED_COIN` modunda imkânsız |
| `fruit_wheel_admin_force_next` → `test_only` guard | Doğrulandı (gövde okundu) |

Canlıda doğrulandı:
```
game_cikis_oyun aktif satır = 0
game_cikis_kural            = 0
game_cikis_sira_kaydet      auth_exec = false
fruit_wheel_policy.economy_mode = PLATFORM_APPROVED_COIN
fruit_wheel_policy.force_next_fruit_id = null
```

**Ama binary'de:** `./admin/cikis-plani.tsx`, `game_cikis`, `TEST_BALANCE`, `force_next` dizgileri **duruyor**. Apple binary'yi incelerse "sonuç belirleme" ekranını görür; sunucunun kapalı olduğunu göremez.

### 6.4 Coin türü ayrımı (25 Ekim sonrası)

`wallets` artık 4 para birimi taşıyor: `coins`, `diamonds`, `game_coins`, `bonus_coins`.

```
wallet_ledger.legacy_source_split (2026-10-25, 39 satır)
  coins        −100.000.000.075.238.147
  bonus_coins  +100.000.000.053.659.602
  game_coins   +21.578.545
```

`coin_bakiye_gecis_incelemesi` tablosu her kullanıcı için **kaynak ayrımını** kaydediyor (`purchased_verified`, `purchased_unverified`, `game_wins`, `promo_credits`) ve `needs_review` işaretliyor. 38 kullanıcıdan **3'ü** inceleme bekliyor; biri **admin hesabı** (`298908eb-…`, `coins_before = 99.999.999.974.115.655`).

**Neden önemli:** Bu, "satın alınan coin ile oyun kazancı karışıyordu" endişesine karşı **doğru yönde** atılmış bir adımdır. Ancak:
- `reviewed_by` / `reviewed_at` alanları **boş** → inceleme tamamlanmamış.
- Kaynak ayrımı **yeni**; eski turlar `legacy` olarak sınıflandı.

### 6.5 Production'daki 1e17 coin anomalisi

```
2026-09-17  admin_topup   100.000.000       coin
2026-10-05  admin_topup   100.000.000.000.000.000  coin   ← 1e17
```

14 `admin_topup` kaydı toplam **1,000000001e17 coin** üretti. Bu, admin hesabında duruyor ve cüzdan bakiyesi olarak temsil ediliyor.

**Apple açısından:** Eğer bir inceleme hesabı veya normal kullanıcı bu bakiyeyi görebiliyorsa (liderlik tablosu, hediye, oda), "gerçek dışı ekonomi" izlenimi doğar. Bu bir **5.6 manipülasyon** argümanı değil, ama **veri bütünlüğü** sorunudur ve inceleme sırasında görülürse açıklama gerektirir.

---

## 7. Ücret ve kesinti şeffaflığı

| Kalem | Kodda | Kullanıcıya gösterim | Durum |
|---|---|---|---|
| Platform payı (varsayılan %10) | `AdminPlatformIslemleri.ts:235` | `show_platform_share` (varsayılan true) | **Kısmen** |
| Ajans payı | `agency_earnings_ledger` | `ledgerAgencyCommission` etiketi | **Kısmen** |
| Hediye komisyonu (~%20,7) | ledger farkı | ? | **Doğrulanamadı (E)** |
| Çekim ücreti (`payout_fee_usd`) | `YayinciKazancIslemleri.ts:59` | Çekim ekranında | **Doğrulanamadı (E)** |
| Minimum çekim (`payout_min_usd`) | aynı | Çekim ekranında | **Doğrulanamadı (E)** |

**Not:** Çekim ekranı açılıyor ama gönderim çalışmıyor (§5.3). Bu yüzden "ücret gösteriliyor mu" sorusunun pratik önemi yok — özellik fiilen ölü.

---

## 8. Kural bazlı değerlendirme

| Kural | Uyum | Gerekçe |
|---|---|---|
| **3.1.1** IAP zorunluluğu | **Kısmen** | iOS'ta coin IAP ile satılıyor (doğru), ancak ajans/Stripe kanalları sunucuda açık; harici satın alma engellenmiyor |
| **3.1.1** Gerçek para çıkışı | **Riskli** | Yayıncı kazançları USD ve banka havalesi; kaynak "purchased coin" olabiliyor |
| **5.3** Oyun/kumar | **Kısmen** | Simüle kumar; RTP yayımlanıyor (iyi), ama 18+ politikası ASC derecelendirmesiyle uyumlu olmalı |
| **2.3.1** Doğru metadata | **İhlal riski** | "Çekilebilir" yazıp çekimin çalışmaması; mağaza metninde oyun/ödeme belirsizliği |
| **2.5.19** Gizli işlev | **İhlal** | Admin sonuç/bakiye ekranları binary'de, beyan edilmemiş (bkz. `HIDDEN_FEATURES_REPORT.md`) |
| **5.6** Yanıltıcı davranış | **Yüksek** | Review notu taslağı ile canlı bayraklar/RPC'ler çelişiyor |

---

## 9. Bulgu tablosu

| # | Bulgu | Dosya | Satır | Kanıt | Kural | Risk | Durum |
|---|---|---|---|---|---|---|---|
| P1 | "Çekilebilir" USD + çalışmayan çekim | `CuzdanimBolumleri.tsx` | 157-171 | `withdrawals_enabled=true`, RPC revoke, `withdrawal_requests=0` | 2.3.1, 5.6 | **Kritik** | Doğrulandı |
| P2 | Ajans TRY satışı, IAP dışı | `agency_coin_packages` | 10 paket | 99–2499 TL, 2 transfer | 3.1.1 | Yüksek | Doğrulandı |
| P3 | Stripe sunucuda açık | `feature_flags` | — | `stripe_enabled=true`, `payment_orders=10` | 3.1.1 | Yüksek | Doğrulandı |
| P4 | Sonuç planı altyapısı DB'de | `20261025090300_oyun_seffaflik.sql` | 14-58 | `aktif=0`, RPC revoke | 2.5.19, 5.6 | Yüksek | Doğrulandı |
| P5 | 1e17 coin admin yüklemesi | `wallet_ledger` | 2026-10-05 | `admin_topup` | 5.6 | Yüksek | Doğrulandı |
| P6 | Kaynak ayrımı denetimi yarım | `coin_bakiye_gecis_incelemesi` | — | `reviewed_by IS NULL` | 5.6 | Orta | Doğrulandı |
| P7 | Hediye komisyonu şeffaflığı | `wallet_ledger` | — | 31,16M → 24,70M | 2.3.1 | Orta | Olası |
| P8 | 18+ politika vs ASC yaşı | `fruit_wheel_policy` | — | `minimum_age_policy=18` | 2.3.1, 5.3 | Orta | İncelenemedi |
| P9 | $9999.99 üst fiyatlı paket | `coin_packages` | — | `max(price_usd)` | 3.1.1 | Düşük | Doğrulandı |
| P10 | Manuel (dev) coin onayı | `CoinPaketiSatinAl.ts` | 30-41 | `__DEV__` guard | — | Düşük | Doğrulandı (D) |

---

## 10. Sonuç

1. **Ödeme tarafında en büyük sorun IAP değil; IAP dışı kanalların açık kalması ve "çekilebilir" vaadinin çalışmaması.**
2. **Oyun tarafında en büyük sorun** artık sonuç kontrolü değil (25 Ekim'de kapatıldı); **binary'de duran kontrol ekranları** ve **production'daki 1e17 coin anomalisi**.
3. **En hızlı kazanç:** iOS'ta çekim/kazanç bölümünü tamamen gizlemek veya gerçekten çalışır hale getirmek; `withdrawals_enabled` ile `wallet_withdraw_enabled` çelişkisini tek bayrağa indirmek.
4. **En büyük hukuki risk:** Satın alınan coinlerin oyun kazancı ve nakit çıkışıyla birleşmesi. 25 Ekim kaynak ayrımı doğru yönde ama **tamamlanmamış** (`reviewed_by` boş).
