import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OdaTemasiniCoz } from '../../oda-olusturma/katalog/OdaTemaKatalogu';

type Props = {
  yogunluk?: 'kapali' | 'hafif' | 'normal';
  /** Seçili oda teması — aura rengi temaya uyum sağlar */
  themeCode?: string | null;
};

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  const h = hex.replace('#', '');
  if (h.length === 6) return `#${h}${a}`;
  if (h.length === 8) return `#${h.slice(0, 6)}${a}`;
  return hex;
}

/**
 * Sesli oda sahnesi — tema uyumlu sabit aura.
 * Sürekli nabız tüm sahneyi her karede yeniden boyayıp kasıyordu.
 */
export function OdaCanliAtmosfer({ yogunluk = 'hafif', themeCode }: Props) {
  const tema = useMemo(() => OdaTemasiniCoz(themeCode), [themeCode]);

  if (yogunluk === 'kapali') return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.aura, yogunluk === 'normal' ? styles.auraNormal : styles.auraHafif]}>
        <LinearGradient
          colors={[
            hexAlpha(tema.vurgu, 0.32),
            hexAlpha(tema.renkler[0], 0.14),
            'transparent',
          ]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View
        style={[
          styles.halka,
          { borderColor: tema.vurgu, opacity: 0.045 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: 'absolute',
    alignSelf: 'center',
    top: '12%',
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: 'hidden',
  },
  auraHafif: { opacity: 0.06 },
  auraNormal: { opacity: 0.08 },
  halka: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
});
