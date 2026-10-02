import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { DuyuruBelge } from '../tipler';

type Props = {
  belge: DuyuruBelge | null | undefined;
  rtl?: boolean;
};

export function DuyuruZenginMetin({ belge, rtl }: Props) {
  const blocks = belge?.blocks ?? [];
  const yazi: { textAlign: 'right' | 'left'; writingDirection: 'rtl' | 'ltr' } = rtl
    ? { textAlign: 'right', writingDirection: 'rtl' }
    : { textAlign: 'left', writingDirection: 'ltr' };

  if (blocks.length === 0) return null;

  return (
    <View style={styles.kutu}>
      {blocks.map((blok, i) => {
        if (blok.type === 'divider') {
          return <View key={i} style={styles.cizgi} />;
        }
        if (blok.type === 'list') {
          return (
            <View key={i} style={styles.liste}>
              {(blok.items ?? []).map((madde, j) => (
                <Text key={j} style={[styles.govde, yazi]}>
                  {blok.ordered ? `${j + 1}. ` : '• '}
                  {madde}
                </Text>
              ))}
            </View>
          );
        }
        if (blok.type === 'link') {
          return (
            <Text
              key={i}
              style={[styles.link, yazi]}
              onPress={() => {
                if (blok.url?.startsWith('https://')) void Linking.openURL(blok.url);
              }}
            >
              {blok.text}
            </Text>
          );
        }
        const stil = [
          blok.type === 'heading' ? styles.baslik : styles.govde,
          blok.type === 'quote' ? styles.alinti : null,
          blok.bold ? styles.kalin : null,
          blok.italic ? styles.italik : null,
          yazi,
        ];
        return (
          <Text key={i} style={stil}>
            {blok.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: BoslukTokenlari.sm },
  baslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  govde: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  alinti: {
    borderLeftWidth: 3,
    borderLeftColor: RenkTokenlari.primarySoft,
    paddingLeft: BoslukTokenlari.sm,
    color: RenkTokenlari.textMuted,
  },
  link: { ...TipografiTokenlari.body, color: RenkTokenlari.accent, textDecorationLine: 'underline' },
  kalin: { fontWeight: '700' },
  italik: { fontStyle: 'italic' },
  liste: { gap: 4 },
  cizgi: { height: 1, backgroundColor: RenkTokenlari.border, marginVertical: BoslukTokenlari.xs },
});
