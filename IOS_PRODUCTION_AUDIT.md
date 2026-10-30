# TAMUSO — iOS Production Build Denetimi

- **Tarih:** 30 Ekim 2026
- **Kapsam:** Expo/EAS/React Native yapılandırması, build geçmişi, IPA içeriği, environment, native modüller, OTA, entitlements, bundle kompozisyonu.
- **Kural:** Hiçbir kod/config değiştirilmedi; yeni build alınmadı. Build 35 IPA'sı **EAS'ten indirilip açıldı** (salt okunur).

---

## 1. Build kimliği ve geçmiş

### 1.1 İncelenen build

| Alan | Değer |
|---|---|
| Uygulama sürümü | **1.3.1** |
| Build numarası | **35** |
| EAS build ID | `b8ce52db-9280-47e8-ac79-01dc2f90064a` |
| Commit | `4724bbc` |
| Durum | FINISHED |
| Tamamlanma | 2026-10-25 11:04 UTC |
| Profil | production / store |
| Bundle ID | `com.litxtech.muta` |
| Team | 9W6CR7KXM7 |
| ASC App ID | 6810697231 |
| IPA boyutu | 106.896.416 bayt (~102 MB) |
| `main.jsbundle` | 18.824.585 bayt |

### 1.2 EAS iOS build geçmişi (son 6)

| Sürüm | Build | Commit | Tamamlanma |
|---|---|---|---|
| 1.3.1 | **35** | `4724bbc` | 2026-10-25 |
| 1.3.0 | 34 | `4724bbc` | 2026-10-22 |
| 1.3.0 | 33 | `56a361e` | 2026-10-19 |
| 1.3.0 | 33 | `cee4201` | 2026-10-11 |
| 1.2.5 | 32 | `e45cceb` | 2026-10-06 |
| 1.2.5 | 32 | `e45cceb` | — (ikinci artefakt) |

> Not: Build 34 ve 35 **aynı commit** (`4724bbc`) üzerinden alınmış; aralarındaki farkın bir kısmı commit edilmemiş çalışma ağacından geliyor olabilir. Bkz. §2.

---

## 2. Kaynak kod ↔ build uyumu (kritik metodoloji bulgusu)

### 2.1 Tespit

`git status` (30 Ekim 2026): **287 dosya değişmiş**, `+12.534 / −21.739` satır; ayrıca çok sayıda yeni dosya (`src/ekranlar/**`, `YetkiliAjansYukleSeridi.ios.tsx`, `IosHariciOdemeYokEkrani.tsx`, `supabase/migrations/20261025*` vb.) **untracked**.

Build 35, `4724bbc` commit'inden alınmış görünüyor; ancak binary'de `src/ekranlar/**` içindeki iOS varyantları (**`AiMuzikIos`, `TakasIos`, `IosHariciOdemeYok`**) bulundu. Bu dosyalar bugün hâlâ **untracked**. Sonuç:

- Build 35, **commit + commit edilmemiş dosyalar** karışımından üretilmiş.
- Bugünkü çalışma ağacı, Apple'ın incelediği koddan **önemli ölçüde ileride** (remediation).
- **Build ↔ kaynak eşlemesi yok.** Bu, hem denetim izi hem de "hangi kod Apple'a gitti" sorusu için risktir.

### 2.2 Kanıt

| Dizgi | Build 35 bundle | Bugünkü git durumu |
|---|---|---|
| `AiMuzikIos` | **var** | `src/ekranlar/ai-muzik/AiMuzikStudyoEkrani.ios.tsx` → **untracked** |
| `TakasIos` | **var** | `src/ekranlar/cuzdan/CuzdanTakasEkrani.ios.tsx` → **untracked** |
| `IosHariciOdemeYok` | **var** | `src/moduller/cuzdan/bilesenler/IosHariciOdemeYokEkrani.tsx` → **untracked** |
| `AiMuzikStudyo` (generic gövde) | **yok** | dosya mevcut (`AiMuzikStudyoEkrani.tsx`) |
| `CuzdanTakasEkrani` (generic gövde) | **yok** | dosya mevcut |

