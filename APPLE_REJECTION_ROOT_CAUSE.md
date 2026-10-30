- TAMUSO — Apple Reddi Kök Neden Analizi
- **Rapor tarihi:** 30 Ekim 2026
- **İncelenen build:** iOS **1.3.1 (build 35)**, bundle `com.litxtech.muta`, EAS build ID `b8ce52db-9280-47e8-ac79-01dc2f90064a`, commit `4724bbc`
- **Ret gerekçesi:** Guidelines **2.5.19** (Performance – Software Requirements) ve **5.6** (Developer Code of Conduct)
- **Yöntem:** Kaynak kod okuma, Git geçmişi, EAS build/submission kayıtları (salt okunur), **EAS'te saklanan build 35 IPA'sının indirilip açılması**, canlı Supabase'e **yalnızca SELECT** sorguları.
- **Yapılmayanlar:** Hiçbir kod/DB/build/deploy değişikliği yapılmadı. Hiçbir bayrak değiştirilmedi. Bu 5 rapor dosyası dışında dosya oluşturulmadı.

---

## 0. Kısa cevap

Apple'ın mesajı tek bir ekran adı vermiyor. Bu yüzden "Apple tam olarak şunu gördü" demek **teknik olarak kanıtlanamaz**. Ancak build 35'in içinden ve canlı sunucudan doğrulanabilen kanıtlarla, reddi en iyi açıklayan **iki teknik gerçek** var:


2. **Uygulamanın iOS binary'sinde, normal kullanıcıların hiç görmediği bir yönetim konsolu var** — 119 ekranlık `app/admin/`* ağacı, bunun içinde oyun sonucu belirleme ("çıkış planı"), oyun algoritması/RTP ayarı, kullanıcı coin bakiyesi düzeltme ve finans ekranları. Bu, 2.5.19'un tarif ettiği **"hidden functionality"** kategorisine birebir uyar ve binary analizinde oturum açmadan bile görülebilir.
3. **Coin ile bahis alınan Meyve Çarkı oyunu canlıda tüm kullanıcılara açık**, mağaza açıklaması/review notlarında ise ya hiç yok ya da "sosyal mini oyun" olarak geçiyor. Bu, "materially different from the features presented during review and described in the app's metadata" cümlesinin **"misleading/undocumented"** tarafına oturur.

Kısa hüküm: **Reddin en güçlü teknik nedeni, iOS binary'sine derlenmiş gizli yönetim/oyun-sonuç kontrol panelidir; ikinci en güçlü neden, metadata'da yer almayan coin bahisli oyunlardır.** İkisi de bu raporda dosya/satır ve binary dizgisi düzeyinde kanıtlanmıştır.

> Önemli ayrım: "Apple hangi ekranı gördü" **doğrulanamadı (E)**. "Binary'de ne var", "canlı sunucuda ne açık", "kod ne yapıyor" **doğrulandı (A)**.

---

## 1. Doğrulama yöntemi ve sınırlar

### 1.1 Doğrulanan kaynaklar

| Kaynak | Ne yapıldı | Sonuç |
|---|---|---|
| EAS build listesi | `eas build:list --platform ios` | En güncel iOS build: **1.3.1 (35)**, commit `4724bbc`, tamamlanma 2026-10-25 11:04 |
| EAS artefaktı | Build 35 IPA'sı indirildi (`artifacts/eas/gn6ZWNXI...ipa`, 106.896.416 bayt) | Açıldı; `Payload/Tamuso.app/main.jsbundle` (18.824.585 bayt) incelendi |
| IPA içeriği | `Info.plist`, `Frameworks/`, JS bundle dizgileri | Aşağıdaki bulgular |
| Canlı Supabase | Yalnızca `SELECT` / `pg_proc` okuma | Feature flag, oyun konfigürasyonu, RPC yetkileri |
| Kaynak kod | `app/`, `src/`, `supabase/`, `app.config.ts`, `eas.json`, `metro.config.js` | Dosya/satır kanıtları |
| Git | `git log`, `git status`, `git diff --stat` | Build ile çalışma ağacı farkı |

### 1.2 Doğrulanamayanlar (E)

- **App Store Connect'e erişim yok.** Canlıda yayınlanan açıklama, ekran görüntüleri, yaş derecelendirmesi ve **gönderilen review notlarının gerçek içeriği** okunamadı. Depodaki `TAMUSO_APP_STORE_METINLERI.md` bir **taslaktır**; bunun build 35 ile gönderildiği kanıtlanamaz.
- **Reddin hangi build'e ait olduğu** ve red tarihi bilinmiyor.
- **Apple'ın hangi analiz aracını kullandığı** bilinmiyor. Bu raporda "Apple şu aracı kullanır" gibi bir iddia yoktur.
- İnceleme hesabının kimliği/şifresi yok; **reviewer oturumu birebir canlandırılamadı**.
- Gerçek para hareketleri (banka çekimi, Stripe tahsilatı) kullanıcı verisi olmadan doğrulanamaz; yalnızca mekanizma doğrulandı.

