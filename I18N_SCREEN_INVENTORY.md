# I18N_SCREEN_INVENTORY

> Generated: 2026-09-24T11:26:02.290Z
> Source: live repository scan (`scripts/i18n-inventory.mjs`). Not guessed.

## Summary

| Metric | Count |
|--------|------:|
| App route screens (tsx excl layouts) | 148 |
| User-facing screens | 99 |
| Admin screens | 49 |
| Tabs | 8 |
| Named Sheet/Modal/Overlay files (src) | 21 |
| Panel/Sheet-like components | 45 |
| `<Modal` JSX hits (non-admin src) | 42 |
| `Alert.alert` calls (all) | 908 |
| `Alert.alert` non-admin | 545 |
| `Alert.alert` admin | 363 |

### Translation status (heuristic)

| Status | User | Admin |
|--------|-----:|------:|
| NOT_TRANSLATED | 36 | 49 |
| PARTIAL (useCeviri but TR literals remain) | 49 | 0 |
| LIKELY_TRANSLATED | 14 | 0 |

**Status meaning:** `LIKELY_TRANSLATED` = file imports `useCeviri` and has few/no Turkish string literals. Does **not** prove EN/ES/AR completeness or that child module components are translated. Most PARTIAL screens only wired titles/headers.

## Tabs

- `app/(tabs)/cihazlar.tsx`
- `app/(tabs)/create.tsx`
- `app/(tabs)/durum.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/messages.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/rooms.tsx`
- `app/(tabs)/wallet.tsx`

## AUTH (7)

- `app/(auth)/dogrula-kod.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/(auth)/forgot-password.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/(auth)/login.tsx` — **PARTIAL** (useCeviri) · TR literals≈3
- `app/(auth)/register.tsx` — **PARTIAL** (useCeviri) · TR literals≈2
- `app/(auth)/reset-password.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/politika/[kod].tsx` — **NOT_TRANSLATED** · TR literals≈2
- `app/politika/index.tsx` — **LIKELY_TRANSLATED** (useCeviri)

## HOME (6)

- `app/(tabs)/durum.tsx` — **PARTIAL** (useCeviri) · TR literals≈4
- `app/(tabs)/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈14
- `app/durum/[id].tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/durum/duzenle.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/durum/olustur.tsx` — **PARTIAL** (useCeviri) · TR literals≈3
- `app/kesfet.tsx` — **PARTIAL** (useCeviri) · TR literals≈2

## PROFILE (13)

- `app/(tabs)/profile.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/ajans/profil/[id]/index.tsx` — **NOT_TRANSLATED** · TR literals≈24
- `app/ajans/profil/[id]/uyeler.tsx` — **NOT_TRANSLATED** · TR literals≈6
- `app/engellenen-kullanicilar/index.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/hesap-sil/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈26
- `app/islem-hacmi/index.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/kullanici/[id].tsx` — **NOT_TRANSLATED** · TR literals≈21
- `app/profil-ayarlar/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈2
- `app/profil-duzenle/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈4
- `app/takip/istekler.tsx` — **NOT_TRANSLATED**
- `app/takip/ortak.tsx` — **NOT_TRANSLATED**
- `app/takip/takip-edilenler.tsx` — **NOT_TRANSLATED**
- `app/takip/takipciler.tsx` — **NOT_TRANSLATED**

## MESSAGING (2)

- `app/(tabs)/messages.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/mesaj/[id].tsx` — **NOT_TRANSLATED** · TR literals≈49

## VOICE (4)

- `app/(tabs)/create.tsx` — **PARTIAL** (useCeviri) · TR literals≈2
- `app/(tabs)/rooms.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/lobi/[id].tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/room/[id].tsx` — **NOT_TRANSLATED** · TR literals≈118

## LIVE (3)

- `app/ajans/[id]/canli.tsx` — **NOT_TRANSLATED** · TR literals≈9
- `app/canli/[id].tsx` — **NOT_TRANSLATED** · TR literals≈17
- `app/canli/index.tsx` — **NOT_TRANSLATED** · TR literals≈26

## CALLS (1)

- `app/gorusme/[id].tsx` — **NOT_TRANSLATED** · TR literals≈5

## PEOPLE (2)

