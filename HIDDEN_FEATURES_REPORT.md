# TAMUSO — Gizli / Pasif / Belgelenmemiş Özellik Raporu

- **Tarih:** 30 Ekim 2026
- **Amaç:** Apple Guideline 2.5.19 kapsamında "hidden, dormant, undocumented" özellikleri **kelime eşleşmesine göre değil, gerçek çalışma biçimine göre** tespit etmek.
- **Kural:** Kod değiştirilmedi. Bulgular iki seviyede ayrıldı: **(A) doğrudan kanıt**, **(B) güçlü şüphe**, **(D) meşru/ihlal yok**, **(E) doğrulanamadı**.

---

## 1. Tanımlar (karışmaması için)

| Terim | Bu raporda anlamı | Apple karşılığı |
|---|---|---|
| **Gizli (hidden)** | Normal kullanıcının hiçbir yoldan erişemediği, yalnızca özel role/bayrağa açılan işlev | 2.5.19 hidden functionality |
| **Pasif (dormant)** | Kod binary'de hazır, kullanıcıya kapalı; **sunucudan açılabilir** | 2.5.19 dormant functionality |
| **Belgelenmemiş (undocumented)** | Kullanıcıya açık ama mağaza metni/review notunda geçmiyor | 2.5.19 + 2.3.1 |
| **Rol kapısı (role-gated)** | Erişim `is_admin` gibi meşru bir yetkiyle sınırlı | Tek başına ihlal değil |

> Önemli: **Rol kapısı meşrudur.** Buradaki risk, rol kapısının varlığı değil; kapının arkasındaki işlevin **binary'de tam olarak bulunması**, **mağaza metninde hiç bildirilmemesi** ve içinde **sonuç/bakiye kontrolü** olmasıdır.

---

## 2. Gizli yönetim konsolu (en kritik)

### 2.1 Boyut ve yapı

| Ölçüm | Değer |
|---|---|
| `app/admin/**` dosya sayısı | **119** |
| Toplam `app/**` rota dosyası | 271 |
| Alt bölümler | `ajanslar`, `app-launch`, `bannerlar`, `blog`, `destek`, `dogrulama`, `duyurular`, `fikirler`, `finance`, `islem-hacmi`, `kullanicilar`, `kyc`, `moderasyon`, `oyun-algoritma`, `politikalar`, `takas`, `ulke-ligi`, `unvanlar`, `yonetim` |

### 2.2 Erişim kapısı

```ts
// src/moduller/admin/yetki/AdminYetkisiVarMi.ts
export function AdminYetkisiVarMi(profile: Profile | null | undefined): boolean {
  return profile?.is_admin === true;
}
```

- Ekranlar kendi içinde `yetkili` kontrolü yapıyor (ör. `app/admin/oyun-algoritma/index.tsx:79, 152-158`).
- Sunucu RPC'leri ayrıca `ben_admin_miyim()` ile kontrol ediyor (canlıda doğrulandı).
- **Değerlendirme:** Erişim kontrolü doğru kurulmuş. Sorun erişim değil, **binary'de bulunması ve beyan edilmemesi**.

### 2.3 Mobilde gerçekten render ediliyor

```tsx
// app/admin/_layout.tsx
import { AdminWebKabuk } from '../../src/moduller/admin/web/AdminWebKabuk';
export default function AdminYerlesim() {
  return <AdminWebKabuk />;
}
```

```tsx
// src/moduller/admin/web/AdminWebKabuk.tsx:45-48
if (!masaustu || !admin) {
  return <Slot />;   // mobilde: sidebar yok, ama ekranın kendisi render edilir
}
```

Yani "admin paneli sadece web'de çalışır" **doğru değil**. Web'de masaüstü kenar çubuğu ekleniyor; mobilde aynı ekranlar `<Slot />` ile tam ekran açılıyor.

### 2.4 Binary kanıtı

Build 35 `main.jsbundle` içinde birebir bulunan dizgiler:

```
./admin/index.tsx
./admin/cikis-plani.tsx
./admin/oyun-algoritma/index.tsx
./admin/oyun-test.tsx
./admin/kaskad-yonetim.tsx
./admin/fruit-wheel.tsx
./admin/app-launch/...
./admin/finance/...
```

