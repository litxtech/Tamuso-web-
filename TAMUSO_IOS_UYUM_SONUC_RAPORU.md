# Tamuso — iOS App Review uyumluluğu ve ekonomi düzenlemesi: sonuç raporu

Tarih: 25 Ekim 2026

## Durum özeti

- Kod, arayüz, çeviri, veritabanı migration'ları ve testler **depoda hazır**.
- **Canlıya hiçbir şey uygulanmadı**: migration çalıştırılmadı, edge function yayımlanmadı, build alınmadı, App Store'a gönderim yapılmadı, commit/push yapılmadı. Canlı veritabanına yalnızca okuma sorguları atıldı.
- Yayın sırası, yedekleme, doğrulama ve geri dönüş adımları: `TAMUSO_EKONOMI_YAYIN_VE_GERI_DONUS_PLANI.md`.
- Kararlar (bölüm 9): Storm King bu iOS sürümünden çıkarıldı; coin tarifesi A seçildi. 085900 güvenlik düzeltmesinin canlıya ne zaman uygulanacağı hâlâ onay bekliyor.

---

## 1. Değiştirilen ve eklenen dosyalar

### Veritabanı (yeni, uygulanmadı)

| Migration | İçerik |
|---|---|
| `20261025085900_acil_finans_yetki_kapatma.sql` | `coin_satin_al_onayla_servis` dahil 12 sunucu fonksiyonunun `anon`/`authenticated` yetkisi kaldırılır. Bu fonksiyon bugün REST ile doğrudan çağrılıp ödeme yapılmadan coin yüklenebiliyor. |
| `20261025090000_cuzdan_bakiye_ayrimi.sql` | `wallets.game_coins`, `wallets.bonus_coins`. Oyun ve ödül kredileri işlem sonunda kendi kovasına taşınır. Eski bakiyeler toplam korunarak sınıflandırılır; inceleme tablosu `coin_bakiye_gecis_incelemesi`. |
| `20261025090100_yayinci_gelir_paylasimi.sql` | %40 yayıncı / %60 platform. USD kazanç defteri `creator_earning_entries` (değiştirilemez, silinemez, kaynak başına tek kayıt). `send_gift` coin kaynağı ve kanal alır. Ajans payı platform payından. Görüşmelerde %60 platform ücreti. Aynı cihaz/ağ ve sandbox ödemeleri için bekletme. |
| `20261025090200_yayinci_odeme.sql` | $25 minimum, 1–15 / 16–ay sonu dönemleri, durum akışı (Bekliyor → İnceleniyor → Onaylandı → Bankaya Gönderildi → Tamamlandı; Başarısız, İptal, Güvenlik incelemesi), tek açık talep, KYC ve banka zorunluluğu, durum geçmişi ve bildirim. Admin RPC'leri ve risk bayrakları. |
| `20261025090300_oyun_seffaflik.sql` | Admin sonuç planı (`game_cikis_*`) gerçek turlarda kapalı. Meyve Çarkı'ndaki gizli "aynı meyve art arda gelmez" kuralı kaldırıldı. Olasılık/RTP için herkese açık `fruit_wheel_olasiliklar()`. Erişilemeyen 5 oyun motorunun bayrağı ve yetkisi kapalı. Storm King tüm platformlarda kapalı (`storm_king_enabled=false`, `game_control_configs`); açık turların iadesi çalışır. Storm King kazançları oyun coin'ine yazılır. |
| `20261025090400_pasif_finans_kapat.sql` | Coin takası, cüzdan numarasıyla transfer ve eski elmas çekimi sunucuda kapatılır. Bekleyen takas teklifleri iptal edilip kilitli coin iade edilir. Ödeme yapılmış olabilecek teklifler admin incelemesine yazılır. |
| `20261025090500_ajans_yukleme_denetim.sql` | Ajans yüklemeleri: `promotion` / `operational_correction` türü, ücretli satış reddedilir. Alıcının ödül kovasına yazılır. Silinemez denetim kaydı `agency_coin_load_audit`; eski yüklemeler geriye dönük olarak incelemeye açılır. |
| `20261025090600_coin_paket_tarife.sql` | İki aday tarife (A ve B) ve `admin_coin_paket_tarifesini_uygula(plan, mağaza_fiyatları_onaylandı)`. **Aktif paketleri değiştirmez.** |

