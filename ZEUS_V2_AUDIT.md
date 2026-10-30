# ZEUS V2 AUDIT

Tarih: 2026-09-25  
Kapsam: Zeus client + `zeus-spin` + asset pipeline (kod incelemesi)

## Current grid architecture

- **Boyut:** 6 sütun × 5 satır (`GRID_COLUMNS` / `GRID_ROWS`)
- **Model:** `GridMatrix` = `GridCell[][]`; hücre: `instanceId`, `type` (`ZeusSymbolType`), `row`, `column`, opsiyonel `multiplierValue`
- **Render:** `GameBoard` → reel kolonları → `ReelSymbol` (Reanimated `translateY`) → `SymbolRenderer`
- **Keys:** reel `reel-${col}`, slot `slot-${col}-${r}`, sembol **`cell.instanceId`** (doğru — index key yok)

## Current symbol source

- Canonical ID’ler (client ↔ server aynı camelCase):  
  `blueDiamond`, `greenEmerald`, `purpleGem`, `redRuby`, `goldCrown`, `goldRing`, `goldGoblet`, `lyre`, `pegasus`, `zeusScatter`, `multiplierOrb`
- Alan adı: Zeus `cell.type` (Kaskad’daki `symbolType` değil)

## Current asset source

- **Lokal Metro `require()`** — `assets/zeus/symbols/*.png` (+ character / background / UI)
- CDN / `uri` / spin sırasında network fetch **yok**
- Registry: `assets/VisualAssets.ts` → `SymbolImages`

## Current animation architecture

- **Reanimated** only (`translateY` drop, scale/opacity win/destroy)
- Server sonucu: `zeus-spin` → `simulateZeusSpin` → `PlaybackEngine.play` fazları:
  `LANDING → EVALUATE → WIN_HIGHLIGHT → EXPLOSION → CASCADE → … → ROUND_END`
- Drop mesafeleri: `DusmeMesafeleri` + cap `MAX_ENTRY_DROP_CELLS = 3`
- Kolon stagger: **yok** (`dropDelayMs={0}`)

## Current state management

- `ZeusEkrani`: phase, grid, matched/destroying/dropping, bet, wallet balance, bonus, panel win
- Logical result: `ZeusSpinResult` (server authoritative)
- Visual phase: `PlaybackEngine` → `setPhase` / `setGrid` / `setDropping`

## Current server spin flow

1. Client `requestZeusSpin` → Edge `zeus-spin`
2. JWT + `game_aktif_config('zeus')` + seed
3. `_shared/zeus/math` `simulateZeusSpin`
4. RPC `zeus_settle_spin` (balance)
5. `{ result }` dönüş

## Current preload system

- `preloadZeusAssets` → `expo-asset` `Asset.fromModule().downloadAsync()`
- `ZeusOnYukleme` + GPU warm Image
- **BUG:** preload `.catch` içinde `visualsReady = true`
- **BUG:** `ZeusEkrani` 360ms timeout ile `imagesWarmed` zorla true → asset hazır olmadan START mümkün

## Current cache

- Module-level `visualCache` promise + `visualsReady` flag
- Metro bundled assets (production); expo-asset decode cache (dev)

## Current failure fallback

- `SymbolRenderer`: source yoksa text label
- Asıl sorun: source **var** ama `mixBlendMode: 'screen'` + doygun `TILE_BG` → ekranda **renkli kutu** hissi (PNG alpha ile screen blend)

## Current FPS bottlenecks

- Her phase’de çoklu `setState` (grid + matched + dropping + phase)
- Büyük PNG decode (768×768) cold start’ta
- `ZeusKarakter` absolute katman + board aynı `flex:1` stage — layout boşluğu / yeniden ölçüm

---

## ROOT CAUSES (özet)

| Semptom | Kök neden |
|---------|-----------|
| Renkli placeholder kutular | `TILE_BG` dolu karo + `mixBlendMode:'screen'` (Kaskad `GercekciSembolKabugu` kullanıyor) |
| Sembol “geç geliyor / boş hücre” | Preload false-ready + destroy→drop timing; asset network değil |
| LoadBundleFromServer | Zeus asset path’i değil — Expo/Metro **JS bundle** packager bağlantısı (dev). Production APK’da bu path yok |
| Üst boşluk | `stageRow` flex:1 + Zeus karakter absolute + board `maxHeight` kırpması |
| Balance çift | `ZeusBaslik` + `GameFooter` ikisi de balance gösteriyor |
| Version UI | `NET KAROLAR · v1.1.3` kullanıcıya açık |

## Fix sırası (bu PR)

1. SymbolRenderer → GercekciSembolKabugu, screen blend kaldır  
2. Preload fail ≠ ready; loading/error UI  
3. Header sadeleştir (balance tek yer, version gizle)  
4. Layout sıkılaştır (board yukarı)  
5. Cascade süreleri hafif hızlandır  
6. Unknown symbol telemetry + fallback  
