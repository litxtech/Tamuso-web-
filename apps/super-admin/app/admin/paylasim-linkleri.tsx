import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { GradientButton } from '../../../../src/components/GradientButton';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { TumPaylasimLinkleriniGetir } from '../../../../src/moduller/paylasim-linkleri/okuma/PaylasimLinkleriniGetir';
import {
  PaylasimLinkiAktiflikDegistir,
  PaylasimLinkiGuncelle,
  PaylasimLinkiOlustur,
  PaylasimLinkiSil,
} from '../../../../src/moduller/paylasim-linkleri/islemler/AdminPaylasimLinkIslemleri';
import type {
  AppPaylasimLinki,
  PaylasimLinkGirdi,
  PaylasimPlatform,
} from '../../../../src/moduller/paylasim-linkleri/tipler';
import { PaylasimHttpsUrlOlustur } from '../../../../src/moduller/paylasim-linkleri/PaylasimUrl';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const PLATFORMLAR: { key: PaylasimPlatform; label: string }[] = [
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
  { key: 'web', label: 'Web' },
  { key: 'universal', label: 'Universal' },
  { key: 'other', label: 'Diğer' },
];

const BOS: PaylasimLinkGirdi = {
  code: '',
  title: '',
  description: '',
  platform: 'other',
  url: 'https://',
  is_active: true,
  sort_order: 100,
};

export default function AdminPaylasimLinkleriEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<AppPaylasimLinki[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [duzenle, setDuzenle] = useState<{
    id: string | null;
    girdi: PaylasimLinkGirdi;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      setYukleniyor(true);
      TumPaylasimLinkleriniGetir()
        .then(setListe)
        .catch(() => setListe([]))
        .finally(() => setYukleniyor(false));
    }, [admin]),
  );

  const ornekUrl = useMemo(() => PaylasimHttpsUrlOlustur('ORNEK123'), []);

  if (!admin) return null;

  const yenile = async () => {
    const rows = await TumPaylasimLinkleriniGetir();
    setListe(rows);
  };

  const kaydet = async () => {
    if (!duzenle) return;
    setBusy(true);
    const r = duzenle.id
      ? await PaylasimLinkiGuncelle(duzenle.id, duzenle.girdi)
      : await PaylasimLinkiOlustur(duzenle.girdi);
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Link', r.hata);
      return;
    }
    setDuzenle(null);
    await yenile();
  };

  const sil = (item: AppPaylasimLinki) => {
    Alert.alert('Sil', `"${item.title}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await PaylasimLinkiSil(item.id);
            if (!r.ok) Alert.alert('Link', r.hata);
            else await yenile();
          })();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Paylaşım linkleri"
        subtitle="İndirme URL'leri · düzenle / sil"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.info}>
          <Text style={styles.infoBaslik}>Kullanıcı paylaşım URL’si</Text>
          <Text style={styles.infoMetin} selectable>
            {ornekUrl}
          </Text>
          <Text style={styles.infoAlt}>
            ios / android / web kodları yönlendirmede önceliklidir. Store
            linklerini buradan güncelle.
          </Text>
        </View>

        <GradientButton
          title="Yeni link"
          onPress={() => setDuzenle({ id: null, girdi: { ...BOS } })}
        />

        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.liste}>
            {liste.map((item) => (
              <View key={item.id} style={styles.kart}>
                <View style={styles.kartUst}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kod}>{item.code}</Text>
                    <Text style={styles.baslik}>{item.title}</Text>
                    <Text style={styles.url} numberOfLines={2}>
                      {item.url}
                    </Text>
                    <Text style={styles.meta}>
                      {item.platform} · sıra {item.sort_order}
                      {item.is_active ? '' : ' · pasif'}
                    </Text>
                  </View>
                  <Switch
                    value={item.is_active}
                    onValueChange={(v) => {
                      void (async () => {
                        const r = await PaylasimLinkiAktiflikDegistir(item.id, v);
                        if (!r.ok) Alert.alert('Link', r.hata);
                        else await yenile();
                      })();
                    }}
                    trackColor={{
                      false: RenkTokenlari.border,
                      true: RenkTokenlari.primarySoft,
                    }}
                  />
                </View>
                <View style={styles.aksiyon}>
                  <Pressable
                    style={styles.aksiyonBtn}
                    onPress={() =>
                      setDuzenle({
                        id: item.id,
                        girdi: {
                          code: item.code,
                          title: item.title,
                          description: item.description,
                          platform: item.platform,
                          url: item.url,
                          is_active: item.is_active,
                          sort_order: item.sort_order,
                        },
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={16} color={RenkTokenlari.primarySoft} />
                    <Text style={styles.aksiyonYazi}>Düzenle</Text>
                  </Pressable>
                  <Pressable style={styles.aksiyonBtn} onPress={() => sil(item)}>
                    <Ionicons name="trash-outline" size={16} color={RenkTokenlari.danger} />
                    <Text style={[styles.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                      Sil
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {liste.length === 0 ? (
              <Text style={styles.bos}>Henüz link yok. Yeni link ekle.</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!duzenle} transparent animationType="fade">
        <View style={styles.modalKok}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDuzenle(null)} />
          <View style={styles.modalKart}>
            <Text style={styles.modalBaslik}>
              {duzenle?.id ? 'Linki düzenle' : 'Yeni link'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Alan
                etiket="Kod"
                deger={duzenle?.girdi.code ?? ''}
                onChange={(t) =>
                  setDuzenle((d) =>
                    d ? { ...d, girdi: { ...d.girdi, code: t } } : d,
                  )
                }
                placeholder="ios / android / kampanya"
              />
              <Alan
                etiket="Başlık"
                deger={duzenle?.girdi.title ?? ''}
                onChange={(t) =>
                  setDuzenle((d) =>
                    d ? { ...d, girdi: { ...d.girdi, title: t } } : d,
                  )
                }
              />
              <Alan
                etiket="URL"
                deger={duzenle?.girdi.url ?? ''}
                onChange={(t) =>
                  setDuzenle((d) =>
                    d ? { ...d, girdi: { ...d.girdi, url: t } } : d,
                  )
                }
                autoCapitalize="none"
              />
              <Alan
                etiket="Açıklama"
                deger={duzenle?.girdi.description ?? ''}
                onChange={(t) =>
                  setDuzenle((d) =>
                    d ? { ...d, girdi: { ...d.girdi, description: t } } : d,
                  )
                }
              />
              <Alan
                etiket="Sıra"
                deger={String(duzenle?.girdi.sort_order ?? 100)}
                onChange={(t) =>
                  setDuzenle((d) =>
                    d
                      ? {
                          ...d,
                          girdi: {
                            ...d.girdi,
                            sort_order: Number.parseInt(t, 10) || 0,
                          },
                        }
                      : d,
                  )
                }
                keyboardType="number-pad"
              />
              <Text style={styles.etiket}>Platform</Text>
              <View style={styles.platformlar}>
                {PLATFORMLAR.map((p) => {
                  const secili = duzenle?.girdi.platform === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() =>
                        setDuzenle((d) =>
                          d ? { ...d, girdi: { ...d.girdi, platform: p.key } } : d,
                        )
                      }
                      style={[styles.platChip, secili && styles.platChipOn]}
                    >
                      <Text style={[styles.platYazi, secili && styles.platYaziOn]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalAksiyon}>
              <Pressable onPress={() => setDuzenle(null)} style={styles.iptal}>
                <Text style={styles.iptalYazi}>Vazgeç</Text>
              </Pressable>
              <GradientButton title={busy ? '...' : 'Kaydet'} onPress={() => void kaydet()} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Alan({
  etiket,
  deger,
  onChange,
  placeholder,
  autoCapitalize,
  keyboardType,
}: {
  etiket: string;
  deger: string;
  onChange: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.alan}>
      <Text style={styles.etiket}>{etiket}</Text>
      <TextInput
        value={deger}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={RenkTokenlari.textDim}
        style={styles.input}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  info: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 6,
  },
  infoBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  infoMetin: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
  },
  infoAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  liste: { gap: BoslukTokenlari.sm, marginTop: BoslukTokenlari.sm },
  kart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: BoslukTokenlari.sm,
  },
  kartUst: { flexDirection: 'row', gap: BoslukTokenlari.md },
  kod: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.violet,
    letterSpacing: 1,
    fontWeight: '800',
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 2,
  },
  url: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 4,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  aksiyon: { flexDirection: 'row', gap: BoslukTokenlari.md },
  aksiyonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: BoslukTokenlari.xl,
  },
  modalKok: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalKart: {
    maxHeight: '88%',
    backgroundColor: RenkTokenlari.bgElevated ?? RenkTokenlari.bgCard,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.xl,
    gap: BoslukTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  modalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  alan: { marginBottom: BoslukTokenlari.sm },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: 6,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  platformlar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  platChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  platChipOn: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: `${RenkTokenlari.primarySoft}22`,
  },
  platYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  platYaziOn: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  modalAksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
  },
  iptal: { padding: 12 },
  iptalYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
