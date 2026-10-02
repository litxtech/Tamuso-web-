# İşlem Hacmi — Final Rapor

Tarih: 2026-09-23  
Durum: Backend production’a uygulandı; client/admin UI eklendi.

## 1. Mevcut payment/IAP mimarisi
- Coin IAP: `tamuso_coin_pack_1..8` → `iap-receipt-verify` → `coin_satin_al_onayla_servis` → `coin_purchases`
- AI Music IAP: `tamuso_ai_music_pack_9..12` → `ai-music-iap-verify` → `ai_music_credit_purchase` → `ai_music_purchases` (CREDITED)
- Stripe aynı credit RPC’lerine bağlanıyor
- İkinci payment sistemi **oluşturulmadı**

## 2. Source of truth
- Projection ledger: `transaction_volume_contributions` (idempotent `unique(source_type, source_id)`)
- Aggregate cache: `user_transaction_volume_summary` (rebuild edilebilir)
- Asıl satın alma kayıtları: `coin_purchases` + `ai_music_purchases`

## 3. Dahil
- Doğrulanmış coin IAP/Stripe (`status=completed`, store/provider ≠ manual/admin)
- Doğrulanmış AI Music IAP/Stripe (`status=CREDITED`)
- Admin adjustment (audit + reason zorunlu)

## 4. Hariç
- welcome_bonus, admin coin/dakika, WELCOME_GRANT (7 dk), manual/admin store
- Failed/cancelled/unverified
- Coin harcaması / hediye (double counting yok)

## 5–8. DB / migration / RLS / RPC
Migration: `supabase/migrations/20260923230000_islem_hacmi_sistemi.sql` (+ remote apply parçaları)

Tablolar: eligibility, tiers, user_settings, contributions, adjustments, summary, audit  
RLS: contributions/adjustments/audit admin; settings own; summary own/admin; public amount yalnız SECURITY DEFINER RPC  
RPC: `get_my_transaction_volume`, `get_public_transaction_volume`, `set_transaction_volume_settings`, `transaction_volume_leaderboard`, admin_*  

Triggers: `coin_purchases` / `ai_music_purchases` → projection (exception yutulur; entitlement bozulmaz)

## 9–12. UI
- Kart: `IslemHacmiKart` — profil + ziyaret
- Detay: `/islem-hacmi`
- Gizlilik: Ayarlar → Gizlilik → İşlem Hacmi + kart menüsü
- Default visibility: **TIER_ONLY**
- Metinler: TR/EN `IslemHacmiMetinleri`

## 13. Admin
- `/admin/islem-hacmi` — özet, uygunluk, recalc, kademe pasif, manuel adjustment
- Hub’da “İşlem Hacmi” modülü

## 14. Refund
- `coin_purchases.status=refunded` → contribution `REFUNDED`, net=0, recalc  
- Store webhook otomasyonu mevcut değil (önceden de yoktu) → **manuel status güncellemesi gerekir**

## 15. Currency
- Canonical: TRY (`amount_try` veya katalog `price_try`)
- FX yok (uydurma kur yok). Schema conversion alanları geleceğe açık.

## 16. Realtime
- Owner: `user_transaction_volume_summary` postgres_changes → yeniden çek
- Ziyaretçi: RLS nedeniyle summary SELECT yok; focus ile yenilenir

## 17. Leaderboard
- RPC var; privacy (PRIVATE hariç, FULL exact / TIER_ONLY label)
- Ayrı UI ekranı **henüz yok** (TEST EDİLEMEDİ / eksik)

## 18. Security (kod incelemesi)
- PRIVATE response’ta `amount_try` gönderilmiyor (RPC branch) — **SQL def incelemesi: OK**
- Client amount injection yok — projection server-only
- Duplicate: unique(source_type, source_id)
- Admin grant / welcome hariç filtreler mevcut
- **Canlı User A→B token ile RPC leak testi: TEST EDİLEMEDİ**

## 19–20. iOS / Android
- Native IAP + UI device smoke: **TEST EDİLEMEDİ** (bu oturumda cihaz koşusu yok)

## 21. Build / lint
- ReadLints (dokunulan dosyalar): temiz
- Tam `tsc` / EAS build: **TEST EDİLEMEDİ**

## 22. Bilinen sınırlamalar
1. Apple/Google refund/chargeback webhook yok
2. Avatar frame/effect tier’dan `ProfilAvatarCerceve`’ye henüz bağlanmadı
3. Tier unlock celebration + push notification yok
4. Leaderboard ekranı yok
5. Partial refund store pipeline yok (şema hazır)
6. Admin kademe eşik UI Android’de sınırlı
7. Gerçek Apple verify hâlâ skip-verify env’e bağlı (mevcut IAP durumu)

## 23. Manuel yapılacaklar
1. Uygulamayı reload → profilde kartı kontrol et
2. Gizlilik: FULL / TIER_ONLY / PRIVATE ile başka hesaptan doğrula
3. Admin → İşlem Hacmi → Recalculate
4. İleride App Store Server Notifications / Play RTDN → `status=refunded`
5. İstenirse leaderboard ekranı + frame wiring + celebration
