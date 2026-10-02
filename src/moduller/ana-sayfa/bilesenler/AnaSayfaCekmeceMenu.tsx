import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  I18nManager,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Gesture,
  GestureDetector,
  Pressable,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { yuzenTabBarToplamYukseklik } from '../../../components/YuzenTabBosluk';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useAuth } from '../../../contexts/AuthContext';
import {
  HamburgerIstatistikler,
  HamburgerProfilKarti,
  useHamburgerRozetSayisi,
  type HamburgerProfilVeri,
} from './HamburgerProfilKarti';
import {
  HamburgerCamBaglantilar,
  useHamburgerCamBaglantilar,
} from './HamburgerCamBaglantilar';
import {
  HamburgerMenuGrubu,
  HamburgerPremiumCta,
  menuGruplarinaBol,
  type AnaSayfaMenuOgesi,
} from './HamburgerMenuGrubu';
import { HamburgerIletisimAlt } from './HamburgerIletisimAlt';
import { useCeviri } from '../../../i18n/useCeviri';
import { useDil } from '../../../i18n/DilSaglayici';
import {
  tabBarOverlayAc,
  tabBarOverlayKapat,
} from '../../../components/tab-navigasyon/TabBarOverlay';

export type { AnaSayfaMenuOgesi };
export type AnaSayfaMenuProfil = HamburgerProfilVeri;

type Props = {
  acik: boolean;
  onAcikDegisti: (acik: boolean) => void;
  ogeler: AnaSayfaMenuOgesi[];
  onOgeSec: (href: string) => void;
  profil?: AnaSayfaMenuProfil | null;
  onProfilPress: () => void;
  onCoinPress?: () => void;
  onRozetPress?: () => void;
  onPremiumCtaPress?: () => void;
  onCikisPress?: () => void;
  children: ReactNode;
};

const EDGE = 28;
/** Üst bar + hamburger — kenar jesti burayı yemesin */
const KENAR_UST_BOSLUK = 56;
/** Tab bar + safe-area üstüne ekstra nefes — son satır görünür kalsın */
const SCROLL_ALT_NEFES = 24;
/** Timing — spring overshoot / çift animasyon titretmesin */
const TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
} as const;
const PAN_ACTIVE_X = 14;
const PAN_FAIL_Y = 28;
const HIZ_ESIK = 480;
const ACILIS_ESIK = 0.38;

/** Arapça için daha geniş drawer — uzun glyph’ler kesilmesin */
function drawerGenislikHesapla(ekranW: number, rtl: boolean): number {
  const oran = rtl ? 0.82 : 0.72;
  const max = rtl ? 420 : 360;
  return Math.min(Math.round(ekranW * oran), max);
}

/**
 * X tarzı push drawer — açıkken sol kenar yumuşak (radius + gölge + blur perde).
 */
