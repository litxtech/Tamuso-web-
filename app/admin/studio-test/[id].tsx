import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { StudioAdminOku } from '../../../src/moduller/studio/v2/StudioAdminApi';
import { StudioV2AdminAdres } from '../../../src/moduller/studio/v2/StudioV2Api';
import { OyunCalismaAlani } from '../../../src/moduller/studio/v2/OyunCalismaAlani';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminStudioTestEkrani() {
  const { profile, loading } = useAuth();
  const yetkili = AdminYetkisiVarMi(profile);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [baslik, setBaslik] = useState('');
  const [manifest, setManifest] = useState<unknown>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [hosts, setHosts] = useState<string[]>([]);
  const [durdu, setDurdu] = useState(false);
  const [yeniden, setYeniden] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const kayit = await StudioAdminOku(id);
      setBaslik(kayit?.title || 'Stüdyo oyunu');
      setManifest(kayit?.manifest ?? null);
      const adres = await StudioV2AdminAdres(id);
      setUrls(adres?.urls ?? {});
      setHosts(adres?.allowedHosts ?? []);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    if (yetkili) void yukle();
  }, [yetkili, yukle]));

  if (!loading && !yetkili) {
    return (
      <Screen>
        <EkranBasligi title="Oyun testi" fallbackHref={'/admin/studio' as never} />
        <Text style={styles.not}>Bu ekran yalnız yöneticiler içindir.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title={baslik || 'Oyun testi'} fallbackHref={'/admin/studio' as never} />
      {yukleniyor ? <ActivityIndicator color={RenkTokenlari.primarySoft} /> : null}
      {!yukleniyor && !manifest ? <Text style={styles.not}>Önizleme henüz hazır değil. Üretim bitince tekrar açın.</Text> : null}
      {manifest ? (
        <View style={styles.sahne}>
          <OyunCalismaAlani manifest={manifest} urls={urls} allowedHosts={hosts} paused={durdu} restartKey={yeniden} />
        </View>
      ) : null}
      <View style={styles.satir}>
        <Pressable style={styles.btn} onPress={() => setDurdu((v) => !v)}>
          <Text style={styles.yazi}>{durdu ? 'Sürdür' : 'Duraklat'}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setYeniden((v) => v + 1)}>
          <Text style={styles.yazi}>Yeniden</Text>
        </Pressable>
      </View>
      <Text style={styles.not}>Test bakiyesi. Cüzdan hareket etmez.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sahne: { height: 420, marginHorizontal: BoslukTokenlari.lg },
  satir: { flexDirection: 'row', gap: 8, padding: BoslukTokenlari.lg },
  btn: { flex: 1, minHeight: 48, borderRadius: YaricapTokenlari.md, backgroundColor: RenkTokenlari.bgElevated, alignItems: 'center', justifyContent: 'center' },
  yazi: { color: RenkTokenlari.text, fontWeight: '700' },
  not: { color: RenkTokenlari.textMuted, paddingHorizontal: BoslukTokenlari.lg, lineHeight: 18 },
});
