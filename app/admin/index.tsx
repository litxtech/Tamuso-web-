import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminOzetGetir, type AdminOzet } from '../../src/moduller/admin/okuma/AdminOzetGetir';
import {
  AdminOnayBalonlariGetir,
  type AdminOnayBalonu,
} from '../../src/moduller/admin/okuma/AdminOnayBalonlari';
import {
  AdminStil,
  SayiKisa,
} from '../../src/moduller/admin/bilesenler/AdminStil';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { AdminOzetBelgesiOlustur } from '../../src/moduller/belge-paylasim/BelgeIcerikDonustur';
import type { BelgeIcerik } from '../../src/moduller/belge-paylasim/BelgeSablonlari';
import {
  ADMIN_BOLUM_SIRASI,
  ADMIN_MODULLER,
  type AdminAramaSonuc,
} from '../../src/moduller/admin/arama/AdminModulKatalogu';
import { AdminAramaKutusu } from '../../src/moduller/admin/arama/AdminAramaKutusu';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminHubEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ozet, setOzet] = useState<AdminOzet | null>(null);
  const [balonlar, setBalonlar] = useState<AdminOnayBalonu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [belge, setBelge] = useState<BelgeIcerik | null>(null);
  const [paylasAcik, setPaylasAcik] = useState(false);
  const [aramaAktif, setAramaAktif] = useState(false);
  const [aramaSonuc, setAramaSonuc] = useState<AdminAramaSonuc[]>([]);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const gelen = await AdminOzetGetir();
      setOzet(gelen);
      setBalonlar(await AdminOnayBalonlariGetir(gelen.platform));
    } catch {
      setOzet(null);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (!admin) router.replace('/(tabs)/profile');
  }, [admin]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) return;
      void yukle();
    }, [admin, yukle]),
  );

  const gosterilecek = useMemo(() => {
    if (!aramaAktif) return ADMIN_MODULLER;
    const hrefSet = new Set(aramaSonuc.map((s) => s.href));
    return ADMIN_MODULLER.filter((m) => hrefSet.has(m.href));
  }, [aramaAktif, aramaSonuc]);

  if (!admin) {
    return (
      <Screen edges={['top']}>
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>Yetkisiz erişim</Text>
        </View>
      </Screen>
    );
  }

  const p = ozet?.platform;
  const kpis = [
    {
      id: 'kullanici',
      n: SayiKisa(p?.kullanici.toplam ?? null),
      l: 'Kullanıcı',
      tint: RenkTokenlari.accent,
    },
    {
      id: 'coin',
      n: p ? SayiKisa(p.finans.toplam_yukleme_coin) : '—',
      l: 'Toplam coin',
      tint: RenkTokenlari.primarySoft,
    },
    {
      id: 'cekim_veya_push',
      n: String(p?.finans.bekleyen_cekim ?? ozet?.pendingOutbox ?? '—'),
      l: p ? 'Bekleyen çekim' : 'Push kuyruk',
      tint: RenkTokenlari.warning,
    },
    {
      id: 'rapor',
      n: String(p?.sosyal.acik_rapor ?? ozet?.openReports ?? '—'),
      l: 'Açık rapor',
      tint: RenkTokenlari.danger,
    },
    {
      id: 'canli_oda',
      n: String(p?.canli.odalar ?? ozet?.liveRooms ?? '—'),
      l: 'Canlı oda',
      tint: RenkTokenlari.live,
    },
    {
      id: 'canli_pk',
      n: String(p?.canli.pk ?? ozet?.livePk ?? '—'),
      l: 'Canlı PK',
      tint: RenkTokenlari.violet,
    },
  ];

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Kontrol merkezi" subtitle="Platform yönetimi" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <AdminAramaKutusu
          onSonuc={(sonuclar, sorgu) => {
            const aktif = sorgu.trim().length > 0;
            setAramaAktif(aktif);
            setAramaSonuc(sonuclar);
          }}
        />

        {!aramaAktif && yukleniyor && !ozet ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        {!aramaAktif && balonlar.length ? (
          <View style={styles.balonSerit}>
            {balonlar.map((b) => (
              <Pressable
                key={b.id}
                style={styles.balon}
                onPress={() => router.push(b.href as never)}
                accessibilityRole="button"
              >
                <Text style={styles.balonAdet}>{b.adet}</Text>
                <Text style={styles.balonYazi}>{b.etiket}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!aramaAktif ? (
          <View style={AdminStil.kpiGrid}>
            {kpis.map((k) => (
              <View key={k.id} style={AdminStil.kpi}>
                <Text style={[AdminStil.kpiN, { color: k.tint }]}>{k.n}</Text>
                <Text style={AdminStil.kpiL}>{k.l}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.aramaMeta}>
            {aramaSonuc.length} sayfa · Enter ile ilk sonuca git
          </Text>
        )}

        {ADMIN_BOLUM_SIRASI.map((bolum) => {
          const items = gosterilecek.filter((m) => m.bolum === bolum);
          if (!items.length) return null;
          return (
            <View key={bolum} style={styles.bolum}>
              <Text style={AdminStil.sectionLabel}>{bolum}</Text>
              <View style={styles.modulGrid}>
                {items.map((m) => (
                  <Pressable
                    key={m.href}
                    style={styles.modul}
                    onPress={() => router.push(m.href as any)}
                  >
                    <View style={[styles.modulIcon, { borderColor: m.tint }]}>
                      <Ionicons name={m.icon} size={18} color={m.tint} />
                    </View>
                    <Text style={AdminStil.modulLabel}>{m.label}</Text>
                    <Text style={AdminStil.modulAlt}>{m.alt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        {aramaAktif && gosterilecek.length === 0 ? (
          <Text style={styles.bosGrid}>Eşleşen sayfa yok</Text>
        ) : null}

        {!aramaAktif ? (
          <BelgePaylasDugmesi
            onPress={() => {
              setBelge(AdminOzetBelgesiOlustur(ozet));
              setPaylasAcik(true);
            }}
            label="Özet raporu"
          />
        ) : null}

        <Text style={styles.note}>
          Kritik işlemler denetim kaydına yazılır. Üstteki arama ile tüm admin
          sayfalarına anında ulaş.
        </Text>
      </ScrollView>

      <BelgePaylasimPaneli
        visible={paylasAcik}
        onKapat={() => setPaylasAcik(false)}
        icerik={belge}
        telefon={profile?.phone_e164}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blockedText: { ...TipografiTokenlari.body, color: RenkTokenlari.danger },
  note: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 8,
  },
  aramaMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  bosGrid: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginVertical: 24,
  },
  bolum: {
    marginBottom: BoslukTokenlari.md,
  },
  modulGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modul: {
    width: '48%',
    marginBottom: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  balonSerit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  balon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 91, 91, 0.16)',
    borderWidth: 1,
    borderColor: RenkTokenlari.danger,
  },
  balonAdet: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '800',
  },
  balonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  modulIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BoslukTokenlari.sm,
    borderWidth: 1,
    backgroundColor: RenkTokenlari.surface,
  },
});