### Edge function'lar (yayımlanmadı)

- `supabase/functions/_shared/iap/magazaDogrulama.ts` (yeni). Apple App Store Server API ve Google Play Developer API ile işlem doğrulama.
- `supabase/functions/iap-receipt-verify/index.ts`:
  - Paket mağaza ürün kimliğinden eşlenir.
  - Aynı mağaza işlemi ikinci kez coin oluşturmaz; başka hesaba ait işlem reddedilir.
  - Ortam (sandbox/production) kaydedilir.
- `supabase/functions/storm-king-spin/index.ts`: yanıt `game_balance` döner.

### iOS paketinden çıkarma

- `package.json`:
  - `expo.autolinking.ios.exclude: ["@stripe/stripe-react-native"]`
  - `test:ekonomi-sql` betiği
  - `@electric-sql/pglite` (yalnızca test, devDependency)
- Stripe iOS boş modülleri:
  - `src/moduller/stripe/islemler/StripeCheckoutBaslat.ios.ts`
  - `StripeUygulamaIciOdemeYap.ios.ts`
  - `StripeSdkOnIsit.ios.ts`
  - `src/moduller/stripe/bilesenler/StripeCheckoutWebSheet.ios.tsx`
- Ajans coin satışı için iOS sürümleri:
  - `src/moduller/cuzdan/bilesenler/YetkiliAjansYukleSeridi.ios.tsx`
  - `AjansPaketTeklifSecSheet.ios.tsx`
  - `src/moduller/mesajlasma/bilesenler/MesajAjansPaketTeklifKarti.ios.tsx`
  - `src/moduller/cuzdan/bilesenler/IosHariciOdemeYokEkrani.tsx`
- Ekran gövdeleri `src/ekranlar/` altına taşındı. `app/` altındaki rota dosyaları tek satırlık re-export oldu. Expo Router, `app/` içindeki `.ios.tsx` dosyalarında temel sürümü de pakete kattığı için bu yapı kullanıldı.

  | Ekranlar | iOS sürümü |
  |---|---|
  | `ai-muzik/{AiMuzikStudyo, AiMuzikIslemler, AiMuzikKutuphane, AiMuzikParca, AiMuzikPasaport}Ekrani`, `admin/AdminAiMuzikEkrani` | Ana sayfaya yönlendirme |
  | `ajans/{AjansSatisLinkAcilis, AjansSatisLinkleri, AjansTeklifler}Ekrani` | "App Store dışında ödeme yok" bilgi ekranı |
  | `cuzdan/CuzdanTakasEkrani`, `odeme/OdemeBasariliEkrani` | Cüzdana yönlendirme |

- Menü ve bağlantılar:
  - `HamburgerMenuKatalogu.ts` ve `AdminModulKatalogu.ts`: iOS'ta AI müzik girişi yok; sis_spin kaldırıldı.
  - `MesajMuzikSecimSheet.tsx`, `OdaMuzikKutuphanesiSheet.tsx`, `DurumMuzikKarti.tsx`: AI müzik bağlantıları kapalı.
  - `BannerInternalLinkHandler.ts`: iOS'ta müzik bağlantıları açılmaz.
- `src/moduller/oyunlar/ortak/katalog/OyunKartKatalogu.ts`: akışta yalnızca açık olan oyunlar (Fruit Wheel; Storm King yalnızca iOS dışı paketlerde ve sunucu bayrağı açıkken; 090300 sonrası kapalı).
- Storm King iOS paketinden çıkarıldı:
  - Tek giriş noktası `src/moduller/oyunlar/storm-king/StormKingGiris.tsx`; iOS sürümü `StormKingGiris.ios.tsx` boştur.
  - `StormKingPaket.ts` / `StormKingPaket.ios.ts`.
  - `app/oyun/storm-king.tsx` iOS'ta ana sayfaya döner.
  - `OyunOdaKatmani.tsx`, `OyunBaslatModal.tsx`, `useGorunurOyunKodlari.ts`, `OyunKontrolServisi.ts` giriş modülünü kullanır.

