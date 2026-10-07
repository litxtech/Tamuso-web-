import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import '../src/tasarim-sistemi/tema/StilYama';
import { InteractionManager, LogBox, Platform, useWindowDimensions } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { CuzdanUiProvider } from '../src/moduller/cuzdan/ui-config/useCuzdanUiConfig';
import { BildirimSaglayici } from '../src/moduller/bildirimler/baglam/BildirimSaglayici';
import { MesajOkunmamisSaglayici } from '../src/moduller/mesajlasma/baglam/MesajOkunmamisSaglayici';
import { GorusmeGelenSaglayici } from '../src/moduller/gorusme/bilesenler/GorusmeGelenSaglayici';
import { KullanimSuresiSaglayici } from '../src/moduller/kullanim-suresi/baglam/KullanimSuresiSaglayici';
import { AktifSesOdasiMiniBar } from '../src/moduller/ses-odalari/bilesenler/AktifSesOdasiMiniBar';
import { AktifSesOdasiPipKart } from '../src/moduller/ses-odalari/bilesenler/AktifSesOdasiPipKart';
import { SesOdasiArkaPlanKurulum } from '../src/moduller/ses-odalari/arka-plan/SesOdasiArkaPlanServisi';
import { SesOdasiPipKurulum } from '../src/moduller/ses-odalari/pip/useSesOdasiPip';
import { TamusoActivitySistemKurulum } from '../src/moduller/tamuso-activity/TamusoActivitySistemKurulum';
import { GorusmeGlobalKatman } from '../src/moduller/gorusme/bilesenler/GorusmeGlobalKatman';
import { OyunKazancBalonuSaglayici } from '../src/moduller/oyunlar/kazanc-balonu/OyunKazancBalonuSaglayici';
import { CocukKorumaOnayKarti } from '../src/moduller/cocuk-koruma/bilesenler/CocukKorumaOnayKarti';
import { KritikDuyuruKapisi } from '../src/moduller/duyurular/bilesenler/KritikDuyuruKapisi';
import { BiyometriKilitKapisi } from '../src/moduller/kimlik-dogrulama/biyometri/BiyometriKilitKapisi';
import { SurumPolitikaKapisi } from '../src/moduller/surum-politikasi/bilesenler/SurumPolitikaKapisi';
import { UygulamaHataSiniri } from '../src/ortak/hata-sinirlari/UygulamaHataSiniri';
import { ModulHataSiniri } from '../src/ortak/hata-sinirlari/ModulHataSiniri';
import { ImagePickerOnIsit } from '../src/ortak/medya/ImagePickerHazirMi';
import { TemaSaglayici, useTema } from '../src/tasarim-sistemi/tema/TemaSaglayici';
import { TabBarGuvenlikKur } from '../src/components/tab-navigasyon/TabBarGuvenlik';
import { YuzenTabBar } from '../src/components/YuzenTabBar';
import { DilSaglayici } from '../src/i18n/DilSaglayici';
import { OzellikBayrakSaglayici } from '../src/moduller/ozellik-bayraklari/OzellikBayrakSaglayici';
import { RtcYenilemeKatmani } from '../src/moduller/rtc/RtcYenilemeKatmani';
import { WebAlertKatmani, WebAlertKur } from '../src/ortak/web/WebAlertKatmani';
import { WebZiyaretKaydi } from '../src/moduller/web-ziyaret/WebZiyaretKaydet';
import '../src/i18n';
import '../src/moduller/livekit/polyfill/AbortReasonPolyfill';

WebAlertKur();

// Tab bar AppState/Dimensions kilidi â€” en erken
try {
  TabBarGuvenlikKur();
} catch {
  /* ignore */
}

// LiveKit / WebRTC gÃ¼rÃ¼ltÃ¼lÃ¼ DEBUG loglarÄ±
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LiveKitGurultuLoglariniKapat } = require('../src/moduller/livekit/polyfill/LiveKitGurultuLoglariniKapat') as {
    LiveKitGurultuLoglariniKapat?: () => void;
  };
  LiveKitGurultuLoglariniKapat?.();
} catch {
  /* ignore */
}

// LiveKit bilincli disconnect sonrasi WS 1001; LogBox kirmizi hata gostermesin
LogBox.ignoreLogs([
  'error reading from signal stream',
  'WS closed unexpectedly',
  'rn-webrtc',
  'ping timeout triggered',
  'Received leave request while trying to (re)connect',
]);

/** LiveKit globals â€” expo-audio ile AVAudioSession cakismasin */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LiveKitGlobalsKaydet } = require('../src/moduller/livekit/polyfill/LiveKitGlobalsKaydet') as {
    LiveKitGlobalsKaydet?: () => boolean;
  };
  LiveKitGlobalsKaydet?.();
} catch {
  /* native eksik / bozuk â€” baglanti mock'a dusar */
}

/** Android FGS + iOS arka plan ses oturumu */
try {
  SesOdasiArkaPlanKurulum();
} catch {
  /* native yok / Expo Go */
}

/** iOS CallKit / PushKit / Live Activity recovery */
try {
  TamusoActivitySistemKurulum();
} catch {
  /* native yok / Expo Go */
}

/** Android ses odasÄ± PiP aksiyonlarÄ± */
try {
  SesOdasiPipKurulum();
} catch {
  /* native yok / Expo Go */
}

/** Deep link / yenilemede tab gecmisi index'e dusmesin */
export const unstable_settings = {
  initialRouteName: '(tabs)',
};


