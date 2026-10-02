# TAMUSO — 500 CCU Tail Latency Root Cause Analysis

Production READ-only. No code/SQL/compute changes. No 1000+ CCU.

## Kaynaklar

| Run | Zaman (UTC) | Not |
|---|---|---|
| Orijinal ladder 500 | 2026-09-23T16:16:55.758Z → 16:20:57.113Z | Hızlı ramp (~33s) → 500; p99=22960ms |
| Diagnostic 500 | 2026-09-23T16:52:50.494Z → 17:02:05.208Z | Yavaş ramp 100→200→300→400→500 |

---

## 1) Latency bucket dağılımı (Diagnostic run — ölçülmüş)

Toplam request: **72912** (hepsi 2xx, error/429/5xx = 0)

| Bucket | Count | % |
|---|---:|---:|
| <100ms | 65024 | 89.1815% |
| 100–250ms | 1805 | 2.4756% |
| 250–500ms | 810 | 1.1109% |
| 500ms–1s | 1057 | 1.4497% |
| 1–2s | 1162 | 1.5937% |
| 2–5s | 1645 | 2.2561% |
| 5–10s | 867 | 1.1891% |
| 10–20s | 542 | 0.7434% |
| 20–30s | 0 | 0% |
| >30s | 0 | 0% |

Orijinal ladder 500 için ham bucket yok (summary-only). Percentile’dan çıkarım: p50/p90 hâlâ ~76/94ms iken p99=22960 → kuyruk çok ince ama çok uzun; ~%1 civarı request 20s+ bandında.

---

## 2) Zaman / stage serisi (Diagnostic)

| Stage (aktif VU bandı) | reqs | p50 | p95 | p99 | max | slow≥20s |
|---|---:|---:|---:|---:|---:|---:|
| ≤100 | 2468 | 78.4 | 93.4 | 145.2 | 1422 | 0 |
| 101–200 | 5577 | 78.1 | **1272.9** | **3377.9** | 3994 | 0 |
| 201–300 | 9067 | 76.7 | 113.6 | 2394.6 | 3939 | 0 |
| 301–400 | 12803 | 76.5 | 93.5 | 483.9 | 1366 | 0 |
| 401–500 | 42997 | 77.2 | **3299.9** | **10651.6** | **13820.7** | 0 |

Sonuç: Tail **sürekli değil**, yük arttıkça belirginleşiyor. İlk ciddi bozulma **~200 CCU**. En kötü kuyruk **500 hold** sırasında (p99≈10.7s). Yavaş ramp ile orijinaldeki 22–31s bandı **yeniden üretilmedi** (0 adet ≥20s).

---

## 3) Correlated spikes

**Orijinal 500:** Evet — birbirinden bağımsız op’lerin p99’u aynı anda ~24–26s (rooms, feed, profile, messages, leaderboard, follow). Tek RPC suçlanamaz; ortak altyapı kuyruğu.

**Diagnostic:** ≥20s sample yok; ama stage 500’de genel p99 yükselmesi tüm trafikte (waiting-dominant).

COMMON SPIKE: **Evet** (orijinal kanıt güçlü).

---

## 4) Request phase timings

### Orijinal 500 (summary)

| Faz | med | p99 | max |
|---|---:|---:|---:|
| blocked | 0 | 61.9 | 137 |
| connecting | 0 | 27.3 | 51 |
| tls | 0 | 33.9 | 66 |
| sending | ~0 | 0.8 | 2.2 |
| **waiting** | **75.9** | **22960** | **31567** |
| receiving | 0 | 3.7 | 473 |
| duration | 76.4 | 22960 | 31567 |

### Diagnostic 500

| Faz | med | p99 | max |
|---|---:|---:|---:|
| blocked | 0 | 0 | 211 |
| connecting | 0 | 0 | 127 |
| tls | 0 | 0 | 90 |
| sending | 0 | 0.8 | 2.9 |
| **waiting** | **76.6** | **8463** | **13820** |
| receiving | 0 | 3.5 | 46 |
| duration | 77.1 | 8464 | 13821 |

**Yavaş requestlerde zaman: waiting (server/TTFB).** blocked/connecting/TLS lokal bottleneck değil.

---

## 5) Connection reuse (k6)

- `noConnectionReuse: false` (default keep-alive)
- `noVUConnectionReuse: false`
- `batchPerHost: 6`
- Diagnostic run’da blocked/TLS p99≈0 → connection reuse çalışıyor; yapay “her request yeni TLS” yok.

---

## 6) Load generator

- Diagnostic generator CSV sampler bu koşuda örnek yazamadı (kanıt zayıf).
- Orijinal 500 sırasında gözlem: k6 WS ~613MB, host mem ~%67; end-of-test CPU snapshot yanıltıcı (k6 sonrası).
- Client phase kanıtı waiting-dominant + 0 error → generator CPU saturasyonu tipik semptomu değil.