**Yorum:** Ekip, Expo Router'ın `app/` altındaki `.ios.tsx` dosyalarında generic sürümü de paketleme davranışını doğru teşhis etmiş ve gövdeleri `src/ekranlar/` altına taşımış. Bu **teknik olarak doğru** bir çözüm; binary kanıtı da bunu doğruluyor.

---

## 3. Expo / EAS yapılandırması

### 3.1 `app.config.ts` (1.3.1)

| Ayar | Değer | Değerlendirme |
|---|---|---|
| `version` | `1.3.1` | Build ile uyumlu |
| `slug` / `owner` | `muta` / `mutaq` | — |
| `ios.bundleIdentifier` | `com.litxtech.muta` | — |
| `ios.entitlements` | `aps-environment` (production/development) | Push |
| `UIBackgroundModes` | `remote-notification`, `audio`, `voip` | Ses odası + CallKit için gerekçeli; Info.plist ile doğrulandı |
| `NSSupportsLiveActivities` | `true` | — |
| `ITSAppUsesNonExemptEncryption` | `false` | — |
| `NSCameraUsageDescription` | Var | — |
| `NSMicrophoneUsageDescription` | Var | — |
| `NSBluetooth*UsageDescription` | Var | — |
| `CFBundleLocalizations` | `tr,en,es,pt,ar` | Uygulamada `fr`, `fil` de var → hafif uyumsuzluk |
| `LSApplicationQueriesSchemes` | `whatsapp`, `whatsapp-business` | — |

### 3.2 Eklentiler (plugins)

| Eklenti | Durum | Not |
|---|---|---|
| `expo-router` | Aktif | Rota envanteri §4 |
| `expo-secure-store`, `expo-font`, `expo-system-ui`, `expo-sharing` | Aktif | — |
| `expo-local-authentication` | Aktif | Face ID |
| `expo-dev-client` | **production'da da listede** | Dev client native kodu prod binary'ye girebilir; zararsız ama gereksiz |
| `expo-apple-authentication` | Aktif | Zorunlu (Sign in with Apple) |
| `expo-iap` | Aktif | IAP |
| **`@stripe/stripe-react-native`** | **Config plugin olarak duruyor** | Native pod autolinking'de hariç (`package.json:134-142`); binary'de Stripe framework yok. Yine de config plugin'in prod'da kalması gereksiz risk |
| `expo-audio`, `expo-camera`, `expo-image-picker` | Aktif | İzin metinleri var |
| `expo-notifications` | Aktif | — |
| `expo-video`, `expo-pip` | Aktif | PiP |
| `@livekit/react-native-expo-plugin` | Aktif | RTC |
| `@config-plugins/react-native-webrtc` | Aktif | WebRTC |
| `./plugins/withSesOdasiForegroundService.js` | Yalnızca native | Android FGS |
| `./plugins/withTamusoCallKit.js` | Yalnızca native | CallKit |
| `./plugins/withAndroidIncomingCall.js` | Yalnızca native | Android |
| `expo-widgets` bağımlılığı | Pakette var, plugin kapalı | Ölü bağımlılık |

### 3.3 `eas.json`

- `cli.promptToConfigurePushNotifications: true`
- `production`: `autoIncrement: true`, `EXPO_PUBLIC_APP_ENV=production`
- `submit.production.ios.ascAppId: 6810697231`
- `updates` bölümü **yok** → OTA kanalı tanımlı değil.
- Tüm profillerde aynı Supabase/LiveKit uçları (development dahil **production Supabase** kullanıyor). Bu, geliştirme build'lerinin canlı veriye yazması demektir (App Review ile doğrudan ilgili değil, operasyonel risk).

### 3.4 `metro.config.js`