### 2.5 Risk derecesi

| Faktör | Durum |
|---|---|
| Normal kullanıcı erişebilir mi? | Hayır (`is_admin`) |
| Binary'de var mı? | **Evet (tam)** |
| Mağaza metninde geçiyor mu? | **Hayır** |
| Review notunda geçiyor mu? | Taslakta **hayır** |
| İçinde sonuç/bakiye kontrolü var mı? | **Evet** (§3, §4) |
| **Sonuç** | **2.5.19 açısından kritik; 5.6 açısından yüksek** |

---

## 3. Oyun sonucu belirleme: "Çıkış Planı"

### 3.1 Ne yapıyor

`app/admin/cikis-plani.tsx` — yöneticinin oyun için **kesin sonuç sırası** ve **saat/gün kuralları** tanımladığı ekran:

| Satır | Metin |
|---|---|
| 158 | *"Kaydettiğin anda canlıya yazılır. **Sıra kesin çıkar.** Sıra bitince saat kuralı, o da yoksa normal sıklık seçer."* |
| 188 | *"Küre çıktığında üstten alta bu değerler gelir."* |
| 189 | *"Üstteki sıra **kesin**. Tahmin yazan satırlar sıklığa göre örnektir…"* |
| 253 | *"100 kutudan kaçı çarpan olsun. Şu an yüksekse büyük kazanç sıklaşır. 0 yazarsan çarpan çıkmaz."* |

### 3.2 Sunucu tarafı

- İstemci RPC'leri: `src/moduller/oyunlar/ortak/servisler/OyunCikisAdminApi.ts:72-111` → `game_cikis_pano`, `game_cikis_sira_kaydet`, `game_cikis_kural_ekle`, `game_cikis_taban_kaydet`, `game_cikis_bps_kaydet`.
- Edge function tarafı: `supabase/functions/_shared/cikis/plan.ts:67-99` → `game_cikis_storm_baslat` / `game_cikis_storm_bitir`.

### 3.3 Mevcut canlı durum (30 Ekim 2026)

| Kontrol | Sonuç |
|---|---|
| `game_cikis_oyun` aktif satır | **0** |
| `game_cikis_kural` | **0** |
| `game_cikis_storm_baslat` gövdesi | `select jsonb_build_object('ok', false);` |
| `game_cikis_sira_kaydet` → `authenticated` yetkisi | **revoke** |
| `20261025090300_oyun_seffaflik.sql` uygulanmış mı? | **Evet** (fonksiyon gövdeleri ve yetkiler bunu gösteriyor) |

**Değerlendirme:** Sunucu tarafı **25 Ekim 2026'da kapatılmış**. Bu iyi bir remediation'dır. Ancak:
1. Bu düzeltme **sunucudadır**; ekran hâlâ binary'dedir.
2. Binary'de `game_cikis` (6 kez), `TEST_BALANCE`, `force_next` dizgileri durmaktadır.
3. Apple binary'yi incelerse "sonuç belirleme" ekranını görür; sunucunun kapalı olduğunu **göremez**.

---

## 4. Bakiye ve finans kontrolü

| Yetenek | Dosya | Satır | RPC | Canlı |
|---|---|---|---|---|
| Kullanıcı coin ekle/eksilt/ceza | `src/moduller/admin/kullanici/islemler/AdminKullaniciCoinIsle.ts` | 30-35 | `admin_kullanici_coin_isle` | **çalışıyor** |
| Cüzdan düzeltme | `src/moduller/admin/platform/AdminPlatformIslemleri.ts` | 65-72 | `admin_cuzdan_duzelt` | **çalışıyor** |
| Ajans dağıtım bakiyesi | `src/moduller/admin/ajans/AdminAjansYetkiKarti.tsx` | 87-100 | — | UI |
| Çekim listesi/durum | `src/moduller/admin/platform/AdminPlatformIslemleri.ts` | 39, 51 | `admin_cekim_listesi`, `admin_cekim_durum_guncelle` | **çalışıyor** |
| Kullanıcı dosyası (coin/elmas) | `src/moduller/admin/kullanici/AdminKullaniciDosyaBelgesi.ts` | 97-98 | — | UI |

