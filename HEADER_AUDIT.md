# HEADER AUDIT — Expo Router Screens

> Generated for repository `C:\\Users\\ilkse\\muta`  
> Scope: all `app/**/*.{tsx,ts}` route files (**158** files including layouts)  
> Method: Glob + Grep + Read of core header primitives and every route pattern.

---

## 1. Root cause — Preferences (`app/ayarlar/index.tsx`) header bug

### Symptoms

- Large empty gap under the status bar
- Back chevron visually disconnected from the title
- Title appears stuck / biased left (not grouped with back)
- Subtitle misaligned relative to title / back
- Feels like **double SafeArea**

### What Preferences actually renders

```tsx
<Screen edges={['top']}>           // SafeAreaView -> pads insets.top
  <ModulHataSiniri>                // no layout / no inset
    <EkranBasligi
      title={...}
      subtitle={...}               // two-line absolute center block
      fallbackHref="/profil-ayarlar"
    />
    <ScrollView>...</ScrollView>
  </ModulHataSiniri>
</Screen>
```

Root stack (`app/_layout.tsx`) sets `headerShown: false` globally — there is **no** native header. Safe area is 100% the app's job via `Screen`.

### Root cause (compound)

**Primary: `EkranBasligi` absolute-center layout + subtitle + `Screen` top SafeArea stacking.**

1. **Top gap / “double SafeArea” perception**  
   - `Screen` wraps children in `SafeAreaView` with `edges=['top']` -> applies `paddingTop ≈ insets.top` (notch/status bar).  
   - `EkranBasligi` then adds its own `paddingTop: BoslukTokenlari.xs` (4) + `minHeight: 48` chrome.  
   - Preferences does **not** literally nest two `SafeAreaView`s, but the stacked inset + header chrome reads as a double safe-area gap.  
   - True double-inset *does* exist elsewhere (e.g. wallet sheet `paddingTop: Math.max(insets.top, 12)` inside `Screen edges={['top']}`).

2. **Back disconnected from title (by design of `EkranBasligi`)**  
   - Title/subtitle live in `position: 'absolute'` box (`left: 52, right: 52`) centered on the full width.  
   - Back is a separate flex side slot. Title is **never** adjacent to the chevron (Material-style). For Preferences this reads as a broken header, not iOS-native polish.

3. **Title “stuck left” + subtitle misaligned**  
   - Absolute `merkez` does **not** contribute to parent height; row stays `minHeight: 48` even with subtitle.  
   - Title (`lineHeight: 22`) + subtitle (`lineHeight: 14` + `marginTop: 2`) ≈ 38px crammed into a 48px absolute overlay while the back button is a 40×40 control — vertical rhythm breaks.  
   - Optical weight of the back control + fixed 52px gutters makes the centered title block look left-biased, especially with a subtitle.  
   - Spreading `TipografiTokenlari.h2` (fontSize 18 / lineHeight 24) then overriding to 17/22 adds fragile stacking.

4. **Not caused by** `ModulHataSiniri` (passthrough), native Stack header, or a second `SafeAreaProvider` on this screen. Expo Router already provides root `SafeAreaProvider`; `Screen` is the consumer.

### Same pattern (will share the bug when subtitle is set)

- `app/profil-ayarlar/index.tsx` — same `Screen edges={['top']}` + `EkranBasligi` + subtitle
- `app/ayarlar/gorunum.tsx` — same
- `AjansAltEkranKabuk` — same shell for all ajans sub-screens
- Any `EkranBasligi` call with `subtitle=`

---

## 2. Architecture summary

| Layer | Behavior |
|-------|----------|
| `app/_layout.tsx` | `Stack screenOptions.headerShown: false` — **zero native headers** |
| `app/(tabs)/_layout.tsx` | `Tabs screenOptions.headerShown: false`; tabBar hidden (custom `YuzenTabBar`) |
| `app/(auth)/_layout.tsx` | `headerShown: false` |
| `src/components/Screen.tsx` | `SafeAreaView` default edges `['top','bottom']`; most stack screens override to `['top']` |
| `src/components/EkranBasligi.tsx` | Shared custom header: back + absolute-centered title/subtitle + optional right |
| Immersive routes | `presentation: 'fullScreenModal'` + manual `insets.top` or `edges=[]` |

