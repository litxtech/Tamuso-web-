# TAMUSO — APPLE APP REVIEW 2.5.19 / 5.6 KAPSAMLI TEKNİK DENETİM RAPORU

- **Rapor tarihi:** 25 Ekim 2026
- **Kapsam:** Tamuso iOS 1.3.0 (bundle `com.litxtech.muta`), yerel kaynak kod, Git geçmişi, EAS build kayıtları, EAS'te saklanan iOS IPA dosyaları (bellekte açılarak), canlı Supabase (yalnızca `SELECT`).
- **Yöntem kuralı:** Hiçbir kaynak dosya değiştirilmedi, veritabanına yazma yapılmadı, build/submit/commit/deploy yapılmadı, hiçbir bayrak değiştirilmedi. Bu dosya dışında proje içinde dosya oluşturulmadı (bkz. §14 "Denetim süreci notları").

---

## EN KRİTİK BULGULAR (ÖZET)

Kesinlik düzeyleri: **A** = doğrudan kod / binary / canlı veri kanıtı · **B** = kuvvetli teknik şüphe · **C** = metadata / App Review açıklaması eksikliği · **D** = meşru özellik, ihlal kanıtı yok · **E** = doğrulanamadı.

| # | Bulgu | Düzey | Apple kuralı |
|---|---|---|---|
| 1 | **Mağaza açıklamasında ve App Review notlarında hiç geçmeyen, coin ile bahis alınan casino tarzı oyunlar 1.3.0 binary'sinde ve canlı sunucuda açık.** Fruit Wheel (meyve çarkı) ve Fırtına Kralı (6×5 slot) ses odasından oynanabiliyor; Zeus, Nox, Kaskad, Fair Spin, Astral Falls, SİS Spin motorları da binary'de. Oyun kazançları bütün kullanıcılara global banner olarak duyuruluyor. | **A** | 2.5.19, 5.6 (ayrıca 5.3 riski) |
| 2 | **Fırtına Kralı slotu Git'e hiç commit edilmemiş, buna rağmen build 34 (1.3.0) içinde. Sunucuda build alınmadan, 12 Ekim 2026 09:43 UTC'de bir migration ile açılmış** (katalog, bayrak, oyun konfigürasyonu aynı anda). Bu tarih build 33'ün (1.3.0) alınmasından sonra. | **A** | 2.5.19 |
| 3 | **Gerçek zamanlı uzaktan bayrak sistemi:** 120+ özellik bayrağı ve 21 kill switch, yeni build olmadan para çekme, coin satışı, coin takası, oyunlar, Stripe gibi işlevleri açıp kapatabiliyor. Para çekme (IBAN/banka) ve coin satış/takas arayüzleri her iki 1.3.0 binary'sinde de var, şu an sunucuda kapalı. Klasik "pasif (dormant), uzaktan açılabilen özellik" örüntüsü. | **A** | 2.5.19 |
| 4 | **App Review notundaki "coin'ler çekilemez veya gerçek paraya çevrilemez" ifadesiyle çelişen kod:** hediyeler elmasa dönüşüyor, elmas IBAN'a çekilebiliyor (1 elmas = 0,10 ₺). Cüzdan kartı coin bakiyesinin ₺ "tahmini hesap özetini" her platformda gösteriyor. Coin takasının sunucu tarafı varsayılan notu "X ₺ veya yaklaşık Y $'a satmak istiyorum". Oyun kazancı → hediye → elmas → banka zinciri kodda var. | **A** (kod) / canlıda çekim **hiç kullanılmamış** | 5.6, 2.5.19, 3.1.1, 5.3 |
| 5 | **iOS'ta Apple IAP yerine Stripe ile ajans üzerinden coin satın alma yolu canlıda AÇIK** (`stripe_enabled = true`). iOS cüzdanında "Apple yerine yetkili ajans üzerinden %20 indirimli Stripe ödeme" şeridi her zaman görünüyor. iOS etiket anahtarı (`cuzdanX.appleOdeme`) çeviri dosyalarında yok, bu yüzden ekranda ham anahtar görünüyor. App Review notlarında bu yoldan hiç söz edilmiyor. | **A** | 3.1.1 (birincil), 2.5.19 |
| 6 | **Fruit Wheel sonuçları canlı modda bir admin "çıkış planı" kuyruğuyla belirlenebiliyor** ("sıra doluysa listedeki meyve kesin gelir", saat kuralları, sonraki 8 sonucun önizlemesi). Kullanıcıya gösterilen kurallar metni bundan söz etmiyor. Şu an kuyrukta 0 kayıt, 0 kural var. | **A** (mekanizma) / Apple'ın görmesi düşük olasılık | 5.6 |
| 7 | **Fırtına Kralı otomatik oyunu sunucuda "mağaza politikası kapalı" diye kapatılmış, ama istemci `showAuto={true}` ile Auto düğmesini her zaman gösteriyor.** Sunucu yapılandırması ile gerçek davranış farklı. | **A** | 5.6, 2.5.19 |
| 8 | Sunucudan gelen banner/duyuru içerikleri herhangi bir uygulama içi route'a (ör. `/oyun/zeus`) veya alan adı kısıtı olmayan herhangi bir HTTPS sayfasına (uygulama içi WebView) yönlendirebiliyor. Banner'lar platform (IOS) ve ülkeye göre hedeflenebiliyor. | **A** (mekanizma) / **B** (kötüye kullanım) | 2.5.19, 2.5.2 |
| 9 | Kodda incelemeye göre metin ayarlandığını gösteren yorumlar var: "Dil: Apple incelemesi — kumar / nakit bozdurma ima etmez", "Apple-güvenli dil", "varsayılan KAPALI (store uyumu)". | **A** (kanıt niteliği: niyet göstergesi) | 5.6 |
| 10 | Mağaza açıklamasında geçmeyen önemli özellikler: oyunlar, AI Müzik Stüdyosu (ayrı IAP), dakikalık ücretli sesli/görüntülü aramalar, ajans sistemi (coin satışı, ödemeler), host kazançları, PK, şehir/ülke ligi, işlem hacmi (harcama gösterimi), unvan/VIP/recharge sıralaması. Web açıklaması (`app.config.ts:121`) "coin ve meyve oyunu" diyor, App Store açıklaması demiyor. | **C** | 2.3.1, 2.5.19 |
| 10b | **Build 34 cüzdan ekranı (§18):** Coin'i olan her kullanıcının cüzdan kartında, takas kapalıyken bile coin'in ₺ değeri, "platform hizmet payı" (%60) ve "tahmini hesap özeti" (%40, kodda `saticiNetTl`) gösteriliyor; altında "hesap hareketleri ayın 01–15 ve 15–31 dönemlerinde işlenir" notu var, "gerçek para değildir" uyarısı kart içinde gösterilmiyor. Kart EMV çip, NFC simgesi, 18 haneli numara ve "account holder" alanıyla "MUTA PAY" banka kartı gibi tasarlanmış. Alınan hediyeler "Earned: ₺" olarak listeleniyor; KYC (kimlik + canlılık selfie) bayraksız herkese açık. | **A** | 5.6, 2.5.19, 3.1.1 |
| 11 | **İnceleme hesabını veya Apple ortamını tespit eden kod bulunamadı** (TestFlight, sandbox makbuzu, IP, cihaz, hesap kimliği, ülke). OTA (expo-updates) yok, `eval`/uzaktan JS yok. | **D** (aranıp bulunamadı) | — |

**Kısa sonuç:** Reddi açıklayabilecek en somut, doğrudan kanıtlanmış unsurlar şunlar: (1) metadata'da hiç geçmeyen coin bahisli oyunlar; (2) bunların ve finansal özelliklerin sunucu bayraklarıyla build'den bağımsız açılıp kapanabilmesi; (3) review notundaki "coin nakde çevrilemez" beyanı ile kodda bulunan elmas→banka çekimi, coin→₺ satış/takas ve ₺ değer gösterimi arasındaki çelişki; (4) iOS'ta IAP dışı Stripe coin satın alma yolunun canlıda açık olması. Apple'ın tam olarak hangi davranışı kastettiği mesajda yazmıyor; bu yüzden aşağıdaki eşleştirmeler kanıta dayalı en güçlü adaylardır, kesin teşhis değildir.

---

## 1. Yönetici özeti

Tamuso, mağaza açıklamasının anlattığından (canlı yayın, ses odaları, mesajlaşma, durum paylaşımı, profil/takip) çok daha geniş bir ürün:

- coin ile bahis alınan, kazanç ödeyen çark ve slot oyunları,
- hediye → elmas → IBAN'a para çekme altyapısı,
- kullanıcılar arası coin takası/satışı,
- ajans üzerinden Stripe ile coin satışı,
- dakikalık ücretli aramalar,
- ayrı IAP'li AI müzik stüdyosu,
- ajans/host ekonomisi,
- 120'den fazla uzaktan bayrakla yönetilen modüler bir platform.

Bunların bir kısmı açık, bir kısmı binary'de hazır bekleyip sunucudan açılmayı bekliyor.

Apple'ın ret mesajındaki "An analysis of the submission determined…" ifadesi, binary analizinin de yapıldığını düşündürüyor (yorum). 1.3.0 binary'si (build 33 ve 34) bellekte açıldığında şu dizgiler doğrudan görülüyor:

- slot/çark sunucu uç noktaları (`zeus-spin`, `storm-king-spin`, `fair-spin-spin`, `kozmik-kaskad-spin`, `nox-reels-spin`),
- `withdrawal_requests`, `user_bank_accounts`, `coin_trade_offers`, `wallet_withdraw_enabled`, `wallet_sell_enabled`,
- "Diamond withdrawal", "IBAN", "saved bank account",
- "Stripe payment via authorized agency instead of {{magaza}}".

Uygulama, sunucu bayrağına göre farklı davranacak şekilde tasarlanmış. İnceleme sırasında kapalı olan özelliklerin onaydan sonra açılabilmesi, 2.5.19'un tarif ettiği durumun ta kendisi.

Öte yandan **inceleme hesabına özel davranış üreten kod yok**. Review notundaki "There is no reviewer-specific interface or behavior" cümlesi kod açısından doğru. Sorun reviewer'a özel davranış değil; **tüm kullanıcılar için sunucudan değiştirilebilen ve beyan edilmemiş işlevler**.

---

## 2. Apple'ın ret gerekçesinin teknik yorumu

| Ret ifadesi | Uygulamadaki en olası karşılık (kanıtlı) | Kanıt |
|---|---|---|
| **Hidden functionality** (gizli işlev) | Mağaza metninde ve review notunda hiç geçmeyen coin bahisli oyunlar; ses odası içindeki oyun dock'u; global "X oyunda N coin kazandı" banner'ları; iOS'ta Stripe ile ajans coin satışı | §3, §9; `app/room/[id].tsx:513-521, 2788`; `app/_layout.tsx:370`; `YetkiliAjansYukleSeridi.tsx:115-135` |
| **Dormant functionality** (pasif işlev) | Binary'de hazır, sunucuda kapalı: elmas çekimi (IBAN), coin satışı/takası, cüzdan no ile coin transferi, Studio (AI oyun üretimi), 6 adet yönlendirilmiş (redirect) oyun ekranı, SİS Spin menü öğesi | `wallet.tsx:268-275, 630, 1274`; `OzellikBayrakCache.ts:29-32`; IPA dizgileri |
| **Undocumented features** (belgelenmemiş) | Oyunlar, AI Müzik (ayrı IAP), ücretli aramalar, ajans/host ödeme sistemi, PK, ligler, işlem hacmi | §10, §11 |
| **Misleading functionality** (yanıltıcı) | "Coin'ler nakde çevrilemez" beyanı ile elmas→banka çekimi ve ₺ değer gösterimi; Fruit Wheel kurallar metni ile admin sonuç kuyruğu; "autoplay kapalı" bayrağı ile her zaman görünen Auto düğmesi | §9, §12 |
| **Materially different from review/metadata** (önemli ölçüde farklı) | Metadata: "sosyal platform". Gerçek: coin ekonomisi + bahisli oyunlar + nakit çıkışı + IAP dışı ödeme. Fırtına Kralı'nın sunucuda build'den bağımsız açılması | §6, §8 |
| **Manipulative or misleading behavior (5.6)** | İncelemeye göre ayarlanmış metin yorumları; `storm_king_autoplay_enabled` "mağaza politikası kapalı" iken istemcinin Auto'yu göstermesi; review notundaki finansal beyanın kodla çelişmesi | §12, §13 |

