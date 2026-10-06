import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RenkTokenlariKoyu } from '../tasarim-sistemi/RenkTokenlari';
import {
  koyuSahneKilidiCik,
  koyuSahneKilidiGir,
  paletiAl,
} from '../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../tasarim-sistemi/tema/useTemayaAboneOl';
import { TabSayfaKaydirSarici } from './tab-navigasyon/TabSayfaKaydirSarici';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = ViewProps & {
  edges?: Edge[];
  /** Ana sekme ekranlarında yatay kaydırarak komşu taba geç. */
  tabSayfaKaydir?: boolean;
  /** Canlı oda / sahne — uygulama teması beyaz olsa da koyu sahne. */
  koyuSahne?: boolean;
};

/**
 * Uygulama ekran kabugu.
 * Android: klavye açıkken bottom safe-area kaldırılır (çift boşluk / input altta kalma).
 */
export function Screen({
  children,
  style,
  edges = ['top', 'bottom'],
  tabSayfaKaydir = false,
  koyuSahne = false,
  ...rest
}: Props) {
  const [klavyeAcik, setKlavyeAcik] = useState(false);
  useTemayaAboneOl();
  const palet = koyuSahne ? RenkTokenlariKoyu : paletiAl();

  useEffect(() => {
    if (!koyuSahne) return;
    koyuSahneKilidiGir();
    return () => koyuSahneKilidiCik();
  }, [koyuSahne]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKlavyeAcik(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKlavyeAcik(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const aktifEdges = useMemo(() => {
    if (Platform.OS === 'android' && klavyeAcik) {
      return edges.filter((e) => e !== 'bottom');
    }
    return edges;
  }, [edges, klavyeAcik]);

  const icerik = (
    <SafeAreaView style={[styles.safe, style]} edges={aktifEdges} {...rest}>
      {children}
    </SafeAreaView>
  );

  return (
    <View style={[styles.root, { backgroundColor: palet.bg }]}>
      <LinearGradient
        colors={[...palet.gradientNight]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {tabSayfaKaydir ? (
        <TabSayfaKaydirSarici>{icerik}</TabSayfaKaydirSarici>
      ) : (
        icerik
      )}
    </View>
  );
}

/** Form/scroll ekranlarinda bos alana dokununca klavyeyi kapat (dokunmayi calmaz). */
export function klavyeBosluktaKapat(): void {
  Keyboard.dismiss();
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  safe: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
  },
});
