import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminAjansPaketGuncelle,
  AdminAjansPaketKatalogu,
  type AdminAjansCoinPaket,
} from '../../src/moduller/admin/platform/AdminPlatformIslemleri';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type FormState = {
  title: string;
  listeFiyat: string;
  coins: string;
  indirim: string;
  sort: string;
};

function formFromPaket(p: AdminAjansCoinPaket): FormState {
  return {
    title: p.title ?? '',
    listeFiyat: String(p.liste_fiyat_try ?? ''),
    coins: String(p.coins ?? 0),
    indirim: String(p.indirim_yuzde ?? 20),
    sort: String(p.sort_order ?? 0),
  };
}

export default function AdminAjansPaketleriEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [paketler, setPaketler] = useState<AdminAjansCoinPaket[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const k = await AdminAjansPaketKatalogu();
      setPaketler(k);
      if (seciliId) {
        const p = k.find((x) => x.id === seciliId);
        if (p) setForm(formFromPaket(p));
      }
    } catch (e) {
      Alert.alert(
        'Ajans paketleri',
        e instanceof Error ? e.message : 'Yüklenemedi',
      );
      setPaketler([]);
    } finally {
      setYukleniyor(false);
    }
  }, [seciliId]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const sec = (p: AdminAjansCoinPaket) => {
    setSeciliId(p.id);
    setForm(formFromPaket(p));
  };

  const kaydet = async () => {
    if (!seciliId || !form || kaydediyor) return;
    const coins = Math.floor(Number(form.coins.replace(/\D/g, '')) || 0);
    const sort = Math.floor(Number(form.sort.replace(/\D/g, '')) || 0);
    const indirim = Math.floor(Number(form.indirim.replace(/\D/g, '')) || 0);
    const fiyatRaw = form.listeFiyat.replace(',', '.').trim();
    const listeFiyat = Number(fiyatRaw);

    if (!(listeFiyat > 0)) {
      Alert.alert('Eksik', 'Liste fiyatı (₺) 0’dan büyük olmalı.');
      return;
    }
    if (!(coins > 0)) {
      Alert.alert('Eksik', 'Coin miktarı 0’dan büyük olmalı.');
      return;
    }
    if (indirim < 0 || indirim >= 100) {
      Alert.alert('Eksik', 'İndirim %0–99 arası olmalı.');
      return;
    }

    setKaydediyor(true);
    try {
      const guncel = await AdminAjansPaketGuncelle({
        id: seciliId,
        title: form.title.trim(),
        listeFiyatTry: listeFiyat,
        coins,
        indirimYuzde: indirim,
        sortOrder: sort,
      });
      setForm(formFromPaket(guncel));
      await yukle();
      Alert.alert('Kaydedildi', 'Ajans paketi güncellendi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setKaydediyor(false);
    }
  };

  const aktifToggle = async (p: AdminAjansCoinPaket) => {
    if (kaydediyor) return;
    setKaydediyor(true);
    try {
      await AdminAjansPaketGuncelle({
        id: p.id,
        isActive: !p.is_active,
      });
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ajans paketleri"
        subtitle="Liste fiyatı · coin · indirim %"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <Text style={styles.ipucu}>
          Platform şablonu — yeni yetkili ajanslar bu paketlerden kopya alır.
          Her ajans kendi kopyasını Ajansım → Paketler’den düzenler. Liste fiyatı
          ve coin buradan değişir; ödenecek tutar indirim %’sine göre hesaplanır.
        </Text>

        {yukleniyor && !paketler.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        {paketler.map((p) => {
          const acik = seciliId === p.id;
          return (
            <View key={p.id} style={AdminStil.kart}>
              <Pressable onPress={() => sec(p)} style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AdminStil.kartBaslik}>{p.title}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {Number(p.coins).toLocaleString('tr-TR')} coin · liste{' '}
                    {Number(p.liste_fiyat_try).toLocaleString('tr-TR')} ₺ · %
                    {p.indirim_yuzde} →{' '}
                    {Number(p.odenecek_try).toLocaleString('tr-TR')} ₺
                  </Text>
                </View>
                <View style={AdminStil.chip}>
                  <Text
                    style={[
                      AdminStil.chipYazi,
                      {
                        color: p.is_active
                          ? RenkTokenlari.success
                          : RenkTokenlari.textDim,
                      },
                    ]}
                  >
                    {p.is_active ? 'Aktif' : 'Kapalı'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.aksiyonSatir}>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => void aktifToggle(p)}
                  disabled={kaydediyor}
                >
                  <Text style={AdminStil.aksiyonYazi}>
                    {p.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                  </Text>
                </Pressable>
                <Pressable style={AdminStil.aksiyon} onPress={() => sec(p)}>
                  <Text style={AdminStil.aksiyonYazi}>
                    {acik ? 'Düzenleniyor' : 'Düzenle'}
                  </Text>
                </Pressable>
              </View>

              {acik && form ? (
                <View style={styles.form}>
                  <Text style={styles.label}>Paket adı</Text>
                  <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(t) => setForm({ ...form, title: t })}
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={styles.label}>Liste fiyatı (₺)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.listeFiyat}
                    onChangeText={(t) => setForm({ ...form, listeFiyat: t })}
                    keyboardType="decimal-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={styles.label}>Coin miktarı</Text>
                  <TextInput
                    style={styles.input}
                    value={form.coins}
                    onChangeText={(t) => setForm({ ...form, coins: t })}
                    keyboardType="number-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={styles.label}>İndirim %</Text>
                  <TextInput
                    style={styles.input}
                    value={form.indirim}
                    onChangeText={(t) => setForm({ ...form, indirim: t })}
                    keyboardType="number-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={styles.label}>Sıralama</Text>
                  <TextInput
                    style={styles.input}
                    value={form.sort}
                    onChangeText={(t) => setForm({ ...form, sort: t })}
                    keyboardType="number-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <GradientButton
                    title={kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
                    onPress={() => void kaydet()}
                    loading={kaydediyor}
                    disabled={kaydediyor}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ipucu: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.md,
    lineHeight: 16,
  },
  aksiyonSatir: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  form: {
    marginTop: BoslukTokenlari.md,
    gap: 6,
  },
  label: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 6,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