---

## 2. Build 35 binary'sinden doğrulanan gerçekler

### 2.1 Build kimliği

| Alan | Değer |
|---|---|
| Sürüm | 1.3.1 |
| Build numarası | 35 |
| Bundle ID | `com.litxtech.muta` |
| Commit | `4724bbc` |
| Build tamamlanma | 2026-10-25 11:04 UTC |
| IPA boyutu | 106.896.416 bayt |
| `main.jsbundle` | 18.824.585 bayt (Hermes/JS) |
| `UIBackgroundModes` | `remote-notification`, `audio`, `voip` |
| `expo-updates` | **Yok** (OTA kapalı) |
| Native Stripe framework | **Yok** (`Frameworks/` içinde Stripe yok) |
| Agora framework'leri | **Var** (AgoraRtcKit vb. ~30 framework) — RTC sağlayıcı LiveKit olmasına rağmen |

### 2.2 JS bundle içinde bulunan rota modülleri (doğrudan dizgi kanıtı)

`main.jsbundle` içinde aşağıdaki **rota dosyası dizgileri** birebir bulundu. Expo Router, `app/` altındaki her dosyayı bundle'a dahil ettiği için bu, ekranların binary'de olduğunun kanıtıdır:

| Dizgi | Anlamı |
|---|---|
| `./admin/cikis-plani.tsx` | **Oyun sonucu belirleme ("çıkış planı") ekranı** |
| `./admin/oyun-algoritma/index.tsx` | **Oyun algoritması / RTP ayar ekranı** |
| `./admin/kaskad-yonetim.tsx` | Oyun yönetim ekranı (47 KB) |
| `./admin/oyun-test.tsx` | Ücretsiz/admin test oyunu |
| `./admin/fruit-wheel.tsx` | Çark yönetimi |
| `./admin/index.tsx` | Yönetim konsolu girişi |
| `./admin/app-launch/*` | Uygulama açılış/duyuru yönetimi |
| `./oyun/zeus.tsx`, `./oyun/nox.tsx`, `./oyun/kaskad.tsx`, `./oyun/fair-spin.tsx`, `./oyun/astral-falls.tsx`, `./oyun/sis-spin.tsx`, `./oyun/dede.tsx` | Kullanıcıya kapalı oyun motorlarının ekranları |
| `./oyun/fruit-wheel.tsx` | Canlı olan çark oyunu |
| `./cuzdan/takas.tsx` | Coin takas ekranı (rota stub'ı) |
| `./ai-muzik/index.tsx`, `./ai-muzik/[id].tsx` | AI Müzik rota stub'ları |
| `./ajans/satis/[kod].tsx` | Ajans satış linki rota stub'ı |
| `./webview.tsx` | Uygulama içi WebView |
| `./tanitim/yatirim.tsx` | "Yatırım" tanıtım sayfası |

### 2.3 JS bundle içinde bulunan hassas dizgiler

| Dizgi | Adet | Yorum |
|---|---|---|
| `withdrawal_requests` | 1 | Banka çekimi tablosu |
| `user_bank_accounts` | 1 | Kayıtlı banka hesabı |
| `coin_trade_offers` | 1 | Kullanıcılar arası coin takası |
| `wallet_withdraw_enabled` | 1 | Çekim bayrağı |
| `wallet_sell_enabled` | 1 | "Coin sat" bayrağı |
| `Diamond withdrawal` | 1 | Elmas → para çekimi metni |
| `saved bank account` | 1 | Kayıtlı banka hesabı metni |
| `Stripe payment via authorized agency instead of {{magaza}}` | 1 | **iOS'ta kullanılmayan** harici ödeme metni (i18n dosyasından) |
| `game_cikis` | 6 | Sonuç planı RPC'leri |
| `TEST_BALANCE` | 1 | Test/bakiye modu |
| `force_next` | 1 | Sonucu zorlama parametresi |
| `expo-updates` | 0 | OTA yok |

### 2.4 iOS'a özel uyumluluk katmanı da binary'de (önemli nüans)

Build 35'te **iOS'a özel ekran gövdeleri** bulundu; generic (Android/web) gövdeleri **bulunmadı**:

| Dizgi | Build 35'te | Anlamı |
|---|---|---|
| `AiMuzikIos` | **Var** | `/ai-muzik` iOS'ta ana sayfaya redirect |
| `TakasIos` | **Var** | `/cuzdan/takas` iOS'ta cüzdana redirect |
| `IosHariciOdemeYok` | **Var** | Harici ödeme yerine bilgi ekranı |
| `AiMuzikStudyo` | **Yok** | AI stüdyo gövdesi iOS'a girmemiş |
| `CuzdanTakasEkrani` | **Yok** | Takas gövdesi iOS'a girmemiş |
| `AjansSatisLinkAcilis` | **Yok** | Ajans satış gövdesi iOS'a girmemiş |

**Sonuç:** Ekip, AI Müzik / coin takası / harici ödeme ekranlarını iOS'ta gerçekten devre dışı bırakmış. Bu, teknik olarak doğru bir yöntemdir. **Ancak** bu ekranların *rota stub'ları*, *i18n metinleri* ve *sunucu uçları* binary'de kalmaya devam ediyor. Yani "iOS binary'sinden tamamen kaldırıldı" ifadesi **dar anlamda doğru, geniş anlamda yanlıştır**.

---

## 3. Canlı sunucudan doğrulanan gerçekler (30 Ekim 2026, salt okunur)

### 3.1 Feature flag durumu

| Bayrak | Canlı | Son güncelleme | Yorum |
|---|---|---|---|
| `games_enabled` | **true** | 2026-09-21 | Oyun platformu açık |
| `fruit_wheel_enabled` | **true** | 2026-10-02 | **Meyve Çarkı canlı** |
| `storm_king_enabled` | false | 2026-10-25 08:28 | Remediation ile kapatıldı |
| `zeus_enabled` / `nox_reels_enabled` / `kozmik_kaskad_enabled` | false | 2026-10-25 08:28 | Kapatıldı |
| `stripe_enabled` | **true** | 2026-09-10 | Sunucuda harici ödeme kanalı hâlâ açık |
| `iap_enabled` | true | 2026-09-10 | IAP açık |
| `ai_music_enabled` | **true** | 2026-09-23 | Sunucuda açık; iOS'ta ekran redirect |
| `agency_enabled` | true | 2026-09-10 | Ajans sistemi açık |
| `people_paid_calling_enabled` | **true** | 2026-09-24 | Dakikalık ücretli arama açık |
| `wallet_exchange_enabled` | false | 2026-10-25 08:28 | Takas kapalı |
| `wallet_sell_enabled` | false | 2026-10-25 08:28 | Coin sat kapalı |
| `wallet_withdraw_enabled` | false | 2026-10-25 08:28 | Cüzdan "Çekim" sekmesi kapalı |
| `withdrawals_enabled` | **true** | **2026-10-25 08:32** | "Para çekimi (eski)" — aşağıdaki kritik çelişki |

### 3.2 Oyun konfigürasyonu

`game_control_configs`:

| Oyun | `is_enabled` | Mod |
|---|---|---|
| `fruit_wheel` | **true** | NORMAL |
| `storm_king` | false | NORMAL |
| `zeus` | false | NORMAL |
| `fair_spin` | false | LOW_REWARD |
| `astral_falls` | false | LOW_REWARD |
| `kozmik_kaskad` / `nox_reels` / `match3` | false | MAINTENANCE |

### 3.3 Sonuç planı (exit plan) sunucuda devre dışı

| Kontrol | Sonuç |
|---|---|
| `game_cikis_oyun` aktif satır | **0** |
| `game_cikis_kural` | **0** |
| `game_cikis_storm_baslat` gövdesi | `select jsonb_build_object('ok', false);` |
| `game_cikis_sira_kaydet` → `authenticated` yetkisi | **false (revoke edilmiş)** |

Bu, `20261025090300_oyun_seffaflik.sql` migration'ının canlıya uygulandığını gösterir. **Ancak bu bir sunucu düzeltmesidir; ekranlar hâlâ binary'dedir.**

### 3.4 Bakiye düzeltme RPC'leri hâlâ var

| Fonksiyon | `authenticated` çalıştırabilir | Koruma |
|---|---|---|
| `admin_cuzdan_duzelt(p_user_id, p_currency, p_delta, p_reason)` | true | `ben_admin_miyim()` |
| `admin_kullanici_coin_isle(p_user_ref, p_islem, p_miktar, p_not)` | true | admin kontrolü |

### 3.5 Çekim RPC'si kapatılmış ama bayrak açık

| Fonksiyon | `authenticated` |
|---|---|
| `cekim_talebi_olustur` | **false (revoke)** |
| `cekim_wallet_bayrak_kontrol` | true |
| `yayinci_cekim_aktif_mi` | true |

**Kritik çelişki:** `withdrawals_enabled = true` (eski elmas çekimi bayrağı) iken `cekim_talebi_olustur` yetkisi kaldırılmış. Build 35'in cüzdan kodu bu bayrağı **"Çekim" sekmesini göstermek için** kullanıyor (bkz. §4.1). Sonuç: **iOS kullanıcısı cüzdanda "Çekim" sekmesini görür, elmas → IBAN formunu açar, talebi gönderince sunucu reddeder.**

---

## 4. En güçlü 10 ret ihtimali (kanıt gücüne göre sıralı)

Sıralama; (a) Apple'ın redinde kullandığı ifadeye uyum, (b) doğrudan binary/kod kanıtı, (c) reviewer'ın normal bir incelemede karşılaşma olasılığı ile belirlendi.

### #1 — iOS binary'sinde gizli yönetim konsolu + oyun sonucu kontrolü

**Neden en güçlü:** 2.5.19 tam olarak "hidden functionality" diyor. Bu, binary analizinde oturum açmadan görülebilen tek kategori. Ayrıca 5.6'nın "manipulative behavior" ifadesiyle birebir örtüşen bir ekran adı var: **çıkış planı**.

| Kanıt | Dosya / konum |
|---|---|
| Admin ağacı bundle'da | `./admin/*` dizgileri (build 35 `main.jsbundle`) |
| 119 admin rota dosyası | `app/admin/**` |
| Mobilde admin içeriği render ediliyor | `app/admin/_layout.tsx:1-7` → `AdminWebKabuk`; `src/moduller/admin/web/AdminWebKabuk.tsx:45-48` (`masaustu` değilse `<Slot />`) |
| Oyun sonucu belirleme | `app/admin/cikis-plani.tsx:158` → *"Sıra kesin çıkar."*; `:188-189` → *"Küre çıktığında üstten alta bu değerler gelir."* |
| Algoritma / RTP ayarı | `app/admin/oyun-algoritma/index.tsx:41-48`, `:100-135` |
| Bakiye düzeltme | `src/moduller/admin/kullanici/islemler/AdminKullaniciCoinIsle.ts:30-35` (`admin_kullanici_coin_isle`); `src/moduller/admin/platform/AdminPlatformIslemleri.ts:65` (`admin_cuzdan_duzelt`) |
| Erişim kapısı yalnızca `is_admin` | `src/moduller/admin/yetki/AdminYetkisiVarMi.ts:4-6` |

**Değerlendirme:** Admin panelinin varlığı tek başına ihlal değildir; rol tabanlı erişim meşrudur. İhlal riski şuradan doğar: uygulama **mağaza metninde ve review notunda bir yönetim konsolu olduğunu hiç söylemiyor**, konsolun içinde **oyun sonucu belirleme** ekranı var ve bu ekranın adı/metaları binary'de okunabiliyor. Apple bunu "review sırasında gösterilmeyen, ama uygulamada bulunan işlev" olarak değerlendirebilir.

### #2 — Metadata'da yer almayan coin bahisli oyun (Meyve Çarkı) canlıda açık

| Kanıt | Dosya / konum |
|---|---|
| Oyun canlı | `feature_flags.fruit_wheel_enabled = true`; `game_control_configs.fruit_wheel.is_enabled = true` |
| Ses odasından erişim | `app/room/[id].tsx:3156` → `OyunOdaKatmani`; `:185` import |
| Global kazanç duyurusu | `src/moduller/oyunlar/kazanc-balonu/OyunKazancBalonuSaglayici.tsx:22-29` (ana akış + odalar + ses odası) |
| Bahis, satın alınan coin'den | `TAMUSO_APP_STORE_METINLERI.md:196` (ekibin kendi notu: `PLATFORM_APPROVED_COIN`) |
| Kurallar ekranı olasılık/RTP gösteriyor (iyi) | `src/moduller/oyunlar/fruit-wheel/ekranlar/FruitWheelKurallar.tsx:26-38` |

**Değerlendirme:** Mağaza metni (canlı sürüm) doğrulanamadı; depodaki taslak metinde Meyve Çarkı **var** (yani yeni gönderimde beyan edilmiş olabilir). Build 35'in gönderildiği metin bilinmiyor. Eğer o gönderimde açıklamada oyun yoksa, Apple'ın "materially different from the metadata" ifadesi tam olarak bunu karşılar.

### #3 — Uzaktan açılıp kapanan 133 bayrak + 21 kill switch

| Kanıt | Dosya / konum |
|---|---|
| Bayrak/kill sayısı | `src/moduller/ozellik-bayraklari/OzellikBayragiAnahtarlari.ts` → **133 bayrak, 21 kill switch** |
| Sunucudan snapshot | `src/moduller/ozellik-bayraklari/OzellikBayrakCache.ts:248-262` (`ozellik_bayraklari_snapshot`) |
| Realtime aç/kapat | aynı dosya `:279-300` → `feature_flags` + `kill_switches` değişiminde yeniden yükleme |
| Canlıda toplu değişim izi | `feature_flags.updated_at` = **2026-10-25 08:28:42** (5 oyun aynı saniyede kapandı) |
| Yerel varsayılanlar | `OzellikBayrakCache.ts:18-137` |

**Değerlendirme:** Bayrak sistemi meşru bir operasyon aracıdır. 2.5.19 riski, **binary'de hazır bekleyen özelliklerin** bu bayraklarla sonradan açılabilmesidir (dormant functionality). Canlı veri bunun fiilen kullanıldığını gösteriyor: aynı saniyede 5 oyun kapatıldı.

### #4 — "Coin'in nakit değeri yoktur" beyanı ile cüzdandaki çekim sekmesi çelişkisi

| Kanıt | Dosya / konum |
|---|---|
| Sekme koşulu | `git show 4724bbc:"app/(tabs)/wallet.tsx"` → `wallet_withdraw_enabled || withdrawals_enabled` |
| Canlı değer | `withdrawals_enabled = true` (2026-10-25 08:32) |
| Çekim akışı | aynı dosya → `CekimTalebiOlustur({ diamonds, method: 'bank', details: { iban ... } })` |
| Sunucu reddi | `cekim_talebi_olustur` → `authenticated_exec = false` |
| Metinler | `i18n` içinde `Diamond withdrawal`, `saved bank account`, `IBAN` |

**Değerlendirme:** Build 35'te iOS kullanıcısı **"Çekim" sekmesini görebiliyordu** (bayrak true). Form elmas → banka hesabı (IBAN) talep ediyor; sunucu ise yetkiyi kaldırdığı için talep başarısız oluyor. Bu hem **yanıltıcı** (kullanıcıya var olmayan bir çıkış yolu gösteriliyor), hem de "coin paraya çevrilemez" beyanıyla **çelişkili**. En somut 5.6 bulgularından biri.

### #5 — Review notu / metadata ile kod arasındaki maddi çelişkiler

Depodaki taslak review notu (`TAMUSO_APP_STORE_METINLERI.md:154-186`) şunları iddia ediyor:

| İddia | Kod/binary gerçeği | Durum |
|---|---|---|
| "AI Music Studio … removed from the iOS binary" | Rota stub'ları (`./ai-muzik/index.tsx`) ve i18n metinleri binary'de; ekran redirect | **Dar anlamda doğru, geniş anlamda yanlış** |
| "external or web payments … removed" | `stripe_enabled=true`; `ajans-pay` edge function Stripe Checkout yapıyor; `Stripe payment via authorized agency…` dizgisi binary'de | **Çelişki** |
| "agency Coin sales … removed" | iOS UI stub'ı var; sunucu satış linki/`ajans-pay` çalışıyor; `./ajans/satis/[kod].tsx` rota stub'ı binary'de | **Kısmi** |
| "These tools cannot change game results or user balances" | Sonuç RPC'leri 25 Ekim'de kapatıldı (doğru), **ama** `admin_cuzdan_duzelt` ve `admin_kullanici_coin_isle` hâlâ çalışıyor | **Yanlış** |

**Değerlendirme:** Bu notlar build 35 ile gönderildiyse (doğrulanamadı), Apple'ın "misleading" değerlendirmesi için doğrudan gerekçe oluşturur. Gönderilmediyse bu, **bir sonraki gönderim için** ciddi bir tuzaktır.

### #6 — iOS'ta gizlenen ama sunucuda açık kalan harici ödeme kanalı

| Kanıt | Dosya / konum |
|---|---|
| Stripe native iOS'ta bağlanmıyor | `package.json:134-142` (`expo.autolinking.ios.exclude`) |
| iOS Stripe fonksiyonu sahte | `src/moduller/stripe/islemler/StripeUygulamaIciOdemeYap.ios.ts:6-19` |
| iOS ajans şeridi null | `src/moduller/cuzdan/bilesenler/YetkiliAjansYukleSeridi.ios.tsx:5-8` |
| Sunucu Stripe açık | `feature_flags.stripe_enabled = true` |
| Ajans satış ödemesi | `supabase/functions/ajans-pay/index.ts:1-3, 50+` (Stripe Checkout) |
| iOS metin kalıntısı | `src/i18n/locales/en.ts:3519` |

**Değerlendirme:** 3.1.1 birincil risk. iOS'ta satın alma yolu IAP'ye indirgenmiş (doğru), ancak **dijital coin'in sunucuda harici ödemeyle satılabildiği bir kanal** açık kalıyor. Apple bunu "uygulama içinde gösterilmeyen ama var olan satın alma yolu" olarak görebilir.

### #7 — Rol/ülke/platforma göre farklılaşan görünüm

| Kanıt | Dosya / konum |
|---|---|
| Admin menü öğeleri yalnızca admin | `src/moduller/ana-sayfa/menu/HamburgerMenuKatalogu.ts:226-247`, `HamburgerMenuyuKur.ts:60` |
| iOS'ta AI Müzik menüden çıkarılıyor | `HamburgerMenuKatalogu.ts:34, 248` |
| Admin modül kataloğu iOS'ta filtreleniyor | `src/moduller/admin/arama/AdminModulKatalogu.ts:20, 642` |
| Banner'lar ülke/şehir/platform/dile göre hedefleniyor | `src/banner/core/BannerEligibilityEngine.ts:36-73, 75-84` |
| Gizli sekmeler | `app/(tabs)/_layout.tsx:110-121` (`rooms`, `wallet`, `cihazlar` → `href: null`) |

**Değerlendirme:** Bu farklılaşma meşru ürün mimarisidir; **reviewer'a özel** bir davranış kodu bulunamadı (D). Ancak Apple "kullanıcıya göre farklı uygulama" izlenimi edinebilir; özellikle admin/oda/oyun gibi keşfedilemeyen ekranlar.

### #8 — Binary'de hazır bekleyen, kullanıcıya kapalı oyun motorları

`./oyun/zeus.tsx`, `./oyun/nox.tsx`, `./oyun/kaskad.tsx`, `./oyun/fair-spin.tsx`, `./oyun/astral-falls.tsx`, `./oyun/sis-spin.tsx`, `./oyun/dede.tsx` rotaları binary'de; sunucuda `is_enabled=false`. Klasik **dormant feature** görüntüsü.

### #9 — Statik analizde kırmızı bayrak olan dizgiler

`TEST_BALANCE`, `force_next`, `game_cikis` (6), `Diamond withdrawal`, `saved bank account`, `coin_trade_offers`. Bu dizgilerin bir kısmı artık kullanılmasa da binary'de duruyor.

### #10 — Uygulama içi WebView'de alan adı kısıtı olmaması

`WebViewSecurity.ts:46-56` yalnızca `https:` şemasını doğruluyor; **alan adı izin listesi yok**. Banner/duyuru içeriği herhangi bir HTTPS sayfasını uygulama içinde açabilir (`app/webview.tsx` → `TamusoWebViewScreen`). 2.5.2/2.5.19 riski; kötüye kullanım kanıtı yok (B).

---

## 5. "Apple neyi tespit etmiş olabilir?" — yöntem bazlı değerlendirme

| Olası tespit yöntemi | Bu projede karşılığı | Kanıt düzeyi |
|---|---|---|
| Binary içindeki rota/ekran adları | `admin/cikis-plani`, `admin/oyun-algoritma`, `oyun/zeus` vb. bundle'da | **A (doğrulandı)** |
| Binary içindeki hassas dizgiler | `withdrawal_requests`, `IBAN`, `TEST_BALANCE` | **A** |
| Oturum açmış reviewer'ın gördüğü ekranlar | Ses odasında oyun, cüzdanda çekim sekmesi, kazanç banner'ı | **A (mekanizma)** / reviewer'ın gördüğü **E** |
| Metadata ↔ uygulama karşılaştırması | Oyunlar/ajans/ücretli arama açıklamada eksik olabilir | **C** (canlı ASC metni okunamadı) |
| Sunucu yanıtlarının incelenmesi | `/functions/v1/...` uçları, `game_cikis_*`, `ajans-pay` | **A (uçlar var)** / Apple'ın baktığı **E** |
| Reviewer'a özel davranış arama | `reviewMode`, `developerMode`, `remote_config`, cihaz/IP/hesap tespiti | **D (bulunamadı)** |
| OTA / uzaktan JS | `expo-updates` yok; `eval` yok | **D (bulunamadı)** |
| Ülke/IP bazlı içerik farkı | Banner hedefleme var; oyun/finans özellikleri için ülke kodu kontrolü bulunamadı | **B** |

**Önemli:** "Apple özel bir analiz aracı kullandı" varsayımı yapılmadı. Yukarıdakiler, Apple'ın *yapabileceği* ve kodun buna *açık olduğu* kontrollerdir.

---

## 6. Sorulara doğrudan cevaplar

**1. Apple'ın reddine neden olabilecek en güçlü teknik bulgu nedir?**
iOS binary'sine derlenmiş **yönetim konsolu** ve içindeki **oyun sonucu belirleme ("çıkış planı") + oyun algoritması/RTP + bakiye düzeltme** ekranları. Binary'de `./admin/cikis-plani.tsx`, `./admin/oyun-algoritma/index.tsx` dizgileri birebir mevcut; ekran metni *"Sıra kesin çıkar"* diyor. Bu, 2.5.19'un "hidden functionality" tanımına doğrudan uyar. İkinci sırada, metadata'da yer almayan coin bahisli Meyve Çarkı'nın canlıda açık olması var.

**2. Uygulamada gerçekten gizli veya belgelenmemiş özellik var mı?**
**Evet.** (a) Normal kullanıcıya görünmeyen 119 ekranlık admin konsolu, (b) kullanıcıya kapalı 7 oyun motoru rotası, (c) bayrakla açılan çekim/takas arayüzleri, (d) iOS'ta redirect'e çevrilmiş ama binary'de duran AI Müzik ve ajans satış rotaları. "Reviewer'a özel" gizli davranış **yok** (aranıp bulunamadı).

**3. Admin panelinin mobil uygulamada bulunması risk oluşturuyor mu?**
**Evet, yüksek risk.** Panel rol ile korunuyor (meşru), ancak (i) binary'de tamamen mevcut, (ii) içinde sonuç/bakiye kontrolü var, (iii) metadata ve review notlarında hiç bildirilmemiş, (iv) review notu "bakiye değiştiremez" derken ilgili RPC'ler canlı. Bu dördü birlikte 2.5.19 + 5.6 riski üretir.

**4. Admin panelinin web'e taşınması hangi riskleri azaltır?**
Binary'den admin rotalarının çıkması 2.5.19'un "hidden functionality" bulgusunu ortadan kaldırır; statik analizde `cikis-plani`/`oyun-algoritma` gibi dizgiler kaybolur; uygulama boyutu ve saldırı yüzeyi küçülür; "review sırasında gösterilmeyen işlev" iddiası zayıflar.

**5. Hangi işlevler yalnızca web'e taşınmakla düzelmez?**

- Coin bahisli oyunların **metadata/yaş derecelendirmesi** uyumu.
- Sunucudaki harici ödeme kanalı (`stripe_enabled`, `ajans-pay`).
- Çekim sekmesi ↔ "coin paraya çevrilemez" çelişkisi.
- Review notlarındaki yanlış beyanlar.
- Bayrakla açılan/kapanan özelliklerin **beyan edilmesi**.
- WebView alan adı kısıtı ve banner hedefleme.

**6. Hangi kodlar kaldırılmalı?**

- `app/admin/**` (veya en az `cikis-plani`, `oyun-algoritma`, `kaskad-yonetim`, `fruit-wheel`, `oyun-test`, `cuzdan-yonetimi`, `finans/*`, `coin`, `ekonomi`, `takas`) native bundle'dan çıkarılmalı.
- Kullanıcıya kapalı oyun rotaları: `app/oyun/{zeus,nox,kaskad,fair-spin,astral-falls,sis-spin,dede}.tsx`.
- AI Müzik rota stub'ları + `ai_music_*` i18n anahtarları + `ai-music-*` edge function'ları (iOS kapsamı için).
- Stripe/ajans satış kalıntıları: `src/moduller/stripe/**`, `AjansPaketTeklifOde`, `ajans-pay`, `stripe-checkout`, `stripe-*` fonksiyonları.
- Cüzdandaki eski çekim sekmesi ve `CekimTalebiOlustur` istemci kodu.
- `app/tanitim/yatirim.tsx` ve "yatırım" metinleri.

**7. Hangi işlevler Apple'a açıkça bildirilmeli?**
Meyve Çarkı (coin ile oynanan, ödülü yalnızca oyun coin'i — "simulated gambling" derecelendirmesi dahil), hediye/coin ekonomisi ve paketleri, dakikalık ücretli aramalar, yayıncı kazançları ve banka ödemeleri, ajans sistemi, PK, canlı kesit, AI asistan, yaş doğrulama/KYC, yönetim araçlarının **varlığı ve kapsamı** (en azından review notunda dürüstçe).

**8. Mevcut production build ile kaynak kod arasında fark var mı?**
**Evet.** Build 35, `4724bbc` commit'i + o tarihte commit edilmemiş `src/ekranlar/`* dosyalarıyla üretilmiş (binary'de `AiMuzikIos`, `TakasIos` var; commit'te bu dosyalar yok). Bugünkü çalışma ağacı ise `4724bbc`'ye göre **287 dosya, +12.534 / −21.739 satır** farklı. Yani bir sonraki build, Apple'ın incelediği koddan **önemli ölçüde farklı** olacak; bu iyi (remediation) ama **build ↔ kaynak eşlemesi artık yok**, bu da denetim izini zayıflatıyor.

**9. En az riskli geliştirme sırası nedir?**
`APPLE_COMPLIANCE_ACTION_PLAN.md` §3'te ayrıntılı. Özet: (1) bayrakları dondur, (2) admin'i native'den çıkar, (3) ölü oyunları sil, (4) çekim bayrağı çakışmasını düzelt, (5) harici ödeme kalıntılarını temizle, (6) metadata + review notlarını gerçeğe eşitle, (7) ancak ondan sonra yeni build.

**10. Yeni iOS build'inden önce hangi testler yapılmalı?**
`APPLE_COMPLIANCE_ACTION_PLAN.md` §4'te liste. Özet: bundle dizgi denetimi, rota envanteri diff'i, normal/admin hesap yürüyüşü, sandbox IAP, deep link matrisi, bayrak aç/kapa matrisi, çekim/çevrim akışının iOS'ta gerçekten kapalı olduğunun doğrulanması.

---

## 7. Bulgu tablosu (özet)

| # | Bulgu | Dosya | Satır | Kanıt | Apple kuralı | Risk | Durum |
|---|---|---|---|---|---|---|---|
| 1 | Admin konsolu iOS binary'sinde | `main.jsbundle` (build 35) | — | `./admin/cikis-plani.tsx`, `./admin/oyun-algoritma/index.tsx` dizgileri | 2.5.19, 5.6 | **Kritik** | Doğrulandı |
| 2 | Oyun sonucu belirleme ekranı | `app/admin/cikis-plani.tsx` | 158, 188-189 | "Sıra kesin çıkar", "Üstteki sıra kesin" | 5.6, 2.5.19 | **Kritik** | Doğrulandı |
| 3 | Oyun algoritması/RTP paneli | `app/admin/oyun-algoritma/index.tsx` | 41-48, 100-135 | `gameAdminMathActivate`, `gameAdminSettingsUpdate` | 5.6 | **Yüksek** | Doğrulandı |
| 4 | Admin bakiye düzeltme | `AdminKullaniciCoinIsle.ts` / `AdminPlatformIslemleri.ts` | 30 / 65 | `admin_kullanici_coin_isle`, `admin_cuzdan_duzelt` canlı | 5.6 | **Yüksek** | Doğrulandı |
| 5 | Meyve Çarkı canlı, metadata belirsiz | `feature_flags` + `app/room/[id].tsx` | 3156 | `fruit_wheel_enabled=true`, `is_enabled=true` | 2.5.19, 5.3, 5.6 | **Kritik** | Doğrulandı (canlı) |
| 6 | Çekim sekmesi iOS'ta görünür | `app/(tabs)/wallet.tsx` (build 35) | sekme koşulu | `withdrawals_enabled=true` + `cekim_talebi_olustur` revoke | 5.6, 3.1.1 | **Kritik** | Doğrulandı |
| 7 | Review notu "bakiye/sonuç değiştiremez" | `TAMUSO_APP_STORE_METINLERI.md` | 154-186 | RPC'ler canlı | 5.6 | **Yüksek** | Taslak (gönderim E) |
| 8 | Harici ödeme sunucuda açık | `ajans-pay/index.ts`, `feature_flags` | 1-3, 50+ | `stripe_enabled=true` | 3.1.1 | **Yüksek** | Doğrulandı |
| 9 | iOS'ta kullanılmayan Stripe metni | `src/i18n/locales/en.ts` | 3519 | binary'de dizgi var | 3.1.1, 2.5.19 | **Orta** | Doğrulandı |
| 10 | Ölü oyun motorları binary'de | `app/oyun/*.tsx` | — | 7 rota dizgisi | 2.5.19 | **Orta** | Doğrulandı |
| 11 | WebView alan adı kısıtsız | `WebViewSecurity.ts` | 46-56 | Yalnızca `https:` kontrolü | 2.5.2, 2.5.19 | **Orta** | Doğrulandı |
| 12 | Banner ülke/platform hedefleme | `BannerEligibilityEngine.ts` | 36-84 | `target_mode`, `platform` | 2.5.19 | **Düşük** | Doğrulandı |
| 13 | Gizli sekmeler | `app/(tabs)/_layout.tsx` | 110-121 | `href: null` | 2.3.1 | **Düşük** | Doğrulandı |
| 14 | Reviewer'a özel davranış | — | — | `reviewMode`/`developerMode`/OTA/eval yok | — | — | Bulunamadı (D) |

---

## 8. Nihai değerlendirme

1. **Kesin olan:** Build 35'in binary'sinde tam bir yönetim konsolu, oyun sonucu belirleme ekranı ve bakiye düzeltme çağrıları var; Meyve Çarkı canlıda açık; cüzdanda çekim sekmesi bayrak nedeniyle görünür; sunucuda harici ödeme kanalı açık.
2. **Kesin olmayan:** Apple'ın bu bulgulardan hangisini/hangilerini gördüğü ve review notlarının gerçek içeriği.
3. **En olası senaryo:** Apple binary'yi inceledi, `admin/cikis-plani` + `oyun-algoritma` + `TEST_BALANCE`/`game_cikis` dizgilerini ve/veya ses odasındaki oyunu gördü, mağaza metni/review notu ile karşılaştırdı ve "hidden + misleading" hükmüne vardı.
4. **Düzeltme önceliği:** Admin'i native'den çıkar → oyunları ya tam beyan et ya kaldır → çekim/harici ödeme çelişkilerini kapat → metadata ve review notlarını birebir doğrula → yeni build.

> Bu rapor bir teşhis değil, kanıta dayalı bir risk analizidir. Apple'ın hangi bulguyu kastettiği ancak yeni gönderimde alınacak yanıtla kesinleşir.
