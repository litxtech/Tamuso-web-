# Super Admin (Expo web) — personel konsolu

Personel konsolu ayrı bir web uygulamasıdır. **iOS/Android binary'sine dahil değildir**;
mağazaya gönderilen pakette admin rotası yoktur (`moduller/admin` = 0).

## Yapı

```
apps/super-admin/
  app/            # expo-router rotaları (eski app/admin/** + sertifikasyon + giris)
  app.json        # expo-router root: app, asyncRoutes: false
  metro.config.js # repo kökündeki src/ ve node_modules'ı kullanır
  .env            # kök .env'e hardlink (tek kaynak)
  node_modules    # kök node_modules'a junction
```

Paylaşılan kod repo kökündeki `src/` altındadır ve mobil uygulamayla aynıdır.

## Çalıştırma

```bash
# 1) Hazırlık (bir kez; repo kökünde)
cmd /c mklink /J "apps\\super-admin\\node_modules" "%CD%\\node_modules"
cmd /c mklink /H "apps\\super-admin\\.env" "%CD%\\.env"

# 2a) Üretim derlemesi + önizleme (önerilen)
cd apps/super-admin
npm run preview          # -> http://127.0.0.1:8091

# 2b) Geliştirme sunucusu
npm run start            # -> http://localhost:8090  (bkz. Bilinen sınır)
```

## Bilinen sınır (dev sunucusu)

`expo start --web` bu yerleşimde **tam çalışmaz**: paylaşılan `src/` klasörü
`apps/super-admin` proje kökünün dışında olduğu için Metro'nun dev modundaki
dinamik `import()` parçaları proje köküne göre çözülür ve şu hatayı verir:

```
Unable to resolve module ./src/moduller/cevrimdisi/CevrimdisiOturum from apps/super-admin/.
```

Statik export (`npm run build`) bu sorundan etkilenmez ve doğru çalışır; bu yüzden
geliştirme için `npm run preview` kullanılmalıdır.

Kalıcı çözüm (yapılmadı): uygulamayı repo kökünde `projectRoot` ile çalıştırıp
`expo-router` `root: "apps/super-admin/app"` vermek veya `src/`'yi paketlenebilir
bir workspace'e taşımak.

## Giriş

`/giris` ekranı e-posta + şifre ile Supabase oturumu açar. Oturum yoksa `/admin`
otomatik `/giris`'e yönlenir. Yetki `profiles.is_admin` ile kontrol edilir
(sunucu tarafı RPC: `ben_admin_miyim()`).

Alanlar boş açılır: örnek e-posta/şifre gösterilmez, hiçbir değer önceden
doldurulmaz.

## Güvenlik

| Katman | Nerede | Davranış |
| --- | --- | --- |
| Oturum kapısı | `AdminOturumKapisi` (kök yerleşim) | 118 admin sayfasının tamamını tek yerden korur; oturum yoksa `/giris` |
| Sekme bağı | `AdminOturumIsareti` (sessionStorage) | Sekme kapanınca oturum düşer; yeniden açılışta zorunlu çıkış |
| Hareketsizlik | `AdminOturumKapisi` | 20 dk işlem yoksa oturum kapanır |
| Mutlak süre | `AdminOturumKapisi` | 8 saat sonra her durumda kapanır |
| Giriş hız sınırı | `AdminGirisKoruma` | 15 dk içinde 5 hatalı deneme → 2 dk kilit, katlanarak 30 dk'ya kadar |
| Kayıt gizliliği | `AdminKayitGuvenligi` | console çıktısı maskelenir; e-posta/şifre/token hiçbir kayda yazılmaz |
| Geri tuşu | `AdminGecmisKalkani` | Tarayıcı geri tuşu panelin dışına (önceki siteye) inemez |
| HTTP başlıkları | `vercel.json` | CSP, HSTS, `X-Frame-Options: DENY`, `noindex`, `no-store` |

Çıkış `AdminOturumuKapat` üzerinden yapılır: oturum geçmişine kaydetmez ve
`signOut({ scope: 'global' })` ile yenileme belirtecini de iptal eder.

**Not:** bu katmanlar arayüzü korur. Asıl yetki sınırı Supabase RLS ve
`is_admin` kontrolüdür; paneldeki hiçbir gizleme sunucu tarafı doğrulamanın
yerine geçmez.

## Dağıtım

Vercel projesi: `litxtechcom/tamuso-super-admin` (ana site `tamuso-web-` projesinden ayrı).

```bash
npm run deploy    # build + dist/vercel.json kopyala + vercel deploy --prod
```

**Prebuilt statik deploy'dur.** Vercel'de build/install çalışmaz
(`vercel.json` içinde `installCommand`/`buildCommand` echo'ya ayarlı). Nedeni: uygulama
paylaşılan `../../src` ve `../../node_modules`'a bağlı; CLI deploy'unda üst dizinler
yüklenmediği için Vercel bu bağımlılıkları göremez. Build yerelde yapılır, sadece
`dist/` gönderilir. Ortam değişkenleri build sırasında `dist/`'e gömülür.

> `vercel deploy dist` **kullanmayın** — CLI dizin argümanını proje adı sanıp `dist`
> adında yeni bir proje açıyor. `deploy.mjs` bunun için `dist/` içinden çalışır.

Yönlendirme: `dist/vercel.json` tüm yolları `/index.html`'e rewrite eder (SPA).
Vercel statik dosyayı rewrite'tan önce kontrol ettiği için `_expo/` varlıkları etkilenmez.

Alan adı: `admin.tamuso.com`. Bu domain daha önce ana site projesine bağlıydı;
personel konsolu ayrı projeye taşındığı için Vercel panelinden
`tamuso-web-` → Settings → Domains → `admin.tamuso.com` → **Move to Project**
ile `tamuso-super-admin`'e taşınmalıdır. DNS kaydı değişmez.

Üretim custom domain'i Vercel'in Standart Koruması'ndan muaftır; gerçek kapı
Supabase personel girişidir (`/giris`). `.vercel.app` adresleri ise SSO'ya yönlenir.

Ek: kök uygulamanın EAS ortamına `EXPO_PUBLIC_ADMIN_WEB_URL=https://admin.tamuso.com`
eklenmeli. Bu değişken tanımlı değilse mobil uygulamada personel girişi görünmez.
