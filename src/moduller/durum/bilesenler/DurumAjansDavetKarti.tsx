import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { DurumAjansDavetPayload } from '../islemler/DurumIslemleri';
import { useCeviri } from '../../../i18n/useCeviri';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../../i18n/diller';
import i18n from '../../../i18n';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

function sayi(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  const dil = DilNormalizeEt(i18n.language);
  return Math.floor(v).toLocaleString(DIL_LOCALE_MAP[dil] ?? dil);
}

type Props = {
  payload: DurumAjansDavetPayload;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DurumAjansDavetKarti({ payload, compact, style }: Props) {
  const { t } = useCeviri();

  const katil = () => {
    router.push({
      pathname: '/ajans/katil',
      params: { kod: payload.invite_code },
    } as any);
  };

  return (
    <LinearGradient
      colors={['#2A1840', '#1A1028', '#120818']}
      style={[styles.kart, compact && styles.kartKompakt, style]}
    >
      <View style={styles.baslikSatir}>
        <MaterialCommunityIcons name="domain" size={compact ? 16 : 20} color="#F0D78C" />
        <Text style={[styles.ad, compact && styles.adKompakt]} numberOfLines={compact ? 2 : 1}>
          {payload.agency_name}
        </Text>
      </View>

      <View style={styles.istatistik}>
        <View style={styles.hucre}>
          <Text style={styles.deger}>{sayi(payload.uye_sayisi)}</Text>
          <Text style={styles.etiket} numberOfLines={1}>
            {t('ajans.statUye')}
          </Text>
        </View>
        <View style={styles.hucre}>
          <Text style={styles.deger}>{sayi(payload.islem_hacmi)}</Text>
          <Text style={styles.etiket} numberOfLines={1}>
            {t('ajans.statIslemHacmi')}
          </Text>
        </View>
        <View style={styles.hucre}>
          <Text style={styles.deger}>{sayi(payload.dakika)}</Text>
          <Text style={styles.etiket} numberOfLines={1}>
            {t('ajans.statDakika')}
          </Text>
        </View>
      </View>

      {compact ? null : (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            katil();
          }}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={t('host.ajansaKatil')}
        >
          <Text style={styles.ctaYazi}>{t('host.ajansaKatil')}</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  kart: {
    padding: 16,
    gap: 14,
    minHeight: 168,
  },
  kartKompakt: {
    flex: 1,
    padding: 8,
    gap: 8,
    minHeight: 0,
    justifyContent: 'center',
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ad: {
    ...TipografiTokenlari.h2,
    color: '#FFF6D6',
    fontSize: 18,
    flex: 1,
  },
  adKompakt: {
    fontSize: 13,
  },
  istatistik: {
    flexDirection: 'row',
    gap: 6,
  },
  hucre: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
  },
  deger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 14,
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E84091',
  },
  ctaYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
