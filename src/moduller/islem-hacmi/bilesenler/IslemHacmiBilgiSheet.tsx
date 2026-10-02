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
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  onKapat: () => void;
};

/** Alt sayfa — "çekilebilir bakiye değildir" bilgilendirmesi */
export function IslemHacmiBilgiSheet({ visible, onKapat }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();

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
          <View style={styles.baslikSatir}>
            <View style={styles.ikonWrap}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={RenkTokenlari.accent}
              />
            </View>
            <Text style={styles.baslik}>{t('islemHacmi.bilgiBaslik')}</Text>
          </View>
          <Text style={styles.metin}>{t('islemHacmi.bilgiMetin')}</Text>
          <Pressable style={styles.btn} onPress={onKapat} accessibilityRole="button">
            <Text style={styles.btnYazi}>{t('islemHacmi.bilgiKapat')}</Text>
          </Pressable>
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
    gap: BoslukTokenlari.md,
  },
  tutamac: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.xs,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  ikonWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    flex: 1,
  },
  metin: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    lineHeight: 22,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
