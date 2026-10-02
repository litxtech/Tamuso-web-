import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { IslemHacmiMetin } from '../metinler/IslemHacmiMetinleri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { useCeviri } from '../../../i18n/useCeviri';
import { formatTierLabel, formatTryExact } from '../utils/IslemHacmiFormat';
import type { BenimIslemHacmim, KamuIslemHacmi } from '../tipler';

type Props = {
  mode: 'own' | 'public';
  data: BenimIslemHacmim | KamuIslemHacmi | null;
  onPress?: () => void;
  onMenu?: () => void;
  /** Yan yana — ziyaret profiliyle aynı kompakt kart */
  kompakt?: boolean;
};

const KENAR = [
  'rgba(232,64,145,0.55)',
  'rgba(139,92,246,0.55)',
  'rgba(34,211,238,0.55)',
] as const;
const ZEMIN = [
  'rgba(232,64,145,0.10)',
  'rgba(139,92,246,0.08)',
  'rgba(34,211,238,0.10)',
] as const;

/** Profil kartı — İşlem Hacmi (ziyaret / kendi profil aynı kompakt görünüm). */
export function IslemHacmiKart({
  mode,
  data,
  onPress,
  onMenu,
  kompakt = false,
}: Props) {
  const { dil } = useCeviri();
  const m = IslemHacmiMetin(dil);
  const sayiLocale = DIL_LOCALE_MAP[dil];

  if (!data || !data.enabled) return null;
  const sahip = mode === 'own' || data.is_owner;
  if (!sahip && (data.visible === false || data.visibility === 'PRIVATE')) {
    return null;
  }

  const gizliSahip = sahip && data.visibility === 'PRIVATE';
  const tamGoster = sahip || data.visibility === 'FULL';
  const deger = tamGoster
    ? formatTryExact(data.amount_try, sayiLocale)
    : formatTierLabel(data.tier, data.display_label);
  const alt = gizliSahip
    ? m.kartGizliSahibi
    : data.tier && (sahip || data.show_badge)
      ? formatTierLabel(data.tier)
      : m.kartAltBaslik;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onLongPress={mode === 'own' ? onMenu : undefined}
      style={({ pressed }) => [
        styles.wrap,
        kompakt && styles.wrapKompakt,
        pressed && styles.pressed,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${m.kartBaslik}: ${deger}`}
    >
      <LinearGradient
        colors={[...KENAR]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.kenar, kompakt && styles.kenarFill]}
      >
        <View style={[styles.ic, kompakt && styles.icFill]}>
          <LinearGradient
            colors={[...ZEMIN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ikonWrap}>
            <Ionicons name="diamond" size={14} color={RenkTokenlari.accent} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.baslik} numberOfLines={1}>
              {m.kartBaslik}
            </Text>
            <View style={styles.degerSatir}>
              <Text
                style={[styles.deger, kompakt && styles.degerKompakt]}
                numberOfLines={1}
              >
                {deger}
              </Text>
            </View>
            {!kompakt ? (
              <Text style={styles.alt} numberOfLines={1}>
                {alt}
              </Text>
            ) : gizliSahip ? (
              <Text style={styles.alt} numberOfLines={1}>
                {m.kartGizliSahibi}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginTop: BoslukTokenlari.md,
  },
  wrapKompakt: {
    marginTop: 0,
    alignSelf: 'stretch',
    width: '100%',
    flex: 1,
  },
  pressed: { opacity: 0.92 },
  kenar: {
    borderRadius: 14,
    padding: 1.5,
  },
  kenarFill: {
    flex: 1,
  },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12.5,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  icFill: {
    flex: 1,
    minHeight: 58,
  },
  ikonWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  copy: { flex: 1, minWidth: 0 },
  baslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '800',
    fontSize: 9,
  },
  degerSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  deger: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  degerKompakt: {
    fontSize: 18,
    lineHeight: 22,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 1,
  },
});