### Cüzdan ve kazanç

- `app/(tabs)/wallet.tsx`: "Cüzdanım" başlığı, MUTA PAY ve ₺ karşılıkları kaldırıldı. Üç bölüm var. Elmas çekimi, kart paylaşımı ve uzaktan açılan hızlı işlemler kaldırıldı.
- `src/moduller/cuzdan/bilesenler/CuzdanimBolumleri.tsx` (yeni): Satın Alınan Coin'ler, Oyunlardan Kazanılan Coin'ler, Yayıncı Kazançları ve "Önemli bilgiler".
- `app/cuzdan/yayinci-kazanclari.tsx` (yeni):
  - Kazanç özeti ve kesintiler.
  - Kanal bazında kaynaklar.
  - Kayıt listesi (uygun olmayanlar nedeniyle birlikte).
  - Ödeme bilgileri, dönem ve sonraki işlem tarihi.
  - Talep oluşturma ve iptal, talep geçmişi.
- `src/moduller/cuzdan/yayinci/YayinciKazancIslemleri.ts` (yeni).
- `src/moduller/cuzdan/okuma/CuzdanLedgeriniGetir.ts`: yeni hareket türleri ve kova etiketleri.
- `src/moduller/iap/islemler/IapIleCoinSatinAl.ts`: hata metinleri çeviri anahtarlarına taşındı (işlem kimliği ve purchaseToken zaten sunucuya gönderiliyor).

### Hediye gönderimi

- `src/moduller/hediyeler/islemler/useHediyeMagaza.ts`, `HediyeMagazaTipleri.ts`, `HediyeGonder.ts`.
- `src/moduller/hediyeler/bilesenler/HediyeMagazaPaneli.tsx`, `HediyeMagazaBaglamasi.tsx`.
- `app/room/[id].tsx` ve `app/mesaj/[id].tsx`:
  - Coin kaynağı seçimi: satın alınan / oyun / ödül.
  - Oyun ve ödül coin'i için gönderim öncesi "gelir oluşturmaz" uyarısı.
  - Kanal bilgisi.

### Oyunlar

- `src/moduller/oyunlar/fruit-wheel/ekranlar/FruitWheelKurallar.tsx`: sunucudan okunan olasılık, çarpan ve beklenen iade tablosu; "yönetici sonucu belirleyemez" açıklaması.
- Storm King (yalnızca iOS dışı paketlerde):
  - `StormKingScreen.tsx`: Auto düğmesi gizlendi; Oyun Coin bakiyesi gösteriliyor.
  - `types/index.ts`, `store/useStormKingStore.ts`, `api/spinStormKing.ts`.

### Ajans

- `src/moduller/ajanslar/islemler/AjansIslemleri.ts`, `AjansPanelIslemleri.ts` ve `app/ajans/[id]/islemler.tsx`: yükleme türü (`promotion`) ve açıklama gönderilir.

### Çeviri

- `src/i18n/locales/{tr,en,es,pt}.ts` ve `{ar,fr,fil}.json`: `cuzdanY` (108) ve `oyunY` (10) ad alanları.
- Kaynak dosya ve uygulayıcı: `scripts/i18n/cuzdan-uyum-metinleri.json` ve `scripts/i18n/cuzdan-uyum-metinlerini-uygula.cjs`.

### Test

- `scripts/ekonomi-sql-tests.ts` (yeni).

---

## 2. Giderilen sorunlar

