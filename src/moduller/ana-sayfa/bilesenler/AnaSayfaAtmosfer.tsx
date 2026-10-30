import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { premiumAtmosferLekeleri } from '../../../tasarim-sistemi/premium/PremiumAmbient';
import { temaKodunuAl } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import {
  YUMUSAK_MOR_KATMANLAR,
  YUMUSAK_MOR_ZEMIN,
} from './yumusakMorIsik';

/** Ana sayfa ambient — kaydırılmaz. Koyu ana ekranda kenar ışığı; diğerlerinde mevcut lekeler. */
export function AnaSayfaAtmosfer({
  yumusakMorIsik = false,
}: {
  yumusakMorIsik?: boolean;
}) {
  useTemayaAboneOl();
  if (yumusakMorIsik && temaKodunuAl() === 'koyu') {
    return (
      <View style={styles.zemin} pointerEvents="none">
        {YUMUSAK_MOR_KATMANLAR.map((katman) => (
          <LinearGradient
            key={katman.id}
            colors={[...katman.colors]}
            locations={[...katman.locations]}
            start={katman.start}
            end={katman.end}
            style={[styles.katman, katman.yer]}
          />
        ))}
      </View>
    );
  }

  const lekeler = premiumAtmosferLekeleri();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lekeler.map((l, i) => (
        <View
          key={i}
          style={[
            styles.leke,
            {
              width: l.w,
              height: l.h,
              borderRadius: l.w / 2,
              backgroundColor: l.renk,
              opacity: l.opacity,
              top: l.top,
              left: l.left,
              right: l.right,
              bottom: l.bottom,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  zemin: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: YUMUSAK_MOR_ZEMIN,
    overflow: 'hidden',
  },
  katman: {
    position: 'absolute',
  },
  leke: {
    position: 'absolute',
  },
});