function ImagePickerArkaPlanIsit() {
  useEffect(() => {
    // Modül import'unu hemen başlat — ilk galeri tıklamasında cold-load olmasın
    ImagePickerOnIsit({ izinIste: false });
    const gorev = InteractionManager.runAfterInteractions(() => {
      ImagePickerOnIsit({ izinIste: false });
    });
    return () => gorev.cancel();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <TemaSaglayici>
      <KokIcerik />
    </TemaSaglayici>
  );
}

function KokIcerik() {
  const { palet } = useTema();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const tamSite =
    segments[0] === 'admin' ||
    segments[0] === 'tanitim' ||
    segments[0] === 'blog' ||
    segments[0] === 'politika' ||
    (Platform.OS === 'web' && (segments.length === 0 || segments[0] === 'index'));
  const telefonKabin = Platform.OS === 'web' && !tamSite && width >= 520;

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        width: '100%',
        maxWidth: telefonKabin ? 430 : '100%',
        alignSelf: 'center',
        minHeight: 0,
        backgroundColor: segments[0] === 'tanitim' ? '#080811' : palet.bg,
        ...(Platform.OS === 'web'
          ? { height: '100%', overflow: 'hidden' as const }
          : null),
      }}
    >
      <UygulamaHataSiniri>
        <SurumPolitikaKapisi>
        <AuthProvider>
          <DilSaglayiciKoku>
          <OzellikBayrakSaglayici>
          <CuzdanUiProvider>
          <KullanimSuresiSaglayici>
          <BildirimSaglayici>
          <MesajOkunmamisSaglayici>
          <ModulHataSiniri
            modulAdi="uygulama"
            varyant="ekran"
            fallbackHref="/(tabs)"
          >
            <GorusmeGelenSaglayici>
              <ImagePickerArkaPlanIsit />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: palet.bg },
                  // fade: eski + yeni baÅŸlÄ±k Ã¼st Ã¼ste biner; slide temiz
                  animation: 'slide_from_right',
                }}
              >
          <Stack.Screen
            name="(tabs)"
            options={{
              // Ana kabuk kaydÄ±rÄ±larak pop edilmesin â€” hamburger kenarÄ± ile Ã§akÄ±ÅŸÄ±r
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
            }}
          />
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
          <Stack.Screen name="tanitim" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="kesfet" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="mesaj/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="kullanici/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="takip/takipciler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="takip/takip-edilenler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="takip/istekler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="takip/ortak" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="destek/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="fikirler/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="fikirler/olustur" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="fikirler/benim" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="fikirler/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="lobi/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="canli/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="canli/[id]"
            options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="pk/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="siralamalar/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/yonetim/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/uye/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/teklifler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/profil/[id]/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/profil/[id]/uyeler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/canli" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/uyeler/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/uyeler/[userId]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/basvurular" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/davetler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/ekipler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/program" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/etkinlikler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/duyurular" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/gorevler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/analitik" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/islemler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/cuzdan" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/paketler" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/satis-linkleri" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/satis-takibi" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/dekontlar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/faturalar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/ayarlar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/destek" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/guvenlik" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/[id]/dogrulama" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ajans/satis/[kod]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="host/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/lig" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/savas" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/secim/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sehir/secim/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="platform/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="duyuru/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="duyuru/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="announcements/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="politika/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="politika/[kod]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="guvenlik/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="engellenen-kullanicilar/index"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="hesap-sil/index"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="bildirimler/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="bildir/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="raporlarim/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="raporlarim/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="durum/olustur" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="durum/duzenle" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="durum/[id]"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="hikaye/olustur"
            options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="hikaye/[userId]"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="hikaye/arsiv"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="bildirim-ayarlari/index"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="sertifikasyon/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="webview" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="odeme-basarili"
            options={{
              animation: 'fade',
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="paylasim/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="paylas/[kod]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ayarlar/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ayarlar/dil" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ayarlar/gizlilik" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="ayarlar/kisiler-aramalar"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ayarlar/satin-alma-gecmisi"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="kisiler/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profil-ayarlar/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profil-duzenle/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="kyc/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="cuzdan/takas" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="room/[id]"
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              contentStyle: { backgroundColor: palet.bg },
              gestureEnabled: true,
              freezeOnBlur: true,
            }}
          />
          <Stack.Screen
            name="gorusme/[id]"
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              // Tema bg sÄ±zmasÄ±n â€” sahne gradient Ã¼st tonu
              contentStyle: { backgroundColor: '#0B1A14' },
              statusBarTranslucent: true,
              statusBarStyle: 'light',
              navigationBarHidden: true,
            }}
          />
          <Stack.Screen
            name="studio/index"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="studio/[id]"
            options={{ animation: 'slide_from_right' }}
          />
              </Stack>
              <YuzenTabBar />
              <AktifSesOdasiMiniBar />
              <AktifSesOdasiPipKart />
              <GorusmeGlobalKatman />
              <RtcYenilemeKatmani />
              <OyunKazancBalonuSaglayici />
              <CocukKorumaOnayKarti />
              <KritikDuyuruKapisi />
              <BiyometriKilitKapisi />
              <WebAlertKatmani />
              <WebZiyaretKaydi />
            </GorusmeGelenSaglayici>
          </ModulHataSiniri>
          </MesajOkunmamisSaglayici>
          </BildirimSaglayici>
          </KullanimSuresiSaglayici>
          </CuzdanUiProvider>
          </OzellikBayrakSaglayici>
          </DilSaglayiciKoku>
        </AuthProvider>
        </SurumPolitikaKapisi>
      </UygulamaHataSiniri>
    </GestureHandlerRootView>
  );
}

function DilSaglayiciKoku({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return (
    <DilSaglayici
      profilDili={profile?.language ?? null}
      profilUlke={profile?.country_code ?? null}
    >
      {children}
    </DilSaglayici>
  );
}