Not: Apple mesajı belirli bir ekran adı vermiyor. Yukarıdaki eşleştirmeler kanıtlı adaylardır; Apple'ın bunlardan hangisini veya hepsini kastettiği **doğrulanamaz** (E).

---

## 3. Uygulamanın tüm özelliklerinin envanteri

Toplam route sayısı: `app/` altında yaklaşık 330 ekran. Bunlardan yaklaşık 125'i `app/admin/*`, yaklaşık 37'si `app/ajans/*`, 11'i `app/oyun/*`. Build 34 binary'sinde bu route dosyalarının tamamı derlenmiş (IPA'da `./admin/...`, `./oyun/...`, `./tanitim/...`, `./webview.tsx` dizgileri doğrulandı).

### 3.1 Ana gezinme
- **Sekmeler** (`src/components/YuzenTabBar.tsx:141-145`): Ana, Durum, Oluştur, Mesaj, Profil. `rooms`, `wallet`, `cihazlar` gizli sekme (`app/(tabs)/_layout.tsx:110-121`), uygulama içinden açılıyor.
- **Hamburger menü** (`src/moduller/ana-sayfa/menu/HamburgerMenuKatalogu.ts`): blog, canlı yayın, PK, Ajansım, duyurular, Host ol, sıralama, Dünya Ülke Ligi, Şehir Ligi, Resmi Şehir, Etkinlikler, Senin İçin, AI Müzik Stüdyosu, SİS Spin, Kişiler, Asistan, Fikir, Canlı destek, Bildir, admin: Oyun Testi ve Admin Panel.
  - Canlı `hamburger_menu_items` tablosu: `sis_spin` = **kapalı**, `pk` = kapalı, diğerleri açık; `admin_oyun_test` ve `admin_panel` istemcide `adminOnly`.

### 3.2 Özellik tablosu

| Özellik | Ana dosyalar | Görünür mü / nereden | Kim | Koşul | Git ilk ekleme |
|---|---|---|---|---|---|
| Canlı yayın, yorum, hediye, PK | `app/canli/*`, `app/pk`, `src/moduller/canli-yayin`, `pk` | Evet: Oluştur, menü | Herkes | `live_enabled`, `pk_enabled`, `live_ui_*` | 2026-09-12 |
| Sesli sohbet odaları | `app/room/[id].tsx`, `src/moduller/ses-odalari` | Evet | Herkes | `voice_rooms_enabled` | 2026-09-12 |
| Mesajlaşma (foto/video/ses/müzik, tek görüntüleme) | `app/mesaj/[id].tsx`, `src/moduller/mesajlasma` | Evet | Herkes | `messages_*` bayrakları | 2026-09-12 |
| Durum ve hikaye | `app/(tabs)/durum.tsx`, `app/hikaye/*` | Evet | Herkes | `stories_*` | Durum 09-12; hikaye **10-06** |
| Canlı kesit (clip) | `src/moduller/canli-kesit` | Yayın sahibi | Host | `live_clip_story_enabled` | 10-07 |
| Profil, takip, engelleme, şikayet | `app/(tabs)/profile.tsx`, `app/takip/*`, `app/bildir` | Evet | Herkes | — | 09-12 / 09-15 |
| Kişiler keşfi + **dakikalık ücretli arama** | `app/kisiler`, `KisilerAramaOnaySheet.tsx:89-150` | Evet: menü | Herkes | `people_*`, `people_paid_calling_enabled` (canlı: açık) | 09-26 |
| 1:1 sesli/görüntülü arama (CallKit) | `app/gorusme/[id].tsx` | Evet | Herkes | `callkit_enabled` | 09-15 |
| **Cüzdan: IAP coin** | `app/(tabs)/wallet.tsx:500-562`, `src/moduller/iap` | Evet | Herkes | `iap_enabled` | 09-12 |
| **Cüzdan: yetkili ajans Stripe coin** | `CoinPaketMagaza.tsx:42,223-228`, `YetkiliAjansYukleSeridi.tsx`, `AjansPaketTeklifOde.ts` | **Evet: iOS dahil** | Herkes | `stripe_enabled` (**canlı: açık**) | 10-02 |
| **Cüzdan: elmas çekimi (IBAN)** | `wallet.tsx:268-275, 565-632, 1274-1330` | Hayır: bayrak kapalı | Host/kullanıcı | `withdrawals_enabled` / `wallet_withdraw_enabled` (canlı: kapalı) | 09-12 / 09-18 |
| **Coin takas / satış / cüzdan no transfer** | `app/cuzdan/takas.tsx`, `src/moduller/cuzdan/takas` | Hayır: bayrak kapalı | KYC'li kullanıcı | `wallet_exchange_enabled` (canlı: kapalı) | 09-18 |
| KYC | `app/kyc` | Evet: cüzdan hızlı eylem | Herkes | — | 09-18 |
| **Oyunlar** | `app/oyun/*`, `src/moduller/oyunlar/*` | Evet: ses odası dock'u, profil oyun kartı, global kazanç banner'ı | Herkes (giriş yapmış) | `games_enabled`, oyun başına bayrak, `game_control_configs`, istemci beyaz listesi | Kaskad/Zeus/Nox 09-18; Fruit Wheel/SİS/Fair/Astral 10-02; **Fırtına Kralı: hiç commit edilmedi** |
| AI Müzik Stüdyosu (ayrı IAP) | `app/ai-muzik/*`, `supabase/functions/ai-music-*` | Evet: menü | Herkes | `ai_music_*` (canlı: açık) | Modül 09-25, route 10-02 |
| AI Asistan (DeepSeek) | `app/asistan` | Evet: menü | Herkes | `ai_assistant_enabled` | 10-02 |
| Ajans sistemi (üyeler, cüzdan, paket, satış linki, fatura/dekont, toplantı) | `app/ajans/*` | Evet: menü "Ajansım" | Ajans sahibi/üye | `agency_enabled`, `agency_meetings_enabled` | 09-12…10-02; toplantı: **commit edilmemiş** |
| Host merkezi | `app/host` | Evet: menü "Host ol" | Herkes | — | 09-12 |
| Şehir ligi/savaş/seçim, ülke ligi | `app/sehir/*`, `app/ulke/*` | Evet: menü | Herkes | `city_*`, `country_league_*` | 09-12…10-02 |
| İşlem hacmi (harcama ₺ gösterimi) | `app/islem-hacmi` | Evet: profil kartı | Herkes | `transaction_volume_*` | 10-02 |
| Unvan, VIP, gifter/charm/recharge seviyesi | `app/ayarlar/unvanlarim`, `src/moduller/vip` | Evet: profil | Herkes | `user_titles_enabled` | 09-12 / 10-02 |
| Sıralamalar (Top Recharge / Top Gifter) | `app/siralamalar` | Evet: menü | Herkes | — | 09-12 |
| Platform (etkinlik/görev) | `app/platform` | Evet: çekmece "Premium" | Herkes | `events_enabled` | 09-12 |
| Sertifikasyon hub (stres testleri) | `app/sertifikasyon` | Bağlantı herkese görünür (`app/platform/index.tsx:100-105`), ekran yalnızca admin (`app/sertifikasyon/index.tsx:182-185`) | Admin | `certification_hub_enabled`, `stress_tools_enabled` (canlı: açık) | 09-12 |
| Blog | `app/blog` | Evet: menü (bayraksız) | Herkes | — | 10-07 |
| Studio (AI oyun üretici) | `app/studio/*` | Hayır: redirect (çalışma ağacı); 4724bbc'de tam ekran | — | `studio_*` (canlı: kapalı) | 10-02 |
| Tanıtım sayfaları (coinler, meyve, **yatırım**, işbirliği) | `app/tanitim/*` | Native'de bağlantı yok; deep link/banner ile açılabilir | — | — | 10-07 |
| Uygulama içi WebView | `app/webview.tsx` | Mesaj/banner linkleri | Herkes | Alan adı izin listesi yok | 09-15 |
| Admin paneli (~125 ekran) | `app/admin/*` | Yalnızca admin | `profiles.is_admin` + RBAC | Sunucu RPC kontrolleri | 09-12… |

---

## 4. Normal kullanıcıların görebildiği özellikler (canlı bayrak durumuna göre)

Canlı `feature_flags` sorgusuna (25 Ekim 2026) göre normal bir iOS kullanıcısı şunları görebilir: canlı yayın, ses odaları, mesajlaşma, durum/hikaye, profil/takip, şikayet/engelleme, kişiler keşfi ve **ücretli aramalar**, AI müzik, AI asistan, ligler, işlem hacmi, unvanlar, ajans, host ol, blog, KYC. Ayrıca:

- **Oyunlar:** `games_enabled=true`, `fruit_wheel_enabled=true`, `storm_king_enabled=true`. Ses odasında oyun dock düğmesi (`app/room/[id].tsx:2788`) → `OyunBaslatModal` (Fruit Wheel ve "FIRTINA" kartları, `OyunBaslatModal.tsx:48-50, 98`).
- **Profil oyun kartı:** kupa/kazanç (`app/(tabs)/profile.tsx:122-126, 464`).
- **Global oyun kazanç banner'ı:** `app/_layout.tsx:370` (`OyunKazancBalonuSaglayici`, `games_enabled` kapısı yok).
- **Cüzdan:**
  - IAP coin paketleri.
  - "Yetkili ajans üzerinden %20 indirimli Stripe ödeme" şeridi (iOS dahil).
  - Coin bakiyesi > 0 ise ₺ "Katalog değeri / Platform hizmet payı / Tahmini hesap özeti" paneli (`CuzdanBankaKarti.tsx:196-198`, `CoinDegerOzetiPaneli.tsx:56-76`).
  - "Hediye geçmişi" sekmesinde alınan hediyeler için "Kazanç: X ₺" (`wallet.tsx:1214-1217`).

---

## 5. Rol veya koşul nedeniyle görünmeyen özellikler

### 5.1 Meşru yetki kontrolü (D)
- **Admin:** `profiles.is_admin` istemciden değiştirilemiyor (trigger: `supabase/migrations/015_admin_yetkisi.sql:11-35`). RBAC v2 var (`admin_accounts`, `admin_has_permission()`, `20261006120000_admin_rbac_v2_schema.sql`). Admin RPC'leri sunucuda `ben_admin_miyim()` / `admin_has_permission()` ile korunuyor.
- **Oyun Testi** (`app/admin/oyun-test.tsx:38-60`): istemcide admin kontrolü var, menüde `adminOnly` (`HamburgerMenuKatalogu.ts:232-242`), ücretsiz test settle'ı sunucuda `is_admin` istiyor (`097_admin_ses_odasi_gercek_settle.sql:48-49`). Normal kullanıcıya açık değil, ihlal kanıtı yok.
- **İstemci kontrolü eksik admin route'lar** (`app/admin/duyurular/*`, `blog/*`, `app-launch/*`, `ajans-sertifika`, `ajans-odalari`, `bannerlar/yeni`): URL ile açılabilir ama veri işlemleri sunucu RPC'leriyle korunuyor (alt inceleme tespiti). 2.5.19 açısından düşük risk, güvenlik açısından hijyen sorunu.
- **Misafir hesap:** production build'de gizli (`app/(auth)/login.tsx:561-569`), build zamanı kararı. Reviewer ve kullanıcı aynı şeyi görüyor (D).

### 5.2 Bayrakla gizli, binary'de hazır (pasif) özellikler (A, 2.5.19 riski)

| Özellik | Canlı bayrak | Binary'de (b33/b34) |
|---|---|---|
| Elmas çekimi / IBAN / banka | `withdrawals_enabled=false`, `wallet_withdraw_enabled=false` | "Diamond withdrawal", "Create withdrawal request", "IBAN", "saved bank account" dizgileri var |
| Coin satış / takas / cüzdan no transfer | `wallet_exchange_enabled=false`, `wallet_sell_enabled=false` | `coin_takas_teklif_olustur`, `cuzdan_no_ile_coin_transfer`, `mutapay://`, "MUTA PAY" var |
| Studio / AI oyun üretimi | `studio_*=false` | `StudioV2`, `playcanvas`, `studio_menu_visible` var |
| Zeus / Nox / Kaskad / Fair Spin / Astral Falls / SİS / Dede ekranları | Route'lar redirect; sunucuda zeus/fair/astral bayrakları **açık** | Spin uç nokta dizgileri var |
| SİS Spin menü öğesi | Uzak menüde kapalı; yerel varsayılan açık (`HamburgerMenuCache.ts:20-25`), ağ yüklenmeden önce görünebilir | `menuSisSpin`, `/oyun/sis-spin` var |
| Fırtına Kralı otomatik oyun | `storm_king_autoplay_enabled=false` ("mağaza politikası kapalı") | İstemci bayrağı okumuyor: `StormKingScreen.tsx:416` `showAuto={true}` |

### 5.3 Koşullara bağlı
- **Fruit Wheel yaş/bölge politikası:** `fruit_wheel_policy.minimum_age_policy=18`, `allowed_regions=[]` (tüm ülkeler).
- **Ülke/sürüm/hesap yaşı kapısı:** finansal ve oyun özelliklerinde **yok** (alt inceleme, doğrulandı). Banner ve duyurular ülke, platform ve sürüme göre hedeflenebiliyor (`src/banner/core/BannerEligibilityEngine.ts:74-154`).

---

## 6. Uzaktan etkinleştirilen özellikler (öncelikli bölüm)

| Mekanizma | Nerede | Nasıl çalışır | Kim değiştirir | Build olmadan işlev değiştirir mi? | İnceleme sırası/sonrası farklı davranış? | 2.5.19 riski |
|---|---|---|---|---|---|---|
| **Feature flags + kill switches** | `src/moduller/ozellik-bayraklari/OzellikBayrakCache.ts:259-310`, `OzellikBayragiAnahtarlari.ts`; tablolar `feature_flags`, `kill_switches`; RPC `ozellik_bayraklari_snapshot` | Açılışta ve **Supabase Realtime** ile anlık yükleniyor; yerel varsayılanlar yalnızca ağ yokken | Admin (`app/admin/ozellikler.tsx`), migration'lar | **Evet** (oyunlar, çekim, takas, Stripe, IAP, AI, ücretli arama, hikaye vb.) | **Evet**, global boolean; tüm kullanıcılar için aynı anda | **Yüksek (A)** |
| **Oyun görünürlüğü** | `game_control_configs`, `game_catalog`; `OyunKontrolServisi.ts:22-58`; `useGorunurOyunKodlari.ts:30-38` | Sunucu listesi ∩ istemci beyaz listesi (`fruit_wheel`, `storm_king`) | Admin / migration | **Evet**: Fırtına Kralı 2026-10-12'de sunucudan açıldı | Evet | **Yüksek (A)** |
| **Oyun matematiği / RTP / mod** | `game_math_versions`, `game_rtp_schedule`, `kaskad_rtp_schedule`, `game_control_configs.mode` (NORMAL/LOW_REWARD/…), `game_control_overrides` (zaman pencereli) | Sunucu tarafı | Admin | Evet (ödeme oranları) | Evet | Orta (5.6) |
| **Oyun çıkış planı** | `supabase/migrations/20261014150000_oyun_cikis_plani.sql` (commit edilmemiş, **canlıda kurulu**) | Admin sonuç kuyruğu (`game_cikis_sira`), saat kuralları (`game_cikis_kural`), önizleme (`game_cikis_pano`) | Admin | Evet | Evet | Orta (5.6) |
| **Hamburger menü** | `HamburgerMenuCache.ts:93-146`; `hamburger_menu_items` | Realtime; yalnızca açık/kapalı, sıra, grup. Linkler binary'deki katalogdan | Admin | Kısmen (menü öğesini gösterir/gizler) | Evet | Orta |
| **Cüzdan UI** | `wallet_ui_live`, `wallet_ui_versions`; `CuzdanUiNormalize.ts:82-98` | Bölümler, metinler, değer özeti etiketleri; route eylemleri beyaz listeli | Admin | Evet (metin/bölüm) | Evet | Orta |
| **Banner'lar** | `src/banner/actions/BannerActionRouter.ts:45-53`, `BannerWebHandler.ts:33` | `INTERNAL_SCREEN` herhangi bir route'a gider (yorumdaki örnek: `/oyun/zeus`); `WEB_URL` alan adı izin listesi olmadan uygulama içi WebView açar | Admin | **Evet**: gizli ekranları yüzeye çıkarabilir | Evet; platform/ülke hedefli | Orta-Yüksek (B) |
| **Duyurular** | `DuyuruHedefCoz.ts:49` (GAME → `/oyun/${id}`), `app/duyuru/[id].tsx:88-95` | CTA'lar route veya HTTPS açar | Admin | Evet | Evet | Orta |
| **Giriş lobisi** | `login.tsx:198-200, 382-390` | Formu veya sosyal girişleri (Apple dahil) gizleyebilir | Admin | Evet | Evet | Düşük-Orta |
| **Sürüm politikası** | `app_version_policies`; `src/moduller/surum-politikasi` | Zorunlu/opsiyonel güncelleme ve bakım. Canlıda: iOS min 1.2.4, zorunlu güncelleme kapalı | Admin | İşlev değil, erişim | — | Düşük (D) |
| **OTA / Expo Updates** | `package.json`'da yok; IPA'da EXUpdates yok | — | — | Hayır | — | Yok (D) |
| **Uzaktan JS / dinamik kod** | `eval` / `new Function` yok; Astral Falls HTML'i binary'ye gömülü (`AstralFallsHtmlBundle.ts`); Studio PlayCanvas motoru gömülü, sunucudan manifest alıyor (`OyunCalismaAlani.tsx:47-55,105`) | — | — | Studio: manifest/asset ile içerik değişebilir (şu an kapalı) | — | Düşük-Orta (B, Studio) |
| **WebView** | `app/webview.tsx`, `TamusoWebViewScreen.tsx:30-34,188-193`; `StripeCheckoutWebSheet.tsx:144-154` | Herhangi bir HTTPS URL; Stripe Checkout yedeği | Sunucu/banner/mesaj linki | Evet (içerik) | Evet | Orta (B) |

**İnceleme ortamını tespit eden kod:** IP, cihaz modeli, hesap kimliği, ülke, uygulama sürümü, TestFlight veya sandbox makbuzu üzerinden işlev değiştiren kod **bulunamadı** (D). Build 34 bundle'ındaki tek "reviewer" eşleşmesi KYC gizlilik metni ("Access is limited to authorized reviewers"). Rol bazlı farklar yalnızca admin/ajans/misafir için ve meşru.

---

## 7. İnceleme hesabının erişim analizi

İnceleme demo hesabının kimliği bu denetimde bilinmiyor (E). Kod ve canlı yapılandırmaya göre giriş yapmış standart bir iOS hesabı şunları görür veya yapabilir:

1. **Ses odası → oyun dock düğmesi** (`app/room/[id].tsx:2788`, koşul `oyunlarAcik && !isDemo`). Fruit Wheel ve Fırtına Kralı açılır. Bahis için coin gerekir; sandbox IAP ile coin alınabilir.
2. **Ana sayfa / odalar / ses odası:** başka kullanıcıların "{{ad}}, {{oyun}} oyununda {{carpan}} ile {{coin}} coin kazandı" banner'ları ("Oyuna git" düğmesiyle). Canlıda son duyurular 2026-10-22 14:56–14:58 UTC (storm_king, fruit_wheel).
3. **Profil:** oyun profil kartı (kupa/kazanç).
4. **Cüzdan:**
   - IAP paketleri.
   - "veya" ayracından sonra **yetkili ajans Stripe şeridi**. Başlık ve alt metin her zaman çizilir (`YetkiliAjansYukleSeridi.tsx:122-135`). Alt metin iOS'ta İngilizce "20% off Stripe payment via authorized agency instead of cuzdanX.appleOdeme", Türkçe "cuzdanX.appleOdeme yerine yetkili ajans üzerinden %20 indirimli Stripe ödeme" olarak görünür, çünkü `cuzdanX.appleOdeme` anahtarı `tr.ts`/`en.ts`'te tanımlı değil.
   - Coin > 0 ise ₺ değer özeti paneli.
5. **Hamburger:** "Ajansım — Kurallar · ödemeler · coinler", "Host ol", AI Müzik (ayrı satın alma), Kişiler (dakikalık ücretli arama).
6. **Göremez:** çekim sekmesi, takas, Studio, diğer slot ekranları (redirect), admin ekranları.

**Sonuç:** Reviewer'a özel kısıtlama yok. Ancak reviewer, metadata'da hiç anlatılmayan oyunlar, Stripe yolu ve ₺ değer gösterimiyle doğrudan karşılaşabilir (A). Binary analizinde ise pasif çekim/takas/slot kodları görünür (A).

---

## 8. iOS 1.3.0 sürüm analizi

### 8.1 EAS build kayıtları (`eas build:list`, salt okunur)

| Build | Profil | Dağıtım | Sürüm/Build | gitCommitHash | Oluşturma (UTC) |
|---|---|---|---|---|---|
| 601a92b1 | production | STORE | 1.2.5 / 32 | `e45cceb` | 2026-10-04 12:34 |
| 24de4a68 | development | INTERNAL | 1.2.5 / 32 | `e45cceb` | 2026-10-06 13:07 |
| **9ad83922** | production | **STORE** | **1.3.0 / 33** | `cee4201` | **2026-10-11 06:17** |
| bbdf25e9 | development | INTERNAL | 1.3.0 / 33 | `56a361e` | 2026-10-19 18:18 |
| **2e4e57f9** | production | **STORE** | **1.3.0 / 34** | `4724bbc` | **2026-10-22 08:47** |

- **Bundle ID:** `com.litxtech.muta` (IPA Info.plist'ten doğrulandı). `CFBundleShortVersionString=1.3.0`.
- **Derleme yapılandırması:** `eas.json` production profili, `EXPO_PUBLIC_APP_ENV=production`, `aps-environment=production`, `autoIncrement`, `appVersionSource=remote`. EAS ortamından ek olarak `EXPO_PUBLIC_PAY_BASE_URL` yükleniyor (`eas-ios-prod-asc2.log:16`).
- **Hangi build reddedildi?** App Store Connect'e erişim yok. Build 34 en son STORE build'i olduğu için en olası aday, ama **doğrulanamadı (E)**.

### 8.2 Commit ≠ binary (kritik metodoloji bulgusu)
- `git status`: 398 değiştirilmiş veya izlenmeyen dosya. `app.config.ts` HEAD'de `1.2.5`, çalışma ağacında `1.3.0` (commit edilmemiş).
- Build 33'ün commit'i `cee4201` `1.2.5` içerdiği halde build 33 `1.3.0`. Build 32'nin commit'i `e45cceb` `1.2.4` içerdiği halde build 32 `1.2.5`. Yani **EAS, commit edilmemiş çalışma ağacını arşivleyip derlemiş**; commit hash'leri binary'yi temsil etmiyor.
- **Kesin kanıt:** Fırtına Kralı dosyalarının tamamı izlenmeyen (`??`) durumda, yani hiç commit edilmemiş. Build 34'ün `main.jsbundle`'ında ise `storm_king` (9), `storm-king-spin` (1), `/oyun/storm-king` (1), `FIRTINA` (1), `storm_king_abort` (1), `game_cikis` (6), "Game coins are for play" (1) dizgileri var. Build 33'te bunların hiçbiri yok.
- Commit edilmemiş 362 mevcut dosyanın 352'sinin son değişiklik zamanı build 34'ten önce. 10 dosyanın değişiklik zamanı 25 Ekim 01:24 (bu denetimin başladığı dakika) olarak görünüyor; bu denetim tarafından yazılmadı, ama bu dosyaların build 34 anındaki içeriği zamandan çıkarılamaz.

### 8.3 IPA bundle karşılaştırması (bellekte, diske yazılmadan)

| Dizgi | b32 (1.2.5) | b33 (1.3.0) | b34 (1.3.0) |
|---|---|---|---|
| `fruit_wheel` | 14 | 15 | 15 |
| `storm_king` / `storm-king-spin` | 0 / 0 | 0 / 0 | **9 / 1** |
| `zeus-spin`, `fair-spin-spin`, `kozmik-kaskad-spin`, `nox-reels-spin` | 1 her biri | 1 her biri | 1 her biri |
| `astral-falls-spin` | 1 | 0 | 0 |
| `withdrawal_requests`, `user_bank_accounts`, `coin_trade_offers` | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 |
| `wallet_withdraw_enabled`, `wallet_sell_enabled`, `withdrawals_enabled` | var | var | var |
| "…Stripe payment via authorized agency instead of {{magaza}}" | — | var | var |
| "Diamond withdrawal", "Create withdrawal request", "saved bank account" | — | var | var |
| "Estimated account summary", "Platform service share" | — | var | var |
| `fruit_wheel_admin_force_next` | — | var | var |
| `game_cikis` (çıkış planı) | — | 0 | **6** |
| `initPaymentSheet` / `presentPaymentSheet` (Stripe native) | — | 2 / 1 | 2 / 1 |
| `react-native-webview` | 3 | 3 | 3 |
| `ozellik_bayraklari_snapshot` | 1 | 1 | 1 |

(b32 için yalnızca ilk tablo dizgileri tarandı; "—" taranmadı demektir.)

### 8.4 Bugünkü kod ile 1.3.0 farkı
- Build 34 ≈ `4724bbc` + build öncesi commit edilmemiş değişiklikler. Bugünkü çalışma ağacı ≈ build 34. Sapma olabilecek 10 dosya: `app/oyun/storm-king.tsx`, `metro.config.js`, `OdaOyunDockButonu.tsx`, `IcerikGuvenlikDugmesi.tsx`, `OdaMuzikButonu.tsx`, `OdaSesHacmiButonu.tsx`, storm-king script'leri, `20261012121000_storm_king.sql`. Bunların varlığı IPA'da doğrulandı, içerik farkı doğrulanamadı.
- Build 33 ≈ `cee4201` + o tarihteki commit edilmemiş değişiklikler. Bu içerik **geri elde edilemiyor**. Yalnızca IPA dizgileri kanıt.

### 8.5 Build'den sonra değişen sunucu yapılandırmaları (canlı `updated_at` değerleri)

| Zaman (UTC) | Değişiklik | Build ilişkisi |
|---|---|---|
| 2026-10-02 14:15 | `fruit_wheel` katalog/bayrak/konfig oluşturuldu | b32'den önce |
| 2026-10-07 08:19 | `fruit_wheel_policy` güncellendi (`PLATFORM_APPROVED_COIN`) | b32 ile b33 arası |
| 2026-10-07 15:05 | Hamburger menü yapılandırması (sis_spin kapalı) | b32 ile b33 arası |
| 2026-10-09 19:57 | `transaction_volume_enabled` kapat-aç | b33'ten önce |
| **2026-10-12 09:43** | **`storm_king_enabled=true`, katalog "Fırtına Kralı", `game_control_configs` NORMAL** (migration, `updated_by=null`) | **b33'ten sonra, b34'ten önce; build olmadan sunucuda açıldı** |
| 2026-10-12 | 120 Fırtına Kralı spin'i (1 kullanıcı), 78 Fruit Wheel turu | Test etkinliği |
| (commit edilmemiş) 2026-10-14 tarihli migration | Oyun çıkış planı tabloları ve fonksiyonları canlıda kurulu | b34'ten önce |
| 2026-10-22 14:56–14:58 | storm_king / fruit_wheel kazanç duyuruları | b34 alındıktan sonra; inceleme penceresine yakın |
| 2026-10-22 20:36 | Stripe ajans paketi siparişi (`pending`, admin hesabı) | Geliştirici testi |

`admin_audit_logs` içinde 10 Ekim ile 24 Ekim arasında bayrak değişikliği kaydı yok. Fırtına Kralı açılışı bir migration ile yapıldığı için admin denetim kaydına düşmemiş.

---

## 9. Coin, oyun, hediye ve para çekme analizi

### 9.1 Oyunlar (tam liste)

| Oyun | Tür | Route (çalışma ağacı / b34) | Sunucu | Canlı durum |
|---|---|---|---|---|
| Fruit Wheel | 8 meyveli canlı çark, en fazla 4 meyveye coin | `app/oyun/fruit-wheel.tsx` (`isGameVisible`) + ses odası | RPC'ler; `fruit_wheel_create_round` | **Açık**, NORMAL; bahis 10–100.000/meyve, 500.000/tur |
| Fırtına Kralı | 6×5 tumble slot | `app/oyun/storm-king.tsx` (**giriş veya görünürlük kontrolü yok**) + ses odası | `supabase/functions/storm-king-spin`, `storm_king_settle` | **Açık**; bahis 10/50/100/500/1000, kazanç tavanı bahis×5000 |
| Zeus | 6×5 cascade slot | Redirect | `zeus-spin` | Bayrak **açık**, NORMAL (istemci gizli) |
| Astral Falls | Cascade slot (gömülü WebView) | Redirect | `astral-falls-spin` | Bayrak **açık**, LOW_REWARD |
| Fair Spin | 8 dilimli çark | Redirect | `fair-spin-spin` | Bayrak **açık**, LOW_REWARD |
| SİS Spin | Çark (10–1000 coin) | Redirect; menü öğesi (uzakta kapalı) | `sis_spin_cevir` (**bayrak kontrolü yok**, yalnızca kill switch) | Canlıda mevcut |
| Kozmik Kaskad | Cascade slot | Redirect | `kozmik-kaskad-spin` | Kapalı, MAINTENANCE |
| NOX Reels | 5×3 payline slot | Redirect | `nox-reels-spin` | Kapalı, MAINTENANCE |
| Dede | — | Redirect | — | — |
| Match-3 | — | Kaldırılmış | — | Kapalı |

- **Erişim yolları:** ses odası dock'u; `/room/<id>?oyun=storm_king` deep link'i (`app/room/[id].tsx:539-548`, görünürlük kontrolü yok); kazanç banner'ı → "Oyuna git"; banner/duyuru route'ları; web tanıtım sayfası (`/tanitim/meyve`).
- **Bakiye:** Ayrı oyun bakiyesi **yok**. Tüm oyunlar `wallets.coins` bakiyesini (hediyelerle aynı bakiye) kullanıyor (alt inceleme; `20261012131618_storm_king_abort.sql:351-360`, `056_oyun_sonuc_odul_alanlari.sql:170`).
- **Ödül hesaplama:** sunucu RNG. Fruit Wheel çarpanları ×5/×10/×15/×25/×40 (≈%96,9 RTP); Fırtına Kralı çarpan küresi 350 bps (×2–×50); Zeus profilleri 0,95 / 0,98 / 0,89 RTP.
- **Kayıtlar:** `wallet_ledger`, `storm_king_spins`, `fruit_wheel_ledger`/`settlements`, `oyun_kazanc_duyurulari` (≥100 coin kazançlar duyuruluyor).
- **Host'a etkisi:** Oyun gelirinden host'a pay ödenmiyor; `oda_oyun_harcama` yalnızca istatistik ve sıralama (alt inceleme).
- **Admin sonuç kontrolü:**
  - `fruit_wheel_admin_force_next` yalnızca `TEST_BALANCE` modunda çalışıyor (`20261002193000_fruit_wheel.sql:1514-1516`); canlı mod `PLATFORM_APPROVED_COIN` olduğu için **etkisiz** (D).
  - Ancak `game_cikis_cek` canlı modda da devrede (`20261014150000_oyun_cikis_plani.sql:921-941`; canlı `fruit_wheel_create_round` tanımında `game_cikis_cek` referansı doğrulandı). Açıklama metni: "Sıra doluysa listedeki meyve kesin gelir" (satır 94). Fırtına Kralı için: "Yüzdeyi düşürmek büyük kazancı seyrekleştirir" (satır 103). Canlıda kuyruk ve kural sayısı 0.
- **Kullanıcıya gösterilen kural** (`tr.ts:2268`): "Kazanan meyve tur açılırken sunucuda belirlenir; seçim dağılımına göre sonradan değiştirilmez…". Admin kuyruğu da tur açılırken uygulandığı için cümle teknik olarak yanlış değil, ancak admin'in sonucu önceden belirleyebildiği açıklanmıyor (5.6 riski).

### 9.2 Bakiye türleri

| Varlık | Tablo/kolon | Nereden gelir | Nereye gider |
|---|---|---|---|
| Coin (satın alınan, oyundan kazanılan, ajanstan transfer edilen; **hepsi karışık**) | `wallets.coins` | IAP, Stripe ajans paketi, oyun kazancı, ajans transferi, takas | Hediye, oyun bahsi, ücretli arama, takas |
| Elmas (kazanç) | `wallets.diamonds`, `host_earnings.diamonds`, `host_earnings_ledger` | Alınan hediye, ücretli arama geliri | Çekim talebi (`withdrawal_requests`) |
| Ajans cüzdanı | `agency_wallets` (`diamonds`, `distribution_balance`, `coins`) | Host komisyonu, admin dağıtım bakiyesi | Kullanıcıya coin transferi |
| Bekleyen/çekilebilir | `withdrawal_requests` (status pending→paid), `payout_requests` (eski) | — | Banka (IBAN) |
| Banka hesabı | `user_bank_accounts` (IBAN) | `app/profil-duzenle` | — |

### 9.3 Sorulara teknik cevaplar

1. **Yayıncı kazancı hangi olayla oluşuyor?** `send_gift` RPC'sinde hediye gönderildiğinde alıcıya `gift.diamond_value × adet` elmas yazılıyor (`supabase/migrations/102_pk_davet_ve_canli_hediye.sql:421-451`). Ücretli arama bitince aranana `brüt − platform_call_fee` (varsayılan 0,2) elmas yazılıyor (`20260926000100_…coin_metering.sql:790-847`).
2. **%60 yayıncı payı kodda nasıl hesaplanıyor?** **Kodda veya canlıda %60 yayıncı payı bulunamadı.**
   - Canlı `platform_economy_config.gift_host_share = 0.8`. Canlı hediye kataloğunda `diamond_value/coin_cost` oranı ortalama 0,807 (min 0,778, max 1,0; 52 hediye).
   - Host bir ajansa bağlıysa `hediye_ajans_komisyon` trigger'ı host elmasının `agency_share` kadarını (canlıda 3 ajansın hepsinde 0,20) ajansa aktarıyor (`037_cuzdan_cekim_duzeltmeleri.sql:193-265`).
   - Etkin dağılım, coin katalog değeri üzerinden: ajanssız host ≈ %80 / platform ≈ %20; ajanslı host ≈ %64 / ajans ≈ %16 / platform ≈ %20.
3. **Platformun %40 payı nasıl hesaplanıyor?** Hediyelerde %40 yok. **60/40 yalnızca coin takasında var ve ters yönde:** platform %60, satıcı %40 (`20260918120054_coin_takas_paylasim_tl_iap_sogutma.sql:1-46`; `src/moduller/cuzdan/katalog/CoinTakasPaylasimi.ts:9-10`, `PLATFORM_PAY_ORANI = 0.6`, `SATICI_PAY_ORANI = 0.4`).
4. **Brüt mü net mi?** Hediye payı brüt coin katalog değeri üzerinden; ajans komisyonu host'un elmasından ayrıca düşülüyor. Apple'ın kesintisi ayrı bir tahmin alanı (`iap_store_fee_estimate=0.3`) olarak simülatörde tutuluyor, dağılımı etkilemiyor.
5. **Coin ↔ USD dönüşümü:** Canlıda `coin_try=0.10`, `diamond_try=0.10`. USD sabit "1 $ ≈ 35 ₺" (`TeklifMesaji.ts:10-11`; `20260920184945_…wallet_flags.sql:356`, `round(v_satici / 35.0)`).
6. **Oyun kazançları nakde hangi yollarla dönüşebilir?**
   - (a) oyun coin'i → hediye → alıcıda elmas → çekim talebi (bayrak açılırsa);
   - (b) oyun coin'i → takas ile ₺ karşılığı satış (bayrak açılırsa). Yalnızca IAP coin'lerine 14 günlük soğuma süresi var; oyun coin'leri kilitli değil.
   - Canlıda iki yol da kapalı ve **hiç kullanılmamış**: `withdrawal_requests = 0`, `payout_requests = 0`. `coin_trade_offers` yalnızca 18 Eylül test kayıtları (6 adet).
7. **Aynı kişiye ait hesaplar arasında kazanç aktarımı:** Kodda ikinci hesaba hediye göndermeyi engelleyen bir kural bulunamadı. Coin, cüzdan numarasıyla (`cuzdan_no_ile_coin_transfer`) ve takasla aktarılabiliyor. Elmasın doğrudan kullanıcıdan kullanıcıya aktarımı yok. İki hesapla oyun kazancının hediye üzerinden elmasa dönüştürülmesi teknik olarak mümkün (çekim kapalıyken nakde dönüşmez).
   - `cuzdan_no_ile_coin_transfer` sunucu tarafında `wallet_exchange_enabled` bayrağını **kontrol etmiyor**; yalnızca `kill_coin_purchase` ve alıcı KYC kontrolü var (`20260918012918_cuzdan_takas_push_limit_admin.sql:203-320`, alt inceleme). Yani UI gizliyken API'den çağrılabilir (B).
8. **Gösterilen açıklama ile gerçek hesaplama farkı:**
   - "Coins … cannot be cashed out" (`en.ts:3692`) ↔ elmas çekimi ve ₺ takas altyapısı.
   - "Game coins are for play inside the app and cannot be cashed out" (Fırtına Kralı ödeme tablosu) ↔ aynı bakiye hediyeye gidiyor.
   - Cüzdan kartında coin için "Tahmini hesap özeti ₺" (bakiyenin %40'ı), yani coin'e nakit değeri ima ediliyor.
   - Hediye geçmişinde "Kazanç: X ₺".
9. **Para çekme hangi izinlere bağlı?**
   - İstemci: `kill_withdrawal`, `withdrawals_enabled` / `wallet_withdraw_enabled`, IBAN kaydı (`wallet.tsx:575-583`).
   - Sunucu: `cekim_talebi_olustur` → `kill_withdrawal`, `withdrawals_enabled`, misafir değil (`037_cuzdan_cekim_duzeltmeleri.sql:12-100`). KYC veya banka hesabı varlığını sunucu kontrol etmiyor (alt inceleme).
   - Onay ve ödeme: admin `payout.approve` izni (`20261006120300_admin_rbac_v2_critical_gates.sql:213-315`).
   - **`Platform.OS` kontrolü yok:** bayrak açılırsa iOS'ta da görünür.
10. **App Review notlarında açıklanmamış önemli finansal işlev var mı?** Evet:
    - IAP dışı Stripe ajans coin satışı (canlıda açık);
    - host elmas → banka çekimi (pasif);
    - coin takas/satış (pasif);
    - dakikalık ücretli aramalar (açık);
    - AI müzik ayrı satın alma (açık; IAP başarısızsa ve `iap_enabled` kapanırsa Stripe'a düşebilir, `AiMuzikSatinAl.ts:42-45`);
    - coin ile bahisli oyunlar (açık).

### 9.4 Kullanıcıya gösterilen bilgi ile backend sonucu arasındaki farklar (özet)

| Kullanıcıya gösterilen | Backend gerçeği |
|---|---|
| "Coinler … gerçek paraya çevrilemez" (`tr.ts:3692`) | Coin → hediye → elmas → IBAN çekim RPC'si mevcut; coin → ₺ takas RPC'si mevcut |
| "Oyun coinleri yalnızca oyun içindir" (`tr.ts:5705`) | Oyun coin'i ile normal coin aynı bakiye (`wallets.coins`) |
| Fruit Wheel kuralları: sonuç sunucuda, değişmez | Admin kuyruğu ve saat kuralları sonucu belirleyebilir (canlıda boş) |
| Fırtına Kralı otomatik oyun "mağaza politikası kapalı" (sunucu) | İstemci Auto düğmesini her zaman gösteriyor |
| Stripe ajans şeridi: "Apple yerine %20 indirim" | Apple'ın dijital ürün kuralına (3.1.1) aykırı bir yönlendirme; iOS etiketi ham anahtar olarak görünüyor |

---

## 10. App Store açıklamasında eksik kalan özellikler

Mağaza metni: canlı yayın, sesli oda, mesajlaşma (foto/video), durum, keşif, profil/takip, yorum/beğeni. Metinde **olmayan** ve uygulamada **normal kullanıcıya açık** olanlar:

1. **Coin ile bahis alınan çark ve slot oyunları** (Fruit Wheel, Fırtına Kralı), oyun kazanç duyuruları, profil oyun istatistikleri.
2. Sanal coin ve hediye ekonomisi (review notunda var, mağaza metninde yok).
3. **Yetkili ajans üzerinden Stripe ile coin satın alma.**
4. Kişiler keşfi + **dakikalık ücretli sesli/görüntülü arama** (cinsiyet, ülke ve fiyat filtresiyle).
5. AI Müzik Stüdyosu (ayrı satın alma).
6. AI asistan, canlı sohbet çevirisi.
7. Ajans sistemi (ajans kurma/katılma, toplantı odaları, satış linkleri, faturalar), host olma.
8. PK yayın savaşları.
9. Şehir ligi/savaş/seçim, Dünya Ülke Ligi (IAP harcaması katkı puanı sayılıyor).
10. İşlem hacmi (harcama ₺ olarak profilde), unvanlar, VIP/recharge sıralaması.
11. KYC (kimlik + selfie), cüzdan numarası ("MUTA PAY").
12. Hikayeler, canlı kesit, blog.

Ayrıca web manifest açıklaması (`app.config.ts:120-121`) "Ses odaları, coin ve meyve oyunu aynı uygulamada" diyor. Herkese açık web sitesi oyunu tanıtırken App Store metni tanıtmıyor (C).

---

## 11. App Review notlarında eksik kalan veya çelişen özellikler

Review notları şunları listeliyor: ses odaları, canlı yayın, profil/takip, mesajlaşma, durum, sanal hediye ve coin, şikayet/engelleme; ayrıca "Virtual coins … have no cash value. They cannot be withdrawn or converted into real-world currency."

| Not ifadesi | Gerçek durum | Değerlendirme |
|---|---|---|
| "Virtual gifts and in-app coin system" | Doğru, ama oyunlarda bahis olarak kullanıldığı ve ajans/Stripe ile de satıldığı yazmıyor | **Eksik (C)** |
| "Coins have no cash value / cannot be withdrawn or converted" | Satın alan kullanıcı coin'i doğrudan çekemiyor (doğru). Ancak hediye ile coin, alıcıda elmasa dönüşüyor ve elmas IBAN'a çekilebilecek şekilde kodlanmış (pasif). Coin takasının ₺ satış metni ve RPC'si var (pasif). Cüzdanda ₺ değer özeti açık | **Kodla çelişen beyan (A)** |
| Yayıncı kazançları | Hiç söz edilmemiş | **Eksik (C)**: Apple, içerik üreticisine ödemeye 3.1.1 kapsamında izin verir ama açıklanmasını bekler |
| Oyunlar | Hiç söz edilmemiş | **Eksik (C) + gizli işlev riski (A)** |
| Ödeme yöntemleri | Yalnızca IAP ima ediliyor; Stripe ajans yolu canlıda açık | **Çelişki (A)**, 3.1.1 |
| "No reviewer-specific interface or behavior" | Kodla tutarlı | **Doğru (D)** |
| 1.2 güvenlik maddeleri (şikayet, engel, 18+, sunucu metin filtresi) | `docs/store-review/APPLE_1_2_RESOLUTION.md` ile tutarlı. Bu denetimde ayrıntılı test edilmedi | D / E |
| PiP / arka plan ses notu: "not on a server flag in our app" (`docs/store-review/PIP_ARKA_PLAN_SES.md:62`) | Bu iki özellik için doğru olabilir, ama uygulamanın geri kalanı yoğun biçimde sunucu bayraklarıyla yönetiliyor | Bağlamdan çıkarılırsa yanıltıcı olabilir (C) |

**Özellikle istenen karşılaştırma ("coin çekilemez" ile "yayıncı kazancı çekilebilir"):** Kodda bu iki şey teknik olarak ayrı: coin satın alan kullanıcı coin'i nakde çeviremiyor, hediyeyi alan kullanıcının elması çekime konu oluyor. Ancak:

- (a) bu ayrım review notunda yapılmamış;
- (b) aynı coin bakiyesi oyun kazancını da içerdiği için oyun kazancı dolaylı yoldan elmasa dönüşebilir;
- (c) takas ile coin'in kendisinin ₺ karşılığı satışı kodlanmış;
- (d) cüzdan coin bakiyesine ₺ "tahmini hesap" değeri biçiyor.

Bu yüzden notun "cannot be … converted into real-world currency" cümlesi, binary'deki kodla birlikte okunduğunda yanıltıcı görünür.

---

## 12. Tespit edilen çelişkiler

1. **Sunucu "autoplay kapalı (mağaza politikası)" ↔ istemci Auto düğmesi her zaman açık.** `supabase/migrations/20261012121000_storm_king.sql:7` ↔ `src/moduller/oyunlar/storm-king/components/StormKingScreen.tsx:416`, `StormControlPanel.tsx:52-56` (A).
2. **"Coin nakde çevrilemez" ↔ ₺ değer özeti, elmas çekimi, takas satış notu.** `tr.ts:3692`, `en.ts:3692` ↔ `CoinDegerOzetiPaneli.tsx:56-76`; `wallet.tsx:565-632`; `20260920184945_…wallet_flags.sql:358-364` (A).
3. **"Oyun coinleri yalnızca oyun içindir" ↔ ortak `wallets.coins` bakiyesi** (A).
4. **Fruit Wheel kural metni ↔ admin çıkış planı.** `tr.ts:2268` ↔ `20261014150000_oyun_cikis_plani.sql:94, 921-941` (A, mekanizma).
5. **`StripeCheckoutBaslat.ts:12` "iOS App Store dijital satış için KULLANILMAZ" yorumu ↔ `AjansPaketTeklifOde.ts:27` iOS'a izin veriyor ↔ canlı `stripe_enabled=true`** (A).
6. **Oyun görünürlüğü:** istemci beyaz listesi `fruit_wheel`, `storm_king` (`OyunKontrolServisi.ts:22`) ↔ sunucuda `zeus`, `fair_spin`, `astral_falls` bayrakları ve uç noktaları açık ↔ `sis_spin_cevir` bayraksız. "Gizli" oyunlar istemci tarafında gizli, sunucu tarafında canlı (A).
7. **Fırtına Kralı route'u (`app/oyun/storm-king.tsx`) görünürlük ve giriş kontrolü yapmıyor**, Fruit Wheel route'u yapıyor (`app/oyun/fruit-wheel.tsx:20-22, 34-36`) (A; sunucu `storm_king_settle` bayrakları kontrol ediyor).
8. **Menü öğesi ölü link:** SİS Spin (yerel varsayılan açık, uzakta kapalı) → redirect. Platform → Sertifikasyon bağlantısı herkese görünür, admin olmayanı profile atar (`app/sertifikasyon/index.tsx:182-185`) (A, düşük önem).
9. **Eksik çeviri anahtarı:** `cuzdanX.appleOdeme` tanımsız, iOS'ta ham anahtar görünüyor (A, kalite sorunu; aynı zamanda IAP yerine Stripe yönlendirmesini görünür kılıyor).
10. **Commit geçmişi ≠ gönderilen binary:** 1.3.0 binary'leri commit edilmemiş kodla derlenmiş (A, süreç sorunu).
11. **Denetim kaydı:** `admin_audit_logs` 1 Ekim 23:02'de "Özellik açıldı: Studio" vb. kayıtları gösteriyor, ama aynı zaman damgalı canlı bayraklar `false`. Kayıt metni ile bayrak değeri çelişiyor; kayıt mantığı bu denetimde incelenmedi (E).

---

## 13. Apple 2.5.19 ve 5.6 açısından doğrulanmış bulgular (sınıflandırılmış)

### A — Doğrudan kod / binary / canlı veri kanıtı

**A1. Beyan edilmemiş coin bahisli oyunlar (2.5.19, 5.6; 5.3 riski)**
- **Dosyalar:**
  - `app/room/[id].tsx:513-521, 2788, 3083`
  - `src/moduller/oyunlar/ortak/bilesenler/OyunBaslatModal.tsx:48-50, 98`
  - `src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi.ts:22`
  - `app/oyun/storm-king.tsx:1-12`
  - `app/_layout.tsx:370`
  - `app/(tabs)/profile.tsx:122-126, 464`
  - canlı: `feature_flags` (games/fruit_wheel/storm_king=true), `game_control_configs`
  - IPA b33/b34 dizgileri
- **Teknik davranış:** Coin bakiyesinden bahis alınıyor, sunucu RNG ile kazanç ödeniyor, ≥100 coin kazançlar global banner'da yayınlanıyor.
- **Kullanıcıya görünen:** Ses odasında oyun düğmesi, kazanç banner'ları, profil oyun kartı.
- **Apple neden sorun görür:** Metadata ve review notunda hiç yok. Uygulamanın niteliğini ("sosyal platform") önemli ölçüde değiştiriyor. Coin, IAP ile alınabiliyor ve kazanç hediye/elmas yoluyla nakde bağlanabilecek şekilde kodlanmış.
- **Düzeltme gerekli mi:** Evet.

**A2. Build'den bağımsız sunucu tarafında açılan oyun (Fırtına Kralı) (2.5.19)**
- **Dosyalar:** `supabase/migrations/20261012121000_storm_king.sql:5-28`; canlı `game_catalog.created_at` ve `feature_flags.updated_at` = 2026-10-12 09:43 UTC; EAS build 33 oluşturulma 2026-10-11 06:17 UTC; IPA b33'te kod yok, b34'te var; dosyalar Git'te izlenmiyor.
- **Teknik davranış:** Oyun, sunucu kaydıyla etkinleşiyor. Binary'de kod varsa anında açılıyor.
- **Apple neden sorun görür:** Uygulama işlevinin incelemeden bağımsız olarak sunucudan değiştirilebildiğinin somut örneği.
- **Düzeltme gerekli mi:** Evet.

**A3. Binary'de pasif finansal özellikler + gerçek zamanlı uzaktan açma (2.5.19)**
- **Dosyalar:**
  - `src/moduller/ozellik-bayraklari/OzellikBayrakCache.ts:29-32, 259-310`
  - `app/(tabs)/wallet.tsx:268-275, 565-632, 1274-1330`
  - `app/cuzdan/takas.tsx`
  - `supabase/migrations/20260920184945_tamuso_coin_pack_ve_wallet_flags.sql:89-102`
  - `src/moduller/admin/ozellikler/AdminOzellikEtiketleri.ts:337` ("Store uyumu için varsayılan kapalı")
- **Teknik davranış:** Çekim, takas ve satış UI'ı ile RPC'leri hazır. Admin tek dokunuşla tüm kullanıcılarda anında açabiliyor.
- **Kullanıcıya görünen:** Şu an görünmüyor.
- **Apple neden sorun görür:** 2.5.19'un "dormant features" tanımı. "Store uyumu için kapalı" ifadesi, kapalılığın incelemeye yönelik olduğunu düşündürüyor.
- **Düzeltme gerekli mi:** Evet.

**A4. Review notundaki finansal beyanla çelişki (5.6)**
- **Dosyalar:** `src/i18n/locales/en.ts:3692, 3718, 4698`; `src/moduller/cuzdan/bilesenler/CoinDegerOzetiPaneli.tsx:23, 33, 56-76`; `wallet.tsx:1214-1217`; takas notu `20260920184945_…:358-364`; `102_pk_…:421-451`; `037_…:12-100, 193-265`.
- **Düzeltme gerekli mi:** Evet (kod ve/veya beyan).

**A5. iOS'ta IAP dışı Stripe coin satın alma, canlıda açık (3.1.1; beyan edilmediği için 2.5.19)**
- **Dosyalar:**
  - `src/moduller/cuzdan/bilesenler/CoinPaketMagaza.tsx:42, 223-228`
  - `src/moduller/cuzdan/bilesenler/YetkiliAjansYukleSeridi.tsx:115-135`
  - `src/i18n/locales/en.ts:3731`, `tr.ts:3731`
  - `src/moduller/cuzdan/islemler/AjansPaketTeklifOde.ts:19, 27`
  - `app.config.ts:140` (Stripe native SDK)
  - canlı `stripe_enabled=true`
  - canlı `payment_orders`: 1 ödenmiş Stripe ajans paketi (2026-09-26), 3 bekleyen; platform bilgisi kaydedilmiyor
- **Düzeltme gerekli mi:** Evet.

**A6. Sunucu yapılandırması ile istemci davranışı uyuşmazlığı: autoplay (5.6)** — §12 madde 1.

**A7. Admin sonuç belirleme mekanizması, canlı modda bağlı (5.6)**
- **Dosyalar:** `supabase/migrations/20261014150000_oyun_cikis_plani.sql:55, 94, 103, 249, 342-343, 921-941`; canlı fonksiyon doğrulaması.
- **Not:** Canlıda kayıt yok. Apple'ın bunu incelemede görmesi beklenmez. Ret gerekçesi olarak düşük olasılık, ama 5.6 kapsamında kendi başına risk.

**A8. Kodda incelemeye yönelik metin yorumları (5.6 bağlamı)**
- `src/moduller/cuzdan/takas/TakasOdemeBilgisi.ts:4`, `CoinDegerOzetiPaneli.tsx:23, 33`, `CuzdanUiTipleri.ts:106`, `app/admin/cuzdan-yonetimi.tsx:388`, migration `20260920184945:89`.
- Apple kaynak kodu görmez. Ancak bu yorumlar, işlevin inceleme algısına göre biçimlendirildiğini gösteren iç kanıttır.

### B — Kuvvetli teknik şüphe, ek doğrulama gerekli
- **B1.** Banner/duyuru ile herhangi bir route veya HTTPS URL'ye yönlendirme; alan adı izin listesi olmayan WebView (`BannerActionRouter.ts:45-53`, `BannerWebHandler.ts:33`, `TamusoWebViewScreen.tsx:30-34`). Canlı banner içerikleri bu denetimde tek tek incelenmedi.
- **B2.** `cuzdan_no_ile_coin_transfer` sunucuda bayraksız; UI kapalıyken API ile çağrılabilir (alt inceleme bulgusu).
- **B3.** `sis_spin_cevir` RPC'si sunucuda bayraksız, `authenticated` rolüne açık (alt inceleme bulgusu).
- **B4.** `/room/<id>?oyun=storm_king` deep link'i görünürlük kontrolü yapmadan oyunu açıyor (`app/room/[id].tsx:539-548`, `OyunOdaKatmani.tsx:66-70`).
- **B5.** Studio v2: sunucudan manifest ve asset alan gömülü PlayCanvas motoru (şu an kapalı). Açılırsa sunucudan yeni oyun içeriği yüklenir (2.5.2 riski).
- **B6.** Örnek kullanıcı/oda üretim aracı (`supabase/functions/admin-ornek-kullanicilar`, `20260921121041_ornek_ses_odalari_seed.sql`). Canlıda `is_sample` profil sayısı 0; tohum odaların canlıda olup olmadığı doğrulanmadı (42 oda var).

### C — Metadata / App Review açıklaması eksikliği
- §10 ve §11'deki tüm özellikler. En önemlileri oyunlar, Stripe ajans satışı, host kazancı ve çekimi, ücretli aramalar, AI müzik satın alımı.

### D — Meşru özellik veya erişim kısıtlaması, ihlal kanıtı yok
- Admin paneli ve Oyun Testi (`profiles.is_admin` + RBAC + sunucu RPC kontrolleri).
- Misafir girişin production'da kapalı olması (build zamanı).
- Sürüm güncelleme politikası.
- Ajans ve host rolleri.
- KYC.
- `fruit_wheel_admin_force_next` (yalnızca test modunda çalışıyor).
- Reviewer tespit kodunun yokluğu.
- OTA ve uzaktan JS yokluğu.

### E — İncelenemeyen veya doğrulanamayan
- §14'e bakınız.

---

## 14. Doğrulanamayan konular

1. **Apple'ın reddettiği build numarası** (33 mü 34 mü): App Store Connect erişimi yok.
2. **App Store Connect metadata'sı:** yaş derecelendirme anketi ("Simulated Gambling", "Contests", "Unrestricted Web Access" yanıtları), demo hesap bilgisi, ekran görüntüleri, App Privacy bilgileri.
3. **İnceleme sırasında reviewer'ın gerçekte ne gördüğü:** Apple oturumlarına ait canlı veri ayrıştırılamadı; demo hesap kimliği bilinmiyor.
4. **Build 33'ün tam kaynak içeriği:** commit edilmemiş değişiklikler o tarihte kaydedilmemiş. Yalnızca IPA dizgileri var.
5. **Build 34 ile bugünkü çalışma ağacı arasındaki olası farklar** (değişiklik zamanı belirsiz 10 dosya).
6. **Edge function deploy yapılandırması:** `storm-king-spin` için gateway JWT doğrulamasının açık olup olmadığı. Alt inceleme, fonksiyonun JWT `sub` alanını imza doğrulamadan okuduğunu bildirdi; bu denetimde ayrıca doğrulanmadı. Güvenlik konusudur.
7. **IAP makbuz doğrulaması:** `supabase/functions/iap-receipt-verify/index.ts:55-75` gerçek Apple/Google doğrulaması yerine TODO içeriyor; `IAP_SKIP_VERIFY` ortam değişkeninin canlı değeri okunamadı. 2.5.19 değil, gelir ve güvenlik riski.
8. **Canlı banner ve duyuru kayıtlarının içerikleri** (oyun veya WebView hedefi var mı) tek tek incelenmedi.
9. **Admin denetim kaydı ile bayrak değerleri arasındaki tutarsızlık** (§12 madde 11).

### Denetim süreci notları (şeffaflık)
- Canlı Supabase'e yalnızca `SELECT` sorguları gönderildi; kişisel veri çekilmedi (sayım ve tarih toplamları).
- EAS'ten `eas build:list` (salt okunur) çalıştırıldı. IPA'lar bellekte açıldı, diske yazılmadı.
- Paralel alt incelemelerden biri, proje **dışında** geçici bir dosya oluşturduğunu bildirdi: `C:\Users\ilkse\AppData\Local\Temp\routes_added.txt` (route ilk ekleme tarihleri listesi). Proje dosyalarına dokunulmadı; dosya silinebilir.
- `npx eas-cli` çalıştırılması npm önbelleğine yazmış olabilir (proje dışı).

---

## 15. Önceliklendirilmiş çözüm önerileri

> İlke: Hiçbir öneri bir işlevi Apple incelemesinden saklamaya yönelik değildir. Amaç, binary'deki işlevlerin metadata ve review notlarıyla birebir örtüşmesi ve inceleme sonrasında incelenmemiş işlevlerin açılamamasıdır.

**P0 (yeniden başvurudan önce zorunlu)**
1. **Oyunlar için ürün kararı verin ve uygulayın.** İki dürüst seçenek var:
   - **(a) iOS'tan tamamen kaldırma:** Oyun ekranları, motorlar, ses odası dock'u, kazanç banner'ları, profil oyun kartı, deep link yolları, SİS Spin menü öğesi ve redirect stub'ları binary'den çıkarılır. Sunucuda oyun spin RPC'leri ve edge function'ları iOS istemcisi için kapatılır, `sis_spin_cevir`'e de kapı eklenir.
   - **(b) Tam beyan:** Oyunlar mağaza açıklamasına, ekran görüntülerine ve review notlarına eklenir. Yaş derecelendirmesinde simüle kumar doğru beyan edilir. Oyun coin'lerinin **hiçbir yolla** (hediye→elmas→çekim, takas, transfer dahil) nakde dönüşemeyeceği teknik olarak garanti edilir; örneğin ayrı, hediye edilemez ve transfer edilemez oyun bakiyesi. Aksi halde 5.3.3 (gerçek parayla oyun) kapsamına girer. Kural metni admin sonuç kuyruğunu dürüstçe açıklar ya da kuyruk kaldırılır.
2. **iOS'ta IAP dışı dijital coin satışını kaldırın.** `YetkiliAjansYukleSeridi`, ajans paket teklif kartının iOS'taki Stripe ödemesi, AI müzik Stripe yedeği. iOS'ta dijital ürünler yalnızca IAP ile satılmalı (3.1.1). Eksik `cuzdanX.appleOdeme` anahtarı da düzeltilmeli.
3. **Pasif finansal özellikleri ya binary'den çıkarın ya da açıp beyan edin.** Elmas çekimi, coin takas/satış ve cüzdan no transferi için "store uyumu için kapalı" bayrak modeli 2.5.19 ile doğrudan çelişir.
   - Host kazanç çekimi sürdürülecekse açıkça beyan edilmeli (Apple, IAP ile satılan hediyelerden içerik üreticisine ödemeye izin verir).
   - Coin'in kendisinin ₺ karşılığı satışı (takas) Apple politikalarıyla uyumlu görünmüyor; kaldırılması önerilir.
4. **Review notundaki finansal beyanı kodla uyumlu ve eksiksiz hale getirin.** Örnek ayrım: "Satın alınan coin'ler nakde çevrilemez; yayıncıların aldığı hediyeler elmas olarak kaydedilir ve onaylı yayıncılar … koşullarla ödeme talep edebilir." Bu cümle ancak kod gerçekten böyle çalışıyorsa yazılmalı.
5. **Gönderilen binary'yi izlenebilir yapın.** Tüm değişiklikleri commit edin, sürüm etiketi atın, `eas.json`'da `cli.requireCommit: true` gibi bir ayarla yalnızca commit edilmiş koddan build alın. Böylece Apple'a gönderilen kod denetlenebilir olur.

**P1**
6. **Uzaktan bayrak politikası:** İnceleme sonrasında incelenmemiş bir işlevi açabilecek bayrakları (oyunlar, çekim, takas, Stripe, Studio) iOS istemcisinde kaldırın ya da yalnızca acil kapatma (kill) yönünde çalışacak şekilde sınırlayın. Açık kalan her özelliği review notunda listeleyin.
7. **Banner ve duyuru yönlendirmeleri:** route'ları beyaz listeyle sınırlayın; WebView'e alan adı izin listesi ekleyin; oyun ve ödeme sayfalarına yönlendirmeyi engelleyin.
8. **Fırtına Kralı autoplay uyuşmazlığını giderin:** istemci `storm_king_autoplay_enabled` değerini okusun, ya da oyun kaldırılsın.
9. **Ölü linkleri kaldırın:** SİS Spin menü öğesi, Platform → Sertifikasyon (admin olmayanlar için).
10. **Mağaza açıklamasını güncelleyin:** ücretli aramalar, AI müzik (ayrı satın alma), ajans/host sistemi, PK, ligler, hikayeler.

**P2 (güvenlik ve kalite; 2.5.19'dan bağımsız)**
11. IAP makbuzlarının sunucuda gerçek doğrulaması (App Store Server API).
12. `storm-king-spin` JWT doğrulaması.
13. `cuzdan_no_ile_coin_transfer` için sunucu tarafı bayrak kontrolü.
14. İstemci admin kontrolü eksik admin route'larına kapı ekleme.

---

## 16. Apple'a açıklanması gereken önemli özellikler

Hangi özellikler iOS binary'sinde kalacaksa, Review Notes ve gerekiyorsa mağaza metninde açıkça yazılmalı:

1. Sanal coin: nasıl satın alınır (yalnızca IAP), nerede harcanır (hediye, ücretli arama, varsa oyunlar).
2. Hediye → elmas → yayıncı ödemesi (varsa): oranlar (ör. %80 / ajans %20), kimin talep edebileceği, KYC şartı, ödeme yöntemi.
3. Oyunlar (kalacaksa): adları, coin ile oynandığı, kazanç ödediği, kazanç coin'lerinin nakde dönüşemediği (teknik garanti ile), 18+ ve yaş derecelendirmesi.
4. Dakikalık ücretli sesli/görüntülü aramalar ve üreticinin fiyat belirlemesi.
5. AI Müzik Stüdyosu ve satın alma modeli (IAP ürünleri).
6. Ajans sistemi: ajansların uygulama içinde ne yapabildiği. Uygulama dışı satış yapıyorlarsa bunun uygulama içinde yönlendirilmediği.
7. Uzaktan yapılandırma: hangi özelliklerin sunucudan kapatılabildiği (yalnızca acil kapatma) ve incelemeden sonra yeni özellik açılmayacağı taahhüdü.
8. Demo hesabın tüm bu özellikleri deneyebilmesi için yeterli test coin'i ve gerekiyorsa ajans/host rolü.

---

## 17. Sonuç ve önerilen yeniden başvuru stratejisi

1. **Ürün kapsamını kararlaştırın:** iOS 1.3.x'te oyunlar, host çekimi, takas ve ajans satışı olacak mı?
2. **Kodu bu karara göre değiştirin:** kaldırılacaklar binary'den ve sunucu kapılarından çıkarılsın; kalacaklar beyan edilebilir ve kurallarla uyumlu hale getirilsin (P0 maddeleri).
3. **Temiz bir build alın:** commit edilmiş ve etiketlenmiş kaynaktan yeni bir build numarası (build 35+). İsteğe bağlı olarak IPA'yı bu rapordaki yöntemle tarayıp kaldırılan dizgilerin (`storm-king-spin`, `zeus-spin`, `withdrawal_requests`, "instead of {{magaza}}" vb.) gerçekten yok olduğunu doğrulayın.
4. **Metadata, yaş derecelendirmesi ve Review Notes'u güncelleyin;** §16'daki listeyi kullanın.
5. **Resolution Center'da kısa ve olgusal bir yanıt yazın:** Hangi işlevlerin kaldırıldığını ve hangilerinin açıklandığını; uzaktan bayrakların artık yeni işlev açmak için kullanılmayacağını belirtin. Apple'ın uyarısına göre aynı sorunlarla yeniden göndermek ek ihlal sayılabilir. Bu yüzden değişiklikler gönderimden önce tamamlanmalı.

---

### "Tamuso'nun Apple tarafından gizli veya yanıltıcı işlev içerdiği gerekçesiyle reddedilmesini teknik olarak açıklayabilecek somut kanıtlar nelerdir?"

Somut ve doğrulanmış kanıtlar şunlar:

1. **Beyan edilmemiş coin bahisli oyunlar binary'de ve canlıda açık.** iOS 1.3.0 build 33 ve 34'ün JavaScript paketinde slot ve çark oyunlarının sunucu uç noktaları (`zeus-spin`, `fair-spin-spin`, `kozmik-kaskad-spin`, `nox-reels-spin`; build 34'te ayrıca `storm-king-spin`) ve Fruit Wheel kodu var. Canlı sunucuda `games_enabled`, `fruit_wheel_enabled`, `storm_king_enabled` açık. Normal bir kullanıcı ses odasındaki oyun düğmesiyle coin bahsi yapabiliyor; kazançlar herkese banner olarak duyuruluyor. Mağaza açıklaması ve review notları oyunlardan hiç söz etmiyor.
2. **Build'den bağımsız sunucu tarafı aktivasyon kanıtlı.** Fırtına Kralı slotu Git'e hiç commit edilmeden build 34'e girdi; sunucuda ise 12 Ekim 2026 09:43 UTC'de, build 33'ten sonra, bir migration ile katalog, bayrak ve oyun konfigürasyonuyla birlikte açıldı. Ayrıca 120'den fazla bayrak ve 21 kill switch Supabase Realtime ile anlık değiştirilebiliyor.
3. **Binary'de pasif (dormant) finansal işlevler var.** Elmas → IBAN/banka çekimi ("Diamond withdrawal", "saved bank account"), coin takas/satış (`coin_takas_teklif_olustur`; sunucu varsayılan notu "X ₺ veya yaklaşık Y $'a satmak istiyorum"), cüzdan numarasıyla transfer. Kodda "varsayılan KAPALI (store uyumu)" yorumlarıyla kapatılmış, tek bayrakla açılabilir durumda.
4. **Review notundaki finansal beyan kodla çelişiyor.** "Coins … cannot be withdrawn or converted into real-world currency" denmiş. Oysa coin, hediye yoluyla elmasa dönüşüp çekime konu olabilecek şekilde kodlanmış, oyun kazancı da aynı bakiyede. Cüzdan, coin bakiyesine ₺ "tahmini hesap özeti" biçiyor.
5. **iOS'ta beyan edilmemiş IAP dışı ödeme yolu canlıda açık.** `stripe_enabled=true`; iOS cüzdanında "Apple yerine yetkili ajans üzerinden %20 indirimli Stripe ödeme" teklifi her zaman görünüyor ve iOS'ta Stripe PaymentSheet ile ödeme yapılabiliyor.
6. **Yapılandırma ile davranış uyuşmuyor.** Fırtına Kralı otomatik oyunu sunucuda "mağaza politikası kapalı" olarak işaretli, istemci yine de Auto düğmesini gösteriyor.

**Bulunamayan:** Apple inceleme ortamını veya inceleme hesabını tespit edip farklı davranan kod. Bu yönde bir kanıt yok. Apple'ın mesajında hangi spesifik ekranı kastettiği yazmadığı için yukarıdaki maddelerin hangisinin tek başına belirleyici olduğu **kesin olarak bilinemez**. Ancak 1–4. maddeler, 2.5.19'un "hidden, dormant, undocumented features" ve 5.6'nın "misleading behavior" tanımlarıyla doğrudan örtüşen, kod, binary ve canlı veriyle kanıtlanmış somut bulgulardır.

---

## 18. Ek denetim: Build 34 cüzdan ekranı (tasarım ve metinler)

Kullanıcı, reddedilen son sürümün build 34 olduğunu ve uygulama içinde yetersiz açıklanmış cüzdan tasarımı ile metinlerinin de sorun olabileceğini belirtti. Bu bölüm yalnızca cüzdanı, bir iOS kullanıcısının (ve inceleyicinin) ekranda gördüğü haliyle inceler. Kod değiştirilmedi; canlı veriye yalnızca SELECT ile bakıldı.

**Kapsam doğrulaması:** Aşağıdaki tüm cüzdan metinleri ve bileşenleri Eylül 2026 commit'lerinde (`e45bcfa` 18.09, `bdd5fce` 21.09, `e45cceb` 02.10) eklenmiş. Build 34'ten önce commit edildikleri için binary'de oldukları kesin; commit edilmemiş kod belirsizliğinden etkilenmezler. Build 34 ile bugünkü kod arasındaki cüzdan farkı yalnızca hook ayrımı, kart stil değerleri ve Storm King hareket etiketleri (`CuzdanLedgeriniGetir.ts:45-48, 63`); bu son madde commit edilmemiş olduğu için build 34'te olup olmadığı **B** seviyesinde.

**Canlı cüzdan yapılandırması** (`wallet_ui_live` → `wallet_ui_versions` v1 "Başlangıç", 20.09.2026'dan beri yayında): `brand` ve `value_summary` alanları **null**. `CuzdanUiNormalize.ts:35-36` null alanları yerel varsayılanlarla (`CuzdanUiVarsayilan.ts:26-43`) birleştirdiği için cihazda varsayılanlar geçerli: `value_summary.enabled`, `show_katalog`, `show_platform_share`, `show_seller_net`, `show_payment_note` hepsi **true**. Canlı ekonomi oranı `coin_try = 0.10`, `diamond_try = 0.10`.

### 18.1 Bulgular

| # | Bulgu | Kanıt | Seviye |
|---|---|---|---|
| W1 | **Coin bakiyesi olan her kullanıcının cüzdan kartında, takas kapalı olsa bile, coin'in ₺ değeri ve %60/%40 bölüşümü gösteriliyor.** Kart içinde "Catalog value X ₺", "Platform service share (X×0,6) ₺", "Estimated account summary (X×0,4) ₺" satırları var. Son satır, kod içinde "satıcı net" (`saticiNetTl`) olarak hesaplanıyor; yani coin'i satarsan eline geçecek tutar. | `CuzdanBankaKarti.tsx:196-198` (`coins > 0` tek koşul), `CoinDegerOzetiPaneli.tsx:56-78`, `CoinTakasPaylasimi.ts:9-10, 38-45`, i18n `en.ts:3708-3710` | A |
| W2 | **Kart içindeki "gerçek para değildir" uyarısı gösterilmiyor; yerine ödeme dönemi notu gösteriliyor.** Kompakt modda yalnızca `payment_note` basılıyor: "Account activity is processed in the 01–15 and 15–31 periods of each month." `language_note` ("not a real-money payout") yalnızca kompakt olmayan modda (takas formu) çıkıyor. ₺ tutarlarının hemen altında 15 günlük işleme dönemi yazması bir ödeme takvimi gibi okunuyor. | `CoinDegerOzetiPaneli.tsx:80-94`, `en.ts:3711-3712` | A |
| W3 | **Aynı ekranda birbiriyle çelişen iki mesaj var.** Kartın hemen altında canlı `coin_info` metni "Coins are virtual items used within Tamuso and cannot be redeemed for cash." diyor; iki satır yukarıda ise aynı coin için ₺ "tahmini hesap özeti" ve platform payı gösteriliyor. | Canlı `wallet_ui_versions.payload.texts[coin_info]`, `wallet.tsx:843-847` | A |
| W4 | **Kart tasarımı gerçek bir banka/ödeme kartını taklit ediyor.** "MUTA PAY" markası, "Digital wallet" tipi, altın EMV çip ve döndürülmüş NFC (temassız) simgesi, 4'lü gruplanmış 18 haneli numara, "ACCOUNT HOLDER" alanı (KYC'den gelen yasal ad), "Top-up / spend" satırı. Uygulama adı Tamuso iken cüzdan ayrı bir ödeme markası gibi sunuluyor ve bu marka metadata'da yok. | `CuzdanBankaKarti.tsx:66, 105-131, 134-137, 200-212`, `CuzdanTakasTipleri.ts:4` | A |
| W5 | **Alınan hediyeler ₺ "kazanç" olarak listeleniyor.** Hediye sekmesinde her alınan hediyede "Earned: X ₺" ve sağda ₺ tutar; alt başlık "Received gifts · diamonds · TRY value". Detay kartı kendini "banka dekontu" olarak tanımlıyor ve "Amount / Balance after / Transaction ID" alanları içeriyor. | `wallet.tsx:1190, 1214-1242`, `CuzdanHareketDetayKarti.tsx:100, 124-141, 178-183`, `en.ts:3663, 3666` | A |
| W6 | **Çekim kapalıyken bile "withdrawal" dili kullanıcıya görünüyor.** Hareketler sekmesi alt başlığı her zaman "Top-ups · gifts · games · withdrawals". PDF/Excel hesap özeti "Game bets / entries", "Game wins / rewards" ve "Payout time" satırları içerebiliyor. | `wallet.tsx:948-949`, `en.ts:3656, 4774, 4784-4785`, `HesapHareketleriBelgesi.ts:325-329` | A |
| W7 | **Kimlik doğrulama (KYC) her kullanıcıya bayraksız açık ve amacı açıklanmıyor.** Cüzdan hızlı aksiyonlarında "Kimlik onayı" (`requires_flag: null`, canlıda da null). Ekran kimlik kartı/pasaport/ehliyet ön-arka yüzü, canlılık selfie'si, doğum tarihi, telefon, e-posta, uyruk topluyor ve 18 yaş kontrolü yapıyor. Takas ve çekim kapalıyken bu verinin neden istendiğini kullanıcıya veya review notlarına açıklayan bir metin yok; KYC'nin bağlı olduğu işlevler (takas/çekim) pasif. | `CuzdanUiVarsayilan.ts:118-131`, canlı `actions[kyc]`, `app/kyc/index.tsx:66-71, 174-176`, `en.ts:2667-2668` | A |
| W8 | **Cüzdan numarası + QR paylaşımı (WhatsApp dahil) açık, ama bu numaranın kullanıldığı transfer/takas kapalı.** "Share card" ve WhatsApp düğmeleri her zaman görünüyor; numaranın tek işlevsel kullanımı pasif takas akışı. İnceleyici açısından amacı belirsiz, pasif bir işleve işaret eden görünür öğe. | `wallet.tsx:800-821`, `CuzdanBankaKarti.tsx:215-244`, `en.ts:3676` | A |
| W9 | **iOS'ta Stripe ajans şeridi** (önceki raporda §9 ve kritik bulgular): "{{pct}}% off Stripe payment via authorized agency instead of {{magaza}}", iOS etiketi eksik anahtar. Cüzdanın "Yükle" sekmesinde. | `YetkiliAjansYukleSeridi.tsx:115-135`, `en.ts:3731` | A |

### 18.2 Değerlendirme

İnceleyici açısından cüzdan ekranının toplam mesajı şudur: "Bu bir banka kartı; coin'lerin X ₺ değerinde, platform %60 alıyor, sana %40 kalıyor, hesap hareketleri ayın 1–15 ve 15–31 dönemlerinde işleniyor; aldığın hediyeler ₺ kazanç; kimliğini doğrula." Aynı ekranda ise "coin'ler nakde çevrilemez" yazıyor ve review notu "virtual coins have no cash value" diyor. Bu çelişki, 5.6'nın "misleading" tanımına ve 2.5.19'un "işlevi metadata'dakinden farklı" tanımına doğrudan uyuyor; ayrıca bir coin'in gerçek para karşılığının gösterilmesi 3.1.1 (IAP ile alınan içerik için para değeri ima etme) açısından da risklidir.

Bu bulgu, önceki bölümlerdeki "pasif çekim/takas" bulgusunu güçlendiriyor: işlevler kapalı olsa bile **arayüz, kapalı işlevlerin sonucunu (₺ net tutar, ödeme dönemi, kimlik doğrulama) şimdiden gösteriyor.** İnceleyicinin bunu fark etmesi için kodu taraması gerekmiyor; coin'i olan bir hesapla cüzdanı açması yeterli.

**Doğrulanamayan (E):** İnceleme demo hesabının coin bakiyesi. Bakiye 0 ise W1–W3 kartta görünmez (W4–W9 yine görünür); sandbox satın alma yapıldıysa görünür.

### 18.3 Düzeltme yönü (kod değiştirilmedi; öneri)

1. Cüzdan kartından ₺ değer, platform payı ve "tahmini hesap özeti" satırlarını iOS'ta tamamen kaldırın; coin ve elmas yalnızca adet olarak gösterilsin. Bunu sunucu bayrağıyla değil binary'de yapın.
2. "MUTA PAY" markasını, EMV çip/NFC görselini, 18 haneli numara ve "account holder" alanını kaldırın veya sade bir "Bakiye" kartına dönüştürün.
3. Hediye geçmişinden "Earned: ₺" ve "TRY value" ifadelerini, hareket alt başlığından "withdrawals" kelimesini, hesap özetinden "Payout time" ve "Game bets" satırlarını kaldırın.
4. KYC'yi ya kaldırın ya da amacını hem uygulama içinde hem review notlarında açıkça yazın (ör. yalnızca belirli rol için gerekli olduğu).
5. Cüzdan numarası/QR paylaşımını, bağlı olduğu transfer işlevi iOS'ta yoksa kaldırın.
6. Review notundaki "no cash value" beyanını koruyacaksanız, uygulamadaki tüm ₺ karşılık gösterimleri bu beyanla birebir uyumlu olmalı.
