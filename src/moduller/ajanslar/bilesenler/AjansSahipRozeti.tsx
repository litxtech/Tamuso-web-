import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  compact?: boolean;
};

/** Ajans sahibi için altın arma. Düz metin pill değil. */
export function AjansSahipRozeti({ compact = false }: Props) {
  const { t } = useCeviri();
  return (
    <LinearGradient
      colors={['#F8E7A2', '#E2B657', '#8C5A16']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, compact && styles.compact]}
      accessibilityRole="image"
      accessibilityLabel={t('ajans.sahipUnvan')}
    >
      <Ionicons name="ribbon" size={compact ? 12 : 14} color="#2A1A08" />
      <Text style={[styles.yazi, compact && styles.yaziCompact]}>{t('ajans.sahipUnvan')}</Text>
    </LinearGradient>
  );
}

export function AjansSahipIsareti() {
  const { t } = useCeviri();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('ajans.sahipUnvan')}
      style={styles.nokta}
    >
      <Ionicons name="ribbon" size={11} color="#E2B657" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  yazi: {
    ...TipografiTokenlari.micro,
    color: '#2A1A08',
    fontWeight: '800',
  },
  yaziCompact: {
    fontSize: 10,
  },
  nokta: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 182, 87, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(226, 182, 87, 0.55)',
  },
});