| Konu | Önce | Sonra |
|---|---|---|
| Ödemesiz coin yükleme açığı | `coin_satin_al_onayla_servis` herkes tarafından çağrılabiliyordu | Yalnızca `service_role` (085900) |
| Makbuz doğrulama | İstemci makbuzu; tekrar kullanım kontrolü zayıf | Apple/Google sunucu API'si, işlem başına tek kullanım, ürün kimliği eşlemesi |
| Gelir paylaşımı | Elmas %80 yayıncı; ajans payı yayıncıdan kesiliyordu | USD defteri: %40 yayıncı, %60 platform; ajans payı platform payından; geriye dönük değişiklik yok |
| Oyun coin'i | Satın alınan coin ile aynı bakiye | Ayrı kova; nakde çevrilemez; hediyesi gelir oluşturmaz; gönderim öncesi uyarı |
| Çift kazanç | Elmas + ajans tetikleyicisi | Kaynak başına tek, değiştirilemez kazanç kaydı; ajans tetikleyicisi kaldırıldı |
| Ödeme | Elmas → TL banka çekimi, belirsiz kurallar | $25 minimum, 15 günlük dönem, açık durumlar, KYC/banka kontrolü; çekim kapalıyken "Para çekme işlemleri şu anda kullanılamıyor" |
| iOS'ta harici ödeme | Stripe, ajans satış linkleri, "ajanstan daha ucuz" teklifleri, takas | iOS paketinde yok (sourcemap ile doğrulandı); Stripe Android/web için yerinde |
| AI Müzik Stüdyosu | iOS'ta erişilebilir | iOS paketinden çıkarıldı; sunucu verisi ve kullanıcı eserleri silinmedi |
| Oyun sonucu müdahalesi | Admin çıkış planı gerçek turları etkileyebiliyordu; gizli tekrar kuralı | Kapalı; sonuç yalnızca yayımlanan ağırlıklardan; olasılıklar uygulamada görünür |
| Erişilemeyen oyun motorları | Rotası kapalı ama sunucu RPC'leri açık | Bayrak ve yetki kapalı |
| Ajans yüklemeleri | Denetimsiz; satın alınan coin gibi | Tür ayrımı, ücretli satış reddi, silinemez denetim kaydı, ödül kovası |
| Cüzdan metinleri | MUTA PAY, ₺ karşılıkları, eksik açıklamalar | Talimattaki metinler 7 dilde, ham anahtar yok |

Uygulamada Apple incelemesine özel gizleme mekanizması yoktur. Kaldırılan özellikler iOS paketinde bulunmaz; sunucu tarafında da kapatıldı. Bayrakla yeniden açılamazlar.

---

## 3. Testler

| Kontrol | Sonuç |
|---|---|
| `npm run test:ekonomi-sql`: gerçek migration dosyaları (090000, 090100, 090200, 090500) bellek içi Postgres'te | **86/86 başarılı** |
| TypeScript (`tsc --noEmit`) | 333 hata. Başlangıçta 338 vardı; dokunulan dosyalarda yeni hata yok, kalanlar önceden var olan hatalar |
| iOS üretim paketi (`expo export --platform ios`) ve sourcemap taraması | AI müzik ekranları, ajans satış/teklif ekranları, takas, ödeme-başarılı, Storm King ve `@stripe` paketi yalnızca `.ios` yer tutucularıyla var |
| Çeviri anahtarı taraması | Kodda kullanılan 118 yeni anahtarın tamamı 7 dilde tanımlı |
| Canlı şema uyumu (yalnızca okuma) | Test edilmeyen migration'ların (090300, 090400, 090600) kullandığı tüm sütunlar canlıda mevcut |

SQL testlerinin kapsadığı konular:
- %40/%60 ve ajans payının platform payından düşmesi.
- Görüşmede %60/%40.
- Oyun/ödül kovaları ve kovalar arası taşma olmaması.
- Idempotency; aynı kaynağın ikinci kez kazanca dönüşmemesi; kazanç kaydının değiştirilememesi ve silinememesi.
- Kendine hediye.
- Aynı cihaz ve sandbox bekletmesi.
- Dönem sınırları (şubat ve artık yıl dahil).
- $25 minimumun altında devretme.
- KYC/banka/çekim kapalı hataları.
- Tek açık talep, iptal ve iade, tam durum akışı, başarısız transferin bakiyeye dönmesi.
- Güvenlik incelemesi.
- Ajans ücretli satış reddi ve denetim kaydı.

