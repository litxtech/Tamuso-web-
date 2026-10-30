# TAMUSO MESSAGING V2 — MEVCUT SİSTEM AUDIT

> Tarih: 2026-09-24  
> Kapsam: DM (`message_threads` / `direct_messages`) — oda/canlı/destek sohbetleri hariç  
> Kural: Mevcut çalışan sistemi duplicate etme; V2 mevcut architecture üzerine entegre edilecek.

---

## Current message schema

**Tablo:** `public.direct_messages`  
**Kaynak:** `supabase/migrations/005_faz4_sosyal.sql` + `032_dm_anlik_medya_arsiv.sql` + `20260921170000_durum_dm_paylasim.sql`

| Kolon | Durum | V2 notu |
|-------|--------|---------|
| `id` uuid PK | ✅ | |
| `thread_id` → `message_threads` | ✅ | conversation_id karşılığı |
| `sender_id` → `profiles` | ✅ | |
| `body` text | ✅ | text içeriği |
| `message_type` | ✅ CHECK | `text\|image\|video\|voice\|emoji\|gift\|system\|shared_post` |
| `media_url` | ✅ | |
| `reply_to_id` → self FK ON DELETE SET NULL | ⚠️ **ölü** | RPC hiç yazmıyor; prod 0 satır |
| `client_id` uuid | ✅ | idempotency; **isim `client_message_id` değil** |
| `media_mime`, `media_width`, `media_height` | ⚠️ hiç doldurulmuyor | |
| `ref_id` | ✅ | `shared_post` → `status_posts.id` |
| `created_at` | ✅ | |
| `deleted_at` | ✅ | soft-delete |
| `edited_at` / `edit_version` | ❌ yok | |
| `view_once` | ❌ yok | |
| `music_track_id` | ❌ yok | |
| `delivery_status` | ❌ yok | READ = peer `last_read_at` karşılaştırması |

**İlişkili:** `direct_message_hidden` (per-user hide), `message_shared_posts`.

**UNIQUE:** `direct_messages_client_id_uq` → `(sender_id, client_id) WHERE client_id IS NOT NULL`

---

## Current conversation schema

**`message_threads`:** `id`, `created_at`, `updated_at`, `last_message_at`, `last_message_preview`, `thread_kind` (`dm`/`mahkeme`/`agency_channel` — canlıda çakışan CHECK’ler var), `title`, `closed_at`, `closed_by`, `peer_agency_id`, `agency_channel_kind`

**`message_thread_members`:** PK `(thread_id, user_id)`, `joined_at`, `last_read_at`, `archived_at`, `deleted_at`, `clear_before`

**Mute / pin:** DM seviyesinde **yok**.

---

## Current realtime architecture

- Publication: `direct_messages` + `message_threads` (`032_dm_anlik_medya_arsiv.sql`)
- Client: `src/moduller/mesajlasma/gercek-zamanli/useMesajKanali.ts`
  - Thread: `direct_messages` filter `thread_id` + broadcast `peer_okundu`
  - Inbox: `message_threads` + DM INSERT
  - Badge: `MesajOkunmamisSaglayici`
- Cleanup: channel remove on unmount (mevcut pattern)

---

## Current send flow

```
UI (app/mesaj/[id].tsx)
  → optimistic temp row (client_id, _localStatus=sending)
  → MesajGonder.ts → rpc('mesaj_gonder')
  → PushWorkerTetikle → Edge notification-push
  → mergeMesaj by client_id / id
```

**SSOT:** `MesajGonder` → `mesaj_gonder` (security definer)  
**Gates:** `messages_enabled`, guest ban, membership, block (`kullanicilar_engelli_mi`), mahkeme `closed_at`, `client_id` idempotency return

**Son RPC imza:** `(p_thread_id, p_body, p_message_type, p_media_url, p_client_id)` — **reply_to yok**

---

## Current read flow

1. `MesajThreadOkundu` → `mesaj_thread_okundu` → member `last_read_at = now()`
2. Sender: `MesajPeerLastReadGet` → peer `last_read_at`
3. Bubble: `created_at <= peerLastReadAt` ⇒ “görüldü” (çift tik / mint)
4. Realtime: `MesajPeerOkunduYayinla` broadcast

**DELIVERED:** ayrı acknowledgement **yok** — sahte “teslim edildi” gösterilmemeli; mevcut model SENT + READ.

---

## Current media flow

1. `DmMedyasiSecVeYukle` → Storage bucket `dm-media` (`public=true`, path = `auth.uid()/...`)
2. MIME: image/jpeg|png|webp|heic, video/mp4|quicktime|webm — **audio MIME yok**
3. `MesajGonder({ messageType: image|video, mediaUrl })`

Voice tipi CHECK’te var ama upload + UI yok.

---

## Current local state

