import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CanliCoinSimgesi } from '../../cuzdan/bilesenler/CanliCoinSimgesi';

type Props = {
  onPress: () => void;
};

export function SisSpinGirisKarti({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="SİS Spin oyna">
      <LinearGradient
        colors={['#14101c', '#241833', '#1a1208']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.kart}
      >
        <View style={styles.ust}>
          <CanliCoinSimgesi size={42} seviye={0.7} />
          <View style={styles.metin}>
            <Text style={styles.ustYazi}>CÜZDAN</Text>
            <Text style={styles.baslik}>SİS Spin</Text>
            <Text style={styles.govde}>Bahis gerçek coinden düşer. Kazanç aynı cüzdana yazılır.</Text>
          </View>
        </View>
        <View style={styles.alt}>
          <Text style={styles.bahis}>10 – 1.000 coin</Text>
          <View style={styles.cta}>
            <Text style={styles.ctaYazi}>Oyna</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 120, 0.28)',
    gap: 14,
  },
  ust: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metin: { flex: 1, gap: 2 },
  ustYazi: {
    color: 'rgba(255, 214, 120, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  baslik: { color: '#fff', fontSize: 22, fontWeight: '800' },
  govde: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
  alt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bahis: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  cta: {
    backgroundColor: '#f0d58c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaYazi: { color: '#2a1b08', fontWeight: '800' },
});