Test edilmeyenler:
- 090300 / 090400 / 090600 izole testte çalıştırılmadı.
- Gerçek Apple/Google API çağrıları ve cihaz üzerinde arayüz testi yapılmadı (canlı ödeme yasak).

---

## 4. Kalan riskler ve eksikler

1. **Storm King ödeme tablosu.** Simülasyonda beklenen iade bahsin yaklaşık %9249'u.
   - iOS paketinden çıkarıldı; 090300 ile sunucuda tüm platformlarda kapanır.
   - Android'de yeniden açmadan önce ödeme tablosu düzeltilip simülasyonla doğrulanmalı.
   - 090300 uygulanana kadar canlıda açık kalır (bugün `storm_king_enabled=true`).
2. **Admin arayüzü yok.** Yayıncı ödemeleri, risk bayrakları, bakiye sınıflandırma incelemesi, ajans yükleme denetimi ve takas kapatma incelemesi için RPC/tablolar var; admin ekranı yok. İlk dönem SQL/RPC ile yürütülmeli.
3. **Ajans USD ödemesi yok.** Ajans payı (`agency_usd`) kayda geçiyor ama ajanslara ödeme akışı kurulmadı.
4. **Apple/Google iade bildirimleri işlenmiyor.** App Store Server Notifications / RTDN yok. İade edilen coin geri alınmıyor; bu satın alımdan doğan kazanç bekletilmiyor.
5. **Android'deki eski takas ekranları.** 090400 sonrası sunucu bu çağrıları reddeder; Android'de takas ve ajans teklif ekranları hata gösterir. Sonraki Android sürümünde kaldırılmalı.
6. **Eski elmas verisi.** Admin ekranlarında `diamonds` / `host_earnings` alanları hâlâ görünür. Para değeri yok, ancak admin tarafında kafa karıştırabilir.
7. **Sınıflandırma sonucu.** Canlıda doğrulanmış satın alma kaydı çok az (2 Stripe ödemesi; Apple alımları sandbox). Mevcut bakiyelerin çoğu ödül kovasına geçer ve hediyeleri gelir oluşturmaz. Bakiyeler silinmez; meşru olduğu doğrulanan hesaplar inceleme tablosundan düzeltilebilir.
8. **Takas iadeleri.** Bekleyen teklif iadeleri, kaynağı doğrulanamadığı için ödül kovasına yapılır.
9. **İstemci–sunucu sırası.** Yeni istemci, migration'lar uygulanmadan yayımlanırsa hediye, ajans yükleme ve kazanç ekranları hata verir.
10. **Edge function sırları.** `APPLE_IAP_*`, `APPLE_BUNDLE_ID`, `GOOGLE_PLAY_*` tanımlı değilse coin satın alımı 503 döner. Bu sırlar okunamadığı için doğrulanmadı.
11. **iOS pakette kalanlar.** Mevcut paylaşılmış AI müzik parçalarının oynatılması (yalnızca dinleme) ve `AiMuzikApi` okuma kodu iOS paketinde duruyor; üretim ve satın alma yok.
12. **Uzaktan cüzdan yapılandırması.** Bazı bölümlerin görünürlüğünü hâlâ `wallet ui-config` belirliyor (ör. özet). Bu bölümlerde ödeme veya gizli özellik yok.
13. **`verify_jwt` bayrağı.** Edge function kimlik kontrolü bu dağıtım ayarına bağlı. `ajans-pay`, `stripe-webhook`, `notification-push` ve `share-redirect` `verify_jwt=false` çalışıyor (kendi içlerinde kontrol ediyorlar).
14. **Çekim kapalı.** `withdrawals_enabled` canlıda `false`. Açılmadan önce KYC, banka doğrulama ve admin süreci hazır olmalı.

