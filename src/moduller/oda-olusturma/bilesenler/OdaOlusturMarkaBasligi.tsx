import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  ozet?: string;
  geriMi?: boolean;
  onGeri?: () => void;
  baslik?: string;
  fisilti?: string;
};

export function OdaOlusturMarkaBasligi({
  ozet,
  geriMi,
  onGeri,
  baslik,
  fisilti,
}: Props) {
  const { t } = useCeviri();
  const baslikMetin = baslik ?? t('canli.gecBaslik');
  const fisiltiMetin = fisilti ?? t('canli.gecFisilti');

  return (
    <View style={styles.wrap}>
      <View style={styles.ust}>
        {geriMi ? (
          <Pressable
            onPress={onGeri}
            style={({ pressed }) => [styles.geriBtn, pressed && styles.geriPressed]}
            accessibilityLabel={t('ortak.geri')}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
          </Pressable>
        ) : null}
        <View style={styles.markaBlok}>
          <Text style={styles.fisilti}>{fisiltiMetin}</Text>
          <Text style={styles.baslik}>{baslikMetin}</Text>
          {ozet ? <Text style={styles.alt}>{ozet}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingTop: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.md,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.sm,
  },
  geriBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 4,
  },
  geriPressed: {
    opacity: 0.85,
  },
  markaBlok: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  fisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.6,
    fontSize: 10,
    lineHeight: 13,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    letterSpacing: -0.5,
    fontSize: 28,
    lineHeight: 34,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
});
