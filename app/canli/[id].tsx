import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { MedyaOdasiBaglan, MedyaOdasiKes } from '../../src/moduller/livekit/MedyaBaglantisi';
import {
  CanliYayinTiyatro,
  type CanliYayinMeta,
} from '../../src/moduller/canli-yayin/bilesenler/CanliYayinTiyatro';
import {
  CanliYayinIzleyiciCik,
  CanliYayinIzleyiciGir,
} from '../../src/moduller/canli-yayin/islemler/CanliYayinIslemleri';
import { useHediyeMagaza } from '../../src/moduller/hediyeler/islemler/useHediyeMagaza';
import { HediyeMagazaBaglamasi } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaBaglamasi';
import { HediyeAnimasyonKatmani } from '../../src/moduller/hediyeler/bilesenler/HediyeAnimasyonKatmani';
import { useCanliHediyeCanlisi } from '../../src/moduller/hediyeler/gercek-zamanli/useCanliHediyeCanlisi';
import { CoinYuklePaneli } from '../../src/moduller/cuzdan/bilesenler/CoinYuklePaneli';
import { useCanliPkMac } from '../../src/moduller/pk/kancalar/useCanliPkMac';
import { supabase } from '../../src/lib/supabase';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { SonGezileneKaydet, SonGezilendenSil } from '../../src/moduller/ana-sayfa/depolama/SonGezilenDepolama';
import { useCeviri } from '../../src/i18n/useCeviri';
import i18n from '../../src/i18n';

