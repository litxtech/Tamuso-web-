import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import {
  HAMBURGER_MENU_KATALOGU,
  type HamburgerGrupId,
} from '../../src/moduller/ana-sayfa/menu/HamburgerMenuKatalogu';
import {
  AdminHamburgerMenuKaydet,
  HamburgerMenuCacheOku,
  HamburgerMenuyuYukle,
  type HamburgerRemoteItem,
} from '../../src/moduller/ana-sayfa/menu/HamburgerMenuCache';
import { HamburgerMenuyuKur } from '../../src/moduller/ana-sayfa/menu/HamburgerMenuyuKur';
import { menuGruplarinaBol } from '../../src/moduller/ana-sayfa/bilesenler/HamburgerMenuGrubu';

const GRUP_ETIKET: Record<HamburgerGrupId, string> = {
  yardim: 'Yardım',
  yayin: 'Yayın',
  hesap: 'Hesap',
  kesfet: 'Keşif',
  yonetim: 'Yönetim',
};

function remoteVarsayilan(): HamburgerRemoteItem[] {
  const mevcut = HamburgerMenuCacheOku();
  const map = new Map(mevcut.map((m) => [m.item_key, m]));
  return HAMBURGER_MENU_KATALOGU.map((k) => {
    const r = map.get(k.itemKey);
    return (
      r ?? {
        item_key: k.itemKey,
        enabled: true,
        sort_order: k.defaultSort,
        group_id: k.defaultGroup,
      }
    );
  }).sort((a, b) => a.sort_order - b.sort_order);
}

