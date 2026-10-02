import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { MedyaSaglayiciGecisi } from '../livekit/MedyaBaglantisi';
import {
  RtcProviderDinle,
  RtcProviderRealtimeBaslat,
  RtcProviderYukle,
} from './RtcProviderDurumu';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';

/** Sağlayıcı sürümü değişince açık medyayı aynı oda/arama içinde yeniden bağlar. */
export function RtcYenilemeKatmani() {
  const { session } = useAuth();
  const [yenileniyor, setYenileniyor] = useState(false);

  useEffect(() => {
    if (!session) return;
    void RtcProviderYukle();
    return RtcProviderRealtimeBaslat();
  }, [session]);

  useEffect(() => {
    let surum = -1;
    return RtcProviderDinle((d) => {
      if (surum < 0) {
        surum = d.version;
        return;
      }
      if (d.version === surum) return;
      surum = d.version;
      setYenileniyor(true);
      void MedyaSaglayiciGecisi().finally(() => setYenileniyor(false));
    });
  }, [session]);

  if (!yenileniyor) return null;
  return (
    <View style={styles.katman} pointerEvents="auto">
      <ActivityIndicator color={RenkTokenlari.primarySoft} />
      <Text style={styles.yazi}>Bağlantı yenileniyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  katman: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,6,14,0.55)',
    gap: 12,
    zIndex: 50,
  },
  yazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
});