**Not:** Bu yetenekler meşru operasyon araçlarıdır (iade, ceza, düzeltme). Ancak review notunda **"admin araçları kullanıcı bakiyesini değiştiremez"** deniyorsa bu **yanlıştır** (bkz. §7).

---

## 5. Pasif (dormant) özellikler

### 5.1 Kullanıcıya kapalı oyun motorları

| Rota | Binary | Sunucu `is_enabled` | Bayrak |
|---|---|---|---|
| `app/oyun/zeus.tsx` | **var** | false | `zeus_enabled=false` |
| `app/oyun/nox.tsx` | **var** | false | `nox_reels_enabled=false` |
| `app/oyun/kaskad.tsx` | **var** | false | `kozmik_kaskad_enabled=false` |
| `app/oyun/fair-spin.tsx` | **var** | false | — |
| `app/oyun/astral-falls.tsx` | **var** | false | — |
| `app/oyun/sis-spin.tsx` | **var** | — | — |
| `app/oyun/dede.tsx` | **var** | — | — |

İstemci beyaz listesi yalnızca `fruit_wheel` + `storm_king` (`OyunKontrolServisi.ts:23`). Yani bu ekranlar **deep link ile bile** normalde açılmaz (`BannerInternalLinkHandler.ts:110-120` görünürlük kontrolü). Ancak kod binary'dedir.

### 5.2 Bayrakla açılan finans arayüzleri

| Arayüz | Bayrak (canlı) | Binary |
|---|---|---|
| Cüzdan "Çekim" sekmesi (elmas → IBAN) | `withdrawals_enabled=true` / `wallet_withdraw_enabled=false` | **var, görünür** (bkz. §6) |
| Coin takas | `wallet_exchange_enabled=false` | iOS'ta redirect stub |
| "Coin sat" | `wallet_sell_enabled=false` | — |

### 5.3 iOS'ta redirect'e çevrilmiş ama binary'de duran rotalar

| Rota | iOS davranışı | Kanıt |
|---|---|---|
| `/ai-muzik` | Ana sayfaya redirect | `src/ekranlar/ai-muzik/AiMuzikStudyoEkrani.ios.tsx:1-6` |
| `/cuzdan/takas` | Cüzdana redirect | `src/ekranlar/cuzdan/CuzdanTakasEkrani.ios.tsx` |
| `/ajans/satis/[kod]` | "Harici ödeme yok" bilgi ekranı | `src/ekranlar/ajans/AjansSatisLinkAcilisEkrani.ios.tsx` |
| `/odeme-basarili` | Cüzdana redirect | `src/ekranlar/odeme/OdemeBasariliEkrani.ios.tsx` |

**Bu iyi bir uygulamadır** ve build 35'te doğrulanmıştır (`AiMuzikIos`, `TakasIos`, `IosHariciOdemeYok` dizgileri var; generic gövdeler yok). Ancak "binary'den kaldırıldı" ifadesi teknik olarak **doğru değildir**; rota ve metinler binary'dedir.

### 5.4 Kullanılmayan native SDK

- `react-native-agora` bağımlılığı ve **~26 Agora framework'ü** IPA'da.
- `rtcProvider: 'livekit'` → Agora çalışmıyor.
- Değerlendirme: 2.5.19 "dormant feature" değil; **gereksiz bağımlılık**. Statik incelemede iki RTC yığını görünmesi kafa karıştırır.

---

## 6. "Gizli" görünüm üreten ama meşru olan yapılar

Bu bölüm, Apple'ın "gizli" sanabileceği ama **teknik olarak meşru** olan yapıları ayırmak için var.

