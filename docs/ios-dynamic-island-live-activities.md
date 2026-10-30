# Tamuso — iOS Dynamic Island, Live Activities, CallKit, PushKit

Production integration for ongoing sessions only (not social push spam).

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **CallKit** | Native incoming/outgoing call UI + call lifecycle |
| **PushKit** | VoIP push delivery → must report to CallKit immediately |
| **ActivityKit / expo-widgets** | Dynamic Island + Lock Screen Live Activities |
| **LiveKit** | Media (unchanged) |
| **Supabase** | Auth, `direct_calls`, room/live state, device tokens |
| **expo-notifications** | Normal APNs/Expo push (messages, follows, gifts) — separate from VoIP |

## Requirements

- **Not Expo Go** — custom development / EAS production build required
- iOS deployment target ≥ 16.4 (already in `expo-build-properties`)
- Bundle ID unchanged: `com.litxtech.muta`
- New native binary after this change (`eas build -p ios`)

## What shows on Dynamic Island / Live Activity

| Scenario | Compact | When |
|----------|---------|------|
| 1:1 audio call | 📞 name + timer | After LiveKit **connected** |
| 1:1 video call | 📹 name + timer | After LiveKit **connected** |
| Voice room | 🎧 room + count | On join |
| Live stream | 🔴 host LIVE + viewers | Host goes live |
| Video upload | 📤 % | Hikaye video upload |
| AI Music | 🎵 % | Job queued/processing |
| Tournament | 🏆 | Flag off by default |

**Never** on Dynamic Island: DMs, follows, likes, gifts, coin balance, earnings, promos.

## JS API

```ts
import {
  TamusoActivityStart,
  TamusoActivityUpdate,
  TamusoActivityEnd,
  TamusoActivityIsSupported,
} from '../src/moduller/tamuso-activity';
```

Integration helpers live under `src/moduller/tamuso-activity/entegrasyon/`.

CallKit:

```ts
import {
  TamusoCallKitBootstrap,
  TamusoCallKitReportIncoming,
  TamusoCallKitMarkConnected,
  TamusoCallKitEnd,
} from '../src/moduller/tamuso-activity/callkit/TamusoCallKitBridge';
```

## Call flow

```
PushKit VoIP push
  → CallKit reportIncomingCall
  → User Accept
  → App → GorusmeCevapla (server auth)
  → LiveKit MedyaOdasiBaglan
  → CallKit reportConnected + Live Activity start
```

Do **not** mark CallKit connected until LiveKit media succeeds.

## Feature flags

| Key | Default (local) |
|-----|-----------------|
| `ios_dynamic_island_enabled` | true |
| `live_activity_enabled` | true |
| `callkit_enabled` | true |
| `voice_room_live_activity_enabled` | true |
| `live_stream_activity_enabled` | true |
| `upload_activity_enabled` | true |
| `ai_music_activity_enabled` | true |
| `tournament_activity_enabled` | false |

If `callkit_enabled` is false → existing in-app incoming Modal + normal push fallback.

## Deep links

- `muta://call/{callId}` / `tamuso://call/{callId}`
- `muta://room/{roomId}`
- `muta://live/{liveId}`
- `muta://music/{jobId}`
- `muta://upload/{uploadId}`
- `muta://tournament/{id}`

## EAS / native build

1. Apply migration `20261006140000_voip_token_ve_live_activity_flags.sql`
2. `npx expo prebuild --platform ios --clean` (CNG; `ios/` is generated)
3. Apple Developer:
   - Push Notifications (existing)
   - **VoIP Services** / PushKit capability on App ID
   - Live Activities supported via `NSSupportsLiveActivities` + expo-widgets extension
4. `eas build --platform ios --profile production` (or development)
5. On first PushKit run, VoIP token is stored via `cihaz_push_token_kaydet` with `p_push_provider = 'voip'`

### Server VoIP push (separate from Expo Push)

Send APNs **voip** push with `apns-push-type: voip` and `apns-topic: com.litxtech.muta.voip` to the device's VoIP token. Payload example:

```json
{
  "callId": "uuid",
  "callerName": "Mert",
  "hasVideo": false,
  "callType": "audio"
}
```

**Secrets stay server-side only** (never in the RN bundle).

### Live Activity remote updates

With `expo-widgets` `enablePushNotifications: true`, use ActivityKit push tokens (`getPushToken` / push-to-start). Topic suffix `.push-type.liveactivity`. See [Expo Widgets docs](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/).

## Update throttling

Client throttles ActivityKit updates (voice room ~20s, live ~25s, count deltas). Prefer timer labels over per-second updates.

## Privacy

Lock Screen / Island must not show coin, diamond, earnings, payments, private messages, or phone numbers.

## Testing checklist

Physical device required for CallKit / PushKit / Dynamic Island.

| Case | Expect |
|------|--------|
| Voice room join/leave | Activity start/end |
| Live host start/end | Activity start/end |
| Connected 1:1 call | Island after media up |
| Incoming CallKit accept | Opens `/gorusme/{id}` |
| App terminated + VoIP | CallKit UI → accept → LiveKit |
| Dynamic Island unsupported phone | Lock Screen Live Activity still OK |
| Expo Go | Soft no-op (no crash) |

## Files

- `modules/tamuso-callkit/` — CallKit + PushKit Expo module
- `plugins/withTamusoCallKit.js` — voip + Live Activity Info.plist
- `src/moduller/tamuso-activity/` — Activity engine + integrations
- `src/moduller/tamuso-activity/ui/TamusoLiveActivity.tsx` — Island + Lock Screen UI (`'widget'`)

## Known limitations

- VoIP push **server sender** must be wired to Edge Function / APNs (token storage is ready; outbound VoIP sender is a follow-up if not already present).
- Full terminated-app CallKit path needs a production-signed build with VoIP entitlement.
- Fruit Wheel / SİS SPIN spins intentionally have **no** Live Activity.
