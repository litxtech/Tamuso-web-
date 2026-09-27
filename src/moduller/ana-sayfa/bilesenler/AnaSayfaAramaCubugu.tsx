import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { kullaniciTemaKodunuAl } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  deger: string;
  onDegisti: (deger: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  /** Header satırında — dış boşluk ve gölge yok */
  gomulu?: boolean;
};

const KUTU_H = 44;

/** Ana keşif arama — metin kutunun içinde ortalanır */
export function AnaSayfaAramaCubugu({
  deger,
  onDegisti,
  placeholder,
  onSubmit,
  gomulu,
}: Props) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const acik = kullaniciTemaKodunuAl() === 'acik';
  const yerTutucu = placeholder ?? t('anaSayfa.aramaPlaceholder');

  return (
    <View
      style={[
        styles.dis,
        gomulu && styles.gomulu,
        !gomulu && {
          backgroundColor: acik ? RenkTokenlari.bgGlass : RenkTokenlari.bgCard,
          borderColor: acik ? RenkTokenlari.border : 'rgba(139,92,246,0.22)',
        },
      ]}
    >
      <View style={styles.wrap}>
        <View
          style={[
            styles.ikonKutu,
            { backgroundColor: 'rgba(232,64,145,0.12)' },
          ]}
        >
          <Ionicons name="search" size={16} color={RenkTokenlari.primarySoft} />
        </View>
        <TextInput
          value={deger}
          onChangeText={onDegisti}
          placeholder={yerTutucu}
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          multiline={false}
          numberOfLines={1}
          textAlignVertical="center"
          underlineColorAndroid="transparent"
          onSubmitEditing={onSubmit}
          accessibilityLabel={t('anaSayfa.aramaA11y')}
          {...(Platform.OS === 'android'
            ? { includeFontPadding: false }
            : null)}
        />
        {deger.length > 0 ? (
          <Pressable
            onPress={() => onDegisti('')}
            hitSlop={8}
            accessibilityLabel={t('anaSayfa.aramaTemizle')}
            style={styles.temizle}
          >
            <Ionicons name="close-circle" size={18} color={RenkTokenlari.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dis: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    height: KUTU_H,
  },
  gomulu: {
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    height: KUTU_H,
  },
  ikonKutu: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: KUTU_H,
    margin: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    color: RenkTokenlari.text,
    fontSize: 14,
    lineHeight: Platform.OS === 'ios' ? 18 : undefined,
    fontWeight: '500',
  },
  temizle: {
    height: KUTU_H,
    justifyContent: 'center',
  },
});