export default function AdminHamburgerMenuEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { t } = useCeviri();
  const [items, setItems] = useState<HamburgerRemoteItem[]>(remoteVarsayilan);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      await HamburgerMenuyuYukle();
      setItems(remoteVarsayilan());
    } catch (e) {
      Alert.alert(
        'Hamburger menü',
        e instanceof Error ? e.message : 'Yüklenemedi',
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

  const simuleOgeler = useMemo(
    () =>
      HamburgerMenuyuKur({
        t,
        isAdmin: true,
        remoteOverride: items,
        flagKapisiniAtla: true,
      }),
    [t, items],
  );

  const simuleGruplar = useMemo(
    () =>
      menuGruplarinaBol(simuleOgeler, {
        yardim: GRUP_ETIKET.yardim,
        yayin: GRUP_ETIKET.yayin,
        hesap: GRUP_ETIKET.hesap,
        kesfet: GRUP_ETIKET.kesfet,
        yonetim: GRUP_ETIKET.yonetim,
      }),
    [simuleOgeler],
  );

  const tasi = (index: number, yon: -1 | 1) => {
    setItems((prev) => {
      const sorted = [...prev].sort(
        (a, b) => a.sort_order - b.sort_order || a.item_key.localeCompare(b.item_key),
      );
      const hedef = index + yon;
      if (hedef < 0 || hedef >= sorted.length) return prev;
      const kopya = sorted.slice();
      const tmp = kopya[index]!;
      kopya[index] = kopya[hedef]!;
      kopya[hedef] = tmp;
      return kopya.map((it, i) => ({
        ...it,
        sort_order: (i + 1) * 10,
      }));
    });
  };

  const gizleGoster = (key: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.item_key === key ? { ...it, enabled: !it.enabled } : it,
      ),
    );
  };

  const grupDegistir = (key: string) => {
    const siralar: HamburgerGrupId[] = [
      'yardim',
      'yayin',
      'hesap',
      'kesfet',
      'yonetim',
    ];
    setItems((prev) =>
      prev.map((it) => {
        if (it.item_key !== key) return it;
        const idx = siralar.indexOf(it.group_id);
        const next = siralar[(idx + 1) % siralar.length]!;
        return { ...it, group_id: next };
      }),
    );
  };

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      const sirali = [...items]
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.item_key.localeCompare(b.item_key),
        )
        .map((it, i) => ({ ...it, sort_order: (i + 1) * 10 }));
      await AdminHamburgerMenuKaydet(sirali);
      setItems(sirali);
      Alert.alert('Tamam', 'Hamburger menü tüm kullanıcılara kaydedildi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!admin) return null;

  const siraliListe = [...items].sort(
    (a, b) => a.sort_order - b.sort_order || a.item_key.localeCompare(b.item_key),
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Hamburger menü"
        subtitle="Sırala · gizle · canlı önizleme"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartBaslik}>Canlı simülasyon</Text>
          <Text style={AdminStil.kartAlt}>
            Kullanıcının göreceği drawer (flag kapısı simülasyonda kapalı; gizlenenler
            listede soluk).
          </Text>
          {yukleniyor && !items.length ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              {simuleGruplar.map((g) => (
                <View key={g.id} style={{ gap: 4 }}>
                  <Text
                    style={{
                      color: RenkTokenlari.textDim,
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 1,
                    }}
                  >
                    {g.baslik.toUpperCase()}
                  </Text>
                  {g.ogeler.map((o) => (
                    <View
                      key={o.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: RenkTokenlari.surface,
                        opacity: (o as { enabled?: boolean }).enabled === false ? 0.4 : 1,
                      }}
                    >
                      <Ionicons name={o.icon} size={18} color={o.tint} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>
                          {o.baslik}
                        </Text>
                        <Text style={{ color: RenkTokenlari.textDim, fontSize: 12 }}>
                          {o.alt}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
              {simuleGruplar.length === 0 ? (
                <Text style={AdminStil.kartAlt}>Hiç görünür öğe yok.</Text>
              ) : null}
            </View>
          )}
        </View>

        <Text style={AdminStil.sectionLabel}>Düzenle</Text>
        <Text style={[AdminStil.kartAlt, { marginTop: -4 }]}>
          ↑↓ sıra · göz ile gizle/göster · Kaydet tüm kullanıcılara uygulanır.
        </Text>

        {siraliListe.map((it, index) => {
          const kat = HAMBURGER_MENU_KATALOGU.find((k) => k.itemKey === it.item_key);
          const baslik = kat ? String(t(kat.baslikKey)) : it.item_key;
          return (
            <View key={it.item_key} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={AdminStil.kartBaslik}>{baslik}</Text>
                  <Text style={AdminStil.kartAlt}>{it.item_key}</Text>
                  <Pressable
                    onPress={() => grupDegistir(it.item_key)}
                    style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: RenkTokenlari.surface,
                      borderWidth: 1,
                      borderColor: RenkTokenlari.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: RenkTokenlari.primarySoft,
                      }}
                    >
                      {GRUP_ETIKET[it.group_id] ?? it.group_id}
                    </Text>
                  </Pressable>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: it.enabled
                        ? RenkTokenlari.primarySoft + '33'
                        : RenkTokenlari.danger + '33',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: it.enabled
                          ? RenkTokenlari.primarySoft
                          : RenkTokenlari.danger,
                      }}
                    >
                      {it.enabled ? 'Görünür' : 'Gizli'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => tasi(index, -1)}
                    style={AdminStil.aksiyon}
                    accessibilityLabel="Yukarı"
                  >
                    <Ionicons name="chevron-up" size={18} color={RenkTokenlari.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => tasi(index, 1)}
                    style={AdminStil.aksiyon}
                    accessibilityLabel="Aşağı"
                  >
                    <Ionicons name="chevron-down" size={18} color={RenkTokenlari.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => gizleGoster(it.item_key)}
                    style={AdminStil.aksiyon}
                    accessibilityLabel={it.enabled ? 'Gizle' : 'Göster'}
                  >
                    <Ionicons
                      name={it.enabled ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={RenkTokenlari.text}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <Pressable
          style={[
            AdminStil.aksiyon,
            {
              marginTop: 8,
              marginBottom: 40,
              borderColor: RenkTokenlari.primarySoft,
              opacity: kaydediliyor ? 0.6 : 1,
            },
          ]}
          disabled={kaydediliyor}
          onPress={() => void kaydet()}
        >
          <Text
            style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.primarySoft }]}
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
