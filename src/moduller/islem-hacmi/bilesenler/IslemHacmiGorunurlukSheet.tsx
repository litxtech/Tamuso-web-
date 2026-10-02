import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { IslemHacmiMetin } from '../metinler/IslemHacmiMetinleri';
import { useCeviri } from '../../../i18n/useCeviri';
import type { IslemHacmiGorunurluk } from '../tipler';

type Props = {
  visible: boolean;
  secili: IslemHacmiGorunurluk;
  onSec: (v: IslemHacmiGorunurluk) => void;
  onKapat: () => void;
};

/** Alt sayfa — FULL / TIER_ONLY / PRIVATE radyo seçimi */
export function IslemHacmiGorunurlukSheet({ visible, secili, onSec, onKapat }: Props) {
  const { dil } = useCeviri();
  const m = IslemHacmiMetin(dil);
  const insets = useSafeAreaInsets();

  const secenekler: {
    deger: IslemHacmiGorunurluk;
    baslik: string;
    aciklama: string;
    ikon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { deger: 'FULL', baslik: m.gorunurlukFull, aciklama: m.gorunurlukFullAlt, ikon: 'eye-outline' },
    { deger: 'TIER_ONLY', baslik: m.gorunurlukTier, aciklama: m.gorunurlukTierAlt, ikon: 'ribbon-outline' },
    { deger: 'PRIVATE', baslik: m.gorunurlukPrivate, aciklama: m.gorunurlukPrivateAlt, ikon: 'eye-off-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onKapat}
      statusBarTranslucent
    >
      <Pressable style={styles.maske} onPress={onKapat}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + BoslukTokenlari.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.tutamac} />
          <Text style={styles.baslik}>{m.gorunurlukBaslik}</Text>
          <Text style={styles.alt}>{m.gorunurlukAlt}</Text>

          {secenekler.map((s) => {
            const aktif = s.deger === secili;
            return (
              <Pressable
                key={s.deger}
                style={[styles.satir, aktif && styles.satirAktif]}
                onPress={() => onSec(s.deger)}
                accessibilityRole="radio"
                accessibilityState={{ selected: aktif }}
              >
                <View style={[styles.ikonWrap, aktif && styles.ikonAktif]}>
                  <Ionicons
                    name={s.ikon}
                    size={18}
                    color={aktif ? RenkTokenlari.accent : RenkTokenlari.textMuted}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.satirBaslik}>{s.baslik}</Text>
                  <Text style={styles.satirAlt}>{s.aciklama}</Text>
                </View>
                <Ionicons
                  name={aktif ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={aktif ? RenkTokenlari.primary : RenkTokenlari.textDim}
                />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  maske: {
    flex: 1,
    backgroundColor: RenkTokenlari.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.sm,
  },
  tutamac: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.sm,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  satirAktif: {
    borderColor: RenkTokenlari.borderAccent,
  },
  ikonWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  ikonAktif: {
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  copy: { flex: 1, gap: 2 },
  satirBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  satirAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 17,
  },
});
