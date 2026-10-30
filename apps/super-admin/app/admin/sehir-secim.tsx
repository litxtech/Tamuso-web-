import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { GradientButton } from '../../../../src/components/GradientButton';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminSehirSecimBaslat,
  AdminSehirSecimListesi,
  AdminSehirSecimOylamayaAc,
  AdminSehirSecimSonuclandir,
  TrSehirleriListesi,
} from '../../../../src/moduller/sehir-secimleri/islemler/SehirSecimIslemleri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type SecimSatir = {
  id: string;
  title: string;
  status: string;
  role_target: string;
  starts_at: string;
  ends_at: string;
  total_votes: number;
  city_name: string;
  city_id: string;
  winner_name?: string | null;
};

type SehirSatir = {
  id: string;
  name: string;
  plate_code: string | null;
};

export default function AdminSehirSecimEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [sehirler, setSehirler] = useState<SehirSatir[]>([]);
  const [secimler, setSecimler] = useState<SecimSatir[]>([]);
  const [seciliSehir, setSeciliSehir] = useState<SehirSatir | null>(null);
  const [arama, setArama] = useState('');
  const [saat, setSaat] = useState('48');
  const [rol, setRol] = useState<'leader' | 'vice_leader'>('leader');
  const [hemenOy, setHemenOy] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [s, l] = await Promise.all([
        TrSehirleriListesi(),
        AdminSehirSecimListesi(),
      ]);
      setSehirler(
        s.map((x) => ({ id: x.id, name: x.name, plate_code: x.plate_code })),
      );
      setSecimler(Array.isArray(l) ? l : []);
    } catch (e) {
      Alert.alert(
        'Şehir seçim',
        e instanceof Error ? e.message : 'Veri yüklenemedi (migration 047?)',
      );
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const filtrelenmis = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    if (!q) return sehirler;
    return sehirler.filter(
      (s) =>
        s.name.toLocaleLowerCase('tr').includes(q) ||
        (s.plate_code ?? '').includes(q),
    );
  }, [arama, sehirler]);

  if (!admin) return null;

  const baslat = async () => {
    if (!seciliSehir) {
      Alert.alert('Şehir seç', 'Önce bir il seç.');
      return;
    }
    const hours = Math.min(168, Math.max(1, parseInt(saat, 10) || 48));
    setBusy(true);
    const sonuc = await AdminSehirSecimBaslat({
      cityId: seciliSehir.id,
      role: rol,
      hours,
      startVoting: hemenOy,
    });
    setBusy(false);
    if (!sonuc.ok) {
      Alert.alert('Seçim', sonuc.hata);
      return;
    }
    Alert.alert(
      'Seçim başladı',
      `${seciliSehir.name} · ${sonuc.notified ?? 0} kullanıcıya bildirim/push kuyruğa yazıldı.`,
      [
        {
          text: 'Detaya git',
          onPress: () => router.push(`/sehir/secim/${sonuc.id}` as any),
        },
        { text: 'Tamam' },
      ],
    );
    setSeciliSehir(null);
    await yukle();
  };

  const oylamayaAc = (id: string) => {
    Alert.alert('Oylama', 'Oylamayı açıp herkese bildirim gönderilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Aç',
        onPress: async () => {
          setBusy(true);
          const r = await AdminSehirSecimOylamayaAc(id);
          setBusy(false);
          if (!r.ok) Alert.alert('Oylama', r.hata);
          else await yukle();
        },
      },
    ]);
  };

  const sonuclandir = (id: string, city: string) => {
    Alert.alert('Sonuçlandır', `${city} seçimini şimdi bitirip kazananı duyur?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const r = await AdminSehirSecimSonuclandir(id);
          setBusy(false);
          if (!r.ok) Alert.alert('Sonuç', r.hata);
          else {
            Alert.alert('Kazanan', r.winner_name ?? 'Duyuruldu');
            await yukle();
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Şehir seçimleri"
        subtitle="81 il · başlat · bitir · push"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
      >
        <Text style={AdminStil.sectionLabel}>Yeni seçim başlat</Text>
        <TextInput
          style={styles.input}
          placeholder="İl ara (isim veya plaka)"
          placeholderTextColor={RenkTokenlari.textDim}
          value={arama}
          onChangeText={setArama}
        />
        <View style={styles.cityList}>
          {yukleniyor && !sehirler.length ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : (
            <FlatList
              data={filtrelenmis}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const aktif = seciliSehir?.id === item.id;
                return (
                  <Pressable
                    style={[styles.cityRow, aktif && styles.cityRowAktif]}
                    onPress={() => setSeciliSehir(item)}
                  >
                    <Text style={styles.plate}>{item.plate_code ?? '—'}</Text>
                    <Text style={styles.cityName}>{item.name}</Text>
                    {aktif ? (
                      <Ionicons name="checkmark-circle" size={18} color={RenkTokenlari.mint} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.chip, rol === 'leader' && styles.chipOn]}
            onPress={() => setRol('leader')}
          >
            <Text style={styles.chipText}>Lider</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, rol === 'vice_leader' && styles.chipOn]}
            onPress={() => setRol('vice_leader')}
          >
            <Text style={styles.chipText}>Yardımcı lider</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.chip, hemenOy && styles.chipOn]}
            onPress={() => setHemenOy(true)}
          >
            <Text style={styles.chipText}>Hemen oylama</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, !hemenOy && styles.chipOn]}
            onPress={() => setHemenOy(false)}
          >
            <Text style={styles.chipText}>Önce adaylık</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Süre (saat)</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={saat}
          onChangeText={setSaat}
          placeholderTextColor={RenkTokenlari.textDim}
        />

        <GradientButton
          title={
            seciliSehir
              ? `${seciliSehir.name} seçimini başlat`
              : 'Şehir seç ve başlat'
          }
          onPress={() => void baslat()}
          loading={busy}
          disabled={!seciliSehir}
        />

        <Text style={[AdminStil.sectionLabel, { marginTop: BoslukTokenlari.xl }]}>
          Son seçimler
        </Text>
        {secimler.map((e) => (
          <View key={e.id} style={styles.card}>
            <Pressable onPress={() => router.push(`/sehir/secim/${e.id}` as any)}>
              <Text style={styles.cardTitle}>{e.title}</Text>
              <Text style={styles.cardMeta}>
                {e.city_name} · {e.status} · {e.total_votes} oy
                {e.winner_name ? ` · ${e.winner_name}` : ''}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              {e.status === 'nominating' ? (
                <Pressable style={styles.action} onPress={() => oylamayaAc(e.id)}>
                  <Text style={styles.actionText}>Oylamaya aç</Text>
                </Pressable>
              ) : null}
              {e.status === 'voting' || e.status === 'nominating' ? (
                <Pressable
                  style={styles.actionDanger}
                  onPress={() => sonuclandir(e.id, e.city_name)}
                >
                  <Text style={styles.actionText}>Sonuçlandır</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 12,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  cityList: {
    maxHeight: 220,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  cityRowAktif: { backgroundColor: 'rgba(61,207,176,0.12)' },
  plate: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    width: 28,
    fontWeight: '700',
  },
  cityName: { ...TipografiTokenlari.body, color: RenkTokenlari.text, flex: 1 },
  row: { flexDirection: 'row', gap: BoslukTokenlari.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipOn: {
    borderColor: RenkTokenlari.mint,
    backgroundColor: 'rgba(61,207,176,0.14)',
  },
  chipText: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '600' },
  label: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, marginTop: 4 },
  card: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
  },
  cardTitle: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  cardMeta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  actions: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: 'rgba(61,207,176,0.16)',
  },
  actionDanger: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: 'rgba(232,64,145,0.16)',
  },
  actionText: { ...TipografiTokenlari.micro, color: RenkTokenlari.text, fontWeight: '700' },
});
