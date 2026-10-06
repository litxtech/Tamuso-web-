import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GaleriAc } from '../../src/ortak/medya/ImagePickerHazirMi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminWebTanitimMedya } from '../../src/moduller/web-tanitim/AdminWebTanitimMedya';
import type { WebTanitimMedya } from '../../src/moduller/web-tanitim/WebTanitimMedya';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

export default function AdminTanitimVideolari() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<WebTanitimMedya[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AdminWebTanitimMedya.listele());
    } catch (e) {
      Alert.alert('Videolar', e instanceof Error ? e.message : 'Liste alınamadı');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (admin) void yenile();
    }, [admin, yenile]),
  );

  const yukle = async (tur: 'video' | 'image') => {
    const secim = await GaleriAc({
      mediaTypes: tur === 'video' ? ['videos'] : ['images'],
      videoMaxDuration: 60,
    });
    if (!secim.ok) {
      if (!secim.iptal) Alert.alert('Medya', secim.hata);
      return;
    }
    setGonderiyor(true);
    try {
      setListe(
        await AdminWebTanitimMedya.yukle({
          uri: secim.asset.uri,
          mime: secim.asset.mimeType,
          tur,
          baslik: tur === 'video' ? 'Video' : 'Görsel',
        }),
      );
    } catch (e) {
      Alert.alert('Yükleme', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setGonderiyor(false);
    }
  };

  const guncelle = async (m: WebTanitimMedya, alan: Partial<WebTanitimMedya>) => {
    try {
      setListe(
        await AdminWebTanitimMedya.guncelle(m.id, {
          anasayfa: alan.anasayfa ?? Boolean(m.anasayfa),
          lobi: alan.lobi ?? Boolean(m.lobi),
          aktif: alan.aktif ?? m.aktif !== false,
        }),
      );
    } catch (e) {
      Alert.alert('Kayıt', e instanceof Error ? e.message : 'Güncellenemedi');
    }
  };

  if (!admin) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title="Tanıtım videoları" fallbackHref="/admin" />
        <Text style={styles.uyari}>Bu ekran yönetici içindir.</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Tanıtım videoları" fallbackHref="/admin" />
      <ScrollView contentContainerStyle={styles.govde}>
        <Text style={styles.alt}>
          Anasayfa açık olanlar web sitesinde döner. Lobi açık olanlar mobil giriş
          formunun arkasında oynar. İstediğini silip yenisini yükleyebilirsin.
        </Text>
        <View style={styles.satirBtn}>
          <Pressable style={styles.btn} onPress={() => void yukle('video')} disabled={gonderiyor}>
            <Text style={styles.btnYazi}>Video yükle</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => void yukle('image')} disabled={gonderiyor}>
            <Text style={styles.btnYazi}>Görsel yükle</Text>
          </Pressable>
        </View>
        {gonderiyor || yukleniyor ? <ActivityIndicator color={RenkTokenlari.primary} /> : null}
        {liste.map((m) => (
          <View key={m.id} style={styles.kart}>
            <Text style={styles.baslik}>{m.baslik || m.tur}</Text>
            <Text style={styles.url} numberOfLines={2}>{m.public_url}</Text>
            <View style={styles.anahtar}>
              <Text style={styles.etiket}>Anasayfa</Text>
              <Switch
                value={Boolean(m.anasayfa)}
                onValueChange={(v) => void guncelle(m, { anasayfa: v })}
              />
            </View>
            <View style={styles.anahtar}>
              <Text style={styles.etiket}>Giriş lobisi</Text>
              <Switch
                value={Boolean(m.lobi)}
                onValueChange={(v) => void guncelle(m, { lobi: v })}
              />
            </View>
            <View style={styles.anahtar}>
              <Text style={styles.etiket}>Aktif</Text>
              <Switch
                value={m.aktif !== false}
                onValueChange={(v) => void guncelle(m, { aktif: v })}
              />
            </View>
            <Pressable
              onPress={() =>
                Alert.alert('Sil', 'Bu kayıt kaldırılsın mı?', [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => void AdminWebTanitimMedya.sil(m.id).then(setListe).catch((e) =>
                      Alert.alert('Sil', e instanceof Error ? e.message : 'Silinemedi'),
                    ),
                  },
                ])
              }
            >
              <Text style={styles.sil}>Kaldır</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: { padding: 16, gap: 12, paddingBottom: 40 },
  alt: { color: RenkTokenlari.textMuted, lineHeight: 20 },
  satirBtn: { flexDirection: 'row', gap: 10 },
  btn: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnYazi: { color: RenkTokenlari.textOnPrimary, fontWeight: '800' },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  baslik: { color: RenkTokenlari.text, fontWeight: '800', fontSize: 16 },
  url: { color: RenkTokenlari.textDim, fontSize: 12 },
  anahtar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etiket: { color: RenkTokenlari.text },
  sil: { color: RenkTokenlari.danger, fontWeight: '700' },
  uyari: { color: RenkTokenlari.text, padding: 20 },
});
