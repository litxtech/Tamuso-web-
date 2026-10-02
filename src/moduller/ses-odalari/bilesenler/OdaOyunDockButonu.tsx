import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  aktif: boolean;
  onPress: () => void;
};

/**
 * Ses odası sahnesinin sağ altındaki oyun kısayolu — ekran dışına taşmaz.
 */
export function OdaOyunDockButonu({ aktif, onPress }: Props) {
  const { t } = useCeviri();
  const iconSize = Platform.OS === 'android' ? 18 : 20;
  const gradient = aktif
    ? ([...colors.gradientGold] as [string, string])
    : ([...colors.gradientDiamond] as [string, string]);

  return (
    <View style={styles.btnSlot}>
      <View pointerEvents="none" style={[styles.aura, aktif && styles.auraAktif]} />
      <Pressable
        onPress={onPress}
        style={[styles.btn, aktif && styles.btnAktif]}
        accessibilityLabel={t('oyun.baslik')}
      >
        <LinearGradient colors={gradient} style={styles.inner}>
          <Ionicons name="game-controller" size={iconSize} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const BTN = Platform.OS === 'android' ? 40 : 48;
const R = BTN / 2;

const styles = StyleSheet.create({
  btnSlot: {
    width: BTN,
    height: BTN,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aura: {
    position: 'absolute',
    width: BTN + 8,
    height: BTN + 8,
    borderRadius: (BTN + 8) / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
  auraAktif: {
    backgroundColor: 'rgba(240, 180, 41, 0.45)',
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: R,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.65)',
  },
  btnAktif: {
    borderColor: 'rgba(240, 180, 41, 0.8)',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
