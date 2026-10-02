import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { YonluIkon } from './YonluIkon';
import { RenkTokenlari } from '../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari, HeaderTokenlari } from '../tasarim-sistemi/BoslukVeYaricapTokenlari';
import i18n from '../i18n';

type Hiza = 'start' | 'center';

export type TamusoScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Geri. Varsayılan açık. Liste kökünde kapatıp onMenu ver. */
  back?: boolean;
  onBack?: () => void;
  fallbackHref?: Href;
  /** back kapalıyken sol slot; back açıkken sağ aksiyonun soluna ikon */
  onMenu?: () => void;
  menuAccessibilityLabel?: string;
  rightAction?: React.ReactNode;
  badge?: string | number | null;
  /** Başlık satırının altında, aynı yatay gutter içinde */
  search?: React.ReactNode;
  transparent?: boolean;
  divider?: boolean;
  compact?: boolean;
  align?: Hiza;
};

type EkranBasligiProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  /** Sağ aksiyon (Kaydet, ikon, vb.) */
  right?: React.ReactNode;
  /**
   * start: geri + başlık aynı satırda grup (varsayılan)
   * center: başlık kalan alanda ortalanır; absolute katman yok
   */
  alignment?: Hiza;
  fallbackHref?: Href;
  border?: boolean;
  transparent?: boolean;
};

function cevir(anahtar: string, yedek: string) {
  try {
    return String(i18n.t(anahtar));
  } catch {
    return yedek;
  }
}

/**
 * Stack ekranlarinda once dismiss / back dener;
 * tab sifirlanmasin diye gerekirse profil (veya fallback) acilir.
 */
export function guvenliGeriDon(fallbackHref: Href = '/(tabs)/profile') {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}

/**
 * Normal sayfa başlığı.
 *
 *   ‹  Başvurular                    ⋯
 *      0 bekleyen başvuru
 *
 * Safe area bu bileşende yok. Üst inset'in sahibi Screen edges={['top']}.
 * İkinci bir SafeAreaView veya insets.top ekleme.
 *
 * Başlık akışta durur: absolute left/right, negatif margin ve width:'100%' yok.
 * Bu üçü Yoga'da başlık kutusunu flex slot'tan genişletip x < 0 bölgesine itiyordu.
 */
export function TamusoScreenHeader({
  title,
  subtitle,
  back = true,
  onBack,
  fallbackHref = '/(tabs)/profile',
  onMenu,
  menuAccessibilityLabel,
  rightAction,
  badge,
  search,
  transparent = false,
  divider = false,
  compact = false,
  align = 'start',
}: TamusoScreenHeaderProps) {
  const geriBas = onBack ?? (() => guvenliGeriDon(fallbackHref));
  const menuSol = !back && !!onMenu;
  const menuSag = back && !!onMenu;
  const ortali = align === 'center';
  const rozet =
    badge === null || badge === undefined || badge === ''
      ? null
      : String(badge);

  const geriDugme = back ? (
    <Pressable
      style={styles.hit}
      onPress={geriBas}
      hitSlop={HeaderTokenlari.backHitSlop}
      accessibilityRole="button"
      accessibilityLabel={cevir('ortak.geri', 'Back')}
    >
      <YonluIkon
        yon="chevron-back"
        size={HeaderTokenlari.iconSize}
        color={RenkTokenlari.text}
      />
    </Pressable>
  ) : null;

  const menuDugme = onMenu ? (
    <Pressable
      style={styles.hit}
      onPress={onMenu}
      hitSlop={HeaderTokenlari.backHitSlop}
      accessibilityRole="button"
      accessibilityLabel={menuAccessibilityLabel ?? cevir('anaSayfa.menu', 'Menu')}
    >
      <Ionicons name="menu" size={22} color={RenkTokenlari.text} />
    </Pressable>
  ) : null;

  const metin = (
    <View
      style={[styles.metin, ortali && styles.metinOrta]}
      pointerEvents={ortali ? 'none' : 'auto'}
    >
      <View style={styles.baslikSatir}>
        <Text
          style={[styles.title, compact && styles.titleCompact, ortali && styles.ortaliMetin]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {rozet ? (
          <View style={styles.rozet}>
            <Text style={styles.rozetYazi} numberOfLines={1}>
              {rozet}
            </Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text
          style={[styles.sub, ortali && styles.ortaliMetin]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  const sagIcerik = menuSag || rightAction;
  const sag = sagIcerik ? (
    <View style={styles.sag}>
      {menuSag ? menuDugme : null}
      {rightAction}
    </View>
  ) : null;

  const sol = menuSol ? menuDugme : geriDugme;

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        divider && !transparent && styles.wrapDivider,
      ]}
    >
      <View style={styles.satir}>
        {ortali ? (
          <>
            <View style={styles.yan}>{sol}</View>
            {metin}
            <View style={[styles.yan, styles.yanSon]}>{sag}</View>
          </>
        ) : (
          <>
            {sol}
            {metin}
            {sag}
          </>
        )}
      </View>
      {search ? <View style={styles.arama}>{search}</View> : null}
    </View>
  );
}

/** Mevcut ekranların kullandığı kapı. Yerleşim TamusoScreenHeader'da. */
export function EkranBasligi({
  title,
  subtitle,
  onBack,
  showBack = true,
  right,
  alignment = 'start',
  fallbackHref = '/(tabs)/profile',
  border = false,
  transparent = false,
}: EkranBasligiProps) {
  return (
    <TamusoScreenHeader
      title={title}
      subtitle={subtitle}
      back={showBack}
      onBack={onBack}
      fallbackHref={fallbackHref}
      rightAction={right}
      divider={border}
      transparent={transparent}
      align={alignment}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.paddingTop,
    paddingBottom: HeaderTokenlari.paddingBottom,
  },
  wrapCompact: {
    paddingTop: 0,
    paddingBottom: BoslukTokenlari.sm,
  },
  wrapDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HeaderTokenlari.minHeight,
    gap: BoslukTokenlari.xs,
  },
  hit: {
    width: HeaderTokenlari.touchTarget,
    height: HeaderTokenlari.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  yan: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  yanSon: {
    alignItems: 'flex-end',
  },
  metin: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: HeaderTokenlari.titleSubtitleGap,
  },
  metinOrta: {
    flex: 2,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: BoslukTokenlari.sm,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    color: RenkTokenlari.text,
    fontSize: HeaderTokenlari.titleSize,
    lineHeight: HeaderTokenlari.titleLineHeight,
    fontWeight: '700',
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: HeaderTokenlari.compactTitleSize,
    lineHeight: HeaderTokenlari.compactTitleLineHeight,
  },
  ortaliMetin: {
    textAlign: 'center',
  },
  sub: {
    color: RenkTokenlari.textMuted,
    fontSize: HeaderTokenlari.subtitleSize,
    lineHeight: HeaderTokenlari.subtitleLineHeight,
    fontWeight: '500',
    letterSpacing: 0,
  },
  rozet: {
    flexShrink: 0,
    minHeight: 20,
    paddingHorizontal: BoslukTokenlari.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  rozetYazi: {
    color: RenkTokenlari.primarySoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sag: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: HeaderTokenlari.touchTarget,
  },
  arama: {
    marginTop: BoslukTokenlari.sm,
    minWidth: 0,
  },
});
