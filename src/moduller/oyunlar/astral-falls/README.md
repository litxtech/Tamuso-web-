# Astral Falls entegrasyon

Referans: `imports/astral-falls-reference/` (`replit/astral-falls` branch).
Görünüm: WebView içinde referans UI (RelicSymbol SVG, CSS, animasyon, ses, kontroller).

## Yayın

1. Migration: `supabase/migrations/20260926140000_astral_falls.sql`
2. Edge Function: `supabase functions deploy astral-falls-spin`
3. Web player yeniden derleme (görünüm değişince):

```bash
cd src/moduller/oyunlar/astral-falls/web-player
npm install
npm run build
node -e "const fs=require('fs');const h=fs.readFileSync('../../../../../assets/oyunlar/astral-falls/dist/index.html','utf8');fs.writeFileSync('AstralFallsHtmlBundle.ts','export const ASTRAL_FALLS_HTML = '+JSON.stringify(h)+';\\n');"
```

Rota: `/oyun/astral-falls`

Demo RNG / tarayıcı kredisi üretimde yok; tur sonuçları `astral-falls-spin` Edge Function + settle RPC.
