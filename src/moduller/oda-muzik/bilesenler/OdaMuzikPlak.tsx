/**
 * Oda sahibi kartının altında — sabit plak + şarkı adı (herkese görünür).
 * Kontrol yok; sadece “şimdi çalıyor” göstergesi.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  title: string;
  artistName?: string | null;
  coverUrl?: string | null;
  spinning?: boolean;
};

function OdaMuzikPlakInner({ title, artistName, coverUrl }: Props) {
  const { t } = useCeviri();
  const cover = MedyaUriGuvenli(coverUrl);

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={t('odaMuzik.caliyorA11y', { title })}
      accessible
    >
      <View style={styles.plak}>
        <View style={styles.plakDis}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverBos]}>
              <Ionicons
                name="musical-notes"
                size={10}
                color={RenkTokenlari.primarySoft}
              />
            </View>
          )}
          <View style={styles.merkez} />
        </View>
      </View>
      <View style={styles.metin}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {artistName ? (
          <Text style={styles.artist} numberOfLines={1}>
            {artistName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const OdaMuzikPlak = memo(OdaMuzikPlakInner);

const PLAK = 28;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    maxWidth: 168,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 10, 18, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  plak: {
    width: PLAK,
    height: PLAK,
  },
  plakDis: {
    width: PLAK,
    height: PLAK,
    borderRadius: PLAK / 2,
    backgroundColor: '#1a1218',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cover: {
    width: PLAK - 8,
    height: PLAK - 8,
    borderRadius: (PLAK - 8) / 2,
  },
  coverBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.15)',
  },
  merkez: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0a0610',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  metin: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 10,
  },
  artist: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
    marginTop: 1,
  },
});
