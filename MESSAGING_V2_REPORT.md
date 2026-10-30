# === TAMUSO MESSAGING V2 ===

Tarih: 2026-09-24  
Audit: `MESSAGING_V2_AUDIT.md`

## MEVCUT SİSTEM
- Message table: `direct_messages` (+ V2 kolonları: `edited_at`, `edit_version`, `view_once*`, `music_track_id`, `media_meta`, `link_*`)
- Conversation table: `message_threads` + `message_thread_members` (+ `conversation_pins`, `conversation_member_settings`)
- Realtime: `useMesajKanali` (INSERT/UPDATE/DELETE + peer_okundu)
- Storage: `dm-media` (audio MIME eklendi)
- State management: screen-local + optimistic `client_id` merge
- Local persistence: drafts + outbox AsyncStorage (userId izole)

## REPLY
- Implemented: Evet (RPC `reply_to_id` same-thread validation; composer preview; bubble quote)
- Swipe: Evet (`Swipeable` + haptic)
- Original jump: Evet (`mesajlari_hedef_cevresinde_getir` + scroll + ~1.6s highlight)
- Deleted original: Evet (`messageUnavailable` i18n; FK SET NULL)
- Tested: **TEST EDİLEMEDİ** (cihaz/E2E yok)

## EDIT
- Implemented: Evet (`mesaj_duzenle` + history table)
- Edit window: `messaging_system_config.message_edit_window_minutes` = 15
- Server authorization: sender_id === auth.uid()
- History: `message_edit_history` (client SELECT yok)
- Tested: **TEST EDİLEMEDİ**

## PIN
- Implemented: Evet (`conversation_pins` + bar + long-press)
- Multiple pins: Evet
- Realtime: pin list refresh on open; soft-delete trigger cleans pins
- Tested: **TEST EDİLEMEDİ**

## VOICE
- Recording: Evet (`expo-audio` + hold mic)
- Lock: Evet (yukarı kaydır)
- Preview: kısmi (lock sonrası send/delete; ayrı preview player sınırlı)
- Waveform: media_meta varsa; yoksa deterministic fallback kartta
- Seek / Playback speed: kartta 1×/1.5×/2× + seek
- Transparent glass card: Evet (`MesajKartTokenlari`)
- Audio session: `MesajSesYoneticisi` singleton; LiveKit conflict derin testi yok
- Tested: **TEST EDİLEMEDİ**

## MUSIC
- Picker: Evet (`MesajMuzikSecimSheet`)
- Music card: Evet
- Playback: merkezi ses yöneticisi
- Permissions: `mesaj_muzik_erisim_var_mi` / alıcı erişim RPC
- Tested: **TEST EDİLEMEDİ**

## MUTE
- Durations: 1h / 8h / 1d / 1w / forever (config dakikaları)
- Server-side: `conversation_member_settings.muted_until`
- Push worker: `bildirim_kuyruga_ekle` mute check (messages category)
- Tested: **TEST EDİLEMEDİ**

## VIEW ONCE
- Image / Video: Evet
- Atomic consume: `mesaj_view_once_ac` FOR UPDATE + race guard
- Multi-device protection: server atomic
- Storage cleanup: `mesaj_view_once_cleanup_batch` (retention config); cron bağlama **TEST EDİLEMEDİ**
- Screenshot: platform garantisi yok (söz verilmedi)
- Tested: **TEST EDİLEMEDİ**

## OFFLINE
- Local outbox: Evet (`MesajOutboxDepolama` + `MesajGonderVeyaKuyruk`)
- Persistence / Restart: AsyncStorage userId keyed
- Retry: exponential backoff
- Idempotency: `client_id` unique (sender_id, client_id)
- Media offline: text kuyruk bağlı; media/voice offline URI outbox **kısmi / UNVERIFIED**
- App restart: outbox flush on session bind
- Tested: **TEST EDİLEMEDİ**

## MESSAGE STATUS
- Queued / Sending / Sent / Failed: Evet
- Delivered: **yok** (sahte teslim yok; gerçek ACK mimarisi yok)
- Read: peer `last_read_at` (mevcut)
- Tested: **TEST EDİLEMEDİ**

## LINK PREVIEW
- Server fetch: Edge `link-preview` (deployed)
- SSRF protection: private IP / localhost / metadata / redirect re-validate
- Cache: `link_preview_cache` TTL
- Metadata: OG title/description/image/site_name
- Glass card: Evet
- Tested: **TEST EDİLEMEDİ** (SSRF unit suite yok)

## SECURITY
- RLS: member SELECT; writes via security definer RPCs
- Block enforcement: `mesaj_gonder` path
- Storage authorization: own-prefix policies (bucket public read — view-once için iyileştirme adayı)
- Rate limits: mevcut platform limitlerine bağlı (yeni DM rate limit eklenmedi)
- Moderation: report `dm_message` devam; edit history moderator-only

## i18n
- TR / EN / ES / AR: `mesajV2` (~70 keys) + long-press labels
- RTL: fiziksel bubble hiza + swipe left-actions; audio timeline ters çevrilmedi

## BUILD
- TypeScript: kısmi kontrol (tam `tsc` bu oturumda tamamlanmadı)
- Lint: **TEST EDİLEMEDİ**
- Tests: otomatik suite yok
- iOS / Android: **TEST EDİLEMEDİ**

## MIGRATIONS
- `supabase/migrations/20260924160952_messaging_v2_core.sql` (production’a Management API ile uygulandı)
- Edge: `supabase/functions/link-preview`

## CHANGED FILES (özet)
- `MESSAGING_V2_AUDIT.md`, `MESSAGING_V2_REPORT.md`
- Migration + link-preview function
- `src/moduller/mesajlasma/**` (RPC wrappers, outbox, audio, cards, composer hooks)
- `app/mesaj/[id].tsx`
- Feature flags + admin etiketleri
- i18n tr/en/es/ar

## UNVERIFIED
- E2E tüm senaryolar (reply/edit/pin/voice/music/mute/view-once/offline/link SSRF)
- LiveKit / Bluetooth / interruption
- View-once storage cron job schedule
- Offline media (image/video/voice local URI) full path
- DELIVERED (bilinçli olarak implement edilmedi)
- Screenshot mitigation platform limitleri
- Agency `thread_kind` CHECK çakışması (pre-existing, V2 dışı)

## Screenshot / platform notu
iOS ve Android ekran görüntüsü / ekran kaydını uygulamadan %100 engellemek mümkün değil. Kullanıcıya “alınamaz” garantisi verilmedi.
