import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  numara: string | null;
  gorunen: string | null;
  onKapat: () => void;
};

export function MesajTelefonKarti({ numara, gorunen, onKapat }: Props) {
  const { t } = useCeviri();
  const [kopyalandi, setKopyalandi] = useState(false);
  const acik = !!numara;
  const etiket = gorunen?.trim() || numara || '';

  const ara = () => {
    if (!numara) return;
    void Haptics.selectionAsync();
    void Linking.openURL(`tel:${numara}`);
    onKapat();
  };

  const sms = () => {
    if (!numara) return;
    void Haptics.selectionAsync();
    void Linking.openURL(`sms:${numara}`);
    onKapat();
  };

  const whatsapp = () => {
    if (!numara) return;
    const hane = numara.replace(/\D/g, '');
    if (!hane) return;
    void Haptics.selectionAsync();
    void Linking.openURL(`https://wa.me/${hane}`);
    onKapat();
  };

  const kopyala = () => {
    if (!etiket) return;
    void Haptics.selectionAsync();
    void Clipboard.setStringAsync(etiket);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1400);
  };

  return (
    <TamusoModal visible={acik} onClose={onKapat} placement="bottom" animationType="slide">
      <View style={styles.kart}>
        <View style={styles.kulp} />
        <View style={styles.rozet}>
          <Ionicons name="call" size={22} color={RenkTokenlari.textOnPrimary} />
        </View>
        <Text style={styles.numara} accessibilityRole="header">
          {etiket}
        </Text>
        <Pressable
          style={styles.satir}
          onPress={ara}
          accessibilityRole="button"
          accessibilityLabel={t('ortak.ara')}
        >
          <Ionicons name="call-outline" size={20} color={RenkTokenlari.mint} />
          <Text style={styles.satirYazi}>{t('ortak.ara')}</Text>
        </Pressable>
        <Pressable
          style={styles.satir}
          onPress={sms}
          accessibilityRole="button"
          accessibilityLabel={t('mesajSohbet.telefonSms')}
        >
          <Ionicons name="chatbubble-outline" size={20} color={RenkTokenlari.primarySoft} />
          <Text style={styles.satirYazi}>{t('mesajSohbet.telefonSms')}</Text>
        </Pressable>
        <Pressable
          style={styles.satir}
          onPress={whatsapp}
          accessibilityRole="button"
          accessibilityLabel={t('mesajSohbet.telefonWhatsapp')}
        >
          <Ionicons name="logo-whatsapp" size={20} color={RenkTokenlari.mint} />
          <Text style={styles.satirYazi}>{t('mesajSohbet.telefonWhatsapp')}</Text>
        </Pressable>
        <Pressable
          style={styles.satir}
          onPress={kopyala}
          accessibilityRole="button"
          accessibilityLabel={t('ortak.kopyala')}
        >
          <Ionicons name="copy-outline" size={20} color={RenkTokenlari.textMuted} />
          <Text style={styles.satirYazi}>
            {kopyalandi ? t('ortak.kopyalandi') : t('ortak.kopyala')}
          </Text>
        </Pressable>
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  kart: {
    marginHorizontal: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.xl,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
  },
  kulp: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.sm,
  },
  rozet: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  numara: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    textAlign: 'center',
    marginBottom: BoslukTokenlari.sm,
  },
  satir: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.pressFill,
  },
  satirYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
});