- `app/ayarlar/kisiler-aramalar.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/kisiler/index.tsx` — **NOT_TRANSLATED**

## WALLET (3)

- `app/(tabs)/wallet.tsx` — **PARTIAL** (useCeviri) · TR literals≈4
- `app/ayarlar/satin-alma-gecmisi.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/cuzdan/takas.tsx` — **PARTIAL** (useCeviri) · TR literals≈65

## AI_MUSIC (5)

- `app/ai-muzik/[id].tsx` — **PARTIAL** (useCeviri) · TR literals≈47
- `app/ai-muzik/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈59
- `app/ai-muzik/islemler.tsx` — **PARTIAL** (useCeviri) · TR literals≈6
- `app/ai-muzik/kutuphane.tsx` — **PARTIAL** (useCeviri) · TR literals≈26
- `app/ai-muzik/pasaport/[id].tsx` — **PARTIAL** (useCeviri) · TR literals≈8

## AGENCY (19)

- `app/ajans/[id]/analitik.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/ajans/[id]/ayarlar.tsx` — **NOT_TRANSLATED** · TR literals≈44
- `app/ajans/[id]/basvurular.tsx` — **NOT_TRANSLATED** · TR literals≈4
- `app/ajans/[id]/davetler.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/ajans/[id]/destek.tsx` — **NOT_TRANSLATED** · TR literals≈3
- `app/ajans/[id]/duyurular.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/ajans/[id]/ekipler.tsx` — **NOT_TRANSLATED** · TR literals≈4
- `app/ajans/[id]/etkinlikler.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/ajans/[id]/gorevler.tsx` — **NOT_TRANSLATED** · TR literals≈10
- `app/ajans/[id]/guvenlik.tsx` — **NOT_TRANSLATED** · TR literals≈4
- `app/ajans/[id]/index.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/ajans/[id]/islemler.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/ajans/[id]/program.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/ajans/[id]/uyeler/[userId].tsx` — **NOT_TRANSLATED** · TR literals≈8
- `app/ajans/[id]/uyeler/index.tsx` — **NOT_TRANSLATED** · TR literals≈8
- `app/ajans/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈24
- `app/ajans/teklifler.tsx` — **PARTIAL** (useCeviri) · TR literals≈20
- `app/ajans/uye/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈17
- `app/ajans/yonetim/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈4

## CITY (6)

- `app/sehir/[id].tsx` — **PARTIAL** (useCeviri) · TR literals≈34
- `app/sehir/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈27
- `app/sehir/lig.tsx` — **PARTIAL** (useCeviri) · TR literals≈4
- `app/sehir/savas.tsx` — **PARTIAL** (useCeviri) · TR literals≈11
- `app/sehir/secim/[id].tsx` — **PARTIAL** (useCeviri) · TR literals≈17
- `app/sehir/secim/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈8

## GAMES (4)

- `app/oyun/kaskad.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/oyun/nox.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/oyun/zeus.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/pk/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈6

## SETTINGS (6)

- `app/(tabs)/cihazlar.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/ayarlar/gizlilik.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/ayarlar/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/bildirim-ayarlari/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/bildirimler/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/guvenlik/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈24

## MODERATION (4)

- `app/bildir/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈18
- `app/destek/index.tsx` — **LIKELY_TRANSLATED** (useCeviri)
- `app/raporlarim/[id].tsx` — **NOT_TRANSLATED** · TR literals≈8
- `app/raporlarim/index.tsx` — **LIKELY_TRANSLATED** (useCeviri)

## IDEAS (4)

- `app/fikirler/[id].tsx` — **PARTIAL** (useCeviri) · TR literals≈7
- `app/fikirler/benim.tsx` — **PARTIAL** (useCeviri) · TR literals≈3
- `app/fikirler/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈7
- `app/fikirler/olustur.tsx` — **PARTIAL** (useCeviri) · TR literals≈17

## HOST_KYC (3)

- `app/host/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈20
- `app/kyc/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈34
- `app/sertifikasyon/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈44

## SHARE_PLATFORM (6)

- `app/duyuru/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈1
- `app/paylas/[kod].tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/paylasim/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈9
- `app/platform/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈24
- `app/siralamalar/index.tsx` — **PARTIAL** (useCeviri) · TR literals≈15
- `app/webview.tsx` — **NOT_TRANSLATED**

