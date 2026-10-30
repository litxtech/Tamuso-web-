import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminCiroOzetiGetir,
  type AdminCiroOzeti,
  type CiroDonem,
} from '../../../../src/moduller/admin/ciro/AdminCiroOzetiGetir';
import { AdminStil, SayiKisa } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../../../src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { AdminCiroBelgesiOlustur } from '../../../../src/moduller/belge-paylasim/BelgeIcerikDonustur';
import type { BelgeIcerik } from '../../../../src/moduller/belge-paylasim/BelgeSablonlari';
import { supabase } from '../../../../src/lib/supabase';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const DONEMLER: { key: CiroDonem; label: string }[] = [
  { key: 'today', label: 'Gün' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Ay' },
  { key: 'all', label: 'Toplam' },
];

function tryYazi(n: number): string {
  return `${Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₺`;
}

export default function AdminCiroEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [donem, setDonem] = useState<CiroDonem>('today');
  const [data, setData] = useState<AdminCiroOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState<'kimden' | 'islem'>('kimden');
  const [belge, setBelge] = useState<BelgeIcerik | null>(null);
  const [paylasAcik, setPaylasAcik] = useState(false);
  const [canli, setCanli] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setData(await AdminCiroOzetiGetir(donem, 100));
    } catch {
      setData(null);
    } finally {
      setYukleniyor(false);
    }
  }, [donem]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  useEffect(() => {
    if (!admin) return;
    const ch = supabase
      .channel('admin-ciro-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coin_purchases' },
        () => {
          setCanli(true);
          void yukle();
        },
      )
      .subscribe();
    const poll = setInterval(() => void yukle(), 20_000);
    return () => {
      void supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [admin, yukle]);

  const aktifMetrik = useMemo(() => {
    if (!data) return { try: 0, coins: 0, adet: 0 };
    return data.ozet[donem];
  }, [data, donem]);

  if (!admin) return null;

  const belgeAc = () => {
    setBelge(AdminCiroBelgesiOlustur(data));
    setPaylasAcik(true);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ciro"
        subtitle={canli ? 'Anlık · güncelleniyor' : 'Finans ciro'}
        onBack={() => router.back()}
        right={
          <BelgePaylasDugmesi onPress={belgeAc} label="PDF / WA / Yazıcı" />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Seçili dönem cirosu</Text>
          <Text style={styles.heroTry}>{tryYazi(aktifMetrik.try)}</Text>
          <Text style={styles.heroMeta}>
            {SayiKisa(aktifMetrik.coins)} coin · {aktifMetrik.adet} işlem
          </Text>
          <View style={styles.canliPill}>
            <View style={styles.canliDot} />
            <Text style={styles.canliText}>Canlı</Text>
          </View>
        </View>

        <View style={styles.donemRow}>
          {DONEMLER.map((d) => {
            const m = data?.ozet[d.key];
            const on = donem === d.key;
            return (
              <Pressable
                key={d.key}
                style={[styles.donem, on && styles.donemOn]}
                onPress={() => setDonem(d.key)}
              >
                <Text style={[styles.donemLabel, on && styles.donemLabelOn]}>
                  {d.label}
                </Text>
                <Text style={[styles.donemVal, on && styles.donemValOn]}>
                  {tryYazi(m?.try ?? 0)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.aksiyonRow}>
          <BelgePaylasDugmesi onPress={belgeAc} label="PDF · WhatsApp · Yazıcı" />
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, sekme === 'kimden' && styles.tabOn]}
            onPress={() => setSekme('kimden')}
          >
            <Text style={[styles.tabText, sekme === 'kimden' && styles.tabTextOn]}>
              Kimden
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, sekme === 'islem' && styles.tabOn]}
            onPress={() => setSekme('islem')}
          >
            <Text style={[styles.tabText, sekme === 'islem' && styles.tabTextOn]}>
              İşlemler
            </Text>
          </Pressable>
        </View>

        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        {sekme === 'kimden'
          ? (data?.kimden ?? []).map((k) => (
              <Pressable
                key={k.user_id}
                style={AdminStil.kart}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${k.user_id}` as any)
                }
              >
                <View style={styles.satir}>
                  {k.avatar_url ? (
                    <Image source={{ uri: MedyaUriGuvenli(k.avatar_url)! }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarBos]}>
                      <Ionicons
                        name="person"
                        size={16}
                        color={RenkTokenlari.textMuted}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={AdminStil.kartBaslik} numberOfLines={1}>
                      {k.display_name}
                    </Text>
                    <Text style={AdminStil.kartAlt} numberOfLines={1}>
                      @{k.username ?? '—'} · {k.public_user_id ?? '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.tutar}>{tryYazi(Number(k.toplam_try))}</Text>
                    <Text style={AdminStil.kartAlt}>
                      {SayiKisa(Number(k.toplam_coin))} · {k.islem_adet}×
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          : (data?.islemler ?? []).map((i) => (
              <Pressable
                key={i.id}
                style={AdminStil.kart}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${i.user_id}` as any)
                }
              >
                <View style={styles.satir}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={AdminStil.kartBaslik} numberOfLines={1}>
                      {i.display_name}
                    </Text>
                    <Text style={AdminStil.kartAlt}>
                      {i.package_title ?? i.provider ?? 'Yükleme'} ·{' '}
                      {new Date(i.created_at).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.tutar}>{tryYazi(Number(i.amount_try))}</Text>
                    <Text style={AdminStil.kartAlt}>
                      +{SayiKisa(Number(i.coins_added))} coin
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}

        {!yukleniyor &&
        ((sekme === 'kimden' && !(data?.kimden?.length)) ||
          (sekme === 'islem' && !(data?.islemler?.length))) ? (
          <Text style={AdminStil.bos}>Bu dönemde yükleme yok</Text>
        ) : null}
      </ScrollView>

      <BelgePaylasimPaneli
        visible={paylasAcik}
        onKapat={() => setPaylasAcik(false)}
        icerik={belge}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.sm,
  },
  hero: {
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 4,
    marginBottom: BoslukTokenlari.sm,
  },
  heroLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1,
  },
  heroTry: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontSize: 32,
  },
  heroMeta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  canliPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(61,207,176,0.16)',
  },
  canliDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.mint,
  },
  canliText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  donemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  donem: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  donemOn: {
    borderColor: RenkTokenlari.mint,
    backgroundColor: 'rgba(61,207,176,0.12)',
  },
  donemLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  donemLabelOn: { color: RenkTokenlari.mint },
  donemVal: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  donemValOn: { color: RenkTokenlari.text },
  aksiyonRow: { marginVertical: BoslukTokenlari.sm },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tabOn: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(232,64,145,0.14)',
  },
  tabText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  tabTextOn: { color: RenkTokenlari.primarySoft },
  satir: { flexDirection: 'row', alignItems: 'center', gap: BoslukTokenlari.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutar: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
});
