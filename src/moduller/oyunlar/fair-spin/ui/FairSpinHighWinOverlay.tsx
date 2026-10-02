import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { playFairSpinLightning } from '../ses/FairSpinAudio';
import { useCeviri } from '../../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../../i18n/diller';

type Props = {
  visible: boolean;
  multiplier: number;
  payout: number;
  onClose: () => void;
};

export function FairSpinHighWinOverlay({
  visible,
  multiplier,
  payout,
  onClose,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil] ?? 'tr-TR';

  useEffect(() => {
    if (!visible) return;
    playFairSpinLightning();
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.flash} />
        <View style={styles.card}>
          <Text style={styles.title}>{t('oyun.fairSpinPremium')}</Text>
          <LinearGradient
            colors={['#f8e7b5', '#e6ce92', '#8a733f', '#e6ce92']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.circleRim}
          >
            <View style={styles.circle}>
              <Text style={styles.mult}>{multiplier}x</Text>
            </View>
          </LinearGradient>
          <Text style={styles.label}>{t('oyun.fairSpinOdul')}</Text>
          <Text style={styles.payout}>
            {Math.floor(payout).toLocaleString(locale)}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,21,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,231,181,0.08)',
  },
  card: { alignItems: 'center', width: '100%', maxWidth: 340 },
  title: {
    fontSize: 22,
    letterSpacing: 6,
    color: '#f8e7b5',
    fontWeight: '300',
    marginBottom: 20,
  },
  circleRim: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 4,
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 64,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  mult: { fontSize: 40, fontWeight: '900', color: '#fff' },
  label: {
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  payout: { fontSize: 32, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
});