| Yapı | Neden meşru | Kanıt |
|---|---|---|
| Rol bazlı admin | Yetki kontrolü hem istemci hem sunucuda | `AdminYetkisiVarMi.ts:4-6`, canlı `ben_admin_miyim()` |
| Gizli sekmeler (`rooms`, `wallet`, `cihazlar`) | Navigasyon tasarımı; profil/menüden erişilir | `app/(tabs)/_layout.tsx:110-121` |
| Feature flag'ler | Standart operasyon aracı | `OzellikBayrakCache.ts` |
| Platforma özel ekranlar | iOS uyumluluğu için bilinçli | `.ios.tsx` varyantları |
| Banner hedefleme | Pazarlama | `BannerEligibilityEngine.ts` |
| Sürüm politikası | Zorunlu güncelleme | `SurumPolitikaKapisi` |
| Deep link | Standart | `app.config.ts:48` |

**Ancak** bu yapıların **bir arada** kullanımı, reviewer'ın gördüğü uygulama ile normal kullanıcının gördüğü uygulamanın farklı olmasına yol açar. Bu, 2.5.19'un "materially different" ifadesiyle kesişir.

---

## 7. Review notu ile kod arasındaki çelişkiler

Kaynak: `TAMUSO_APP_STORE_METINLERI.md:154-186` (taslak).

