/**
 * Lobi altı — politika kısayolları (dinamik CMS).
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PolitikalariListele } from '../../politikalar/islemler/PolitikaIslemleri';
import type { PolitikaGorunum } from '../../politikalar/tipler/PolitikaTipleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  onSec: (p: PolitikaGorunum) => void;
};

export function LobiPolitikaLinkleri({ onSec }: Props) {
  const { t } = useCeviri();
  const [liste, setListe] = useState<PolitikaGorunum[]>([]);

  useEffect(() => {
    void PolitikalariListele('all')
      .then(setListe)
      .catch(() => setListe([]));
  }, []);

  if (!liste.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.baslik}>{t('lobi.platformPolitikalari')}</Text>
      <Text style={styles.alt}>{t('lobi.platformPolitikaAlt')}</Text>
      <View style={styles.row}>
        {liste.map((p) => (
          <Pressable
            key={p.kod}
            style={[
              styles.chip,
              p.kod === 'child_safety' && styles.chipDanger,
            ]}
            onPress={() => onSec(p)}
          >
            <Ionicons
              name={
                p.kod === 'child_safety'
                  ? 'shield-checkmark'
                  : p.kod === 'privacy'
                    ? 'lock-closed'
                    : 'document-text'
              }
              size={14}
              color={
                p.kod === 'child_safety'
                  ? RenkTokenlari.danger
                  : RenkTokenlari.primarySoft
              }
            />
            <Text
              style={[
                styles.chipYazi,
                p.kod === 'child_safety' && styles.chipYaziDanger,
              ]}
              numberOfLines={1}
            >
              {p.linkEtiketi}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(18,16,24,0.72)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232,64,145,0.12)',
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  chipDanger: {
    backgroundColor: 'rgba(232,75,106,0.14)',
    borderColor: 'rgba(232,75,106,0.45)',
  },
  chipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  chipYaziDanger: {
    color: RenkTokenlari.danger,
  },
});
