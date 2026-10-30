import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

type Props = {
  item: DirektMesaj;
  mine: boolean;
  onLongPress?: () => void;
};

/** iOS: eski ajans paket teklifleri ödeme bağlantısı olmadan bilgi kartı olarak görünür. */
export function MesajAjansPaketTeklifKarti({ onLongPress }: Props) {
  const { t } = useCeviri();
  return (
    <Pressable onLongPress={onLongPress} style={styles.kart}>
      <Ionicons name="information-circle-outline" size={18} color={RenkTokenlari.textMuted} />
      <View style={styles.metin}>
        <Text style={styles.baslik}>{t('cuzdanY.ajansTeklifIosBaslik')}</Text>
        <Text style={styles.alt}>{t('cuzdanY.iosYalnizAppStore')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    maxWidth: 280,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  metin: { flex: 1, gap: 2 },
  baslik: { color: RenkTokenlari.text, fontSize: 13, fontWeight: '700' },
  alt: { color: RenkTokenlari.textMuted, fontSize: 12, lineHeight: 16 },
});
