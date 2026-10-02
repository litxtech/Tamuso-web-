/**
 * Root tab chrome — Tabs navigator DIŞINDA.
 *
 * iOS: yeni iPhone tab menü — yüzen liquid-glass kapsül.
 * Android: tam genişlik alt kabuk (mevcut davranış).
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  DeviceEventEmitter,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useMesajOkunmamis } from '../moduller/mesajlasma/baglam/MesajOkunmamisSaglayici';
import { MedyaUriGuvenli } from '../moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { CamArkaplan } from '../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../tasarim-sistemi/TipografiTokenlari';
import { useTemayaAboneOl } from '../tasarim-sistemi/tema/useTemayaAboneOl';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../tasarim-sistemi/tema/TemaDurumu';
import {
  IOS_TAB_FLOAT_GAP,
  IOS_TAB_H_MARGIN,
  YUZEN_TAB_SHELL_H,
  guvenliTabAltInset,
  yuzenTabBarToplamYukseklik,
} from './YuzenTabBosluk';
import {
  TAB_BAR_ELEVATION,
  TAB_BAR_Z_INDEX,
  TabBarGuvenliGenislik,
  TabBarGuvenlikKur,
  TabBarSyncDinle,
} from './tab-navigasyon/TabBarGuvenlik';
import {
  GORUNUR_TAB_SIRASI,
  type GorunurTabAdi,
} from './tab-navigasyon/GorunurTabSirasi';
import { TAB_BAR_OVERLAY_EVENT } from './tab-navigasyon/TabBarOverlay';
import { useCeviri } from '../i18n/useCeviri';

export { YUZEN_TAB_ICERIK_BOSLUGU } from './YuzenTabBosluk';

type TabIcon = keyof typeof Ionicons.glyphMap;

const TAB_ICON: Record<
  GorunurTabAdi,
  { active: TabIcon; idle: TabIcon }
> = {
  index: { active: 'home', idle: 'home-outline' },
  durum: { active: 'images', idle: 'images-outline' },
  create: {
    active: 'add-circle',
    idle: 'add-circle-outline',
  },
  messages: {
    active: 'chatbubble-ellipses',
    idle: 'chatbubble-ellipses-outline',
  },
  profile: {
    active: 'person-circle',
    idle: 'person-circle-outline',
  },
};

const HREF: Record<GorunurTabAdi, string> = {
  index: '/(tabs)',
  durum: '/(tabs)/durum',
  create: '/(tabs)/create',
  messages: '/(tabs)/messages',
  profile: '/(tabs)/profile',
};

/** Ana sekmesine tekrar basınca feed en üste — index dinler */
export const ANA_TAB_YENIDEN_EVENT = 'tamuso.anaTabYeniden';

const IS_IOS = Platform.OS === 'ios';
const ICON_SIZE = IS_IOS ? 24 : 26;
const CREATE_SIZE = IS_IOS ? 26 : 30;
const AVATAR = IS_IOS ? 24 : 26;
const PILL_RADIUS = 28;

function tabsIcindeMi(segments: string[]): boolean {
  return segments[0] === '(tabs)';
}

function aktifTabAdi(segments: string[]): GorunurTabAdi | null {
  if (!tabsIcindeMi(segments)) return null;
  const ad = (segments[1] ?? 'index') as string;
  if ((GORUNUR_TAB_SIRASI as readonly string[]).includes(ad)) {
    return ad as GorunurTabAdi;
  }
  return null;
}

function tabGit(href: string) {
  try {
    router.navigate(href as never);
  } catch {
    try {
      router.replace(href as never);
    } catch {
      /* ignore */
    }
  }
}

function tamEkranMu(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.includes('/room/')) return true;
  if (pathname.includes('/gorusme/')) return true;
  if (/\/canli\/[^/]+/.test(pathname)) return true;
  return false;
}

