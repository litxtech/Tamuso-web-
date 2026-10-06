import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  isMine: boolean;
  onClose: () => void;
  onGoruntuleyenler?: () => void;
  onSil?: () => void;
  onSessizeAl?: () => void;
  onBildir?: () => void;
  onArsiv?: () => void;
};

export function HikayeMenuSheet({
  visible,
  isMine,
  onClose,
  onGoruntuleyenler,
  onSil,
  onSessizeAl,
  onBildir,
  onArsiv,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();

  const satir = (
    etiket: string,
    onPress: () => void,
    tehlikeli?: boolean,
  ) => (
    <Pressable
      key={etiket}
      onPress={() => {
        onClose();
        onPress();
      }}
      style={styles.satir}
      accessibilityRole="button"
    >
      <Text style={[styles.yazi, tehlikeli && styles.tehlike]}>{etiket}</Text>
    </Pressable>
  );

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
      contentStyle={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.handle} />
      {isMine && onGoruntuleyenler
        ? satir(t('hikaye.goruntuleyenler'), onGoruntuleyenler)
        : null}
      {isMine && onArsiv ? satir(t('hikaye.arsiv'), onArsiv) : null}
      {isMine && onSil
        ? satir(
            t('ortak.sil'),
            () => {
              Alert.alert(t('hikaye.silBaslik'), t('hikaye.silSoru'), [
                { text: t('ortak.vazgec'), style: 'cancel' },
                {
                  text: t('ortak.sil'),
                  style: 'destructive',
                  onPress: onSil,
                },
              ]);
            },
            true,
          )
        : null}
      {!isMine && onSessizeAl
        ? satir(t('hikaye.sessizeAl'), onSessizeAl)
        : null}
      {!isMine && onBildir ? satir(t('hikaye.bildir'), onBildir, true) : null}
      {satir(t('ortak.kapat'), onClose)}
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 8,
  },
  satir: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  yazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  tehlike: { color: RenkTokenlari.danger },
});
