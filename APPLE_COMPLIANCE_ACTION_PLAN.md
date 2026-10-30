# TAMUSO — Apple Uyum Eylem Planı

- **Tarih:** 30 Ekim 2026
- **Durum:** **Faz 1 ve Faz 3 uygulandı; Faz 2 uygulandı (ayrı web admin).** Faz 4 (ödeme/çekim yüzeyi) kullanıcı kararıyla **donduruldu** — dokunulmadı.
- **Kural:** Onay verilmeden hiçbir adım uygulanmaz.

---

## 0.1 Uygulama durumu (30 Ekim 2026)

| Faz | Kapsam | Durum | Kanıt |
|---|---|---|---|
| 1 | Review notu metinleri | **Tamam** | `TAMUSO_APP_STORE_METINLERI.md` §3 güncellendi; §4'e 7–8. doğrulama maddeleri eklendi |
| 2 | Admin konsolunun binary'den çıkarılması | **Tamam** | 119 route + `sertifikasyon` → `apps/super-admin/app/`; iOS bundle'da `moduller/admin` = **0** |
| 3 | Ölü oyun rotalarının çıkarılması | **Tamam** | 8 rota → `archive/oyun/`; iOS bundle'da `/oyun/zeus` vb. = **0** |
| 4 | Ödeme / çekim yüzeyi | **Donduruldu** | Kullanıcı kararı: hukuki/operasyonel karar bekleniyor |
| 5 | Veri bütünlüğü (1e17 coin) | **Yapılmadı** | Production DB'ye dokunulmadı |
| 6 | Gönderim öncesi testler | **Kısmi** | iOS + web export ile bundle doğrulandı; cihaz testi yapılmadı |

### Doğrulama komutları ve sonuçları

```bash
node scripts/admin-import-dogrula.mjs     # 1069 göreli import, 0 çözülmeyen
npx expo export --platform ios            # başarılı
# bundle taraması:
moduller/admin  => 0
cikis-plani     => 0
oyun-algoritma  => 0
/oyun/{zeus,nox,kaskad,fair-spin,astral-falls,dede,storm-king} => 0
admin/          => 4  (yalnızca @supabase/supabase-js SDK'nın kendi /v1/.../admin/... yolları)
```

### Yeni yapı