export function AnaSayfaCekmeceMenu({
  acik,
  onAcikDegisti,
  ogeler,
  onOgeSec,
  profil,
  onProfilPress,
  onCoinPress,
  onRozetPress,
  onPremiumCtaPress,
  onCikisPress,
  children,
}: Props) {
  useTemayaAboneOl();
  const insets = useSafeAreaInsets();
  const { t } = useCeviri();
  const { rtl: dilRtl } = useDil();
  const { width: ekranW } = useWindowDimensions();
  /** Dil intent + native — reload öncesi dil kaynağı öncelikli */
  const rtl = dilRtl || I18nManager.isRTL;
  const rtlSv = useSharedValue(rtl ? 1 : 0);
  const menuW = useMemo(() => drawerGenislikHesapla(ekranW, rtl), [ekranW, rtl]);
  const menuWSv = useSharedValue(menuW);
  const { wallet } = useAuth();
  const rozetSayisi = useHamburgerRozetSayisi(acik);
  const { oda: camOda, ajans: camAjans } = useHamburgerCamBaglantilar(acik);
  const menuGruplari = useMemo(
    () =>
      menuGruplarinaBol(ogeler, {
        yardim: t('anaSayfa.grupYardim'),
        yayin: t('anaSayfa.grupYayin'),
        hesap: t('anaSayfa.grupHesap'),
        kesfet: t('anaSayfa.grupKesfet'),
        yonetim: t('anaSayfa.grupYonetim'),
      }),
    [ogeler, t],
  );
  const acikSv = useSharedValue(0);
  const surukleBaslangic = useSharedValue(0);
  const jesttenGeliyor = useRef(false);
  const acikTema = temaAcikMi(kullaniciTemaKodunuAl());
  const ustGradient = RenkTokenlari.gradientNight;
  const ustAccent = acikTema
    ? (['rgba(214,46,130,0.14)', 'rgba(91,47,212,0.06)', 'transparent'] as const)
    : (['rgba(232,64,145,0.28)', 'rgba(139,92,246,0.12)', 'transparent'] as const);

  useEffect(() => {
    menuWSv.value = menuW;
  }, [menuW, menuWSv]);

  useEffect(() => {
    rtlSv.value = rtl ? 1 : 0;
  }, [rtl, rtlSv]);

  /** Drawer açıkken root tab bar’ı gizle (zIndex 200 çakışması) */
  useEffect(() => {
    if (acik) {
      tabBarOverlayAc();
      return () => tabBarOverlayKapat();
    }
    return undefined;
  }, [acik]);

  useEffect(() => {
    if (jesttenGeliyor.current) {
      jesttenGeliyor.current = false;
      return;
    }
    acikSv.value = withTiming(acik ? 1 : 0, TIMING);
  }, [acik, acikSv]);

  const jestBitir = useCallback(
    (sonraki: boolean) => {
      jesttenGeliyor.current = true;
      acikSv.value = withTiming(sonraki ? 1 : 0, TIMING);
      onAcikDegisti(sonraki);
    },
    [acikSv, onAcikDegisti],
  );

  const kapat = useCallback(() => {
    onAcikDegisti(false);
  }, [onAcikDegisti]);

  /** LTR: sağa kaydır aç · RTL: sola kaydır aç (kenardan içeri) */
  const kenarPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!acik)
        .activeOffsetX(rtl ? -PAN_ACTIVE_X : PAN_ACTIVE_X)
        .failOffsetY([-PAN_FAIL_Y, PAN_FAIL_Y])
        .onBegin(() => {
          surukleBaslangic.value = acikSv.value;
        })
        .onUpdate((e) => {
          const w = menuWSv.value;
          const isRtl = rtlSv.value === 1;
          const delta = (isRtl ? -e.translationX : e.translationX) / w;
          acikSv.value = Math.min(1, Math.max(0, surukleBaslangic.value + delta));
        })
        .onEnd((e) => {
          const isRtl = rtlSv.value === 1;
          const hiz = isRtl ? -e.velocityX : e.velocityX;
          const sonraki =
            hiz > HIZ_ESIK
              ? true
              : hiz < -HIZ_ESIK
                ? false
                : acikSv.value > ACILIS_ESIK;
          runOnJS(jestBitir)(sonraki);
        }),
    [acik, acikSv, jestBitir, menuWSv, rtl, rtlSv, surukleBaslangic],
  );

  const ekranKapatPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(acik)
        .activeOffsetX(rtl ? PAN_ACTIVE_X : -PAN_ACTIVE_X)
        .failOffsetY([-PAN_FAIL_Y, PAN_FAIL_Y])
        .onBegin(() => {
          surukleBaslangic.value = acikSv.value;
        })
        .onUpdate((e) => {
          const w = menuWSv.value;
          const isRtl = rtlSv.value === 1;
          const delta = (isRtl ? -e.translationX : e.translationX) / w;
          acikSv.value = Math.min(1, Math.max(0, surukleBaslangic.value + delta));
        })
        .onEnd((e) => {
          const isRtl = rtlSv.value === 1;
          const hiz = isRtl ? -e.velocityX : e.velocityX;
          const sonraki =
            hiz > HIZ_ESIK
              ? true
              : hiz < -HIZ_ESIK
                ? false
                : acikSv.value > ACILIS_ESIK;
          runOnJS(jestBitir)(sonraki);
        }),
    [acik, acikSv, jestBitir, menuWSv, rtl, rtlSv, surukleBaslangic],
  );

  /**
   * RN / I18nManager RTL’de translateX’i aynalar.
   * Bu yüzden kapalı→açık her zaman [-w, 0] / [0, w-8] yazılır;
   * kenar (left/right) rtl ile seçilir — ikinci kez işaret çevirme.
   */
  const panelStyle = useAnimatedStyle(() => {
    const w = menuWSv.value;
    const acikOran = acikSv.value;
    return {
      zIndex: acikOran > 0.02 ? 60 : 1,
      elevation: acikOran > 0.02 ? 24 : 0,
      opacity: acikOran < 0.01 ? 0 : 1,
      transform: [
        {
          translateX: interpolate(
            acikOran,
            [0, 1],
            [-w, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  /** İçerik: yatay it + açıkken drawer kenarını yuvarlat / gölgelendir */
  const icerikStyle = useAnimatedStyle(() => {
    const w = menuWSv.value;
    const isRtl = rtlSv.value === 1;
    const r = interpolate(acikSv.value, [0, 1], [0, 22], Extrapolation.CLAMP);
    const golge = interpolate(acikSv.value, [0, 1], [0, 0.32], Extrapolation.CLAMP);
    return {
      transform: [
        {
          translateX: interpolate(
            acikSv.value,
            [0, 1],
            [0, w - 8],
            Extrapolation.CLAMP,
          ),
        },
      ],
      borderTopLeftRadius: isRtl ? 0 : r,
      borderBottomLeftRadius: isRtl ? 0 : r,
      borderTopRightRadius: isRtl ? r : 0,
      borderBottomRightRadius: isRtl ? r : 0,
      shadowColor: '#000',
      shadowOffset: { width: isRtl ? 8 : -8, height: 0 },
      shadowOpacity: golge,
      shadowRadius: interpolate(acikSv.value, [0, 1], [0, 20], Extrapolation.CLAMP),
      elevation: interpolate(acikSv.value, [0, 1], [0, 14], Extrapolation.CLAMP),
    };
  });

  const perdeStyle = useAnimatedStyle(() => ({
    opacity: acikSv.value,
  }));

  /** Panel ↔ feed birleşiminde yumuşak dikiş */
  const kenarYumusatmaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(acikSv.value, [0, 0.35, 1], [0, 0.55, 1], Extrapolation.CLAMP),
  }));

  const altBosluk =
    yuzenTabBarToplamYukseklik(insets.bottom) + SCROLL_ALT_NEFES;
  const ustPad = insets.top + (Platform.OS === 'ios' ? 6 : 10);

  const ogeSecVeKapat = useCallback(
    (href: string) => {
      kapat();
      onOgeSec(href);
    },
    [kapat, onOgeSec],
  );

  /** Blur/focus sonrası jest + shared value senkronu — yarım açık perde feed’i kilitlemesin */
  useEffect(() => {
    if (acik) return;
    jesttenGeliyor.current = false;
    acikSv.value = 0;
  }, [acik, acikSv]);

  /**
   * Kapalıyken BlurView’i ağaçta tutma.
   * iOS blur, üst opacity 0 olsa da koyu bir dikdörtgen bırakabiliyor.
   * Kapanış animasyonu bitince sökülür.
   */
  const [perdeTakili, setPerdeTakili] = useState(acik);
  useEffect(() => {
    if (acik) {
      setPerdeTakili(true);
      return;
    }
    const timer = setTimeout(() => setPerdeTakili(false), TIMING.duration);
    return () => clearTimeout(timer);
  }, [acik]);

  return (
    <View style={styles.kok}>
      <LinearGradient
        colors={[...ustGradient]}
        style={styles.kokZemin}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[...ustAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={styles.kokParlama}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.panel,
          {
            width: menuW,
            /** İçerik LTR kilit — satır flex aynalanmasın */
            direction: 'ltr',
          },
          rtl ? styles.panelRtl : styles.panelLtr,
          panelStyle,
        ]}
        pointerEvents={acik ? 'auto' : 'none'}
      >
        <View style={[styles.panelIc, { width: menuW }]} collapsable={false}>
          <ScrollView
            style={styles.listeScroll}
            contentContainerStyle={[
              styles.liste,
              {
                paddingTop: ustPad,
                paddingBottom: altBosluk,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
            overScrollMode="never"
            decelerationRate="fast"
            nestedScrollEnabled
          >
          <HamburgerProfilKarti
            profil={profil}
            onPress={() => {
              kapat();
              onProfilPress();
            }}
          />
          <HamburgerIstatistikler
            coin={wallet?.coins ?? 0}
            rozet={rozetSayisi}
            onCoinPress={() => {
              kapat();
              (onCoinPress ?? (() => onOgeSec('/(tabs)/wallet')))();
            }}
            onRozetPress={() => {
              kapat();
              (onRozetPress ?? (() => onOgeSec('/platform')))();
            }}
          />

          <HamburgerCamBaglantilar
            oda={camOda}
            ajans={camAjans}
            onOdaPress={(oda) => {
              kapat();
              // Host kendi canlı odasına lobisiz girer
              onOgeSec(`/room/${oda.roomId}`);
            }}
            onAjansPress={(ajans) => {
              kapat();
              onOgeSec(
                ajans.role === 'member'
                  ? `/ajans/profil/${ajans.id}`
                  : `/ajans/${ajans.id}`,
              );
            }}
          />

          {menuGruplari.map((grup) => (
            <HamburgerMenuGrubu
              key={grup.id}
              grup={grup}
              onOgeSec={ogeSecVeKapat}
            />
          ))}

          <HamburgerPremiumCta
            onPress={() => {
              kapat();
              (onPremiumCtaPress ?? (() => onOgeSec('/platform')))();
            }}
          />

          {onCikisPress ? (
            <HamburgerIletisimAlt
              onCikis={() => {
                kapat();
                onCikisPress();
              }}
            />
          ) : null}
          </ScrollView>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.icerik, icerikStyle]}
        pointerEvents="box-none"
        collapsable={false}
      >
        {children}

        <Animated.View
          style={[
            styles.kenarYumusatma,
            rtl ? styles.kenarYumusatmaRtl : styles.kenarYumusatmaLtr,
            kenarYumusatmaStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.34)',
              'rgba(0,0,0,0.12)',
              'rgba(0,0,0,0)',
            ]}
            locations={[0, 0.45, 1]}
            start={rtl ? { x: 1, y: 0 } : { x: 0, y: 0 }}
            end={rtl ? { x: 0, y: 0 } : { x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {!acik ? (
          <GestureDetector gesture={kenarPan}>
            <View
              style={[
                styles.kenarHit,
                rtl ? styles.kenarHitRtl : styles.kenarHitLtr,
                { top: insets.top + KENAR_UST_BOSLUK },
              ]}
              collapsable={false}
            />
          </GestureDetector>
        ) : null}

        {perdeTakili ? (
          <Animated.View
            style={[styles.perde, perdeStyle]}
            pointerEvents={acik ? 'auto' : 'none'}
            collapsable={false}
          >
            <CamArkaplan
              intensity={48}
              hafif
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              fallbackColor="rgba(8,6,14,0.42)"
            />
            <View style={styles.perdeTint} pointerEvents="none" />
            <GestureDetector gesture={ekranKapatPan}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={kapat}
                accessibilityLabel={t('anaSayfa.menuKapat')}
              />
            </GestureDetector>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function AnaSayfaHamburgerDugmesi({ onPress }: { onPress: () => void }) {
  const { t } = useCeviri();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.hamBtn, pressed && { opacity: 0.88 }]}
      accessibilityLabel={t('anaSayfa.menu')}
      accessibilityRole="button"
      hitSlop={12}
    >
      <View style={styles.hamCizgi} pointerEvents="none" />
      <View style={[styles.hamCizgi, styles.hamCizgiOrta]} pointerEvents="none" />
      <View style={styles.hamCizgi} pointerEvents="none" />
    </Pressable>
  );
}

/** Hamburger yerine profil avatarı — menüyü açar */
export function AnaSayfaProfilMenuDugmesi({
  onPress,
  avatarUrl,
  harf = '?',
}: {
  onPress: () => void;
  avatarUrl?: string | null;
  harf?: string;
}) {
  const { t } = useCeviri();
  const uri = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.profilBtn, pressed && { opacity: 0.88 }]}
      accessibilityLabel={t('anaSayfa.menu')}
      accessibilityRole="button"
      hitSlop={12}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.profilAvatar}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[...RenkTokenlari.gradientPrimary]}
          style={styles.profilAvatar}
        >
          <Text style={styles.profilHarf}>
            {(harf[0] ?? '?').toLocaleUpperCase('tr-TR')}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
    overflow: 'hidden',
  },
  kokZemin: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  kokParlama: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: '70%',
    height: '55%',
    opacity: 0.7,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: RenkTokenlari.bg,
    overflow: 'hidden',
  },
  panelLtr: { left: 0 },
  panelRtl: { right: 0 },
  panelIc: {
    flex: 1,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  listeScroll: { flex: 1, overflow: 'hidden' },
  liste: {
    flexGrow: 0,
    gap: 8,
    paddingStart: 14,
    paddingEnd: 14,
  },
  icerik: {
    flex: 1,
    zIndex: 2,
    backgroundColor: RenkTokenlari.bg,
    overflow: 'hidden',
  },
  kenarYumusatma: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 25,
  },
  kenarYumusatmaLtr: { left: 0 },
  kenarYumusatmaRtl: { right: 0 },
  kenarHit: {
    position: 'absolute',
    bottom: 0,
    width: EDGE,
    zIndex: 30,
  },
  kenarHitLtr: { left: 0 },
  kenarHitRtl: { right: 0 },
  perde: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    zIndex: 40,
    elevation: 0,
  },
  perdeTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  hamBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  hamCizgi: {
    width: 17,
    height: 2,
    borderRadius: 1,
    backgroundColor: RenkTokenlari.text,
  },
  hamCizgiOrta: { width: 12 },
  profilBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: RenkTokenlari.primary,
    backgroundColor: RenkTokenlari.bgCard,
  },
  // Android: % boyut + Image borderRadius kırpmaz — sabit px + cover
  profilAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilHarf: {
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});