function YuzenTabBarIc() {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();
  const { profile, session } = useAuth();
  const { okunmamis: mesajOkunmamis } = useMesajOkunmamis();
  const avatarUrl = MedyaUriGuvenli(profile?.avatar_url);
  const [, setTick] = useState(0);
  const acikTema = temaAcikMi(kullaniciTemaKodunuAl());

  const tabEtiket: Record<GorunurTabAdi, string> = {
    index: t('sekmeler.ana'),
    durum: t('sekmeler.durum'),
    create: t('sekmeler.olustur'),
    messages: t('sekmeler.mesaj'),
    profile: t('sekmeler.profil'),
  };

  useEffect(() => {
    TabBarGuvenlikKur();
    return TabBarSyncDinle(() => setTick((n) => n + 1));
  }, []);

  const segList = useMemo(() => segments.map(String), [segments]);
  const focused = aktifTabAdi(segList);
  const [overlayAcik, setOverlayAcik] = useState(false);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      TAB_BAR_OVERLAY_EVENT,
      (p: { acik?: boolean }) => setOverlayAcik(!!p?.acik),
    );
    return () => sub.remove();
  }, []);

  const gorunur =
    tabsIcindeMi(segList) &&
    !!session &&
    !tamEkranMu(pathname) &&
    !overlayAcik;

  const ekranW = TabBarGuvenliGenislik(windowWidth);
  const bottomInset = guvenliTabAltInset(insets.bottom);
  const toplamH = yuzenTabBarToplamYukseklik(insets.bottom);

  // iOS: yüzen kapsül genişliği; Android: tam genişlik
  const barW = IS_IOS
    ? Math.max(280, ekranW - IOS_TAB_H_MARGIN * 2)
    : ekranW;

  if (!gorunur) {
    return null;
  }

  const barBody = (
    <View style={[styles.row, { width: barW }]}>
      {GORUNUR_TAB_SIRASI.map((name) => {
        const icons = TAB_ICON[name];
        const label = tabEtiket[name];
        const secili = focused === name;
        const isCreate = name === 'create';
        const isProfile = name === 'profile';
        const isMessages = name === 'messages';
        const color = secili
          ? RenkTokenlari.primarySoft
          : RenkTokenlari.textMuted;
        const badge =
          isMessages && !secili && mesajOkunmamis > 0 ? mesajOkunmamis : 0;

        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={secili ? { selected: true } : {}}
            accessibilityLabel={
              badge > 0 ? `${label}, ${badge}` : label
            }
            onPress={() => {
              if (secili) {
                if (name === 'index') {
                  DeviceEventEmitter.emit(ANA_TAB_YENIDEN_EVENT);
                }
                return;
              }
              tabGit(HREF[name]);
            }}
            style={styles.slot}
            hitSlop={8}
          >
            <View
              style={[
                styles.iconWrap,
                isCreate && styles.createWrap,
                IS_IOS && secili && !isCreate && styles.iosSeciliHalka,
              ]}
            >
              {isCreate ? (
                <LinearGradient
                  colors={[...RenkTokenlari.gradientPrimary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.createBtn,
                    IS_IOS && styles.createBtnIos,
                    secili && styles.createBtnAktif,
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={CREATE_SIZE}
                    color={RenkTokenlari.textOnPrimary}
                  />
                </LinearGradient>
              ) : isProfile && avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatar,
                    {
                      borderColor: secili
                        ? RenkTokenlari.primarySoft
                        : 'transparent',
                      borderWidth: secili ? 2 : 0,
                    },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={secili ? icons.active : icons.idle}
                  size={ICON_SIZE}
                  color={color}
                />
              )}
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badge > 99 ? '99+' : String(badge)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  if (IS_IOS) {
    return (
      <View
        collapsable={false}
        pointerEvents="box-none"
        style={[styles.anchor, { height: toplamH }]}
      >
        <View
          collapsable={false}
          pointerEvents="auto"
          style={[
            styles.iosKapsulDis,
            {
              width: barW,
              marginBottom: bottomInset + IOS_TAB_FLOAT_GAP,
            },
          ]}
        >
          <View style={styles.iosKapsul}>
            <CamArkaplan
              intensity={acikTema ? 72 : 88}
              tint={acikTema ? 'systemUltraThinMaterialLight' : 'systemUltraThinMaterialDark'}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              fallbackColor={
                acikTema
                  ? 'rgba(255,255,255,0.78)'
                  : 'rgba(22,18,28,0.72)'
              }
            />
            <View
              pointerEvents="none"
              style={[
                styles.iosCamKenar,
                {
                  borderColor: acikTema
                    ? 'rgba(255,255,255,0.55)'
                    : 'rgba(255,255,255,0.14)',
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.iosCamTint,
                {
                  backgroundColor: acikTema
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(0,0,0,0.12)',
                },
              ]}
            />
            {barBody}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      collapsable={false}
      pointerEvents="box-none"
      style={styles.anchor}
    >
      <View
        collapsable={false}
        pointerEvents="auto"
        style={[
          styles.barAndroid,
          {
            width: barW,
            height: toplamH,
            paddingBottom: bottomInset,
            backgroundColor: acikTema
              ? RenkTokenlari.tabBarOverlay
              : RenkTokenlari.tabBarFallback,
            borderTopColor: RenkTokenlari.border,
          },
        ]}
      >
        {barBody}
      </View>
    </View>
  );
}

export const YuzenTabBar = memo(YuzenTabBarIc);

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: TAB_BAR_Z_INDEX,
    elevation: TAB_BAR_ELEVATION,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barAndroid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
  },
  iosKapsulDis: {
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  iosKapsul: {
    height: YUZEN_TAB_SHELL_H,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  iosCamKenar: {
    ...StyleSheet.absoluteFill,
    borderRadius: PILL_RADIUS,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  iosCamTint: {
    ...StyleSheet.absoluteFill,
    borderRadius: PILL_RADIUS,
  },
  row: {
    height: YUZEN_TAB_SHELL_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_IOS ? 6 : 0,
  },
  slot: {
    flex: 1,
    height: YUZEN_TAB_SHELL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  iosSeciliHalka: {
    backgroundColor: 'rgba(232, 64, 145, 0.16)',
  },
  createWrap: {
    width: IS_IOS ? 44 : 48,
    height: IS_IOS ? 44 : 48,
    marginTop: IS_IOS ? 0 : -10,
  },
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RenkTokenlari.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  createBtnIos: {
    width: 40,
    height: 40,
    borderRadius: 20,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  createBtnAktif: {
    shadowOpacity: 0.55,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  badge: {
    position: 'absolute',
    top: IS_IOS ? 0 : -2,
    right: IS_IOS ? 0 : -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: RenkTokenlari.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RenkTokenlari.bg,
  },
  badgeText: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 12,
  },
});