- `apps/super-admin/` — ayrı Expo web uygulaması (personel konsolu). `expo export --platform web` ile derlenir, ayrı domain'e deploy edilir.
- `src/moduller/admin/web/AdminWebAdresi.ts` — mobil uygulamadan panele açılan tek kapı. `EXPO_PUBLIC_ADMIN_WEB_URL` tanımlı değilse mobilde hiçbir personel girişi görünmez.
- `archive/oyun/` — çıkarılan 8 oyun rotası (silinmedi, geri alınabilir; Metro ve TS tarafından taranmaz).
- `src/moduller/medya-yukleme/` — eski `admin/ses-odalari/AdminSesOdasiIslemleri` (aslında medya yükleme; dinamik import yolu binary'de kalıyordu).

---

## 0. İlkeler

1. **Önce beyan, sonra kod.** Review notundaki yanlış cümleler, kod düzeltmesinden daha hızlı ve daha büyük risk azaltır (§3'teki 6 çelişki).
2. **Silme > gizleme.** Apple binary'yi inceler. `if (false)` ile kapatmak "dormant feature" tanımına girer; dosyayı bundle'dan çıkarmak girer mi? **Hayır.**
3. **Tek yönlü kapı.** Her özellik için tek bir karar noktası (tek bayrak / tek RPC). Çift bayrak (`withdrawals_enabled` + `wallet_withdraw_enabled`) çelişki üretir.
4. **Geri alınabilirlik.** Her adım tek başına revert edilebilir olmalı; veri迁移 ayrı tutulmalı.
5. **Kanıtla kapat.** Her adımın sonunda binary'de string taraması yapılmalı (§6).

---

## 1. Risk sınıfları

| Sınıf | Kapsam | Örnek |
|---|---|---|
| **R0** | Mağaza metni / review notu (kod yok) | Yanlış iddiaları sil |
| **R1** | UI gizleme (client, tek dosya) | Çekim bölümünü kaldır |
| **R2** | Rota/bundle dışlama (build config) | `app/admin/**` çıkar |
| **R3** | Sunucu bayrak/RPC kapatma | `stripe_enabled=false` |
| **R4** | Veri düzeltme (ledger, bakiye) | 1e17 coin |
| **R5** | Mimari taşıma (monorepo, ayrı web app) | Admin panelini web'e taşı |

**Kural:** R4 ve R5, App Review gönderimini **bloklamaz**; R0–R3 gönderim öncesi tamamlanmalıdır.

---

## 2. Faz planı (en az riskli sıra)

### Faz 0 — Kanıt toplama ve dondurma (0 kod, ~1 gün)

| # | İş | Çıktı |
|---|---|---|
| 0.1 | App Store Connect'ten mevcut **yaş derecelendirmesi**, ekran görüntüleri, açıklama, review notu kopyasını al | Karşılaştırma tablosu |
| 0.2 | Şu an canlı bayrakların anlık görüntüsü (`feature_flags`, `kill_switches`) | `flags_snapshot_2026-10-30.json` |
| 0.3 | Build 35 IPA'sını arşivle (EAS artifact) | Hash + tarih |
| 0.4 | "Değişiklik yapılmayacak" dondurma: yeni bayrak açma, yeni build yok | — |

> **Neden ilk:** Apple'a verilecek her cevap, mevcut durumun kanıtına dayanmalı. Snapshot alınmadan yapılan değişiklik, "ne zaman ne vardı" sorusunu cevapsız bırakır.

---

### Faz 1 — Beyan düzeltmesi (R0, kod yok, ~2 saat) ⭐ en yüksek fayda/maliyet

`TAMUSO_APP_STORE_METINLERI.md:154-186` içindeki review notu **gerçekle değiştirilmeli**:

| Mevcut iddia | Yapılacak |
|---|---|
| "Every feature in this build is visible to all users" | → "The app has a staff-only moderation console. Demo credentials are provided below." |
| "no remote switch that turns on features not in this binary" | → "Feature flags control availability only; no code is downloaded at runtime." |
| "AI Music Studio removed from the iOS binary" | → "AI Music is not available on iOS; the route redirects to Home." |
| "external or web payments removed" | → "Coin purchases on iOS use StoreKit only. Web checkout exists for the website and is not linked from the iOS app." |
| "agency Coin sales removed" | → "Agency sales are a web-only B2B channel; not purchasable in the iOS app." |
| "These tools cannot change game results or user balances" | → "Result-plan tooling is disabled server-side and removed from the next build. Balance adjustments are audit-logged and limited to staff." |

**Risk:** Sıfır kod riski. **Kazanç:** 5.6 "misleading" argümanının yarısını kapatır.

---

### Faz 2 — Admin ağacını binary'den çıkarma (R2/R5, ~2-3 gün) ⭐ en kritik

**Hedef:** `app/admin/**` (119 dosya) ve `src/moduller/admin/**` ekranlarının iOS bundle'ında **hiç bulunmaması**.

**Seçenekler:**

| Seçenek | Yaklaşım | Artı | Eksi | Öneri |
|---|---|---|---|---|
| A | `app/admin/**` dosyalarını repodan çıkar, web admin ayrı uygulama | Temiz, kalıcı | Mobil admin kaybı | **Önerilen** |
| B | Metro `resolver.blockList` / alias ile koşullu dışlama | Hızlı | Expo Router dosya tabanlı; kırılgan | Geçici |
| C | Mobilde admin yerine **WebView** ile masaüstü panele yönlendirme | Tek kod tabanı | WebView + gizli URL algısı | Kabul edilebilir |
| D | Sadece `is_admin` kapısını sıkılaştır | — | Binary'de kalır → **çözmez** | **Yetersiz** |

**Önerilen sıra (A + C karışımı):**
1. Admin ekranlarını `apps/admin-web` (veya `web-admin/`) altına taşı; `src/moduller/admin` yalnızca web build'inde import edilsin.
2. iOS'ta `/admin` rotası **hiç var olmasın** (dosya yok → rota yok).
3. Personel erişimi gerekiyorsa: Ayarlar → "Personel" → `https://admin.tamuso.app` **WebView** (tek URL, allowlist'li). Bu, review notunda açıkça bildirilir ve demo hesap verilir.

**Dokunulacak dosyalar (uygulama sırasında):**
- `app/admin/**` (119 dosya) → taşınacak
- `src/moduller/admin/**` → web-only
- `app/_layout.tsx:297` (`admin` Stack.Screen) → kaldırılacak
- `src/moduller/menu/**` (admin menü öğeleri) → platforma göre
- `app.config.ts` → gerekirse yeni `extra.adminWebUrl`

**Doğrulama (build sonrası):**
```bash
# bundle içinde admin izi kalmadı mı?
strings main.jsbundle | grep -E "admin/(cikis-plani|oyun-algoritma|finance|kyc)"
# beklenen: çıktı yok
```

**Risk:** Orta (rota silme → derleme hatası riski). **Azaltma:** önce `tsc --noEmit` + `expo export` yerel doğrulama.

---

### Faz 3 — Ölü oyun motorlarını kaldırma (R2, ~1 gün)

| Dosya | İşlem |
|---|---|
| `app/oyun/zeus.tsx` | Kaldır |
| `app/oyun/nox.tsx` | Kaldır |
| `app/oyun/kaskad.tsx` | Kaldır |
| `app/oyun/fair-spin.tsx` | Kaldır |
| `app/oyun/astral-falls.tsx` | Kaldır |
| `app/oyun/sis-spin.tsx` | Kaldır |
| `app/oyun/dede.tsx` | Kaldır |
| `app/oyun/fruit-wheel.tsx` | **Kalsın** (tek canlı oyun) |
| `app/oyun/storm-king.tsx` | Kaldır veya `storm_king_enabled` açılana kadar çıkar |

**Ek:** `react-native-agora` bağımlılığı ve ~26 Agora framework'ü IPA'dan çıkarılmalı (LiveKit kullanılıyor). Bu, binary boyutunu ve statik incelemede karışıklığı azaltır.

**Risk:** Düşük. **Dikkat:** `OyunKontrolServisi.ts:23` beyaz listesi ve `BannerInternalLinkHandler` hedefleri güncellenmeli, yoksa kırık link.

---

### Faz 4 — Ödeme/çekim yüzeyini netleştirme (R1/R3, ~1-2 gün) ⭐ ikinci en kritik

**Karar noktası:** Çekim **var mı, yok mu?** İkisi arasında seçim yapılmalı; "yarı açık" hâli en kötü durum.

| Senaryo | Yapılacak | Apple mesajı |
|---|---|---|
| **4A — Çekim yok** (önerilen, hızlı) | iOS'ta `yayinci-kazanclari` ekranını ve USD tutarlarını **gizle**; `withdrawals_enabled=false`; `cekim_talebi_olustur` revoke kalsın | "Payouts are not available in this version." |
| **4B — Çekim var** | `cekim_talebi_olustur` yetkisini geri ver, uçtan uca test et, ücret/min tutar UI'da göster, review notunda açıkla | "Creators can withdraw via bank transfer; fees shown before confirmation." |

**4A için dokunulacak yerler:**
- `src/moduller/cuzdan/bilesenler/CuzdanimBolumleri.tsx:157-171` (USD + "çekilebilir")
- `app/cuzdan/yayinci-kazanclari.tsx:170`
- `src/moduller/cuzdan/cekim/CekimTalebiOlustur.ts:29-33` (çift bayrak)
- `feature_flags.withdrawals_enabled` → `false` (tek bayrak kuralı)

**Ayrıca (R3):**
- `stripe_enabled` → web satışı gerçekten sürüyorsa **bırakılabilir**, ama review notunda "web-only, not linked from iOS" denmeli. Sürdürülmüyorsa `false`.
- Ajans kanalı: B2B olduğu ve iOS'tan erişilemediği review notunda **açıkça** yazılmalı.

---

### Faz 5 — Veri bütünlüğü (R4, kod dışı, ~1 gün)

1. `admin_topup` 1e17 coin kaydını **inceleme altına al** (silme değil; audit trail korunmalı).
2. `coin_bakiye_gecis_incelemesi` içindeki `needs_review=true` satırları (3 kullanıcı) **elle incele**, `reviewed_by/reviewed_at` doldur.
3. Admin hesabının bakiyesini normal aralığa çek (yeni bir düzeltme kaydı ile, geçmişi silmeden).
4. Hediye komisyon oranını (%20,7) ürün metnine ekle.

> **Not:** Bu adımlar Apple gönderimini bloklamaz ama inceleme sırasında "gerçek dışı ekonomi" görüntüsünü engeller.

---

### Faz 6 — Küçük sertleştirmeler (R1, ~yarım gün)

| Dosya | Sorun | Düzeltme |
|---|---|---|
| `src/banner/webview/WebViewSecurity.ts:46-56` | Host allowlist yok | `ALLOWED_HOSTS` seti; dış hostlar `Linking.openURL` ile tarayıcıya |
| `app/(tabs)/_layout.tsx:110-121` | 3 gizli sekme | Mağaza metninde "Profil menüsünden erişilir" veya sekme görünür yap |
| `src/i18n/locales/en.ts:3519` | "AI Music" metni binary'de | Ölü çeviri anahtarlarını temizle |

---

## 3. Yalnızca web'e taşımakla düzelmeyenler

| # | Sorun | Neden web'e taşımak yetmez |
|---|---|---|
| 1 | Binary'deki ölü oyun motorları | Binary'de kalır; silinmeli |
| 2 | "Çekilebilir" yazan cüzdan UI | Client metni; sunucu değişse de görünür |
| 3 | Review notu çelişkileri | Metin sorunu; kodla düzelmez |
| 4 | 1e17 coin / kaynak ayrımı denetimi | Veri sorunu |
| 5 | WebView host allowlist | Client kodu |
| 6 | Yaş derecelendirmesi (18+) | App Store Connect ayarı |
| 7 | Agora framework'leri | Native binary |
| 8 | `withdrawals_enabled` / `wallet_withdraw_enabled` çelişkisi | İki bayrağın mantığı client'ta |

---

## 4. Kod kaldırma kontrol listesi (uygulama sırasında)

```text
[ ] app/admin/**                          → taşı/çıkar (119 dosya)
[ ] app/_layout.tsx:297                   → admin Stack.Screen kaldır
[ ] src/moduller/admin/**                 → web-only
[ ] admin menü öğeleri                    → platforma göre
[ ] app/oyun/{zeus,nox,kaskad,fair-spin,astral-falls,sis-spin,dede,storm-king}.tsx
[ ] app/admin/cikis-plani.tsx             → taşı (binary'den çıkar)
[ ] app/admin/oyun-algoritma/index.tsx    → taşı
[ ] src/moduller/oyunlar/ortak/servisler/OyunCikisAdminApi.ts → web-only
[ ] src/moduller/cuzdan/yayinci/**        → iOS'ta kullanılmıyorsa çıkar
[ ] app/cuzdan/yayinci-kazanclari.tsx     → senaryo 4A ise çıkar
[ ] react-native-agora                    → bağımlılık + pod çıkar
[ ] i18n ölü anahtarlar                   → aiMuzik/stripe kalıntıları
```

**Dokunulmayacaklar:** `iap/**`, `stripe/**` (web için kalabilir, ama iOS'ta import edilmemeli), `feature_flags` altyapısı, `fruit_wheel` motoru.

---

## 5. Review notu taslağı (gerçeğe uygun)

```text
Review notes — Tamuso 1.3.x

1. Account for review
   Email: <demo@...>   Password: <...>
   The account is a regular user with no staff privileges.

2. What the app does
   Tamuso is a live audio-room and social app. Users buy Coins via StoreKit,
   send virtual gifts in rooms, and play one casual game ("Fruit Wheel").
   Coins are virtual items with no cash value.

3. Purchases
   All digital purchases inside the iOS app use StoreKit (In-App Purchase).
   The website offers checkout for web users only and is not linked from
   the iOS app. Agency/B2B coin sales are handled outside the app.

4. Games
   Fruit Wheel is a casual game played with Coins. Published probabilities
   and return-to-player are available in-app under Game Rules. No real-money
   prizes are awarded from the game.

5. Staff tools
   A moderation console exists for staff. It is not present in this build;
   staff use the web console at admin.tamuso.app. No staff tool can change
   game outcomes. Balance adjustments are audit-logged.

6. Region availability
   All features shown in this build are available to every user in every
   storefront. No feature is unlocked by country, device, or account type.
```

> Satır 6, **ancak Faz 2 ve 3 tamamlandıktan sonra** doğru olur.

---

## 6. Gönderim öncesi test listesi

### 6.1 Statik (build çıkmadan)

```bash
npx tsc --noEmit
npx expo export --platform ios        # bundle üret
strings dist/_expo/static/js/ios/*.hbc \
  | grep -E "cikis-plani|oyun-algoritma|admin/finance|force_next|TEST_BALANCE"
# beklenen: boş
```

### 6.2 Binary (build sonrası, IPA)

```bash
unzip -o build.ipa -d ipa
ls ipa/Payload/*.app/Frameworks | grep -i agora      # beklenen: yok
strings ipa/Payload/*.app/main.jsbundle | grep -c "admin/"   # beklenen: 0
```

### 6.3 Fonksiyonel (gerçek cihaz, production API)

| # | Test | Beklenen |
|---|---|---|
| 1 | Yeni kayıt → ana ekran | Normal akış, çökme yok |
| 2 | Cüzdan | Coin paketleri StoreKit fiyatıyla |
| 3 | IAP satın alma (sandbox) | Coin yükleniyor, makbuz doğrulanıyor |
| 4 | Cüzdan → kazanç bölümü | Senaryo 4A ise **görünmüyor** |
| 5 | Çekim denemesi | Senaryo 4A ise erişilemiyor |
| 6 | Fruit Wheel | Oynanıyor, kurallar/RTP ekranı açılıyor |
| 7 | Deep link `muta://oyun/zeus` | "Bulunamadı" (rota yok) |
| 8 | Arama/menüde admin izi | **Yok** |
| 9 | `is_admin=false` kullanıcıyla tüm sekmeler | Hepsi normal |
| 10 | Uçak modu / yavaş ağ | Anlamlı hata, beyaz ekran yok |
| 11 | 18+ yaş kapısı | Doğum tarihi akışı çalışıyor |
| 12 | Hesap silme | Erişilebilir (5.1.1(v)) |

### 6.4 Sunucu (deploy sonrası)

```sql
select key, enabled from feature_flags
where key in ('withdrawals_enabled','wallet_withdraw_enabled','stripe_enabled',
              'storm_king_enabled','zeus_enabled','nox_reels_enabled');
-- tek bayrak kuralı: withdrawals_enabled == wallet_withdraw_enabled

select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname like 'game_cikis%'
  and has_function_privilege('authenticated', p.oid, 'execute');
-- beklenen: yalnızca game_cikis_pano (içinde yetki kontrolü var) veya hiç
```

---

## 7. Zaman çizelgesi ve bağımlılıklar

```text
Faz 0  (snapshot)        ──┐
Faz 1  (review notu)     ──┼──► bağımsız, hemen yapılabilir
Faz 6  (küçük fix)       ──┘

Faz 2  (admin çıkar)     ──► Faz 3 ile paralel
Faz 3  (ölü oyunlar)     ──► Faz 2 sonrası rota kontrolü
Faz 4  (ödeme yüzeyi)    ──► Faz 2/3'ten bağımsız
        │
        ▼
Yeni build + Faz 6 testleri → gönderim

Faz 5  (veri)            ──► gönderimi bloklamaz, paralel
```

**Tahmini efor:** Faz 1 = 2 saat, Faz 2 = 2-3 gün, Faz 3 = 1 gün, Faz 4 = 1-2 gün, Faz 5 = 1 gün, Faz 6 = 0,5 gün.

---

## 8. Onay gerektiren kararlar

| # | Karar | Seçenekler | Etki |
|---|---|---|---|
| K1 | Mobil admin kalsın mı? | (a) tamamen çıkar, (b) WebView ile web panele | Binary içeriği |
| K2 | Çekim var mı? | (a) iOS'ta kaldır, (b) gerçekten çalıştır | 2.3.1/5.6 |
| K3 | Ajans kanalı | (a) web-only olarak belgele, (b) kapat | 3.1.1 |
| K4 | Storm King | (a) çıkar, (b) düzeltip aç | Binary + oyun |
| K5 | Agora | (a) kaldır, (b) bırak | Binary boyutu |
| K6 | 1e17 coin | (a) düzeltme kaydı, (b) olduğu gibi bırak | 5.6 |

**Bu 6 karar verilmeden Faz 2-5 uygulanmamalıdır.**

---

## 9. Geri alma (rollback)

| Faz | Rollback |
|---|---|
| 1 | Metin sürümü git'te |
| 2 | Ayrı branch; admin ağacı `archive/admin-mobile` etiketiyle korunur |
| 3 | Oyun dosyaları `archive/games` etiketi |
| 4 | Bayrak tekrar `true` (kod revert gerekmez) |
| 5 | Düzeltme kayıtları ters kayıtla (silme yok) |