## OTHER_USER (1)

- `app/index.tsx` — **NOT_TRANSLATED** · TR literals≈3

## ADMIN (49)

- `app/admin/ai-muzik.tsx` — **NOT_TRANSLATED** · TR literals≈38
- `app/admin/ajanslar/[id].tsx` — **NOT_TRANSLATED** · TR literals≈46
- `app/admin/ajanslar/index.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/admin/bannerlar/[id].tsx` — **NOT_TRANSLATED** · TR literals≈35
- `app/admin/bannerlar/index.tsx` — **NOT_TRANSLATED** · TR literals≈10
- `app/admin/bannerlar/otomatik.tsx` — **NOT_TRANSLATED** · TR literals≈4
- `app/admin/bannerlar/yeni.tsx` — **NOT_TRANSLATED**
- `app/admin/ciro.tsx` — **NOT_TRANSLATED** · TR literals≈7
- `app/admin/cocuk-koruma.tsx` — **NOT_TRANSLATED** · TR literals≈7
- `app/admin/coin-paketleri.tsx` — **NOT_TRANSLATED** · TR literals≈14
- `app/admin/coin.tsx` — **NOT_TRANSLATED** · TR literals≈4
- `app/admin/cuzdan-yonetimi.tsx` — **NOT_TRANSLATED** · TR literals≈56
- `app/admin/destek/[id].tsx` — **NOT_TRANSLATED** · TR literals≈6
- `app/admin/destek/index.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/admin/ekonomi.tsx` — **NOT_TRANSLATED** · TR literals≈32
- `app/admin/fikirler/[id].tsx` — **NOT_TRANSLATED** · TR literals≈36
- `app/admin/fikirler/index.tsx` — **NOT_TRANSLATED** · TR literals≈10
- `app/admin/fikirler/kategoriler.tsx` — **NOT_TRANSLATED** · TR literals≈2
- `app/admin/finans.tsx` — **NOT_TRANSLATED** · TR literals≈13
- `app/admin/giris-lobisi.tsx` — **NOT_TRANSLATED** · TR literals≈25
- `app/admin/gorusme-guvenlik.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/admin/iletisim.tsx` — **NOT_TRANSLATED** · TR literals≈8
- `app/admin/index.tsx` — **NOT_TRANSLATED** · TR literals≈100
- `app/admin/islem-hacmi/index.tsx` — **NOT_TRANSLATED** · TR literals≈40
- `app/admin/kaskad-animasyon-lab.tsx` — **NOT_TRANSLATED** · TR literals≈3
- `app/admin/kaskad-yonetim.tsx` — **NOT_TRANSLATED** · TR literals≈93
- `app/admin/kayit-alanlari.tsx` — **NOT_TRANSLATED** · TR literals≈19
- `app/admin/kisiler-aramalar.tsx` — **NOT_TRANSLATED** · TR literals≈8
- `app/admin/komisyonlar.tsx` — **NOT_TRANSLATED** · TR literals≈26
- `app/admin/kullanicilar/[id].tsx` — **NOT_TRANSLATED** · TR literals≈72
- `app/admin/kullanicilar/index.tsx` — **NOT_TRANSLATED** · TR literals≈27
- `app/admin/kyc/[id].tsx` — **NOT_TRANSLATED** · TR literals≈35
- `app/admin/kyc/index.tsx` — **NOT_TRANSLATED** · TR literals≈6
- `app/admin/moderasyon/[id].tsx` — **NOT_TRANSLATED** · TR literals≈63
- `app/admin/moderasyon/index.tsx` — **NOT_TRANSLATED** · TR literals≈12
- `app/admin/muzik.tsx` — **NOT_TRANSLATED** · TR literals≈1
- `app/admin/odalar.tsx` — **NOT_TRANSLATED** · TR literals≈63
- `app/admin/oyun-test.tsx` — **NOT_TRANSLATED** · TR literals≈5
- `app/admin/oyunlar.tsx` — **NOT_TRANSLATED** · TR literals≈24
- `app/admin/ozellikler.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/admin/paylasim-linkleri.tsx` — **NOT_TRANSLATED** · TR literals≈13
- `app/admin/platform-guvenlik.tsx` — **NOT_TRANSLATED** · TR literals≈38
- `app/admin/politikalar/[kod].tsx` — **NOT_TRANSLATED** · TR literals≈18
- `app/admin/politikalar/index.tsx` — **NOT_TRANSLATED** · TR literals≈10
- `app/admin/rehber.tsx` — **NOT_TRANSLATED** · TR literals≈11
- `app/admin/satin-alma-itirazlar.tsx` — **NOT_TRANSLATED** · TR literals≈19
- `app/admin/sehir-secim.tsx` — **NOT_TRANSLATED** · TR literals≈22
- `app/admin/sehirler.tsx` — **NOT_TRANSLATED** · TR literals≈15
- `app/admin/takas/index.tsx` — **NOT_TRANSLATED** · TR literals≈28

