import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { FikirKategorileriGetir } from '../../../../../src/moduller/fikir-geri-bildirim/islemler/FikirIslemleri';
import { AdminFikirKategoriKaydet } from '../../../../../src/moduller/fikir-geri-bildirim/islemler/AdminFikirIslemleri';
import type { FikirKategori } from '../../../../../src/moduller/fikir-geri-bildirim/tipler';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminFikirKategorilerEkrani() {
  const { profile } = useAuth();
  const [items, setItems] = useState<FikirKategori[]>([]);
  const [yeniAd, setYeniAd] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await FikirKategorileriGetir(true));
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!AdminYetkisiVarMi(profile)) {
        router.replace('/(tabs)/profile' as any);
        return;
      }
      void load();
    }, [profile, load]),
  );

  const kaydet = async (k: FikirKategori, patch: Partial<FikirKategori>) => {
    try {
      await AdminFikirKategoriKaydet({
        id: k.id,
        name: patch.name ?? k.name,
        icon: patch.icon ?? k.icon,
        sortOrder: patch.sort_order ?? k.sort_order,
        isActive: patch.is_active ?? k.is_active,
        isBugForm: patch.is_bug_form ?? k.is_bug_form,
      });
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  };

  const ekle = async () => {
    if (!yeniAd.trim()) return;
    try {
      await AdminFikirKategoriKaydet({ name: yeniAd.trim(), icon: 'bulb-outline' });
      setYeniAd('');
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Eklenemedi');
    }
  };

  return (
    <Screen>
      <ModulHataSiniri modulAdi="admin-fikir-kategoriler">
        <EkranBasligi
          title="Fikir kategorileri"
          subtitle="Ekle · aktif · sıra"
          onBack={() => router.back()}
        />
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.liste}
          ListHeaderComponent={
            <View style={styles.ekle}>
              <TextInput
                style={styles.input}
                value={yeniAd}
                onChangeText={setYeniAd}
                placeholder="Yeni kategori adı"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Pressable style={styles.btn} onPress={() => void ekle()}>
                <Text style={styles.btnYazi}>Ekle</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.kart}>
              <TextInput
                style={styles.ad}
                defaultValue={item.name}
                onEndEditing={(e) =>
                  void kaydet(item, { name: e.nativeEvent.text.trim() })
                }
              />
              <Text style={styles.meta}>
                {item.icon} · sıra {item.sort_order}
              </Text>
              <View style={styles.satir}>
                <Text style={styles.meta}>Aktif</Text>
                <Switch
                  value={!!item.is_active}
                  onValueChange={(v) => void kaydet(item, { is_active: v })}
                />
              </View>
            </View>
          )}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liste: { padding: BoslukTokenlari.md, gap: 10, paddingBottom: 40 },
  ekle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 12,
    color: RenkTokenlari.text,
  },
  btn: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.pill,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    padding: 12,
    gap: 6,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    padding: 0,
  },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
