import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminBayraklariGetir, AdminOzellikBayragiAyarla } from '../../src/moduller/admin/platform/AdminPlatformIslemleri';
import { StudioAdminIncele, StudioAdminKarar, StudioAdminListe, StudioAdminYayinla, type AdminStudioOyun } from '../../src/moduller/studio/v2/StudioAdminApi';
import { StudioV2AdminGorsel } from '../../src/moduller/studio/v2/StudioV2Api';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const ANAHTARLAR = [
  ['studio_enabled', 'Stüdyo açık'],
  ['studio_menu_visible', 'Menüde görünsün'],
  ['new_game_creation_enabled', 'Yeni taslak'],
  ['ai_generation_enabled', 'Oyun planı (AI)'],
  ['game_testing_enabled', 'Test bayrağı'],
  ['game_submission_enabled', 'İnceleme bayrağı'],
  ['game_publishing_enabled', 'Yayın bayrağı'],
  ['meshy_enabled', '3D bayrağı'],
  ['elevenlabs_enabled', 'Ses bayrağı'],
  ['playcanvas_enabled', 'Önizleme bayrağı'],
  ['creator_rewards_enabled', 'Ödül bayrağı'],
] as const;

export default function AdminStudioEkrani() {
  const { profile, loading } = useAuth();
  const yetkili = AdminYetkisiVarMi(profile);
  const [bayrak, setBayrak] = useState<Record<string, boolean>>({});
  const [oyunlar, setOyunlar] = useState<AdminStudioOyun[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const d = await AdminBayraklariGetir();
      const sonraki: Record<string, boolean> = {};
      for (const f of d.flags) sonraki[f.key] = !!f.enabled;
      setBayrak(sonraki);
      setOyunlar(await StudioAdminListe());
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (yetkili) void yukle();
    }, [yetkili, yukle]),
  );

  const gorselSec = async (oyunId: string, slot: 'cover' | 'avatar') => {
    const secim = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: slot === 'cover' ? [16, 9] : [1, 1],
      quality: 0.55,
      base64: true,
    });
    const dosya = secim.assets?.[0];
    if (secim.canceled || !dosya?.base64) return;
    const mime = dosya.mimeType === 'image/png' ? 'image/png' : dosya.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';
    await StudioV2AdminGorsel(oyunId, slot, mime, dosya.base64).catch(() => undefined);
  };

  const yayinla = (oyunId: string, canli: boolean) => {
    void StudioAdminYayinla(oyunId, canli)
      .then(yukle)
      .catch((err: unknown) => {
        const mesaj = err instanceof Error ? err.message : 'Yayın açılamadı';
        Alert.alert('Canlı paylaş', mesaj);
      });
  };

  const cevir = async (key: string, enabled: boolean) => {
    setBayrak((o) => ({ ...o, [key]: enabled }));
    try {
      await AdminOzellikBayragiAyarla(key, enabled);
    } catch {
      setBayrak((o) => ({ ...o, [key]: !enabled }));
    }
  };

  if (!loading && !yetkili) {
    return (
      <Screen>
        <EkranBasligi title="Tamuso Studio" fallbackHref={'/admin' as never} />
        <Text style={styles.not}>Bu ekran yalnız yöneticiler içindir.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title="Tamuso Studio" fallbackHref={'/admin' as never} />
      <ScrollView contentContainerStyle={styles.icerik}>
        <Text style={styles.baslik}>Gönderilen oyunlar</Text>
        <Text style={styles.not}>
          Yaratıcı oyunu incelemeye gönderince burada görünür. Onayla veya onaylama kararı buradan verilir. Canlı paylaşım ayrıdır. Test bakiyesiyle oynanır. Algoritma ve coin cüzdanı hareket ettirmez.
        </Text>
        {oyunlar
          .filter((oyun) => oyun.status === 'SUBMITTED' || oyun.status === 'IN_REVIEW')
          .map((oyun) => (
          <View key={oyun.id} style={styles.kart}>
            <Text style={styles.satirYazi}>{oyun.title || 'Adsız oyun'}</Text>
            <Text style={styles.not}>{oyun.status}{oyun.error_code ? ` · ${oyun.error_code}` : ''}</Text>
            <Pressable style={styles.eylem} onPress={() => router.push(`/admin/studio-test/${oyun.id}` as never)}>
              <Text style={styles.eylemYazi}>Test et</Text>
            </Pressable>
            <Pressable style={styles.eylem} onPress={() => void gorselSec(oyun.id, 'cover')}>
              <Text style={styles.eylemYazi}>Kapak değiştir</Text>
            </Pressable>
            <Pressable style={styles.eylem} onPress={() => void gorselSec(oyun.id, 'avatar')}>
              <Text style={styles.eylemYazi}>Avatar değiştir</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminKarar(oyun.id, 'algorithm', !oyun.algorithm_enabled).then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>{oyun.algorithm_enabled ? 'Algoritma bağlı' : 'Algoritmaya bağla'}</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminKarar(oyun.id, 'coin', !oyun.coin_enabled).then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>{oyun.coin_enabled ? 'Coin uygun' : 'Coin sistemine işaretle'}</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminIncele(oyun.id, 'APPROVED').then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>Onayla</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminIncele(oyun.id, 'REJECTED').then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>Onaylama</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => yayinla(oyun.id, oyun.status !== 'PUBLISHED')}
            >
              <Text style={styles.eylemYazi}>{oyun.status === 'PUBLISHED' ? 'Canlıdan çek' : 'Canlı paylaş'}</Text>
            </Pressable>
          </View>
        ))}
        {oyunlar.every((oyun) => oyun.status !== 'SUBMITTED' && oyun.status !== 'IN_REVIEW') ? (
          <Text style={styles.not}>Bekleyen oyun onayı yok.</Text>
        ) : null}
        <Text style={styles.baslik}>Onaylananlar</Text>
        <Text style={styles.not}>
          Onaylanan oyun burada kalır. Canlıya çıkması için aynı karttan Canlı paylaş gerekir. Onay, oyunu herkese açmaz.
        </Text>
        {oyunlar
          .filter((oyun) => oyun.status === 'APPROVED')
          .map((oyun) => (
          <View key={`onay-${oyun.id}`} style={styles.kart}>
            <Text style={styles.satirYazi}>{oyun.title || 'Adsız oyun'}</Text>
            <Text style={styles.not}>Onaylandı{oyun.error_code ? ` · ${oyun.error_code}` : ''}</Text>
            <Pressable style={styles.eylem} onPress={() => router.push(`/admin/studio-test/${oyun.id}` as never)}>
              <Text style={styles.eylemYazi}>Test et</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => yayinla(oyun.id, true)}
            >
              <Text style={styles.eylemYazi}>Canlı paylaş</Text>
            </Pressable>
          </View>
        ))}
        {oyunlar.every((oyun) => oyun.status !== 'APPROVED') ? (
          <Text style={styles.not}>Onaylanmış oyun yok.</Text>
        ) : null}
        <Text style={styles.baslik}>Canlıda</Text>
        {oyunlar
          .filter((oyun) => oyun.status === 'PUBLISHED')
          .map((oyun) => (
          <View key={`canli-${oyun.id}`} style={styles.kart}>
            <Text style={styles.satirYazi}>{oyun.title || 'Adsız oyun'}</Text>
            <Text style={styles.not}>Yayında</Text>
            <Pressable style={styles.eylem} onPress={() => router.push(`/admin/studio-test/${oyun.id}` as never)}>
              <Text style={styles.eylemYazi}>Test et</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => yayinla(oyun.id, false)}
            >
              <Text style={styles.eylemYazi}>Canlıdan çek</Text>
            </Pressable>
          </View>
        ))}
        {oyunlar.every((oyun) => oyun.status !== 'PUBLISHED') ? (
          <Text style={styles.not}>Canlıda oyun yok.</Text>
        ) : null}
        <Text style={styles.baslik}>Diğer oyunlar</Text>
        {oyunlar
          .filter((oyun) => oyun.status !== 'SUBMITTED' && oyun.status !== 'IN_REVIEW' && oyun.status !== 'APPROVED' && oyun.status !== 'PUBLISHED')
          .map((oyun) => (
          <View key={`diger-${oyun.id}`} style={styles.kart}>
            <Text style={styles.satirYazi}>{oyun.title || 'Adsız oyun'}</Text>
            <Text style={styles.not}>{oyun.status}{oyun.error_code ? ` · ${oyun.error_code}` : ''}</Text>
            <Pressable style={styles.eylem} onPress={() => router.push(`/admin/studio-test/${oyun.id}` as never)}>
              <Text style={styles.eylemYazi}>Test et</Text>
            </Pressable>
            <Pressable style={styles.eylem} onPress={() => void gorselSec(oyun.id, 'cover')}>
              <Text style={styles.eylemYazi}>Kapak değiştir</Text>
            </Pressable>
            <Pressable style={styles.eylem} onPress={() => void gorselSec(oyun.id, 'avatar')}>
              <Text style={styles.eylemYazi}>Avatar değiştir</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminKarar(oyun.id, 'algorithm', !oyun.algorithm_enabled).then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>{oyun.algorithm_enabled ? 'Algoritma bağlı' : 'Algoritmaya bağla'}</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => void StudioAdminKarar(oyun.id, 'coin', !oyun.coin_enabled).then(yukle).catch(() => undefined)}
            >
              <Text style={styles.eylemYazi}>{oyun.coin_enabled ? 'Coin uygun' : 'Coin sistemine işaretle'}</Text>
            </Pressable>
            <Pressable
              style={styles.eylem}
              onPress={() => yayinla(oyun.id, oyun.status !== 'PUBLISHED')}
            >
              <Text style={styles.eylemYazi}>{oyun.status === 'PUBLISHED' ? 'Canlıdan çek' : 'Canlı paylaş'}</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.baslik}>Studio kontrolleri</Text>
        <Text style={styles.not}>
          Anahtarlar stüdyo özelliklerini açar. Aşağıdaki algoritma ve coin düğmeleri cüzdanı hareket ettirmez. Canlı paylaşım ayrı bir onaydır.
        </Text>
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.primarySoft} /> : null}
        {ANAHTARLAR.map(([key, ad]) => (
          <View key={key} style={styles.satir}>
            <Text style={styles.satirYazi}>{ad}</Text>
            <Switch
              value={!!bayrak[key]}
              onValueChange={(v) => void cevir(key, v)}
              trackColor={{ true: RenkTokenlari.primary, false: RenkTokenlari.border }}
            />
          </View>
        ))}
        <Pressable onPress={() => void yukle()} style={styles.yenile}>
          <Text style={styles.yenileYazi}>Yenile</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: BoslukTokenlari.sm, paddingBottom: 48 },
  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 24 },
  not: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
    gap: 12,
  },
  satirYazi: { ...TipografiTokenlari.body, color: RenkTokenlari.text, flex: 1 },
  yenile: { alignSelf: 'flex-start', marginTop: 8 },
  yenileYazi: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  kart: { gap: 8, borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: YaricapTokenlari.md, padding: BoslukTokenlari.md, backgroundColor: RenkTokenlari.bgCard },
  eylem: { minHeight: 44, borderRadius: YaricapTokenlari.md, backgroundColor: RenkTokenlari.bgElevated, alignItems: 'center', justifyContent: 'center' },
  eylemYazi: { color: RenkTokenlari.text, fontWeight: '700' },
});