/** Izleyici: tam ekran video + yorum + hediye + beğeni */
export default function CanliIzleyiciEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isGuest, refreshProfile, refreshWallet, wallet } = useAuth();
  const { upgradeAcik, upgradeKapat, upgradeAc } = useMisafirIslemKapisi(isGuest);
  const magaza = useHediyeMagaza();
  const [meta, setMeta] = useState<CanliYayinMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [medyaDurum, setMedyaDurum] = useState(() => i18n.t('canliYayin.baglaniyor'));
  const [medyaMock, setMedyaMock] = useState(false);
  const metaRef = useRef<CanliYayinMeta | null>(null);
  const baglaniyorRef = useRef(false);
  const { mac: pkMac } = useCanliPkMac({
    liveSessionId: meta?.id ?? (typeof id === 'string' ? id : undefined),
    enabled: !!meta?.id,
  });

  useCanliHediyeCanlisi({
    sessionId: meta?.id,
    selfUserId: user?.id,
    gifts: magaza.gifts,
    enabled: !!meta?.id,
  });

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  const load = useCallback(
    async (opts?: { soft?: boolean; iptal?: () => boolean }) => {
      if (!id) return;
      const soft = !!opts?.soft && !!metaRef.current;
      const iptal = opts?.iptal ?? (() => false);

      if (baglaniyorRef.current) return;
      baglaniyorRef.current = true;

      if (!soft) setLoading(true);
      else setMedyaDurum(t('canliYayin.goruntuYeniden'));

      try {
        // Önceki blur disconnect yarışını kapat
        await MedyaOdasiKes();
        if (iptal()) return;

        const { data, error } = await supabase
          .from('live_sessions')
          .select(
            '*, host:profiles!live_sessions_host_id_fkey(display_name, username, avatar_url)',
          )
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data || !data.is_live) {
          setMeta(null);
          setMedyaDurum(t('canliYayin.yayinSonaErdi'));
          return;
        }
        const row = data as unknown as {
          id: string;
          host_id: string;
          title: string;
          viewer_count: number | null;
          like_count?: number | null;
          gift_count?: number | null;
          total_coins_earned?: number | null;
          started_at?: string | null;
          livekit_room_name: string | null;
          host?:
            | {
                display_name: string | null;
                username: string | null;
                avatar_url: string | null;
              }
            | {
                display_name: string | null;
                username: string | null;
                avatar_url: string | null;
              }[]
            | null;
        };
        const hostRaw = row.host;
        const host = Array.isArray(hostRaw) ? hostRaw[0] ?? null : hostRaw ?? null;
        const hostAd =
          host?.display_name?.trim() || host?.username?.trim() || t('canliYayin.yayinci');

        if (iptal()) return;

        setMeta({
          id: row.id,
          host_id: row.host_id,
          title: row.title,
          viewer_count: row.viewer_count ?? 0,
          like_count: row.like_count ?? 0,
          gift_count: row.gift_count ?? 0,
          total_coins_earned: Number(row.total_coins_earned ?? 0),
          hostAd,
          hostAvatar: host?.avatar_url ?? null,
          started_at: row.started_at ?? null,
        });

        void SonGezileneKaydet({
          id: row.id,
          tur: 'canli',
          title: row.title,
          coverUrl: host?.avatar_url ?? null,
          hostAd,
          hostAvatar: host?.avatar_url ?? null,
          mode: null,
          href: `/canli/${row.id}`,
        });

        const gir = await CanliYayinIzleyiciGir(row.id);
        if (iptal()) return;
        if (!gir.ok) {
          Alert.alert(t('canliYayin.canli'), gir.hata);
          setMeta(null);
          return;
        }
        setMeta((m) => (m ? { ...m, viewer_count: gir.viewer_count } : m));

        const roomName = row.livekit_room_name ?? `live_${row.id}`;
        const medya = await MedyaOdasiBaglan({
          roomName,
          role: 'listener',
          video: true,
          zorla: soft,
        });
        if (iptal()) return;
        setMedyaDurum(
          medya.ok
            ? medya.mock
              ? t('canliYayin.izlemeMock')
              : t('canliYayin.izleme')
            : medya.hata,
        );
        setMedyaMock(!!(medya.ok && medya.mock));
      } catch (e) {
        if (iptal()) return;
        Alert.alert(
          t('canliYayin.canli'),
          e instanceof Error ? e.message : t('canliYayin.yayinAcilamadi'),
        );
        setMeta(null);
      } finally {
        baglaniyorRef.current = false;
        if (!iptal()) setLoading(false);
      }
    },
    [id, t],
  );

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      const soft = !!metaRef.current;
      void load({ soft, iptal: () => iptal });
      return () => {
        iptal = true;
        if (id) void CanliYayinIzleyiciCik(id).catch(() => undefined);
        void MedyaOdasiKes();
      };
    }, [load, id]),
  );

  // Yayıncı atar/engellerse veya yayın biterse izleyiciyi çıkar
  useEffect(() => {
    if (!id || !user?.id) return;
    const ch = supabase
      .channel(`canli-ban-${id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_bans',
          filter: `session_id=eq.${id}`,
        },
        (payload: { new?: { user_id?: string; action?: string } }) => {
          if (payload.new?.user_id === user.id) {
            void MedyaOdasiKes();
            Alert.alert(
              t('canliYayin.yayin'),
              payload.new.action === 'ban'
                ? t('canliYayin.engellendiBody')
                : t('canliYayin.atildiBody'),
              [{ text: t('ortak.tamam'), onPress: () => router.back() }],
            );
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${id}`,
        },
        (payload: { new?: { is_live?: boolean } }) => {
          if (payload.new && payload.new.is_live === false) {
            if (typeof id === 'string') void SonGezilendenSil('canli', id);
            Alert.alert(t('canliYayin.yayinBitti'), t('canliYayin.yayinciBitirdi'), [
              { text: t('ortak.tamam'), onPress: () => router.back() },
            ]);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, user?.id, t]);

  if (loading && !meta) {
    return (
      <Screen koyuSahne>
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 80 }}
        />
      </Screen>
    );
  }

  if (!meta) {
    return (
      <Screen koyuSahne edges={['top']}>
        <View style={styles.bos}>
          <Text style={styles.bosTitle}>{t('canliYayin.yayinBulunamadi')}</Text>
          <Pressable onPress={() => router.back()} style={styles.geri}>
            <Text style={styles.geriText}>{t('ortak.geri')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen koyuSahne edges={[]}>
      <ModulHataSiniri modulAdi="canli-yayin">
        <CanliYayinTiyatro
          rol="izleyici"
          meta={meta}
          medyaDurum={medyaDurum}
          medyaMock={medyaMock}
          currentUserId={user?.id}
          canSend={!isGuest}
          isGuest={isGuest}
          walletCoins={wallet?.coins ?? null}
          onNeedUpgrade={upgradeAc}
          onCoinYukle={() => {
            if (isGuest) {
              upgradeAc();
              return;
            }
            magaza.coinYuklePaneli.ac();
          }}
          onCikis={() => router.back()}
          onMeta={(patch) => setMeta((m) => (m ? { ...m, ...patch } : m))}
          pkMac={pkMac}
          onHediye={() => {
            const pkAlicilar =
              pkMac && pkMac.host_a_id && pkMac.host_b_id
                ? [
                    {
                      id: pkMac.host_a_id,
                      ad: pkMac.side_a?.host_name ?? t('canliYayin.yayinciA'),
                      liveSessionId: pkMac.live_a_id,
                      side: 'a' as const,
                    },
                    {
                      id: pkMac.host_b_id,
                      ad: pkMac.side_b?.host_name ?? t('canliYayin.yayinciB'),
                      liveSessionId: pkMac.live_b_id,
                      side: 'b' as const,
                    },
                  ].filter((a) => a.id !== user?.id)
                : undefined;

            magaza.ac({
              receiverId: meta.host_id,
              aliciAdi: meta.hostAd,
              liveSessionId: meta.id,
              pkAlicilar,
              animasyon: true,
              onBasarili: (_g, adet) => {
                setMeta((m) =>
                  m
                    ? {
                        ...m,
                        gift_count: m.gift_count + adet,
                      }
                    : m,
                );
                void refreshWallet();
              },
            });
          }}
        />

        <HediyeMagazaBaglamasi magaza={magaza} misafirKart={false} animasyon={false} />
        <HediyeAnimasyonKatmani />

        <CoinYuklePaneli
          visible={magaza.coinYuklePaneli.acik && !magaza.acik}
          packages={magaza.coinYuklePaneli.packages}
          locked={magaza.coinYuklePaneli.purchaseLocked}
          coins={wallet?.coins}
          onBuy={magaza.coinYuklePaneli.satinAl}
          onClose={magaza.coinYuklePaneli.kapat}
          upgradeAcik={magaza.coinYuklePaneli.upgradeAcik}
          upgradeKapat={magaza.coinYuklePaneli.upgradeKapat}
          onPaketleriYenile={magaza.coinYuklePaneli.paketleriYenile}
        />

        <HesabiTamamlaKarti
          visible={
            upgradeAcik ||
            magaza.upgradeAcik ||
            magaza.coinYuklePaneli.upgradeAcik
          }
          onClose={() => {
            upgradeKapat();
            magaza.upgradeKapat();
            magaza.coinYuklePaneli.upgradeKapat();
          }}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bosTitle: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  geri: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  geriText: { ...TipografiTokenlari.body, color: RenkTokenlari.primarySoft },
});