- `blockList`: `docs/`, `load-tests/`, `imports/`, `.cache/`, loglar, `sis-spin/` referansı engelleniyor.
- **`app/admin/**` veya `app/oyun/**` için hiçbir hariç tutma yok.**
- Web için native modül stub'ları var (`expo-iap`, `@stripe/stripe-react-native`, `react-native-agora` vb.) — bu yalnızca `platform === 'web'` için.
- Sonuç: **native bundle'a giren rota kümesi `app/` ağacının tamamıdır.**

### 3.5 OTA / uzaktan JS

| Kontrol | Sonuç |
|---|---|
| `expo-updates` bağımlılığı | **Yok** |
| `eas.json` `updates` | **Yok** |
| Bundle içinde `expo-updates` dizgisi | **0** |
| `eval(` / uzaktan JS yükleme | Bulunamadı |
| WebView ile uzak içerik | **Var** (bkz. §6.4) |

**Sonuç:** OTA yok. "Kod değiştirmeden uygulama davranışı değiştirme" yalnızca **feature flag + sunucu yanıtları** üzerinden yapılıyor — ki bu başlı başına 2.5.19 riskidir (bkz. `HIDDEN_FEATURES_REPORT.md`).

---

## 4. Binary kompozisyonu

### 4.1 Rota envanteri

| Klasör | Dosya sayısı |
|---|---|
| `app/**` toplam | **271** |
| `app/admin/**` | **119** |
| `app/ajans/**` | ~37 |
| `app/oyun/**` | 8 |
| `app/ai-muzik/**` | 5 |

Expo Router tüm bu dosyaları route manifest'ine ve JS bundle'a dahil eder. Build 35 bundle'ında `./admin/...`, `./oyun/...`, `./ai-muzik/...` dizgileri birebir doğrulandı.

### 4.2 Gömülü framework'ler

| Framework grubu | Var mı | Not |
|---|---|---|
| `ExpoCamera`, `ExpoVideo`, `ExpoPrint`, `ExpoFileSystem`, `ExpoFont` | Var | Beklenen |
| `LiveKitWebRTC`, `hermesvm`, `React` | Var | Beklenen |
| **Agora** (`AgoraRtcKit` + ~25 extension) | **Var** | `rtcProvider: 'livekit'` olmasına rağmen tam Agora SDK binary'de |
| `ZXingObjC` | Var | Barkod tarama |
| **Stripe** | **Yok** | Autolinking hariç tutma çalışmış |
| `expo-updates` | **Yok** | OTA yok |

**Değerlendirme:** Agora, kullanılmayan ağır bir native SDK olarak binary'de duruyor. 2.5.19 kapsamında "dormant capability" olarak değil, **gereksiz bağımlılık/boyut** olarak değerlendirilir (orta-düşük risk). Ancak iki ayrı RTC yığınının binary'de olması, statik incelemede "hangi özellik gerçekten kullanılıyor" sorusunu doğurur.

### 4.3 Info.plist (IPA'dan okundu)

```json
{
  "CFBundleIdentifier": "com.litxtech.muta",
  "CFBundleShortVersionString": "1.3.1",
  "CFBundleVersion": "35",
  "UIBackgroundModes": ["remote-notification", "audio", "voip"],
  "NSSupportsLiveActivities": true,
  "ITSAppUsesNonExemptEncryption": false,
  "LSApplicationQueriesSchemes": ["whatsapp", "whatsapp-business"],
  "CFBundleURLTypes": [["muta","com.litxtech.muta"], ["exp+muta"]],
  "CFBundleLocalizations": ["tr","en","es","pt","ar"]
}
```

- `NSUserTrackingUsageDescription` yok → ATT kullanılmıyor (temiz).
- `voip` background mode CallKit/PushKit için gerekçeli; review notunda açıklanmalı.
- `audio` background mode ses odası için gerekçeli.
- URL şeması `muta://` → **tüm deep link rotaları** (`/ajans/satis/[kod]`, `/ai-muzik`, `/admin/...`) OS tarafından açılabilir.

---

## 5. Ortam değişkenleri ve sırlar