---

## 5. App Store Connect — manuel işlemler

1. **In-App Purchase ürünleri:**
   - Tarife A uygulanacak:

     | SKU | Coin | Fiyat |
     |---|---|---|
     | `tamuso_coin_pack_1` | 100 | $2.99 |
     | `tamuso_coin_pack_2` | 500 | $9.99 |
     | `tamuso_coin_pack_3` | 1.200 | $19.99 |
     | `tamuso_coin_pack_4` | 3.200 | $49.99 |
     | `tamuso_coin_pack_5` | 7.000 | $99.99 |

   - Her ürünün fiyat kademesi, görünen adı ve açıklaması (coin miktarı) App Store Connect'te ve Google Play'de güncellenir.
   - Ürünler tüketilebilir (Consumable) olmalı, "Ready to Submit" durumda ve yeni build'e eklenmiş olmalı.
2. **App Store Server API anahtarı:** Users and Access → Integrations → In-App Purchase anahtarı oluşturulur. Issuer ID, Key ID ve özel anahtar Supabase sırlarına girilir.
3. **App Store Server Notifications V2** URL'si tanımlanır (iade işleme eklendiğinde).
4. **App Privacy:** satın alma geçmişi, banka/IBAN (yayıncı ödemesi), kimlik doğrulama verisi beyan edilir.
5. **Yaş derecelendirmesi:** "Simulated Gambling" sorusu Fruit Wheel için "Frequent/Intense" işaretlenir. Oyuna satın alınan Coin ile girilir (canlıda `economy_mode = PLATFORM_APPROVED_COIN`); ödüller yalnızca nakde dönmeyen Oyun Coin'idir.
6. **Demo hesap:** Review için içinde satın alınan coin, oyun coin'i ve örnek yayıncı kazancı bulunan bir test hesabı hazırlanır ve Review Notes'a eklenir.
7. **Build:** yeni sürüm yalnızca migration'lar ve edge function'lar canlıya alındıktan sonra yüklenir.

## 6. Review Notes (inceleme notu) için önerilen metin

Güncel ve tam metin: `TAMUSO_APP_STORE_METINLERI.md` (açıklama EN/TR + review notu). Aşağıdaki kısa sürüm yerine o dosya kullanılmalı.

> Tamuso uses Coins, a consumable virtual item sold only through Apple In-App Purchase on iOS. Coins cannot be converted to cash.
>
> Wallet ("My Wallet") has three separate sections:
> 1. Purchased Coins: bought via IAP, used for virtual gifts.
> 2. Coins Won in Games: game rewards. Cannot be purchased or withdrawn, and gifts sent with them do not create earnings.
> 3. Creator Earnings: 40% of the shareable revenue from eligible gifts (sent with purchased Coins) goes to the creator, 60% to Tamuso. Earnings are shown in USD and paid by bank transfer (minimum $25.00, 15-day periods) after identity verification. Withdrawals are currently unavailable and this is stated in the app.
>
> The only game in this build, Fruit Wheel, shows its odds and expected return in the rules screen. Outcomes are random on the server and cannot be set by administrators. No real-money prizes.
>
> This build contains no external payment links, no agency coin sales and no AI Music Studio. These features are not part of the iOS binary.
>
> Demo account: [e-posta] / [şifre]

## 7. App Store açıklamasında yer alabilecek özellikler

- Canlı yayın, sesli odalar, mesajlaşma, gönderiler ve sesli/görüntülü görüşme.
- Sanal hediyeler ve App Store üzerinden Coin satın alma.
- Cüzdanım: satın alınan Coin'ler, oyunlardan kazanılan Coin'ler ve yayıncı kazançlarının ayrı gösterimi.
- Yayıncı gelir paylaşımı: uygun hediyelerden %40, $25 minimum ödeme, 15 günlük dönemler.
- Olasılıkları açıklanan sosyal mini oyunlar; gerçek para ödülü yok.
- Güvenlik: şüpheli işlem incelemesi ve itiraz kanalları.

