import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil, SayiKisa } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminIslemHacmiDuzelt,
  AdminIslemHacmiKademeKaydet,
  AdminIslemHacmiKademePasifle,
  AdminIslemHacmiKademeleriListele,
  AdminIslemHacmiOzetGetir,
  AdminIslemHacmiUygunlukAyarla,
  AdminIslemHacmiUygunlukGetir,
  AdminIslemHacmiYenidenHesapla,
} from '../../../src/moduller/islem-hacmi/islemler/IslemHacmiApi';
import { formatTryExact } from '../../../src/moduller/islem-hacmi/utils/IslemHacmiFormat';
import type {
  AdminIslemHacmiOzet,
  AdminIslemHacmiUygunluk,
  IslemHacmiKademe,
} from '../../../src/moduller/islem-hacmi/tipler';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type KademeForm = {
  id: string | null;
  name: string;
  display_label: string;
  min_amount_try: string;
  badge_key: string;
  frame_key: string;
  effect_key: string;
  sort_order: string;
};

const BOS_FORM: KademeForm = {
  id: null,
  name: '',
  display_label: '',
  min_amount_try: '0',
  badge_key: '',
  frame_key: '',
  effect_key: '',
  sort_order: '0',
};

function kademedenForm(t: IslemHacmiKademe): KademeForm {
  return {
    id: t.id,
    name: t.name,
    display_label: t.display_label,
    min_amount_try: String(t.min_amount_try ?? 0),
    badge_key: t.badge_key ?? '',
    frame_key: t.frame_key ?? '',
    effect_key: t.effect_key ?? '',
    sort_order: String(t.sort_order ?? 0),
  };
}

