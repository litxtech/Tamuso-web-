import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

type Props = {
  value: number;
  label?: string | number | null;
  /** Yan yana profil satırı — ziyaret profiliyle aynı kompakt kart */
  kompakt?: boolean;
};

const GOLD = ['#FFF6D1', '#F5E6A8', '#D4AF37', '#B8860B'] as const;
const GOLD_EDGE = ['#FFE9A0', '#C9A227', '#8B6914'] as const;

/** Profilde altın kaplama hesap değeri rozeti (güven / kalite skoru). */
export function HesapDegeriRozeti({ value, label, kompakt = false }: Props) {
  const { t } = useCeviri();
  const skor = Math.max(
    0,
    Math.min(1000, Math.round(Number(value) || 0)),
  );
  const ham =
    typeof label === 'string'
      ? label.trim()
      : label != null
        ? String(label).trim()
        : '';
  const etiket = (ham || t(HesapDegeriEtiketAnahtari(skor))).toUpperCase();

  return (
    <View
      style={[styles.wrap, kompakt && styles.wrapKompakt]}
      accessibilityLabel={t('profil.hesapDegeriA11y', { skor, etiket })}
    >
      <LinearGradient
        colors={[...GOLD_EDGE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.edge, kompakt && styles.edgeFill]}
      >
        <LinearGradient
          colors={[...GOLD]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, kompakt && styles.innerFill]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={14} color="#3A2A08" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.kicker} numberOfLines={1}>
              {t('profil.hesapDegeri').toUpperCase()}
            </Text>
            <View style={styles.skorSatir}>
              <Text style={styles.skor} numberOfLines={1}>
                {skor}
              </Text>
              <Text style={styles.etiket} numberOfLines={1}>
                {etiket}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

export function HesapDegeriEtiketAnahtari(score: number): CeviriAnahtari {
  if (score >= 750) return 'profil.degerPrestijli';
  if (score >= 550) return 'profil.degerYuksekGuven';
  if (score >= 350) return 'profil.degerGuvenilir';
  if (score >= 150) return 'profil.degerYukselen';
  return 'profil.degerYeni';
}

/** @deprecated — UI için t(HesapDegeriEtiketAnahtari(score)) kullan */
export function HesapDegeriEtiketi(score: number): string {
  // Lazy import avoids circular init; callers should prefer HesapDegeriEtiketAnahtari + t()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const i18n = require('../../../i18n').default as {
    t: (k: string) => string;
  };
  return i18n.t(HesapDegeriEtiketAnahtari(score));
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  wrapKompakt: {
    marginTop: 0,
    alignSelf: 'stretch',
    width: '100%',
    flex: 1,
  },
  edge: {
    borderRadius: 14,
    padding: 1.5,
  },
  edgeFill: {
    flex: 1,
  },
  inner: {
    borderRadius: 12.5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,246,209,0.55)',
  },
  innerFill: {
    flex: 1,
    minHeight: 58,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(58,42,8,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
  },
  kicker: {
    ...TipografiTokenlari.micro,
    color: 'rgba(58,42,8,0.72)',
    fontWeight: '800',
    letterSpacing: 0.8,
    fontSize: 9,
  },
  skorSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  skor: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#3A2A08',
    letterSpacing: 0.2,
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: '#5C4510',
    fontWeight: '800',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
});