Açıklamada **yer almaması gerekenler:** AI müzik üretimi, ajanstan coin satın alma, coin takası ve "daha ucuz coin" ifadeleri.

## 8. App Review şeffaflık matrisi

| Özellik | iOS paketinde | Erişim | Sunucu durumu |
|---|---|---|---|
| Coin satın alma (IAP) | Var | Cüzdanım → Coin Yükle | Sunucu doğrulaması + tekrar engeli |
| Stripe / web ödeme | Yok (native modül ve JS çıkarıldı) | — | Android/web için açık |
| Ajans coin satışı, satış linkleri, paket teklifleri | Yok (bilgi ekranı) | — | Ücretli ajans satışı sunucuda reddedilir |
| Coin takası, cüzdan numarasıyla transfer | Yok | — | Kapalı (090400) |
| Elmas → banka çekimi | Yok | — | Kapalı; yerini USD yayıncı ödemesi aldı |
| Yayıncı kazançları ve ödeme talebi | Var | Cüzdanım → Kazanç detayları | `withdrawals_enabled=false` → "Para çekme işlemleri şu anda kullanılamıyor" |
| Oyun coin'i ile hediye | Var | Hediye paneli → kaynak seçimi | Gelir oluşturmaz |
| Fruit Wheel | Var | Oyun kartı | Olasılık tablosu herkese açık; admin müdahalesi kapalı |
| Storm King | Yok (rota ana sayfaya döner) | Kart yok | Bayrak ve `game_control_configs` kapalı (090300) |
| Zeus, Astral Falls, Fair Spin, Kozmik Kaskad, NOX, Sis Spin | Ekran yok (rota ana sayfaya döner) | Akışta kart yok | Bayrak ve yetki kapalı |
| AI Müzik Stüdyosu (üretim, kütüphane, satın alma, pasaport) | Yok | Menüde yok | Veriler korunuyor; Android'de açık |
| Paylaşılmış AI parçalarını dinleme | Var (yalnızca oynatma) | Durum/oda içinde | — |
| Ajans promosyon yüklemesi | Var (ajans paneli) | Ajans → İşlemler | Ödül kovası, denetim kaydı |

---

## 9. Kararlar

1. **Storm King: bu iOS sürümünden çıkarıldı.**
   - iOS paketinde oyun kodu ve görselleri yok (sourcemap ile doğrulandı).
   - 090300 sunucu bayrağını ve oyun görünürlüğünü tüm platformlarda kapatır.
   - Android'de yeniden açılması için ödeme tablosunun düzeltilmesi gerekir.

2. **Coin tarifesi: A seçildi.** Uygulama sırası:
   1. Önce App Store Connect ve Google Play fiyatları güncellenir.
   2. Sonra admin hesabıyla `select public.admin_coin_paket_tarifesini_uygula('A_oneri', true);` çalıştırılır.
   3. Bu adım henüz yapılmadı; aktif paketler değişmedi.

   Etkileri:
   - Coin başı net gelir bugün $0.00523. A ile en büyük pakette $0.0100, en küçükte $0.0209 olur.
   - Hediyelerin coin fiyatları değişmediği için aynı hediye yeni alıcıya yaklaşık 4 kat daha pahalıya gelir.
   - Paylaşılabilir gelir parametresi (`revenue_usd_per_coin`) $0.005'te kalır. Fonksiyon bu değeri yalnızca düşürebilir.
   - Yayıncı payını yeni tarifeye göre artırmak için ayrı bir kararla $0.0100'e çıkarılabilir. Bu değişiklik yalnızca sonraki işlemlere uygulanır.

3. **085900 güvenlik düzeltmesi: onay bekliyor.**
   - Ödemesiz coin yüklemeye izin veren yetki açığını kapatır; veri değiştirmez.
   - Diğer migration'lardan bağımsız olarak hemen uygulanması önerilir.
