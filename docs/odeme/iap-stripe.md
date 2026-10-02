# IAP + Stripe (satış)

## Kural
- **iOS dijital coin** → yalnızca App Store IAP (`expo-iap`)
- **Android** → Play Billing IAP
- **Web / izinli kanal** → Stripe Checkout (`stripe_enabled`)

## Takas ≠ IAP cash-out (Apple / Google)

MUTA PAY **coin takası** mağaza dışı “satın al → nakde çevir” değildir:

- Coin **yükleme** (IAP / Play Billing) ile **takas / ajans anlaşması** ayrı ekranlardır; aynı CTA’da birleştirilmez.
- UI dili: *katalog değeri*, *anlaşma tutarı*, *MUTA PAY takas* — “nakit bozdur / para çek / kazanç” kullanılmaz.
- Katalog: `1 coin = 0,10 ₺` · anlaşmada satıcı **%40**, platform **%60** (sunucuda kilitlenir).
- Mağazadan yüklenen coinler **14 gün** soğutulur; bu süre dolmadan takasa giremez (iade penceresi).
- `refunded` satın alma kaydı olan kullanıcıda yeni takas **engellenir**; iade / chargeback / sahte dekont hesap askı / kapatma sebebidir.
- Ödemeler ilk tamamlanan anlaşmadan itibaren ayın **01–15** ve **15–31** pencerelerinde yapılır.
- Elmas çekimi (host kazancı) bu modelden ayrıdır.

Rakip cent/dolar bandı + kilitli katalog oranları: [`coin-ekonomi-benchmark.md`](./coin-ekonomi-benchmark.md).

## App Store Connect ürünleri (Consumable)
Bundle: `com.litxtech.muta`

| Product ID | Örnek |
|------------|--------|
| `com.litxtech.muta.coins_60` | Starter |
| `com.litxtech.muta.coins_300` | Popular |
| `com.litxtech.muta.coins_1280` | VIP |
| `com.litxtech.muta.coins_6480` | Legend |

Aynı ID'leri Play Console'da da oluştur. Güncel TRY SKU’lar için `CoinPaketHesap.ts` / `coin_packages` tablosuna bak.

## SQL
`supabase/migrations/011_iap_stripe.sql`

Takas TL alanları + IAP soğutma:
`supabase/migrations/20260918120054_coin_takas_paylasim_tl_iap_sogutma.sql`

```sql
update public.feature_flags set enabled = true where key in ('iap_enabled');
-- Stripe web icin:
-- update public.feature_flags set enabled = true where key = 'stripe_enabled';
```

## Edge secrets
```
IAP_SKIP_VERIFY=1          # sandbox; prod'da kaldir + Apple/Google verify ekle
STRIPE_SECRET_KEY=sk_live_...   # Dashboard → Edge Functions → Secrets (asla mobil .env)
STRIPE_WEBHOOK_SECRET=whsec_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # yalnız publishable; Payment Sheet için
```

Deploy:
```
npx supabase functions deploy iap-receipt-verify --project-ref vdkqrqtrftzhbtquzked
npx supabase functions deploy stripe-checkout --project-ref vdkqrqtrftzhbtquzked
npx supabase functions deploy stripe-webhook --project-ref vdkqrqtrftzhbtquzked
```

Stripe webhook URL:
`https://vdkqrqtrftzhbtquzked.supabase.co/functions/v1/stripe-webhook`
Event: `checkout.session.completed`

## AI müzik dakikası
- iOS/Android: App Store / Play IAP → `ai-music-iap-verify` → anında dakika
- Web / IAP yok + `stripe_enabled`: Stripe Checkout → webhook → `ai_music_stripe_satin_al_onayla`
- Satın alma geçmişi: Ayarlar → `satin_alma_gecmisim` (coin + AI müzik)

## Mobil
- `expo-iap` plugin (`app.config.ts`)
- `@stripe/stripe-react-native` — uygulama içi PaymentSheet (alttan kart; yeni native build gerekir)
- Yedek: `StripeCheckoutWebSheet` — Checkout URL uygulama içi WebView bottom sheet (harici tarayıcı yok)
- Cüzdan → `CoinPaketiSatinAl`
- AI Müzik → `AiMuzikPaketSatinAl` + alttan sheet
- Development build gerekir (Expo Go IAP / Stripe native yok)
