# Android gelen arama (Play-uyumlu)

Tamuso 1:1 aramalar için Android'de uygulama kapalıyken:

1. FCM **yüksek öncelik** + kanal `arama` (MAX importance + zil sesi)
2. Heads-up / kilit ekranı bildirimi + ses / titreşim
3. Bildirime dokununca tam ekran **Kabul / Red** Modal + in-app zil
4. `USE_FULL_SCREEN_INTENT` + MainActivity `showWhenLocked` / `turnScreenOn`

## Google Play kuralları

- `USE_FULL_SCREEN_INTENT` **yalnızca gerçek arama** için (incoming_call).
- DM / hediye / kampanya bu kanala **asla** gitmez.
- Play Console → Uygulama kategorisi: Communication / Calling beyanı önerilir.
- Android 14+: tam ekran intent kısıtlı; calling app olarak beyan etmezsen sistem FSI'yi engelleyebilir — heads-up + zil yine çalışır.

## Yeni binary gerekir

`eas build -p android` (kanal sesi + permission + plugin).

## Dosyalar

- `plugins/withAndroidIncomingCall.js`
- `assets/sounds/gelen_arama.wav`
- `src/moduller/gorusme/android/*`
- `supabase/functions/notification-push` → `channel_id: arama`