| Parça | Durum |
|-------|--------|
| Optimistic send | ✅ `client_id` + `_localStatus` |
| Drafts | ✅ `MesajTaslakDepolama` AsyncStorage `@muta/mesaj_taslaklar_v1:{userId}` — sadece text |
| Message history cache | ❌ |
| Offline outbox | ❌ |
| Network gate (`ag-baglantisi`) | ❌ mesajlaşmada kullanılmıyor |

---

## Current storage

- Bucket: `dm-media` (public read; write own prefix + upload_ban check)
- Client: signed/public URL path saklanıyor `media_url`
- Voice/music için ayrı bucket yok

---

## Current indexes

- `direct_messages_thread_idx` `(thread_id, created_at DESC)`
- `direct_messages_client_id_uq` unique partial
- `direct_messages_ref_id_idx` (shared_post)
- Member indexes on `user_id` / `deleted_at`
- **Yok:** reply lookup hot index (FK yeterli olabilir), pin, mute

---

## Current RLS

| Tablo | Client write | SELECT |
|-------|--------------|--------|
| `direct_messages` | yok (RPC) | thread member |
| `message_threads` | yok (RPC) | member |
| `message_thread_members` | limited | own |
| `direct_message_hidden` | own ALL | own |

Tüm mutasyonlar security definer RPC üzerinden.

---

## Current moderation hooks

- Report: `content_type = 'dm_message'` → `kullanici_bildir` snapshot (body, type, media_url, sender, thread)
- Admin: `admin_rapor_icerik_kaldir` → soft-delete DM
- Block: `mesaj_gonder` / inbox / `mesaj_thread_engelli_mi`
- Room/live UGC text filter **DM’de yok**

---

## Client map (reuse — do not duplicate)

| Rol | Path |
|-----|------|
| Main chat | `app/mesaj/[id].tsx` |
| Inbox | `app/(tabs)/messages.tsx` |
| Bubble | `MesajBaloncugu.tsx` |
| Send SSOT | `MesajGonder.ts` |
| Fetch | `MesajlariGetir.ts` |
| Realtime | `useMesajKanali.ts` |
| Media upload | `DmMedyasiYukle.ts` |
| Drafts | `depolama/MesajTaslak*` |
| i18n | `mesajlar.*`, `mesajSohbet.*` (tr/en/es/ar) |
| Audio stack | `expo-audio` (AI Music) — yeni lib ekleme |
| AI Music | `src/moduller/ai-muzik/` — DM share yok |
| Feature flags | `OzellikBayragiAnahtarlari` + `messages_enabled` |
| Network | `src/moduller/ag-baglantisi/` |

---

## Integration plan (V2 — adapt, don’t fork)

1. **Reuse** `client_id` (client_message_id semantic) — yeni kolon ekleme.
2. **Activate** `reply_to_id` via extended `mesaj_gonder` + same-thread server check.
3. **Add** columns: `edited_at`, `edit_version`, `view_once`, `view_once_consumed_at`, `view_once_consumed_by`, `music_track_id`, media meta JSON where needed.
4. **Add** tables: `conversation_pins`, `conversation_member_settings` (mute), `message_edit_history`, `link_preview_cache` (+ optional `message_link_previews`).
5. **Extend** `message_type` CHECK: `music` (+ keep existing).
6. **Extend** `dm-media` MIME for audio (m4a/aac/mp4 audio).
7. **RPCs:** `mesaj_duzenle`, pin/unpin, mute, view-once consume, link-preview fetch edge, music share path.
8. **Feature flags:** `message_reply_enabled`, `message_edit_enabled`, `message_pin_enabled`, `voice_message_enabled`, `music_message_enabled`, `conversation_mute_enabled`, `view_once_enabled`, `offline_outbox_enabled` (kill), `link_preview_enabled`.
9. **Config:** `message_edit_window_minutes` (platform_settings / app_config pattern).
10. **Push:** mute check in enqueue/worker; localized type previews.
11. **Client:** outbox + draft reply_to; glass card design system extension of existing bubble; central audio manager sharing expo-audio with AI Music.

---

## Gaps summary

| Feature | Schema | RPC | UI |
|---------|--------|-----|-----|
| Reply | kolon var, unused | yok | yok |
| Edit | yok | yok | yok |
| Pin | yok | yok | yok |
| Voice | type var | send teorik | yok + no audio MIME |
| Music | yok | yok | yok |
| Mute | yok | yok | yok |
| View once | yok | yok | yok |
| Offline outbox | — | idempotency var | kısmi optimistic only |
| Status | peer read | — | sent/failed/seen |
| Link preview | yok | yok | yok |

---

## Risks / smells (pre-existing)

1. `thread_kind` çift CHECK → `agency_channel` insert bloklu (V2 dışı ama dokümante).
2. `dm-media` public bucket — V2 view-once için signed/consume policy şart.
3. Preview string’leri RPC içinde TR hardcode (`📷 Fotoğraf`) — i18n client-side; server preview localization ayrı iş.
4. Chat pagination API var, UI tek sayfa (60) — reply jump için around-id fetch gerekir.