## Overlays / Sheets / Modals (named files under src)

### Sheet / Modal / Overlay / Portal / Dialog

- `src/bilesenler/yuzey/TamusoModal.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikDurumPaylasSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikDuzenleSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikSatinAlmaSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/GelismisAyarlarSheet.tsx`
- `src/moduller/ana-sayfa/bilesenler/AnaSayfaPortalSeridi.tsx`
- `src/moduller/durum/bilesenler/DurumResimLightbox.tsx`
- `src/moduller/durum/paylasim/bilesenler/GonderiPaylasSheet.tsx`
- `src/moduller/islem-hacmi/bilesenler/IslemHacmiBilgiSheet.tsx`
- `src/moduller/islem-hacmi/bilesenler/IslemHacmiGorunurlukSheet.tsx`
- `src/moduller/kesfet/bilesenler/KesfetDunyaPortallari.tsx`
- `src/moduller/kisiler-kesif/bilesenler/KisilerAramaOnaySheet.tsx`
- `src/moduller/oda-muzik/bilesenler/OdaMuzikKutuphanesiSheet.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunBaslatModal.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunDavetiModal.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunSonucuModal.tsx`
- `src/moduller/pk/bilesenler/PkDavetModal.tsx`
- `src/moduller/stripe/bilesenler/StripeCheckoutWebSheet.tsx`
- `src/moduller/stripe/islemler/StripeNativePaymentSheetCalistir.ts`
- `src/moduller/stripe/islemler/StripePaymentSheetBaslat.ts`
- `src/moduller/takip/bilesenler/TakipOnaySheet.tsx`

### Panel / Lightbox / Sheet-like

- `src/bilesenler/yuzey/TamusoModal.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikAdminDakikaPaneli.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikDurumPaylasSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikDuzenleSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/AiMuzikSatinAlmaSheet.tsx`
- `src/moduller/ai-muzik/bilesenler/GelismisAyarlarSheet.tsx`
- `src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli.tsx`
- `src/moduller/canli-sohbet/bilesenler/CanliSohbetPaneli.tsx`
- `src/moduller/cuzdan/bilesenler/CoinDegerOzetiPaneli.tsx`
- `src/moduller/cuzdan/bilesenler/CoinYuklePaneli.tsx`
- `src/moduller/cuzdan/bilesenler/PlatformResmiHesapPaneli.tsx`
- `src/moduller/cuzdan/islemler/useCoinYuklePaneli.ts`
- `src/moduller/durum/bilesenler/DurumResimLightbox.tsx`
- `src/moduller/durum/bilesenler/DurumYorumPaneli.tsx`
- `src/moduller/durum/paylasim/bilesenler/GonderiPaylasSheet.tsx`
- `src/moduller/gorusme/bilesenler/GorusmeGecmisPaneli.tsx`
- `src/moduller/hediyeler/bilesenler/HediyeMagazaPaneli.tsx`
- `src/moduller/islem-hacmi/bilesenler/IslemHacmiBilgiSheet.tsx`
- `src/moduller/islem-hacmi/bilesenler/IslemHacmiGorunurlukSheet.tsx`
- `src/moduller/kisiler-kesif/bilesenler/KisilerAramaOnaySheet.tsx`
- `src/moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu.tsx`
- `src/moduller/mesajlasma/bilesenler/MesajKullaniciAramaPaneli.tsx`
- `src/moduller/mesajlasma/bilesenler/MesajMedyaSecimPaneli.tsx`
- `src/moduller/moderasyon/bilesenler/IcerikBildirPaneli.tsx`
- `src/moduller/oda-muzik/bilesenler/AdminMuzikPaneli.tsx`
- `src/moduller/oda-muzik/bilesenler/OdaMuzikKutuphanesiSheet.tsx`
- `src/moduller/oda-sohbeti/bilesenler/OdaSohbetPaneli.tsx`
- `src/moduller/oyunlar/oda-siralama/OdaOyunSiralamaPaneli.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/CanliSkorPaneli.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunBaslatModal.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunDavetiModal.tsx`
- `src/moduller/oyunlar/ortak/bilesenler/OyunSonucuModal.tsx`
- `src/moduller/pk/bilesenler/PkDavetModal.tsx`
- `src/moduller/pk/bilesenler/PkDavetPaneli.tsx`
- `src/moduller/politikalar/bilesenler/PolitikaOkumaPaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/MikrofonIstekPaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/OdaBilgiPaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/OdaDinleyiciPaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/OdaKapakDuzenlePaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/OdaKatilimciAksiyonPaneli.tsx`
- `src/moduller/ses-odalari/bilesenler/OdaProfilKartiPaneli.tsx`
- `src/moduller/stripe/bilesenler/StripeCheckoutWebSheet.tsx`
- `src/moduller/stripe/islemler/StripeNativePaymentSheetCalistir.ts`
- `src/moduller/stripe/islemler/StripePaymentSheetBaslat.ts`
- `src/moduller/takip/bilesenler/TakipOnaySheet.tsx`