LOAD GENERATOR BOTTLENECK: **Kanıt yetersiz** (muhtemelen hayır; asıl sinyal server wait).

---

## 7) Supabase Dashboard — bakılacak zaman aralıkları

**100:** `2026-09-23T16:12:19.841Z` → `2026-09-23T16:16:09.019Z`  
**500 orijinal:** `2026-09-23T16:16:55.758Z` → `2026-09-23T16:20:57.113Z`  
**500 diagnostic:** `2026-09-23T16:52:50.494Z` → `2026-09-23T17:02:05.208Z`

Kontrol listesi:
- Database CPU / RAM
- Database connections (özellikle max’e yaklaşma)
- Pooler connections (Supavisor/PgBouncer)
- Disk IO / IOPS
- Cache hit ratio
- Slow queries / long-running queries
- Locks

Canlı okuma (bu oturumda): **`max_connections = 60`**. PostgREST idle bağlantıları gözlendi (~11). Dashboard metrikleri otomatik çekilemedi → CPU/RAM/IO: **N/A**.

READ-ONLY SQL: `load-tests/sql/readonly-tail-diagnostics.sql`

---

## 8) Query static review (değişiklik yok)

| RPC | Risk notu |
|---|---|
| `durum_akisi` | SECURITY DEFINER; satır başı `takip_icerik_gorunur_mu` + `EXISTS status_likes`; `jsonb_agg` |
| `durum_akisi_takip` | follows→posts join; engel kontrolü |
| `mesaj_konularini_getir` | Thread başına correlated `COUNT(*)` unread → N+1 SQL |
| `liderlik_siralamasi_listele` | snapshot + index (`leaderboard_lookup_idx`) — genelde hafif |
| `takipcileri_listele` | satır başı `takip_kart_json()` |

Index’ler related tablolarda mevcut (`status_posts_feed_idx`, follows idx, rooms/live live idx, vb.).  
**Ama:** tüm bağımsız op’lerin aynı anda ~25s beklemesi tek bir yavaş SQL’den çok **ortak connection/pool kuyruğuna** uyuyor.

QUERY BOTTLENECK (tek başına 25s ortak kuyruk): **Kanıt yetersiz** (maliyet var, ortak spike’ı açıklamıyor).

---

## 9) Control test sonucu

Yavaş ramp diagnostic:
- Tail latency **~200 CCU**’da başlıyor (p99 3.4s)
- **500**’de p99 10.7s / max 13.8s
- **20s+ request: 0**
- Hızlı ramp’li orijinal koşu kuyruğu **daha şiddetli** (p99 22.9s) → ani VU basışı kuyruğu büyütüyor

---

## 10) SON RAPOR KARTI

```
TAIL LATENCY BAŞLANGIÇ CCU: ~200 (diagnostic stage bandı)
TAIL LATENCY BAŞLANGIÇ ZAMANI: diagnostic ~200 VU aşaması; orijinalde hızlı ramp sonrası 500 hold içinde (ham timeseries yok)

20+ SECOND REQUEST COUNT: orijinal ≈ ~1% bandı (p99=22960 → ~398/39758 tahmini); diagnostic = 0
20+ SECOND REQUEST %: orijinal ~1%; diagnostic = 0%

YAVAŞ REQUESTLERDE (orijinal p99≈duration):
  blocked: ~0–62ms (p99)
  connecting: ~0–27ms
  TLS: ~0–34ms
  sending: <1ms
  waiting: ≈ duration (22960ms p99)   ← ASIL
  receiving: ~0–4ms

COMMON SPIKE: Evet
LOAD GENERATOR BOTTLENECK: Kanıt yetersiz (muhtemel hayır)
DATABASE BOTTLENECK: Kanıt yetersiz (Dashboard N/A; CPU/IO doğrulanmadı)
CONNECTION/POOL BOTTLENECK: Evet (en güçlü hipotez)
NETWORK BOTTLENECK: Hayır (TLS/connect ihmal; waiting dominant)
QUERY BOTTLENECK: Kanıt yetersiz (ortak 25s spike’ı açıklamaz; bazı RPC’ler pahalı olabilir)

EN GÜÇLÜ KANIT:
  1) http_req_waiting ≈ http_req_duration (blocked/TLS değil)
  2) Birbirinden bağımsız op’lerde eşzamanlı ~25s p99 (orijinal)
  3) max_connections=60 + yüksek eşzamanlı PostgREST/DB talep
  4) Yavaş ramp ile 20s+ kayboldu / kuyruk yumuşadı → kuyruk/pool davranışı

SONUÇ:
  ~25s tail, tek bir RPC hatası değil; istemci keep-alive de suçlu değil.
  Süre sunucu tarafında TTFB (waiting) olarak geçiyor; en tutarlı açıklama
  DB/PostgREST connection pool doygunluğu ve kuyruk beklemesi.
  compute yükselt / index / kod değişikliği yapmadan önce Dashboard’da
  aynı zaman aralığında connections + pooler + CPU grafiklerini doğrula.
```