### Counts by class (all 158 route files)

- **A) Native/Expo Router header:** 3
- **B) Custom header (EkranBasligi or other):** 134
- **C) Headerless:** 7
- **D) Full-screen special:** 6
- **E) Modal/sheet:** 0 (primary class)
- **F) Immersive (live/voice/call/game):** 8

> Note: `presentation: 'fullScreenModal'` routes (`canli/[id]`, `durum/[id]`, `room/[id]`, `gorusme/[id]`) are counted under **F** (they are also modal). Class **A** is only the three `_layout.tsx` files (they *disable* native headers). No screen enables `headerShown: true`.

---

## 3. Full route matrix

| Route | Header Type | Component | SafeArea notes | Notes |
|-------|-------------|-----------|----------------|-------|
| `_layout.tsx` | A) Native/Expo Router header | Root Stack layout | n/a (layout) | headerShown:false globally |
| `(auth)/_layout.tsx` | A) Native/Expo Router header | Auth Stack layout | n/a (layout) | headerShown:false globally |
| `(auth)/dogrula-kod.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `(auth)/forgot-password.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `(auth)/login.tsx` | D) Full-screen special | login hero (manual insets) | manual useSafeAreaInsets | manual insets.top for overlay |
| `(auth)/register.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `(auth)/reset-password.tsx` | C) Headerless | Screen only | SafeArea top+bottom via Screen default | edges default |
| `(tabs)/_layout.tsx` | A) Native/Expo Router header | Tabs layout | n/a (layout) | headerShown:false globally |
| `(tabs)/cihazlar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `(tabs)/create.tsx` | C) Headerless | tab (no EkranBasligi) | SafeArea top via Screen | edges:top |
| `(tabs)/durum.tsx` | C) Headerless | tab (no EkranBasligi) | SafeArea top via Screen | edges:top |
| `(tabs)/index.tsx` | C) Headerless | tab (no EkranBasligi) | edges=[] — full-bleed / manual insets | edges:[] |
| `(tabs)/messages.tsx` | C) Headerless | tab (no EkranBasligi) | SafeArea top via Screen | edges:top |
| `(tabs)/profile.tsx` | D) Full-screen special | cover full-bleed (edges=[]) | edges=[] — full-bleed / manual insets | manual insets.top for overlay |
| `(tabs)/rooms.tsx` | C) Headerless | tab (no EkranBasligi) | SafeArea top via Screen | edges:top |
| `(tabs)/wallet.tsx` | B) Custom header (EkranBasligi or other) | custom baslikBar | SafeArea top via Screen | Screen top; DOUBLE-INSET RISK |
| `admin/ai-muzik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `admin/ajanslar/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/ajanslar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/bannerlar/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/bannerlar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/bannerlar/otomatik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/bannerlar/yeni.tsx` | B) Custom header (EkranBasligi or other) | re-export bannerlar/[id]->EkranBasligi | same as [id] | export { default } from "./[id]" |
| `admin/ciro.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/cocuk-koruma.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/coin-paketleri.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/coin.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/cuzdan-yonetimi.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `admin/destek/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/destek/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/ekonomi.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/fikirler/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/fikirler/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/fikirler/kategoriler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/finans.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/giris-lobisi.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `admin/gorusme-guvenlik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/hamburger-menu.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/iletisim.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/islem-hacmi/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kaskad-animasyon-lab.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/kaskad-yonetim.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/kayit-alanlari.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kisiler-aramalar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/komisyonlar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kullanicilar/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kullanicilar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kyc/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/kyc/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/moderasyon/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/moderasyon/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/muzik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `admin/odalar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/oyun-algoritma/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `admin/oyun-test.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `admin/oyunlar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/ozellikler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/paylasim-linkleri.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/platform-guvenlik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/politikalar/[kod].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/politikalar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/rehber.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/satin-alma-itirazlar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/sehir-secim.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/sehirler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/takas/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `admin/ulke-ligi/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ai-muzik/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `ai-muzik/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top |
| `ai-muzik/islemler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `ai-muzik/kutuphane.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top |
| `ai-muzik/pasaport/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom) |
| `ajans/[id]/analitik.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/ayarlar.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/basvurular.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/canli.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/davetler.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/destek.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/duyurular.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/ekipler.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/etkinlikler.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/gorevler.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/guvenlik.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/index.tsx` | B) Custom header (EkranBasligi or other) | custom geri Pressable | SafeArea top via Screen | Screen top |
| `ajans/[id]/islemler.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/program.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/uyeler/[userId].tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/[id]/uyeler/index.tsx` | B) Custom header (EkranBasligi or other) | AjansAltEkranKabuk->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper); has subtitle |
| `ajans/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ajans/profil/[id]/index.tsx` | D) Full-screen special | cover full-bleed (edges=[]) | edges=[] — full-bleed / manual insets | manual insets.top for overlay |
| `ajans/profil/[id]/uyeler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ajans/teklifler.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `ajans/uye/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ajans/yonetim/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ayarlar/dil.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ayarlar/gizlilik.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ayarlar/gorunum.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ayarlar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle; BROKEN EXAMPLE — Preferences header bug |
| `ayarlar/kisiler-aramalar.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ayarlar/satin-alma-gecmisi.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `bildir/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `bildirim-ayarlari/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `bildirimler/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top |
| `canli/[id].tsx` | F) Immersive (live/voice/call/game) | Screen koyuSahne + custom chrome | SafeArea top via Screen | presentation:fullScreenModal |
| `canli/index.tsx` | B) Custom header (EkranBasligi or other) | CanliYayinMarkaBasligi / custom | edges=[] — full-bleed / manual insets | Screen [] |
| `cuzdan/takas.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `destek/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `durum/[id].tsx` | F) Immersive (live/voice/call/game) | Screen/custom immersive | edges=[] — full-bleed / manual insets | presentation:fullScreenModal; manual insets.top |
| `durum/duzenle.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `durum/olustur.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `duyuru/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `engellenen-kullanicilar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `fikirler/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `fikirler/benim.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `fikirler/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `fikirler/olustur.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `gorusme/[id].tsx` | F) Immersive (live/voice/call/game) | immersive custom (insets) | - | presentation:fullScreenModal |
| `guvenlik/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `hesap-sil/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `host/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `index.tsx` | D) Full-screen special | redirect/splash | - | — |
| `islem-hacmi/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `kesfet.tsx` | C) Headerless | Screen + in-page chrome (no back header) | SafeArea top via Screen | edges top; discover feed |
| `kisiler/index.tsx` | B) Custom header (EkranBasligi or other) | KisilerKesifEkrani->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper) |
| `kullanici/[id].tsx` | D) Full-screen special | cover full-bleed (edges=[]) | edges=[] — full-bleed / manual insets | manual insets.top for overlay |
| `kyc/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `lobi/[id].tsx` | F) Immersive (live/voice/call/game) | immersive custom (insets) | manual useSafeAreaInsets | manual insets.top |
| `mesaj/[id].tsx` | B) Custom header (EkranBasligi or other) | custom chat header | SafeArea top via Screen | Screen top,bottom |
| `oyun/kaskad.tsx` | F) Immersive (live/voice/call/game) | immersive custom (insets) | - | — |
| `oyun/nox.tsx` | F) Immersive (live/voice/call/game) | immersive custom (insets) | - | — |
| `oyun/zeus.tsx` | F) Immersive (live/voice/call/game) | immersive custom (insets) | - | — |
| `paylas/[kod].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `paylasim/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `pk/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `platform/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `politika/[kod].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `politika/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `profil-ayarlar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `profil-duzenle/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `raporlarim/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `raporlarim/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top+bottom via Screen default | Screen DEFAULT edges (top+bottom); has subtitle |
| `room/[id].tsx` | F) Immersive (live/voice/call/game) | Screen koyuSahne + custom chrome | SafeArea top via Screen | presentation:fullScreenModal; manual insets.top |
| `sehir/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sehir/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sehir/lig.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sehir/savas.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sehir/secim/[id].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sehir/secim/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `sertifikasyon/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `siralamalar/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `takip/istekler.tsx` | B) Custom header (EkranBasligi or other) | TakipIstekleriEkrani->EkranBasligi | SafeArea top via module Screen | Screen edges top (via wrapper) |
| `takip/ortak.tsx` | B) Custom header (EkranBasligi or other) | OrtakTakipcilerEkrani->EkranBasligi | SafeArea top via module Screen | thin route re-export |
| `takip/takip-edilenler.tsx` | B) Custom header (EkranBasligi or other) | TakipListeEkrani->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper) |
| `takip/takipciler.tsx` | B) Custom header (EkranBasligi or other) | TakipListeEkrani->EkranBasligi | SafeArea top via wrapper Screen | Screen edges top (via wrapper) |
| `ulke/[code].tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `ulke/index.tsx` | B) Custom header (EkranBasligi or other) | EkranBasligi | SafeArea top via Screen | Screen edges top; has subtitle |
| `webview.tsx` | D) Full-screen special | WebView chrome | - | — |

---

## 4. All `EkranBasligi` call sites

Direct JSX in `app/` plus shared wrappers that routes mount.

| File | Line | Snippet |
|------|------|--------|
| `(auth)/dogrula-kod.tsx` | 149 | `<EkranBasligi` |
| `(auth)/forgot-password.tsx` | 42 | `<EkranBasligi` |
| `(auth)/register.tsx` | 266 | `<EkranBasligi` |
| `(tabs)/cihazlar.tsx` | 100 | `<EkranBasligi` |
| `admin/ai-muzik.tsx` | 167 | `<EkranBasligi title="AI Müzik" fallbackHref="/admin" />` |
| `admin/ajanslar/[id].tsx` | 374 | `<EkranBasligi` |
| `admin/ajanslar/index.tsx` | 232 | `<EkranBasligi` |
| `admin/bannerlar/[id].tsx` | 359 | `<EkranBasligi` |
| `admin/bannerlar/index.tsx` | 92 | `<EkranBasligi` |
| `admin/bannerlar/otomatik.tsx` | 67 | `<EkranBasligi` |
| `admin/ciro.tsx` | 119 | `<EkranBasligi` |
| `admin/cocuk-koruma.tsx` | 94 | `<EkranBasligi title="Çocuk Koruma" fallbackHref={'/admin' as any} />` |
| `admin/cocuk-koruma.tsx` | 102 | `<EkranBasligi` |
| `admin/coin-paketleri.tsx` | 144 | `<EkranBasligi` |
| `admin/coin.tsx` | 25 | `<EkranBasligi` |
| `admin/cuzdan-yonetimi.tsx` | 186 | `<EkranBasligi title="Cüzdan yönetimi" fallbackHref="/admin" />` |
| `admin/cuzdan-yonetimi.tsx` | 194 | `<EkranBasligi title="Cüzdan yönetimi" fallbackHref="/admin" />` |
| `admin/destek/[id].tsx` | 136 | `<EkranBasligi` |
| `admin/destek/index.tsx` | 190 | `<EkranBasligi` |
| `admin/ekonomi.tsx` | 276 | `<EkranBasligi` |
| `admin/fikirler/[id].tsx` | 220 | `<EkranBasligi` |
| `admin/fikirler/index.tsx` | 88 | `<EkranBasligi` |
| `admin/fikirler/kategoriler.tsx` | 81 | `<EkranBasligi` |
| `admin/finans.tsx` | 96 | `<EkranBasligi` |
| `admin/giris-lobisi.tsx` | 76 | `<EkranBasligi title="Giriş lobisi" fallbackHref="/admin" />` |
| `admin/giris-lobisi.tsx` | 175 | `<EkranBasligi title="Giriş lobisi" fallbackHref="/admin" />` |
| `admin/gorusme-guvenlik.tsx` | 93 | `<EkranBasligi` |
| `admin/hamburger-menu.tsx` | 184 | `<EkranBasligi` |
| `admin/iletisim.tsx` | 86 | `<EkranBasligi` |
| `admin/index.tsx` | 449 | `<EkranBasligi` |
| `admin/islem-hacmi/index.tsx` | 289 | `<EkranBasligi` |
| `admin/kaskad-animasyon-lab.tsx` | 110 | `<EkranBasligi` |
| `admin/kaskad-yonetim.tsx` | 489 | `<EkranBasligi` |
| `admin/kayit-alanlari.tsx` | 87 | `<EkranBasligi title="Kayıt alanları" fallbackHref="/admin" />` |
| `admin/kayit-alanlari.tsx` | 180 | `<EkranBasligi` |
| `admin/kisiler-aramalar.tsx` | 108 | `<EkranBasligi` |
| `admin/komisyonlar.tsx` | 233 | `<EkranBasligi` |
| `admin/kullanicilar/[id].tsx` | 288 | `<EkranBasligi title={ad} subtitle="Kullanıcı dosyası" />` |
| `admin/kullanicilar/index.tsx` | 170 | `<EkranBasligi` |
| `admin/kyc/[id].tsx` | 186 | `<EkranBasligi` |
| `admin/kyc/index.tsx` | 71 | `<EkranBasligi` |
| `admin/moderasyon/[id].tsx` | 282 | `<EkranBasligi` |
| `admin/moderasyon/index.tsx` | 117 | `<EkranBasligi` |
| `admin/muzik.tsx` | 35 | `<EkranBasligi title="Müzik Merkezi" fallbackHref="/admin" />` |
| `admin/odalar.tsx` | 484 | `<EkranBasligi` |
| `admin/oyun-algoritma/index.tsx` | 153 | `<EkranBasligi title="Oyun algoritması" onBack={() => router.back()} />` |
| `admin/oyun-algoritma/index.tsx` | 161 | `<EkranBasligi` |
| `admin/oyun-test.tsx` | 62 | `<EkranBasligi` |
| `admin/oyunlar.tsx` | 206 | `<EkranBasligi` |
| `admin/ozellikler.tsx` | 121 | `<EkranBasligi` |
| `admin/paylasim-linkleri.tsx` | 127 | `<EkranBasligi` |
| `admin/platform-guvenlik.tsx` | 187 | `<EkranBasligi title="Platform güvenliği" fallbackHref={'/admin' as any} />` |
| `admin/platform-guvenlik.tsx` | 195 | `<EkranBasligi` |
| `admin/politikalar/[kod].tsx` | 184 | `<EkranBasligi` |
| `admin/politikalar/index.tsx` | 83 | `<EkranBasligi` |
| `admin/rehber.tsx` | 189 | `<EkranBasligi` |
| `admin/satin-alma-itirazlar.tsx` | 162 | `<EkranBasligi` |
| `admin/sehir-secim.tsx` | 179 | `<EkranBasligi` |
| `admin/sehirler.tsx` | 65 | `<EkranBasligi` |
| `admin/takas/index.tsx` | 174 | `<EkranBasligi` |
| `admin/ulke-ligi/index.tsx` | 73 | `<EkranBasligi title={t('ulkeLigi.adminBaslik')} fallbackHref="/admin" />` |
| `admin/ulke-ligi/index.tsx` | 81 | `<EkranBasligi` |
| `ai-muzik/[id].tsx` | 166 | `<EkranBasligi title={t('aiMuzik.parca')} fallbackHref="/ai-muzik/kutuphane" />` |
| `ai-muzik/[id].tsx` | 188 | `<EkranBasligi` |
| `ai-muzik/index.tsx` | 367 | `<EkranBasligi title={t('aiMuzik.baslik')} fallbackHref="/" />` |
| `ai-muzik/index.tsx` | 391 | `<EkranBasligi` |
| `ai-muzik/islemler.tsx` | 58 | `<EkranBasligi title={t('aiMuzik.islemler')} fallbackHref={'/ai-muzik' as Href} />` |
| `ai-muzik/kutuphane.tsx` | 198 | `<EkranBasligi title={t('aiMuzik.kutuphane')} fallbackHref={'/ai-muzik' as Href} />` |
| `ai-muzik/pasaport/[id].tsx` | 57 | `<EkranBasligi` |
| `ajans/index.tsx` | 183 | `<EkranBasligi` |
| `ajans/index.tsx` | 200 | `<EkranBasligi` |
| `ajans/profil/[id]/uyeler.tsx` | 97 | `<EkranBasligi` |
| `ajans/teklifler.tsx` | 189 | `<EkranBasligi` |
| `ajans/uye/index.tsx` | 61 | `<EkranBasligi` |
| `ajans/yonetim/index.tsx` | 100 | `<EkranBasligi` |
| `ayarlar/dil.tsx` | 116 | `<EkranBasligi` |
| `ayarlar/gizlilik.tsx` | 95 | `<EkranBasligi` |
| `ayarlar/gorunum.tsx` | 23 | `<EkranBasligi` |
| `ayarlar/index.tsx` | 80 | `<EkranBasligi` |
| `ayarlar/kisiler-aramalar.tsx` | 170 | `<EkranBasligi` |
| `ayarlar/satin-alma-gecmisi.tsx` | 221 | `<EkranBasligi` |
| `bildir/index.tsx` | 128 | `<EkranBasligi` |
| `bildirim-ayarlari/index.tsx` | 81 | `<EkranBasligi` |
| `bildirimler/index.tsx` | 282 | `<EkranBasligi` |
| `cuzdan/takas.tsx` | 565 | `<EkranBasligi title={t('takas.baslik')} subtitle={t('takas.kontrolEdiliyor')} />` |
| `cuzdan/takas.tsx` | 573 | `<EkranBasligi` |
| `destek/index.tsx` | 188 | `<EkranBasligi title={t('destek.canliBaslik')} fallbackHref="/(tabs)" />` |
| `destek/index.tsx` | 214 | `<EkranBasligi` |
| `durum/duzenle.tsx` | 99 | `<EkranBasligi` |
| `durum/olustur.tsx` | 154 | `<EkranBasligi` |
| `duyuru/index.tsx` | 49 | `<EkranBasligi` |
| `engellenen-kullanicilar/index.tsx` | 82 | `<EkranBasligi` |
| `fikirler/[id].tsx` | 85 | `<EkranBasligi` |
| `fikirler/benim.tsx` | 64 | `<EkranBasligi` |
| `fikirler/index.tsx` | 63 | `<EkranBasligi` |
| `fikirler/olustur.tsx` | 153 | `<EkranBasligi` |
| `guvenlik/index.tsx` | 202 | `<EkranBasligi` |
| `hesap-sil/index.tsx` | 64 | `<EkranBasligi` |
| `hesap-sil/index.tsx` | 126 | `<EkranBasligi` |
| `host/index.tsx` | 150 | `<EkranBasligi title={t('host.baslik')} subtitle={t('host.alt')} />` |
| `islem-hacmi/index.tsx` | 89 | `<EkranBasligi` |
| `kyc/index.tsx` | 214 | `<EkranBasligi title={t('kyc.baslik')} subtitle={t('kyc.altBaslik')} />` |
| `paylas/[kod].tsx` | 75 | `<EkranBasligi` |
| `paylasim/index.tsx` | 105 | `<EkranBasligi` |
| `pk/index.tsx` | 122 | `<EkranBasligi` |
| `platform/index.tsx` | 180 | `<EkranBasligi` |
| `politika/[kod].tsx` | 51 | `<EkranBasligi` |
| `politika/index.tsx` | 48 | `<EkranBasligi` |
| `profil-ayarlar/index.tsx` | 62 | `<EkranBasligi` |
| `profil-duzenle/index.tsx` | 443 | `<EkranBasligi` |
| `raporlarim/[id].tsx` | 84 | `<EkranBasligi` |
| `raporlarim/index.tsx` | 67 | `<EkranBasligi` |
| `sehir/[id].tsx` | 130 | `<EkranBasligi` |
| `sehir/index.tsx` | 129 | `<EkranBasligi` |
| `sehir/lig.tsx` | 50 | `<EkranBasligi` |
| `sehir/savas.tsx` | 74 | `<EkranBasligi` |
| `sehir/secim/[id].tsx` | 196 | `<EkranBasligi` |
| `sehir/secim/index.tsx` | 64 | `<EkranBasligi` |
| `sertifikasyon/index.tsx` | 270 | `<EkranBasligi` |
| `siralamalar/index.tsx` | 114 | `<EkranBasligi title={t('siralamalar.baslik')} subtitle={altBaslik} />` |
| `src/.../AjansAltEkranKabuk.tsx (used by 15 ajans routes)` | 65 | `<EkranBasligi` |
| `src/.../KisilerKesifEkrani.tsx` | 243 | `<EkranBasligi title={t('kisiler.baslik')} fallbackHref="/(tabs)" />` |
| `src/.../KisilerKesifEkrani.tsx` | 262 | `<EkranBasligi` |
| `src/.../OrtakTakipcilerEkrani.tsx` | 66 | `<EkranBasligi` |
| `src/.../TakipIstekleriEkrani.tsx` | 35 | `<EkranBasligi` |
| `src/.../TakipListeEkrani.tsx (takipciler/takip-edilenler)` | 201 | `<EkranBasligi title={title} />` |
| `ulke/[code].tsx` | 120 | `<EkranBasligi title={t('ulkeLigi.baslik')} fallbackHref="/ulke" />` |
| `ulke/[code].tsx` | 145 | `<EkranBasligi` |
| `ulke/index.tsx` | 85 | `<EkranBasligi title={t('ulkeLigi.baslik')} fallbackHref="/(tabs)" />` |
| `ulke/index.tsx` | 98 | `<EkranBasligi` |

Also via wrappers (not duplicated per route above): `AjansAltEkranKabuk.tsx`, `TakipListeEkrani.tsx`, `TakipIstekleriEkrani.tsx`, `OrtakTakipcilerEkrani.tsx`, `KisilerKesifEkrani.tsx`.

**Totals:** 129+ direct app JSX call sites (includes loading/error duplicate branches); plus wrapper components used by thin routes.

---

## 5. Magic-number `paddingTop` / header insets

| Location | Values / risk |
|----------|---------------|
| `EkranBasligi.tsx` | paddingTop: BoslukTokenlari.xs (4); minHeight: 48; left/right: 52; backBtn 40×40 |
| `(auth)/login.tsx` | paddingTop: insets.top + 12 (manual; no Screen SafeArea) |
| `(tabs)/wallet.tsx sheet` | paddingTop: Math.max(insets.top, 12) ON TOP OF Screen edges top -> DOUBLE |
| `lobi/[id].tsx` | paddingTop: insets.top / insets.top + 6 (manual immersive) |
| `durum/[id].tsx` | paddingTop: insets.top + 8 (immersive; edges=[]) |
| `cuzdan/takas.tsx scanner` | paddingTop: insets.top + 8 |
| `ajans/profil/[id]/index.tsx` | paddingTop: insets.top + 40; overlayTop = insets.top + 8 |
| `kullanici/[id].tsx` | paddingTop: ustInset (derived from insets.top) |
| `ai-muzik/kutuphane.tsx` | paddingTop: 48 (empty state) |
| `(tabs)/durum.tsx` | paddingTop: 48 (empty); paddingTop: BoslukTokenlari.sm |
| `admin/moderasyon/[id].tsx` | paddingTop: 100 |
| `bildirimler/index.tsx` | paddingTop: 12 |
| `profil-duzenle/index.tsx` | paddingTop: 14 |
| `mesaj/[id].tsx` | paddingTop: BoslukTokenlari.md on custom header area |
| `room/[id].tsx` | paddingTop: 4 / 8 on overlays (Screen already edges top) |

### Additional `paddingTop` hits in `app/` (broader)

```
(auth)/dogrula-kod.tsx — BoslukTokenlari.xl
(auth)/forgot-password.tsx — BoslukTokenlari.lg
(auth)/login.tsx — insets.top + 12
(tabs)/durum.tsx — sm / 48
(tabs)/index.tsx — BoslukTokenlari.sm
(tabs)/profile.tsx — md / lg
(tabs)/rooms.tsx — 0 / lg
(tabs)/wallet.tsx — Math.max(insets.top, 12) ⚠ double
admin/moderasyon/[id].tsx — 100
admin/oyunlar.tsx — 10
ai-muzik/kutuphane.tsx — 48
ajans/profil/[id]/index.tsx — insets.top + 40
ayarlar/gizlilik.tsx — BoslukTokenlari.sm (section, not header)
bildirimler/index.tsx — 12
cuzdan/takas.tsx — insets.top + 8
durum/[id].tsx — insets.top + 8
kesfet.tsx — xs / md / lg
kullanici/[id].tsx — ustInset
lobi/[id].tsx — insets.top / +6
mesaj/[id].tsx — BoslukTokenlari.md
profil-duzenle/index.tsx — 14
room/[id].tsx — 4 / 8
```

---

## 6. Recommended fix plan

### P0 — Fix `EkranBasligi` (fixes Preferences + all subtitle screens)

1. **Drop absolute centering** for the default/Preferences layout; use a single row:  
   `[Back][Title+Subtitle flex column][Right]` with title `textAlign: 'left'` (or start) next to back — Material / settings pattern.  
   Keep absolute-center as an optional `align="center"` prop if some screens need it.
2. **Let the row grow with subtitle** — remove reliance on `minHeight: 48` + absolute overlay; use `alignItems: 'center'` on the row so back stays vertically aligned with the text block.
3. **Remove extra `paddingTop: BoslukTokenlari.xs`** when parent is already `Screen edges={['top']}` (or accept `edges` prop / `inset="none"` on `EkranBasligi`).
4. **Stop spreading `TipografiTokenlari.h2` then overriding** — define a dedicated `headerTitle` / `headerSubtitle` token.

### P1 — SafeArea contract

1. Document rule: **either** `Screen` SafeArea edge **or** manual `insets.top`, never both.  
2. Audit double-inset offenders: wallet sheet, any `paddingTop: insets.top` under `edges={['top']}`.
3. Prefer `edges={['top']}` on stack screens; use `edges={[]}` only for cover/immersive.
4. Avoid `<Screen>` default (top+bottom) on stack pages that also pad `insets.bottom` manually (`kyc`, `teklifler`).

### P2 — Consistency

1. Migrate one-off custom headers (`wallet`, `mesaj/[id]`, `ajans/[id]/index`) to `EkranBasligi` after P0.  
2. Keep immersive (F) on manual insets — do not force `EkranBasligi`.  
3. Add a Storybook/dev screen: Preferences header with/without subtitle, RTL, long title.

### P3 — Preferences-specific smoke test

- Open `/ayarlar` from Profil -> Tercihler  
- Verify: back adjacent to title, subtitle under title left-aligned, no oversized top gap, scroll content starts immediately under header  
- Compare with `/profil-ayarlar` and `/ayarlar/gorunum`

---

## 7. Class legend quick ref

- **A** — Native Expo Router / React Navigation header (here: layouts only; all `headerShown: false`)
- **B** — Custom header (`EkranBasligi`, `AjansAltEkranKabuk`, or bespoke back+title)
- **C** — Headerless (tabs/feeds without titled back chrome)
- **D** — Full-screen special (login, covers, webview, splash)
- **E** — Modal/sheet presentation (counted under F when immersive)
- **F** — Immersive live/voice/call/game/status viewer

---

## 8. IMPLEMENTATION STATUS (2026-09-25)

### Root fix shipped

`EkranBasligi` rewritten:

- Default `alignment='start'`: Back + Title/Subtitle as one visual group (Preferences pattern)
- Optional `alignment='center'` for screens that need true center title (equal side slots)
- Touch target 44x44 via `HeaderTokenlari`
- No second SafeArea inset in header (Screen edges remains single source)
- Subtitle under title, same content alignment
- RTL via I18nManager row mirror + `YonluIkon` (no language === 'ar' hack)
- Props: title, subtitle, showBack, onBack, right, alignment, fallbackHref, border, transparent

### Design tokens

`HeaderTokenlari` added to `BoslukVeYaricapTokenlari.ts` and exported from `TasarimSistemi`.

### Content gutter alignment

Preferences, Görünüm, Profil-ayarlar, AjansAltEkranKabuk content padding aligned to `HeaderTokenlari.horizontal` + `contentGap`.

### Wallet

Custom header chrome aligned to HeaderTokenlari touch/padding. PageSheet modal keeps its own `insets.top` (separate window — not double with Screen).

### Migration model

~100+ screens already use `EkranBasligi` — they inherit the fix automatically. No per-screen margin patches.

### Remaining custom headers (not forced)

- `(tabs)/wallet` — dynamic wallet UI config title/icon (bespoke, token-aligned)
- `mesaj/[id]`, `kullanici/[id]`, `ajans/[id]/index`, `lobi/[id]` — thread/profile chrome
- Immersive F: room, canli, gorusme, oyun, durum viewer — excluded by design

### Verified by code review

- `app/ayarlar/index.tsx` (Preferences) — primary target
- `app/ayarlar/gorunum.tsx`
- `app/profil-ayarlar/index.tsx`
- `AjansAltEkranKabuk` consumers
- `EkranBasligi.tsx` + `HeaderTokenlari`
- Device UI / RTL / Dynamic Island: **TEST EDİLEMEDİ** (code-level only this session)