| Review notu iddiası | Kod gerçeği | Kanıt |
|---|---|---|
| "Every feature in this build is visible to all users" | Admin konsolu, ölü oyunlar, bayraklı finans arayüzleri görünmez | §2, §5 |
| "no remote switch that turns on features that are not in this binary" | Teknik olarak doğru (hepsi binary'de) ama **bayrakla açılıp kapanıyor** | `OzellikBayrakCache.ts:279-300` |
| "AI Music Studio … removed from the iOS binary" | Rota stub'ı + i18n + sunucu açık | `./ai-muzik/index.tsx` binary'de; `ai_music_enabled=true` |
| "external or web payments … removed" | `stripe_enabled=true`, `ajans-pay` çalışıyor | canlı DB + `ajans-pay/index.ts` |
| "agency Coin sales … removed" | iOS UI kapalı; sunucu satış kanalı açık | §5.3, canlı bayrak |
| "These tools cannot change game results or user balances" | Sonuç RPC'leri kapalı **ama** bakiye RPC'leri açık | §4 |

**Değerlendirme:** Bu notlar bir sonraki gönderimde kullanılırsa, Apple'ın **5.6 "misleading"** değerlendirmesi için doğrudan malzeme olur. Notların gerçeğe eşitlenmesi, kod düzeltmesi kadar önemlidir.

---

## 8. Kelime taraması (istenen anahtarlar)

| Anahtar | Sonuç | Yorum |
|---|---|---|
| `feature_flags` | 13 dosya | Gerçek uzaktan bayrak sistemi |
| `remote_config` | **0** | Firebase Remote Config yok |
| `isEnabled` | 7 | Bayrak okuma |
| `hidden` | 25+ (çoğu stil/ikon) | Anlamlı gizleme: `href: null`, `IOS_PAKETINDE_OLMAYAN` |
| `dormant` | 0 | — |
| `adminOnly` | 5 | Menü öğeleri |
| `developerMode` | **0** | — |
| `reviewMode` | **0** | **Reviewer tespiti yok** |
| `testMode` | 0 (ayrı `TEST_BALANCE` var) | Oyun test modu |
| `production` / `staging` / `beta` / `experimental` | Yalnızca env/ortam adları | Gizli ortam yok |
| `userRole` | 0 (rol `is_admin`/RBAC) | — |
| `countryCode` | 25+ dosya | Banner/şehir hedefleme |
| `deviceId` | Cihaz push/oturum | Reviewer tespiti için kullanım **yok** |
| `appVersion` | Sürüm politikası | — |
| OTA (`expo-updates`) | **0** | Yok |
| Dynamic import | Rehberde yok | — |
| `WebView` | Var | Host allowlist yok |
| Remote JavaScript / `eval` | **0** | Yok |

**Sonuç:** "Reviewer'a özel davranış", "cihaz/IP tespiti", "gizli ortam", "OTA ile kod değiştirme" **bulunamadı (D)**. Gizlilik, **rol kapısı + bayrak + binary'de hazır kod** üzerinden kuruluyor.

---

## 9. Uzaktan içerik: WebView ve banner

### 9.1 WebView

```ts
// src/banner/webview/WebViewSecurity.ts:46-56
if (parsed.protocol !== 'https:') { ... }
if (!parsed.hostname || parsed.hostname === 'localhost') { ... }
if (parsed.username || parsed.password) { ... }
return { ok: true, url: parsed.toString() };
```

- **Host allowlist yok.** Banner/duyuru/mesaj linki herhangi bir HTTPS sayfasını uygulama içinde açabilir.
- Risk: 2.5.2 (uygunsuz içerik) + 2.5.19 (uzaktan değişen işlev).

### 9.2 Banner hedefleme

`BannerEligibilityEngine.ts:36-95` — `ALL`, `COUNTRY`, `REGION`, `CITY`, `CUSTOM`, `platform`, `language`, saat aralığı. Aynı uygulama, aynı sürüm, farklı kullanıcıya farklı içerik gösterebilir.

**Kanıt düzeyi:** Mekanizma **A**; kötüye kullanım **B** (kanıt yok).

---

## 10. Bulgu tablosu

| # | Bulgu | Dosya | Satır | Kanıt | Kural | Risk | Durum |
|---|---|---|---|---|---|---|---|
| H1 | 119 ekranlık admin konsolu binary'de | `app/admin/**`, `main.jsbundle` | — | Rota dizgileri | 2.5.19 | **Kritik** | Doğrulandı |
| H2 | Oyun sonucu belirleme ekranı | `app/admin/cikis-plani.tsx` | 158, 188-189 | "Sıra kesin çıkar" | 5.6, 2.5.19 | **Kritik** | Doğrulandı |
| H3 | Oyun algoritması/RTP paneli | `app/admin/oyun-algoritma/index.tsx` | 41-48, 100-135 | `gameAdminMathActivate` | 5.6 | Yüksek | Doğrulandı |
| H4 | Bakiye düzeltme yeteneği | `AdminKullaniciCoinIsle.ts` | 30-35 | Canlı RPC | 5.6 | Yüksek | Doğrulandı |
| H5 | Ölü oyun motorları | `app/oyun/*.tsx` | — | 7 rota | 2.5.19 | Orta | Doğrulandı |
| H6 | AI Müzik rota/i18n kalıntısı | `./ai-muzik/*`, `en.ts:3519` | — | Binary dizgi | 2.5.19 | Orta | Doğrulandı |
| H7 | Stripe/ajans metin kalıntısı | `src/i18n/locales/en.ts` | 3519 | Binary dizgi | 3.1.1 | Orta | Doğrulandı |
| H8 | WebView host allowlist yok | `WebViewSecurity.ts` | 46-56 | Kod | 2.5.2 | Orta | Doğrulandı |
| H9 | Banner ülke/platform hedefleme | `BannerEligibilityEngine.ts` | 36-95 | Kod | 2.5.19 | Düşük | Doğrulandı |
| H10 | Gizli sekmeler | `app/(tabs)/_layout.tsx` | 110-121 | `href: null` | 2.3.1 | Düşük | Doğrulandı |
| H11 | Reviewer tespiti | — | — | `reviewMode`/`developerMode`/OTA/eval yok | — | — | **Bulunamadı (D)** |
| H12 | Review notu ↔ kod çelişkisi | `TAMUSO_APP_STORE_METINLERI.md` | 154-186 | §7 | 5.6 | Yüksek | Taslak (gönderim E) |

---

## 11. Sonuç

1. **Gerçek gizli işlev var:** yönetim konsolu ve içindeki sonuç/bakiye kontrolü. Rol kapısı meşru, ancak binary'de tam olarak bulunuyor ve hiçbir yerde beyan edilmiyor.
2. **Gerçek pasif işlev var:** kullanıcıya kapalı 7 oyun motoru, bayrakla açılan finans arayüzleri.
3. **Reviewer'a özel davranış yok.** Apple'ın "review hesabına farklı özellik" ihtimali kodda desteklenmiyor.
4. **En hızlı risk azaltma:** admin ağacını native bundle'dan çıkarmak. Tek başına en büyük 2.5.19 bulgusunu ortadan kaldırır.