export default function AdminIslemHacmiEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ozet, setOzet] = useState<AdminIslemHacmiOzet | null>(null);
  const [kademeler, setKademeler] = useState<IslemHacmiKademe[]>([]);
  const [uygunluk, setUygunluk] = useState<AdminIslemHacmiUygunluk[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState(false);
  const [form, setForm] = useState<KademeForm | null>(null);
  const [recalcUserId, setRecalcUserId] = useState('');
  const [duzeltUserId, setDuzeltUserId] = useState('');
  const [duzeltTutar, setDuzeltTutar] = useState('');
  const [duzeltSebep, setDuzeltSebep] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [o, t, u] = await Promise.all([
        AdminIslemHacmiOzetGetir().catch(() => null),
        AdminIslemHacmiKademeleriListele().catch(() => []),
        AdminIslemHacmiUygunlukGetir().catch(() => []),
      ]);
      setOzet(o);
      setKademeler(t);
      setUygunluk(u);
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

  const kademeKaydet = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.display_label.trim()) {
      Alert.alert('Kademe', 'İsim ve görünen etiket zorunlu.');
      return;
    }
    const min = Number(form.min_amount_try.replace(',', '.'));
    if (!Number.isFinite(min) || min < 0) {
      Alert.alert('Kademe', 'Geçerli bir alt tutar gir.');
      return;
    }
    setMesgul(true);
    const r = await AdminIslemHacmiKademeKaydet({
      id: form.id ?? undefined,
      name: form.name.trim(),
      display_label: form.display_label.trim(),
      min_amount_try: min,
      badge_key: form.badge_key.trim() || null,
      frame_key: form.frame_key.trim() || null,
      effect_key: form.effect_key.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    });
    setMesgul(false);
    if (!r.ok) {
      Alert.alert('Kademe', r.hata ?? 'Kaydedilemedi');
      return;
    }
    setForm(null);
    void yukle();
  };

  const kademePasifle = (t: IslemHacmiKademe) => {
    Alert.alert('Kademeyi pasifle', `"${t.display_label || t.name}" pasife alınsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Pasifle',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await AdminIslemHacmiKademePasifle(t.id, t);
            if (!r.ok) {
              Alert.alert('Kademe', r.hata ?? 'Pasiflenemedi');
              return;
            }
            void yukle();
          })();
        },
      },
    ]);
  };

  const uygunlukDegistir = async (category: string, v: boolean) => {
    setUygunluk((prev) =>
      prev.map((x) => (x.category === category ? { ...x, enabled: v } : x)),
    );
    const r = await AdminIslemHacmiUygunlukAyarla(category, v);
    if (!r.ok) {
      setUygunluk((prev) =>
        prev.map((x) => (x.category === category ? { ...x, enabled: !v } : x)),
      );
      Alert.alert('Uygunluk', r.hata ?? 'Kaydedilemedi');
      return;
    }
    if (r.recalculation_required) {
      Alert.alert(
        'Uygunluk',
        'Kaydedildi. Mevcut hacimlerin güncellenmesi için yeniden hesaplama gerekli.',
      );
    }
  };

  const yenidenHesapla = () => {
    const hedef = recalcUserId.trim();
    Alert.alert(
      'Yeniden hesapla',
      hedef
        ? `Sadece ${hedef} için hacim yeniden hesaplanacak.`
        : 'TÜM kullanıcıların hacmi yeniden hesaplanacak. Bu uzun sürebilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: () => {
            void (async () => {
              setMesgul(true);
              const r = await AdminIslemHacmiYenidenHesapla(hedef || undefined);
              setMesgul(false);
              if (!r.ok) {
                Alert.alert('Yeniden hesapla', r.hata ?? 'Başlatılamadı');
                return;
              }
              setRecalcUserId('');
              Alert.alert('Yeniden hesapla', 'Hesaplama tamamlandı / kuyruğa alındı.');
              void yukle();
            })();
          },
        },
      ],
    );
  };

  const duzelt = async () => {
    const uid = duzeltUserId.trim();
    const delta = Number(duzeltTutar.replace(',', '.'));
    const sebep = duzeltSebep.trim();
    if (!uid) {
      Alert.alert('Düzeltme', 'Kullanıcı ID (uuid) zorunlu.');
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      Alert.alert('Düzeltme', 'Sıfırdan farklı geçerli bir tutar gir.');
      return;
    }
    if (!sebep) {
      Alert.alert('Düzeltme', 'Sebep zorunlu — denetim kaydına yazılır.');
      return;
    }
    setMesgul(true);
    const r = await AdminIslemHacmiDuzelt(uid, delta, sebep);
    setMesgul(false);
    if (!r.ok) {
      Alert.alert('Düzeltme', r.hata ?? 'Uygulanamadı');
      return;
    }
    setDuzeltUserId('');
    setDuzeltTutar('');
    setDuzeltSebep('');
    Alert.alert('Düzeltme', 'Hacim düzeltmesi uygulandı.');
    void yukle();
  };

  if (!admin) {
    return (
      <Screen edges={['top']}>
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>Yetkisiz erişim</Text>
        </View>
      </Screen>
    );
  }

  const kpis = [
    {
      id: 'hacim',
      n: ozet?.total_volume_try != null ? formatTryExact(ozet.total_volume_try) : '—',
      l: 'Toplam hacim',
      tint: RenkTokenlari.accent,
    },
    {
      id: 'kullanici',
      n: ozet?.active_users != null ? SayiKisa(ozet.active_users) : '—',
      l: 'Hacimli kullanıcı',
      tint: RenkTokenlari.violet,
    },
    {
      id: 'bugun',
      n: ozet?.today_try != null ? formatTryExact(ozet.today_try) : '—',
      l: 'Bugün',
      tint: RenkTokenlari.mint,
    },
    {
      id: 'ay',
      n: ozet?.month_try != null ? formatTryExact(ozet.month_try) : '—',
      l: 'Bu ay',
      tint: RenkTokenlari.warning,
    },
  ];

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="İşlem hacmi"
        subtitle="Kademeler · uygunluk · düzeltme"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={AdminStil.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.id} style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: k.tint }]} numberOfLines={1}>
                {k.n}
              </Text>
              <Text style={AdminStil.kpiL}>{k.l}</Text>
            </View>
          ))}
        </View>

        {/* Kademeler */}
        <Text style={AdminStil.sectionLabel}>Kademeler</Text>
        <View style={AdminStil.kart}>
          {kademeler.length === 0 && !yukleniyor ? (
            <Text style={AdminStil.bos}>Kademe tanımlı değil</Text>
          ) : (
            kademeler.map((t) => (
              <View key={t.id} style={styles.kademeSatir}>
                <View style={styles.kademeCopy}>
                  <Text style={styles.kademeAd}>
                    {t.display_label || t.name}
                    {t.is_active === false ? '  · pasif' : ''}
                  </Text>
                  <Text style={styles.kademeAlt}>
                    {formatTryExact(t.min_amount_try)} ve üzeri
                    {t.badge_key ? ` · rozet: ${t.badge_key}` : ''}
                  </Text>
                </View>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => setForm(kademedenForm(t))}
                >
                  <Text style={AdminStil.aksiyonYazi}>Düzenle</Text>
                </Pressable>
                {t.is_active !== false ? (
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={() => kademePasifle(t)}
                  >
                    <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                      Pasifle
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
          <Pressable
            style={[AdminStil.aksiyon, styles.yeniBtn]}
            onPress={() => setForm({ ...BOS_FORM })}
          >
            <Ionicons name="add" size={16} color={RenkTokenlari.text} />
            <Text style={AdminStil.aksiyonYazi}>Yeni kademe</Text>
          </Pressable>
        </View>

        {form ? (
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>
              {form.id ? 'Kademeyi düzenle' : 'Yeni kademe'}
            </Text>
            <TextInput
              style={AdminStil.input}
              placeholder="İsim (ör. bronz)"
              placeholderTextColor={RenkTokenlari.textDim}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Görünen etiket (ör. Bronz)"
              placeholderTextColor={RenkTokenlari.textDim}
              value={form.display_label}
              onChangeText={(v) => setForm({ ...form, display_label: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Alt tutar (TL)"
              placeholderTextColor={RenkTokenlari.textDim}
              keyboardType="numeric"
              value={form.min_amount_try}
              onChangeText={(v) => setForm({ ...form, min_amount_try: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Rozet anahtarı (opsiyonel)"
              placeholderTextColor={RenkTokenlari.textDim}
              autoCapitalize="none"
              value={form.badge_key}
              onChangeText={(v) => setForm({ ...form, badge_key: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Çerçeve anahtarı (opsiyonel)"
              placeholderTextColor={RenkTokenlari.textDim}
              autoCapitalize="none"
              value={form.frame_key}
              onChangeText={(v) => setForm({ ...form, frame_key: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Efekt anahtarı (opsiyonel)"
              placeholderTextColor={RenkTokenlari.textDim}
              autoCapitalize="none"
              value={form.effect_key}
              onChangeText={(v) => setForm({ ...form, effect_key: v })}
            />
            <TextInput
              style={AdminStil.input}
              placeholder="Sıra (0, 1, 2…)"
              placeholderTextColor={RenkTokenlari.textDim}
              keyboardType="numeric"
              value={form.sort_order}
              onChangeText={(v) => setForm({ ...form, sort_order: v })}
            />
            <View style={AdminStil.aksiyonSatir}>
              <Pressable
                style={AdminStil.aksiyon}
                onPress={() => void kademeKaydet()}
                disabled={mesgul}
              >
                {mesgul ? (
                  <ActivityIndicator size="small" color={RenkTokenlari.text} />
                ) : (
                  <Text style={AdminStil.aksiyonYazi}>Kaydet</Text>
                )}
              </Pressable>
              <Pressable style={AdminStil.aksiyon} onPress={() => setForm(null)}>
                <Text style={AdminStil.aksiyonYazi}>Vazgeç</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Uygunluk */}
        <Text style={AdminStil.sectionLabel}>Uygun işlem türleri</Text>
        <View style={AdminStil.kart}>
          {uygunluk.length === 0 && !yukleniyor ? (
            <Text style={AdminStil.bos}>Uygunluk kaydı yok</Text>
          ) : (
            uygunluk.map((u) => (
              <View key={u.category} style={styles.uygunlukSatir}>
                <Text style={styles.uygunlukEtiket}>{u.label || u.category}</Text>
                <Switch
                  value={u.enabled}
                  onValueChange={(v) => void uygunlukDegistir(u.category, v)}
                  trackColor={{
                    true: RenkTokenlari.primary,
                    false: RenkTokenlari.border,
                  }}
                  thumbColor={RenkTokenlari.bgElevated}
                />
              </View>
            ))
          )}
        </View>

        {/* Yeniden hesaplama */}
        <Text style={AdminStil.sectionLabel}>Yeniden hesaplama</Text>
        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartAlt}>
            Kullanıcı ID boş bırakılırsa tüm kullanıcılar yeniden hesaplanır.
          </Text>
          <TextInput
            style={AdminStil.input}
            placeholder="Kullanıcı ID (uuid, opsiyonel)"
            placeholderTextColor={RenkTokenlari.textDim}
            autoCapitalize="none"
            value={recalcUserId}
            onChangeText={setRecalcUserId}
          />
          <Pressable
            style={AdminStil.aksiyon}
            onPress={yenidenHesapla}
            disabled={mesgul}
          >
            <Text style={AdminStil.aksiyonYazi}>Yeniden hesapla</Text>
          </Pressable>
        </View>

        {/* Manuel düzeltme */}
        <Text style={AdminStil.sectionLabel}>Manuel düzeltme</Text>
        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartAlt}>
            Pozitif veya negatif TL farkı uygulanır. Sebep zorunludur ve denetim
            kaydına yazılır.
          </Text>
          <TextInput
            style={AdminStil.input}
            placeholder="Kullanıcı ID (uuid)"
            placeholderTextColor={RenkTokenlari.textDim}
            autoCapitalize="none"
            value={duzeltUserId}
            onChangeText={setDuzeltUserId}
          />
          <TextInput
            style={AdminStil.input}
            placeholder="Tutar farkı (ör. 500 veya -250)"
            placeholderTextColor={RenkTokenlari.textDim}
            keyboardType="numbers-and-punctuation"
            value={duzeltTutar}
            onChangeText={setDuzeltTutar}
          />
          <TextInput
            style={AdminStil.input}
            placeholder="Sebep (zorunlu)"
            placeholderTextColor={RenkTokenlari.textDim}
            value={duzeltSebep}
            onChangeText={setDuzeltSebep}
          />
          <Pressable
            style={AdminStil.aksiyon}
            onPress={() => void duzelt()}
            disabled={mesgul}
          >
            {mesgul ? (
              <ActivityIndicator size="small" color={RenkTokenlari.text} />
            ) : (
              <Text style={AdminStil.aksiyonYazi}>Düzeltmeyi uygula</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blockedText: { ...TipografiTokenlari.body, color: RenkTokenlari.danger },
  kademeSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingVertical: BoslukTokenlari.xs,
  },
  kademeCopy: { flex: 1, minWidth: 0, gap: 2 },
  kademeAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kademeAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  yeniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: YaricapTokenlari.sm,
  },
  uygunlukSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
    minHeight: 44,
  },
  uygunlukEtiket: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
  },
});