## Global floating / overlay (root layout)

- `YuzenTabBar` — bottom tabs
- `AktifSesOdasiMiniBar` / `AktifSesOdasiPipKart` — voice room floating
- `GorusmeGlobalKatman` / `GorusmeGelenSaglayici` — call overlay
- `OyunKazancBalonuSaglayici` — game win bubble
- `CocukKorumaOnayKarti` — child-safety consent card
- `TamusoModal` — shared modal shell

## Full route audit

| route_name | file_path | translation_status |
|------------|-----------|--------------------|
| (auth)/dogrula-kod | `app/(auth)/dogrula-kod.tsx` | LIKELY_TRANSLATED |
| (auth)/forgot-password | `app/(auth)/forgot-password.tsx` | LIKELY_TRANSLATED |
| (auth)/login | `app/(auth)/login.tsx` | PARTIAL |
| (auth)/register | `app/(auth)/register.tsx` | PARTIAL |
| (auth)/reset-password | `app/(auth)/reset-password.tsx` | LIKELY_TRANSLATED |
| (tabs)/cihazlar | `app/(tabs)/cihazlar.tsx` | LIKELY_TRANSLATED |
| (tabs)/create | `app/(tabs)/create.tsx` | PARTIAL |
| (tabs)/durum | `app/(tabs)/durum.tsx` | PARTIAL |
| (tabs)/index | `app/(tabs)/index.tsx` | PARTIAL |
| (tabs)/messages | `app/(tabs)/messages.tsx` | LIKELY_TRANSLATED |
| (tabs)/profile | `app/(tabs)/profile.tsx` | PARTIAL |
| (tabs)/rooms | `app/(tabs)/rooms.tsx` | LIKELY_TRANSLATED |
| (tabs)/wallet | `app/(tabs)/wallet.tsx` | PARTIAL |
| ai-muzik/[id] | `app/ai-muzik/[id].tsx` | PARTIAL |
| ai-muzik/index | `app/ai-muzik/index.tsx` | PARTIAL |
| ai-muzik/islemler | `app/ai-muzik/islemler.tsx` | PARTIAL |
| ai-muzik/kutuphane | `app/ai-muzik/kutuphane.tsx` | PARTIAL |
| ai-muzik/pasaport/[id] | `app/ai-muzik/pasaport/[id].tsx` | PARTIAL |
| ajans/[id]/analitik | `app/ajans/[id]/analitik.tsx` | NOT_TRANSLATED |
| ajans/[id]/ayarlar | `app/ajans/[id]/ayarlar.tsx` | NOT_TRANSLATED |
| ajans/[id]/basvurular | `app/ajans/[id]/basvurular.tsx` | NOT_TRANSLATED |
| ajans/[id]/canli | `app/ajans/[id]/canli.tsx` | NOT_TRANSLATED |
| ajans/[id]/davetler | `app/ajans/[id]/davetler.tsx` | NOT_TRANSLATED |
| ajans/[id]/destek | `app/ajans/[id]/destek.tsx` | NOT_TRANSLATED |
| ajans/[id]/duyurular | `app/ajans/[id]/duyurular.tsx` | NOT_TRANSLATED |
| ajans/[id]/ekipler | `app/ajans/[id]/ekipler.tsx` | NOT_TRANSLATED |
| ajans/[id]/etkinlikler | `app/ajans/[id]/etkinlikler.tsx` | NOT_TRANSLATED |
| ajans/[id]/gorevler | `app/ajans/[id]/gorevler.tsx` | NOT_TRANSLATED |
| ajans/[id]/guvenlik | `app/ajans/[id]/guvenlik.tsx` | NOT_TRANSLATED |
| ajans/[id]/index | `app/ajans/[id]/index.tsx` | NOT_TRANSLATED |
| ajans/[id]/islemler | `app/ajans/[id]/islemler.tsx` | NOT_TRANSLATED |
| ajans/[id]/program | `app/ajans/[id]/program.tsx` | NOT_TRANSLATED |
| ajans/[id]/uyeler/[userId] | `app/ajans/[id]/uyeler/[userId].tsx` | NOT_TRANSLATED |
| ajans/[id]/uyeler/index | `app/ajans/[id]/uyeler/index.tsx` | NOT_TRANSLATED |
| ajans/index | `app/ajans/index.tsx` | PARTIAL |
| ajans/profil/[id]/index | `app/ajans/profil/[id]/index.tsx` | NOT_TRANSLATED |
| ajans/profil/[id]/uyeler | `app/ajans/profil/[id]/uyeler.tsx` | NOT_TRANSLATED |
| ajans/teklifler | `app/ajans/teklifler.tsx` | PARTIAL |
| ajans/uye/index | `app/ajans/uye/index.tsx` | PARTIAL |
| ajans/yonetim/index | `app/ajans/yonetim/index.tsx` | PARTIAL |
| ayarlar/gizlilik | `app/ayarlar/gizlilik.tsx` | LIKELY_TRANSLATED |
| ayarlar/index | `app/ayarlar/index.tsx` | PARTIAL |
| ayarlar/kisiler-aramalar | `app/ayarlar/kisiler-aramalar.tsx` | LIKELY_TRANSLATED |
| ayarlar/satin-alma-gecmisi | `app/ayarlar/satin-alma-gecmisi.tsx` | PARTIAL |
| bildir/index | `app/bildir/index.tsx` | PARTIAL |
| bildirim-ayarlari/index | `app/bildirim-ayarlari/index.tsx` | PARTIAL |
| bildirimler/index | `app/bildirimler/index.tsx` | PARTIAL |
| canli/[id] | `app/canli/[id].tsx` | NOT_TRANSLATED |
| canli/index | `app/canli/index.tsx` | NOT_TRANSLATED |
| cuzdan/takas | `app/cuzdan/takas.tsx` | PARTIAL |
| destek/index | `app/destek/index.tsx` | LIKELY_TRANSLATED |
| durum/[id] | `app/durum/[id].tsx` | NOT_TRANSLATED |
| durum/duzenle | `app/durum/duzenle.tsx` | LIKELY_TRANSLATED |
| durum/olustur | `app/durum/olustur.tsx` | PARTIAL |
| duyuru/index | `app/duyuru/index.tsx` | PARTIAL |
| engellenen-kullanicilar/index | `app/engellenen-kullanicilar/index.tsx` | LIKELY_TRANSLATED |
| fikirler/[id] | `app/fikirler/[id].tsx` | PARTIAL |
| fikirler/benim | `app/fikirler/benim.tsx` | PARTIAL |
| fikirler/index | `app/fikirler/index.tsx` | PARTIAL |
| fikirler/olustur | `app/fikirler/olustur.tsx` | PARTIAL |
| gorusme/[id] | `app/gorusme/[id].tsx` | NOT_TRANSLATED |
| guvenlik/index | `app/guvenlik/index.tsx` | PARTIAL |
| hesap-sil/index | `app/hesap-sil/index.tsx` | PARTIAL |
| host/index | `app/host/index.tsx` | PARTIAL |
| index | `app/index.tsx` | NOT_TRANSLATED |
| islem-hacmi/index | `app/islem-hacmi/index.tsx` | LIKELY_TRANSLATED |
| kesfet | `app/kesfet.tsx` | PARTIAL |
| kisiler/index | `app/kisiler/index.tsx` | NOT_TRANSLATED |
| kullanici/[id] | `app/kullanici/[id].tsx` | NOT_TRANSLATED |
| kyc/index | `app/kyc/index.tsx` | PARTIAL |
| lobi/[id] | `app/lobi/[id].tsx` | NOT_TRANSLATED |
| mesaj/[id] | `app/mesaj/[id].tsx` | NOT_TRANSLATED |
| oyun/kaskad | `app/oyun/kaskad.tsx` | PARTIAL |
| oyun/nox | `app/oyun/nox.tsx` | PARTIAL |
| oyun/zeus | `app/oyun/zeus.tsx` | PARTIAL |
| paylas/[kod] | `app/paylas/[kod].tsx` | NOT_TRANSLATED |
| paylasim/index | `app/paylasim/index.tsx` | PARTIAL |
| pk/index | `app/pk/index.tsx` | PARTIAL |
| platform/index | `app/platform/index.tsx` | PARTIAL |
| politika/[kod] | `app/politika/[kod].tsx` | NOT_TRANSLATED |
| politika/index | `app/politika/index.tsx` | LIKELY_TRANSLATED |
| profil-ayarlar/index | `app/profil-ayarlar/index.tsx` | PARTIAL |
| profil-duzenle/index | `app/profil-duzenle/index.tsx` | PARTIAL |
| raporlarim/[id] | `app/raporlarim/[id].tsx` | NOT_TRANSLATED |
| raporlarim/index | `app/raporlarim/index.tsx` | LIKELY_TRANSLATED |
| room/[id] | `app/room/[id].tsx` | NOT_TRANSLATED |
| sehir/[id] | `app/sehir/[id].tsx` | PARTIAL |
| sehir/index | `app/sehir/index.tsx` | PARTIAL |
| sehir/lig | `app/sehir/lig.tsx` | PARTIAL |
| sehir/savas | `app/sehir/savas.tsx` | PARTIAL |
| sehir/secim/[id] | `app/sehir/secim/[id].tsx` | PARTIAL |
| sehir/secim/index | `app/sehir/secim/index.tsx` | PARTIAL |
| sertifikasyon/index | `app/sertifikasyon/index.tsx` | PARTIAL |
| siralamalar/index | `app/siralamalar/index.tsx` | PARTIAL |
| takip/istekler | `app/takip/istekler.tsx` | NOT_TRANSLATED |
| takip/ortak | `app/takip/ortak.tsx` | NOT_TRANSLATED |
| takip/takip-edilenler | `app/takip/takip-edilenler.tsx` | NOT_TRANSLATED |
| takip/takipciler | `app/takip/takipciler.tsx` | NOT_TRANSLATED |
| webview | `app/webview.tsx` | NOT_TRANSLATED |
| admin/ai-muzik | `app/admin/ai-muzik.tsx` | NOT_TRANSLATED |
| admin/ajanslar/[id] | `app/admin/ajanslar/[id].tsx` | NOT_TRANSLATED |
| admin/ajanslar/index | `app/admin/ajanslar/index.tsx` | NOT_TRANSLATED |
| admin/bannerlar/[id] | `app/admin/bannerlar/[id].tsx` | NOT_TRANSLATED |
| admin/bannerlar/index | `app/admin/bannerlar/index.tsx` | NOT_TRANSLATED |
| admin/bannerlar/otomatik | `app/admin/bannerlar/otomatik.tsx` | NOT_TRANSLATED |
| admin/bannerlar/yeni | `app/admin/bannerlar/yeni.tsx` | NOT_TRANSLATED |
| admin/ciro | `app/admin/ciro.tsx` | NOT_TRANSLATED |
| admin/cocuk-koruma | `app/admin/cocuk-koruma.tsx` | NOT_TRANSLATED |
| admin/coin-paketleri | `app/admin/coin-paketleri.tsx` | NOT_TRANSLATED |
| admin/coin | `app/admin/coin.tsx` | NOT_TRANSLATED |
| admin/cuzdan-yonetimi | `app/admin/cuzdan-yonetimi.tsx` | NOT_TRANSLATED |
| admin/destek/[id] | `app/admin/destek/[id].tsx` | NOT_TRANSLATED |
| admin/destek/index | `app/admin/destek/index.tsx` | NOT_TRANSLATED |
| admin/ekonomi | `app/admin/ekonomi.tsx` | NOT_TRANSLATED |
| admin/fikirler/[id] | `app/admin/fikirler/[id].tsx` | NOT_TRANSLATED |
| admin/fikirler/index | `app/admin/fikirler/index.tsx` | NOT_TRANSLATED |
| admin/fikirler/kategoriler | `app/admin/fikirler/kategoriler.tsx` | NOT_TRANSLATED |
| admin/finans | `app/admin/finans.tsx` | NOT_TRANSLATED |
| admin/giris-lobisi | `app/admin/giris-lobisi.tsx` | NOT_TRANSLATED |
| admin/gorusme-guvenlik | `app/admin/gorusme-guvenlik.tsx` | NOT_TRANSLATED |
| admin/iletisim | `app/admin/iletisim.tsx` | NOT_TRANSLATED |
| admin/index | `app/admin/index.tsx` | NOT_TRANSLATED |
| admin/islem-hacmi/index | `app/admin/islem-hacmi/index.tsx` | NOT_TRANSLATED |
| admin/kaskad-animasyon-lab | `app/admin/kaskad-animasyon-lab.tsx` | NOT_TRANSLATED |
| admin/kaskad-yonetim | `app/admin/kaskad-yonetim.tsx` | NOT_TRANSLATED |
| admin/kayit-alanlari | `app/admin/kayit-alanlari.tsx` | NOT_TRANSLATED |
| admin/kisiler-aramalar | `app/admin/kisiler-aramalar.tsx` | NOT_TRANSLATED |
| admin/komisyonlar | `app/admin/komisyonlar.tsx` | NOT_TRANSLATED |
| admin/kullanicilar/[id] | `app/admin/kullanicilar/[id].tsx` | NOT_TRANSLATED |
| admin/kullanicilar/index | `app/admin/kullanicilar/index.tsx` | NOT_TRANSLATED |
| admin/kyc/[id] | `app/admin/kyc/[id].tsx` | NOT_TRANSLATED |
| admin/kyc/index | `app/admin/kyc/index.tsx` | NOT_TRANSLATED |
| admin/moderasyon/[id] | `app/admin/moderasyon/[id].tsx` | NOT_TRANSLATED |
| admin/moderasyon/index | `app/admin/moderasyon/index.tsx` | NOT_TRANSLATED |
| admin/muzik | `app/admin/muzik.tsx` | NOT_TRANSLATED |
| admin/odalar | `app/admin/odalar.tsx` | NOT_TRANSLATED |
| admin/oyun-test | `app/admin/oyun-test.tsx` | NOT_TRANSLATED |
| admin/oyunlar | `app/admin/oyunlar.tsx` | NOT_TRANSLATED |
| admin/ozellikler | `app/admin/ozellikler.tsx` | NOT_TRANSLATED |
| admin/paylasim-linkleri | `app/admin/paylasim-linkleri.tsx` | NOT_TRANSLATED |
| admin/platform-guvenlik | `app/admin/platform-guvenlik.tsx` | NOT_TRANSLATED |
| admin/politikalar/[kod] | `app/admin/politikalar/[kod].tsx` | NOT_TRANSLATED |
| admin/politikalar/index | `app/admin/politikalar/index.tsx` | NOT_TRANSLATED |
| admin/rehber | `app/admin/rehber.tsx` | NOT_TRANSLATED |
| admin/satin-alma-itirazlar | `app/admin/satin-alma-itirazlar.tsx` | NOT_TRANSLATED |
| admin/sehir-secim | `app/admin/sehir-secim.tsx` | NOT_TRANSLATED |
| admin/sehirler | `app/admin/sehirler.tsx` | NOT_TRANSLATED |
| admin/takas/index | `app/admin/takas/index.tsx` | NOT_TRANSLATED |