| Değişken | Değer tipi | Not |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Production URL | Tüm profillerde aynı |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Anon key (normal) |
| `EXPO_PUBLIC_LIVEKIT_URL` | `wss://...livekit.cloud` | — |
| `EXPO_PUBLIC_LIVEKIT_TOKEN_URL` | Supabase function | — |
| `EXPO_PUBLIC_IAP_VERIFY_URL` | Supabase function | — |
| `EXPO_PUBLIC_RTC_PROVIDER` | `livekit` | Agora binary'de ama kullanılmıyor |

**Not:** `.env` dosyası depoda mevcut (674 bayt). İçeriği bu raporda açılmadı; **repoda tutulması** ayrı bir güvenlik konusudur (bu denetimin kapsamı dışında, ancak `APPLE_COMPLIANCE_ACTION_PLAN.md` §5'te not edildi).

---

## 6. Uygulama davranışını build dışından değiştiren mekanizmalar

### 6.1 Feature flag + kill switch

- **133 bayrak + 21 kill switch** (`OzellikBayragiAnahtarlari.ts`).
- Sunucudan `ozellik_bayraklari_snapshot` RPC ile yükleniyor (`OzellikBayrakCache.ts:248-262`).
- `feature_flags` ve `kill_switches` tablolarına **realtime abonelik** var (`:279-300`).
- Yerel varsayılanlar kodda (`:18-137`).
- Canlıda 2026-10-25 08:28:42'de 5 oyun bayrağı **aynı saniyede** değişti → mekanizmanın gerçekten kullanıldığının kanıtı.

### 6.2 Oyun kontrol konfigürasyonu

- `game_control_configs` (`is_enabled`, `mode`: `NORMAL`, `LOW_REWARD`, `MAINTENANCE`).
- İstemci tarafında ayrıca beyaz liste: `OyunKontrolServisi.ts:23` → yalnızca `fruit_wheel` + `storm_king`.
- Görünürlük realtime güncelleniyor (`useGorunurOyunKodlari.ts:63-87`).

### 6.3 Sürüm politikası

- `SurumPolitikaKapisi` (`app/_layout.tsx:156`) ve `AdminSurumPolitikasi` — sunucudan minimum sürüm/force update.
- Bu meşru bir mekanizma; ancak "eski sürümü kapatma" da uzaktan kontrol edilebilirliği artırır.

### 6.4 WebView ve banner hedefleme

- `app/webview.tsx` → `TamusoWebViewScreen`.
- `WebViewSecurity.ts:46-56`: yalnızca `https:` şeması; **host allowlist yok**.
- Banner hedefleme: ülke / bölge / şehir / platform / dil (`BannerEligibilityEngine.ts:36-95`).
- Sonuç: Sunucudan gelen içerik, kullanıcıya göre farklı HTTPS sayfaları uygulama içinde açabilir.

---

## 7. Metadata karşılaştırması

### 7.1 Erişilebilen metin

Depoda `TAMUSO_APP_STORE_METINLERI.md` var; **yeni gönderim için hazırlanmış taslak**. İçinde şunlar beyan edilmiş:

- Canlı yayın, ses odaları, mesajlaşma, durum/hikâye
- Coin + hediye, IAP
- Cüzdan: Satın alınan Coin / Oyun Coin'i / Yayıncı Kazançları (USD)
- **Fruit Wheel** (coin ile oynanan, ödülü oyun coin'i, olasılık/RTP gösterilir)
- Ajanslar
- Ücretli dakikalık aramalar
- 18+

### 7.2 Eksik / çelişkili noktalar

| Konu | Taslak metinde | Kodda | Durum |
|---|---|---|---|
| Yönetim konsolu | **Hiç yok** | 119 ekran, binary'de | **Eksik** |
| Çekim / banka | "Creator Earnings … bank transfer" | Eski elmas→IBAN sekmesi de var | **Belirsiz** |
| Harici ödeme | "Yok" | `stripe_enabled=true`, `ajans-pay` | **Çelişki** |
| AI Müzik | "iOS binary'sinden kaldırıldı" | Rotasyon stub'ları + i18n + sunucu açık | **Kısmi** |
| Diğer oyunlar | "Yalnızca Fruit Wheel" | 7 ölü oyun rotası binary'de | **Kısmi** |
| Yaş derecelendirmesi | 18+, "simulated gambling" önerisi | ASC'de gerçek değer okunamadı | **E** |
| Ekran görüntüleri | — | Okunamadı | **E** |

### 7.3 Canlı App Store metni

**Okunamadı (E).** Bu nedenle "reddedildiği sırada mağazada ne yazıyordu" sorusu bu denetimde cevaplanamaz.

---

## 8. Bulgu tablosu

| # | Bulgu | Dosya | Satır | Kanıt | Kural | Risk | Durum |
|---|---|---|---|---|---|---|---|
| P1 | Admin ağacı native bundle'da | `app/admin/**`, `main.jsbundle` | — | 119 dosya + `./admin/*` dizgileri | 2.5.19 | Kritik | Doğrulandı |
| P2 | Ölü oyun motorları bundle'da | `app/oyun/*.tsx` | — | 7 rota dizgisi | 2.5.19 | Orta | Doğrulandı |
| P3 | Kullanılmayan Agora SDK | `package.json`, `Frameworks/` | 59 | ~26 Agora framework | — | Düşük/Orta | Doğrulandı |
| P4 | Stripe config plugin prod'da | `app.config.ts` | 139-144 | plugin listesinde | 3.1.1 | Düşük | Doğrulandı |
| P5 | Stripe native framework yok | `package.json` | 134-142 | `Frameworks/` temiz | — | — | Doğrulandı (iyi) |
| P6 | OTA yok | `package.json`, `eas.json` | — | `expo-updates` 0 | — | — | Doğrulandı (iyi) |
| P7 | WebView host allowlist yok | `WebViewSecurity.ts` | 46-56 | Sadece şema kontrolü | 2.5.2 | Orta | Doğrulandı |
| P8 | Deep link ile her rota açılabilir | `app.config.ts` | 48 | `scheme: muta` | 2.5.19 | Orta | Doğrulandı |
| P9 | Build ↔ kaynak eşlemesi yok | git | — | 287 dosya fark | — | Yüksek (süreç) | Doğrulandı |
| P10 | Dev client prod profilinde | `app.config.ts` | 135 | `expo-dev-client` | 2.5.19 (düşük) | Düşük | Doğrulandı |
| P11 | Lokalizasyon listesi eksik | `app.config.ts` | 78 | `fr`,`fil` yok | 2.3.1 (düşük) | Düşük | Doğrulandı |
| P12 | Tüm profiller canlı Supabase | `eas.json` | 12-20 | dev/prod aynı URL | — | Orta (operasyon) | Doğrulandı |

---

## 9. Doğrulanamayanlar

1. Apple'a gönderilen **App Store Connect metni ve ekran görüntüleri**.
2. Gönderilen **review notlarının** içeriği (depodaki dosya taslak).
3. Reddin **hangi build** için ve **hangi tarihte** verildiği.
4. Apple'ın **cihaz/hesap/ülke** bazlı inceleme yapıp yapmadığı.
5. Build 34 ile 35 arasındaki **tam içerik farkı** (34 indirilmedi; aynı commit olduğu için farkın kaynağı belirsiz).
6. Gerçek IAP/Stripe **tahsilat** kayıtları (kullanıcı verisi okunmadı).

---

## 10. Sonuç

- Build 35 teknik olarak **sağlıklı bir Expo/EAS build'idir**: OTA yok, Stripe native yok, iOS'a özel uyumluluk varyantları doğru uygulanmış.
- Sorun build kalitesi değil, **binary'nin içeriği ve beyan uyumu**: admin konsolu, ölü oyun motorları, cüzdan çekim sekmesi ve harici ödeme kalıntıları binary'de/sunucuda duruyor.
- **En önemli süreç bulgusu:** Build ile kaynak kod arasında birebir eşleme yok; bu, Apple'a verilecek her türlü beyanın doğrulanabilirliğini azaltıyor.
