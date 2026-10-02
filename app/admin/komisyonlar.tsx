import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminAjansKomisyonGuncelle,
  AdminAjansKomisyonListele,
  AdminAjansKomisyonVarsayilanUygula,
  AdminEkonomiConfigGuncelle,
} from '../../src/moduller/admin/platform/AdminPlatformIslemleri';
import type { AjansKomisyonOrani } from '../../src/moduller/admin/tipler/PlatformTipleri';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import {
  KomisyonNasilCalisir,
  KomisyonPayCubugu,
} from '../../src/moduller/admin/bilesenler/KomisyonPayCubugu';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { KatalogCache } from '../../src/ortak/onbellek/KatalogCache';

function pctMetin(oran: number): string {
  return String(Math.round(Number(oran) * 1000) / 10);
}

function pctParse(s: string): number {
  const n = Number(String(s).replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  return n / 100;
}

function pctSayi(s: string): number {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function AdminKomisyonlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<AjansKomisyonOrani[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [varsayilanAjansPct, setVarsayilanAjansPct] = useState('20');
  const [duzenId, setDuzenId] = useState<string | null>(null);
  const [ajansPct, setAjansPct] = useState('20');
  const [platformPct, setPlatformPct] = useState('10');
  const [q, setQ] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const d = await AdminAjansKomisyonListele();
      setItems(d.items);
      setVarsayilanAjansPct(pctMetin(d.defaults.default_agency_share));
    } catch (e) {
      Alert.alert(
        'Komisyonlar',
        e instanceof Error ? e.message : 'Liste alınamadı',
      );
      setItems([]);
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

  const filtreli = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr-TR');
    if (!s) return items;
    return items.filter(
      (x) =>
        (x.name || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (x.agency_public_id || '').toLocaleLowerCase('tr-TR').includes(s),
    );
  }, [items, q]);

  const varsayilanHost = useMemo(() => {
    const a = pctSayi(varsayilanAjansPct);
    return Math.max(0, Math.round((100 - a - 10) * 10) / 10);
  }, [varsayilanAjansPct]);

  const hostOnizleme = useMemo(() => {
    const a = pctParse(ajansPct);
    const p = pctParse(platformPct);
    if (![a, p].every(Number.isFinite)) return null;
    if (a + p > 1) return null;
    return Math.round((1 - a - p) * 1000) / 10;
  }, [ajansPct, platformPct]);

  const duzenAc = (row: AjansKomisyonOrani) => {
    setDuzenId(row.agency_id);
    setAjansPct(pctMetin(row.agency_share));
    setPlatformPct(pctMetin(row.platform_share));
  };

  const kaydet = async () => {
    if (!duzenId) return;
    const agencyShare = pctParse(ajansPct);
    const platformShare = pctParse(platformPct);
    if (![agencyShare, platformShare].every(Number.isFinite)) {
      Alert.alert('Komisyon', 'Geçerli yüzde gir (ör. 20).');
      return;
    }
    if (agencyShare + platformShare > 1) {
      Alert.alert('Komisyon', 'Ajans + platform toplamı %100’ü geçemez.');
      return;
    }
    setKaydediyor(true);
    try {
      const r = await AdminAjansKomisyonGuncelle({
        agencyId: duzenId,
        agencyShare,
        platformShare,
      });
      setItems((prev) =>
        prev.map((x) =>
          x.agency_id === duzenId
            ? {
                ...x,
                agency_share: r.agency_share,
                platform_share: r.platform_share,
                host_share: r.host_share,
                updated_at: r.updated_at,
              }
            : x,
        ),
      );
      setDuzenId(null);
      Alert.alert(
        'Kaydedildi',
        `Yayıncı %${pctMetin(r.host_share)} · Ajans %${pctMetin(r.agency_share)} · Platform %${pctMetin(r.platform_share)}`,
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const varsayilanKaydet = async () => {
    const agencyShare = pctParse(varsayilanAjansPct);
    if (!Number.isFinite(agencyShare) || agencyShare < 0 || agencyShare > 0.9) {
      Alert.alert('Varsayılan', 'Ajans payı 0–90 arası olmalı.');
      return;
    }
    setKaydediyor(true);
    try {
      await AdminEkonomiConfigGuncelle({ default_agency_share: agencyShare });
      KatalogCache.invalidatePrefix('economy');
      Alert.alert(
        'Varsayılan kaydedildi',
        `Bundan sonra açılan ajanslar: yayıncı %${varsayilanHost} · ajans %${varsayilanAjansPct} · platform %10.\n\nMevcut ajanslar değişmedi.`,
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const tumuneUygula = () => {
    Alert.alert(
      'Tüm ajanslara uygula',
      `DİKKAT: Listedeki her ajansın komisyonu şuna çekilir:\n\n• Yayıncı %${varsayilanHost}\n• Ajans %${varsayilanAjansPct}\n• Platform %10\n\nBu işlem geri alınamaz (tek tek tekrar düzenleyebilirsin).`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, uygula',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setKaydediyor(true);
              try {
                const agencyShare = pctParse(varsayilanAjansPct);
                if (Number.isFinite(agencyShare)) {
                  await AdminEkonomiConfigGuncelle({
                    default_agency_share: agencyShare,
                  });
                }
                const r = await AdminAjansKomisyonVarsayilanUygula();
                KatalogCache.invalidatePrefix('economy');
                setDuzenId(null);
                await yukle();
                Alert.alert(
                  'Uygulandı',
                  `${r.updated_rows} ajans güncellendi.`,
                );
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Uygulanamadı',
                );
              } finally {
                setKaydediyor(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Komisyon oranları"
        subtitle="Hediye elması kimlere bölünür?"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        <KomisyonNasilCalisir />

        {/* Adım 1 */}
        <View style={st.adimBaslik}>
          <View style={st.adimNo}>
            <Text style={st.adimNoYazi}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.adimTitle}>Yeni ajanslar için varsayılan</Text>
            <Text style={st.adimAlt}>
              Sadece bundan sonra açılacak ajansları etkiler
            </Text>
          </View>
        </View>

        <View style={AdminStil.kart}>
          <KomisyonPayCubugu
            host={varsayilanHost}
            ajans={pctSayi(varsayilanAjansPct)}
            platform={10}
          />

          <Text style={st.alanEtiket}>Ajans payı (%)</Text>
          <TextInput
            style={AdminStil.input}
            value={varsayilanAjansPct}
            onChangeText={setVarsayilanAjansPct}
            keyboardType="decimal-pad"
            placeholder="20"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>
            Platform sabit %10 · Yayıncı otomatik %
            {varsayilanHost}
          </Text>

          <View style={AdminStil.aksiyonSatir}>
            <Pressable
              style={[AdminStil.aksiyon, st.birincilBtn]}
              disabled={kaydediyor}
              onPress={() => void varsayilanKaydet()}
            >
              <Text style={[AdminStil.aksiyonYazi, st.birincilYazi]}>
                {kaydediyor ? '…' : 'Varsayılanı kaydet'}
              </Text>
            </Pressable>
            <Pressable
              style={AdminStil.aksiyon}
              disabled={kaydediyor}
              onPress={tumuneUygula}
            >
              <Text style={AdminStil.aksiyonYazi}>Tüm ajanslara uygula</Text>
            </Pressable>
          </View>
          <Text style={st.uyariKucuk}>
            “Tüm ajanslara uygula” mevcut oranları ezer. Dikkatli kullan.
          </Text>
        </View>

        {/* Adım 2 */}
        <View style={st.adimBaslik}>
          <View style={st.adimNo}>
            <Text style={st.adimNoYazi}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.adimTitle}>Mevcut ajansları düzenle</Text>
            <Text style={st.adimAlt}>
              {items.length} ajans · birine dokun → oranları değiştir → kaydet
            </Text>
          </View>
        </View>

        <TextInput
          style={AdminStil.input}
          value={q}
          onChangeText={setQ}
          placeholder="Ajans adı veya kod ile ara…"
          placeholderTextColor={RenkTokenlari.textDim}
        />

        {filtreli.map((row) => {
          const acik = duzenId === row.agency_id;
          return (
            <View
              key={row.agency_id}
              style={[AdminStil.kart, acik && st.kartAcik]}
            >
              <Pressable
                style={AdminStil.satir}
                onPress={() => (acik ? setDuzenId(null) : duzenAc(row))}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={AdminStil.kartBaslik}>{row.name}</Text>
                  {row.agency_public_id ? (
                    <Text style={AdminStil.kartAlt}>{row.agency_public_id}</Text>
                  ) : null}
                </View>
                <View style={st.chipRow}>
                  <View style={[st.miniChip, { backgroundColor: 'rgba(94,234,212,0.15)' }]}>
                    <Text style={[st.miniChipYazi, { color: RenkTokenlari.mint }]}>
                      H %{pctMetin(row.host_share)}
                    </Text>
                  </View>
                  <View style={[st.miniChip, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
                    <Text
                      style={[
                        st.miniChipYazi,
                        { color: RenkTokenlari.primarySoft },
                      ]}
                    >
                      A %{pctMetin(row.agency_share)}
                    </Text>
                  </View>
                  <Ionicons
                    name={acik ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={RenkTokenlari.textDim}
                  />
                </View>
              </Pressable>

              {!acik ? (
                <KomisyonPayCubugu
                  host={Number(pctMetin(row.host_share))}
                  ajans={Number(pctMetin(row.agency_share))}
                  platform={Number(pctMetin(row.platform_share))}
                />
              ) : (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <KomisyonPayCubugu
                    host={hostOnizleme ?? 0}
                    ajans={pctSayi(ajansPct)}
                    platform={pctSayi(platformPct)}
                  />

                  <Text style={st.alanEtiket}>Ajans payı (%)</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={ajansPct}
                    onChangeText={setAjansPct}
                    keyboardType="decimal-pad"
                    placeholder="20"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={st.alanEtiket}>Platform payı (%)</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={platformPct}
                    onChangeText={setPlatformPct}
                    keyboardType="decimal-pad"
                    placeholder="10"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />

                  <Text style={st.otomatik}>
                    Yayıncı payı otomatik:{' '}
                    <Text style={{ color: RenkTokenlari.mint, fontWeight: '800' }}>
                      {hostOnizleme != null ? `%${hostOnizleme}` : 'geçersiz'}
                    </Text>
                  </Text>

                  <View style={AdminStil.aksiyonSatir}>
                    <Pressable
                      style={[AdminStil.aksiyon, st.birincilBtn]}
                      disabled={kaydediyor}
                      onPress={() => void kaydet()}
                    >
                      <Text style={[AdminStil.aksiyonYazi, st.birincilYazi]}>
                        {kaydediyor ? '…' : 'Bu ajansı kaydet'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={AdminStil.aksiyon}
                      onPress={() => setDuzenId(null)}
                    >
                      <Text style={AdminStil.aksiyonYazi}>Kapat</Text>
                    </Pressable>
                    <Pressable
                      style={AdminStil.aksiyon}
                      onPress={() =>
                        router.push(`/admin/ajanslar/${row.agency_id}` as never)
                      }
                    >
                      <Text style={AdminStil.aksiyonYazi}>Ajans detayı</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {!yukleniyor && filtreli.length === 0 ? (
          <Text style={AdminStil.bos}>Ajans bulunamadı.</Text>
        ) : null}

        <Pressable
          style={[AdminStil.aksiyon, { alignSelf: 'flex-start' }]}
          onPress={() => router.push('/admin/ekonomi')}
        >
          <Text style={AdminStil.aksiyonYazi}>Ekonomi merkezi (coin/elmas ₺) →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  adimBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: BoslukTokenlari.sm,
  },
  adimNo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
  },
  adimNoYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.bg,
    fontWeight: '800',
  },
  adimTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  adimAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  alanEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  birincilBtn: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderColor: RenkTokenlari.primarySoft,
  },
  birincilYazi: {
    color: RenkTokenlari.bg,
    fontWeight: '800',
  },
  uyariKucuk: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    lineHeight: 16,
  },
  kartAcik: {
    borderColor: RenkTokenlari.borderAccent,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.sm,
  },
  miniChipYazi: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
  },
  otomatik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
