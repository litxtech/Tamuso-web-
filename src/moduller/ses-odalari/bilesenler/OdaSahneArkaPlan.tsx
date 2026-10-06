import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OdaTemasiniCoz } from '../../oda-olusturma/katalog/OdaTemaKatalogu';

type Props = {
  /** Özel yüklenen kapak / arka plan URL — varsa temanın üstüne biner */
  url?: string | null;
  /** Modern gradient tema kodu */
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
 * Ses odası tam ekran arka plan.
 * Tek gradient — üst üste binen atmosfer katmanları GPU'yu sürekli boyuyordu.
 */
export function OdaSahneArkaPlan({ url, themeCode }: Props) {
  const uri = url?.trim() || null;
  const tema = useMemo(() => OdaTemasiniCoz(themeCode), [themeCode]);

  return (
    <View pointerEvents="none" style={styles.kutu} collapsable={false}>
      <LinearGradient
        colors={[...tema.renkler]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[hexAlpha(tema.vurgu, 0.16), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.kapak}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <LinearGradient
        colors={
          uri
            ? ['rgba(8,4,14,0.55)', 'rgba(8,4,14,0.42)', 'rgba(8,4,14,0.72)']
            : ['rgba(8,4,14,0.22)', 'rgba(8,4,14,0.12)', 'rgba(8,4,14,0.55)']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const kapakWeb: ViewStyle =
  Platform.OS === 'web'
    ? ({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
      } as ViewStyle)
    : StyleSheet.absoluteFillObject;

const styles = StyleSheet.create({
  kutu: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  kapak: kapakWeb,
});
