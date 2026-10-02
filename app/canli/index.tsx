import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  CanliYayinBitir,
  CanliYayinlariGetir,
  TakipCanliYayinlariGetir,
} from '../../src/moduller/canli-yayin/islemler/CanliYayinIslemleri';
import {
  CanliYayinBaslatMotoru,
  CanliYayinOnHazirlik,
  CanliBaslatKilitliMi,
  type CanliBaslatDurum,
} from '../../src/moduller/canli-yayin/islemler/CanliYayinBaslatMotoru';
import { CanliGeriSayimKatmani } from '../../src/moduller/canli-yayin/bilesenler/CanliGeriSayimKatmani';
import {
  CanliYayinTiyatro,
  type CanliYayinMeta,
} from '../../src/moduller/canli-yayin/bilesenler/CanliYayinTiyatro';
import { CanliYayinMarkaBasligi } from '../../src/moduller/canli-yayin/bilesenler/CanliYayinMarkaBasligi';
import { CanliYayinStudioKarti } from '../../src/moduller/canli-yayin/bilesenler/CanliYayinStudioKarti';
import { CanliYayinKarti } from '../../src/moduller/canli-yayin/bilesenler/CanliYayinKarti';
import { MedyaOdasiKes } from '../../src/moduller/livekit/MedyaBaglantisi';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { HediyeAnimasyonKatmani } from '../../src/moduller/hediyeler/bilesenler/HediyeAnimasyonKatmani';
import { HediyeMagazaBaglamasi } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaBaglamasi';
import { useHediyeMagaza } from '../../src/moduller/hediyeler/islemler/useHediyeMagaza';
import { useCanliHediyeCanlisi } from '../../src/moduller/hediyeler/gercek-zamanli/useCanliHediyeCanlisi';
import { CoinYuklePaneli } from '../../src/moduller/cuzdan/bilesenler/CoinYuklePaneli';
import { PkDavetPaneli } from '../../src/moduller/pk/bilesenler/PkDavetPaneli';
import { PkDavetModal } from '../../src/moduller/pk/bilesenler/PkDavetModal';
import { usePkDaveti } from '../../src/moduller/pk/kancalar/usePkDaveti';
import { useCanliPkMac } from '../../src/moduller/pk/kancalar/useCanliPkMac';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  AnimasyonTokenlari,
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

type CanliSekme = 'hepsi' | 'takip';

export default function CanliYayinEkrani() {
  const { t } = useCeviri();
  const navigation = useNavigation();
  const { user, isGuest, refreshProfile, refreshWallet, wallet, profile } =
    useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene, upgradeAc } =
    useMisafirIslemKapisi(isGuest);
  const magaza = useHediyeMagaza();
  const [title, setTitle] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [canliSekme, setCanliSekme] = useState<CanliSekme>('hepsi');
  const [yayinda, setYayinda] = useState(false);
  const [meta, setMeta] = useState<CanliYayinMeta | null>(null);
  const [medyaDurum, setMedyaDurum] = useState<string | null>(null);
  const [medyaMock, setMedyaMock] = useState(false);
  const [pkDavetAcik, setPkDavetAcik] = useState(false);
  const [geriSayim, setGeriSayim] = useState<number | null>(null);
  const [baslatDurum, setBaslatDurum] = useState<CanliBaslatDurum>('idle');
  /** Stüdyo CameraView — LiveKit öncesi kapat (cihaz kilidi) */
  const [studioKamera, setStudioKamera] = useState(true);
  const yayindaRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const liveEnabled = OzellikBayragiAktifMi('live_enabled');
  const videoEnabled = OzellikBayragiAktifMi('video_enabled');

  const baslikOnerisi = useMemo(() => {
    const ad = profile?.display_name?.trim() || profile?.username?.trim();
    if (!ad) return '';
    return t('canliYayin.canlida', { ad });
  }, [profile?.display_name, profile?.username, t]);

  const { davet: gelenPkDavet, temizle: pkDavetTemizle } = usePkDaveti({
    hostUserId: user?.id,
    enabled: yayinda && OzellikBayragiAktifMi('pk_enabled'),
  });
  const { mac: pkMac, yenile: pkYenile } = useCanliPkMac({
    liveSessionId: meta?.id,
    enabled: yayinda && !!meta?.id,
  });

  useCanliHediyeCanlisi({
    sessionId: meta?.id,
    selfUserId: user?.id,
    gifts: magaza.gifts,
    enabled: yayinda && !!meta?.id,
  });

  const load = useCallback(async () => {
    try {
      setList(
        canliSekme === 'takip'
          ? await TakipCanliYayinlariGetir()
          : await CanliYayinlariGetir(),
      );
    } catch {
      setList([]);
    }
  }, [canliSekme]);

  const yayiniSonlandir = useCallback(async () => {
    const sid = sessionIdRef.current;
    await MedyaOdasiKes();
    if (yayindaRef.current || sid) {
      await CanliYayinBitir(sid).catch(() => undefined);
    }
    yayindaRef.current = false;
    sessionIdRef.current = null;
    setYayinda(false);
    setMeta(null);
    setMedyaDurum(null);
    setMedyaMock(false);
    setGeriSayim(null);
    setBaslatDurum('idle');
    setStudioKamera(true);
    await load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void CanliYayinOnHazirlik(videoEnabled);
      return () => {
        void (async () => {
          // Aktif yayında blur'da sonlandırma — Keşfet vb. geri dönüşte görüntü kalsın
          if (yayindaRef.current) return;
          const sid = sessionIdRef.current;
          const aktif = !!sid;
          if (aktif || CanliBaslatKilitliMi()) {
            await MedyaOdasiKes();
            if (sid) await CanliYayinBitir(sid).catch(() => undefined);
          } else {
            await MedyaOdasiKes();
          }
          yayindaRef.current = false;
          sessionIdRef.current = null;
        })();
      };
    }, [load, videoEnabled]),
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!yayindaRef.current && baslatDurum === 'idle') return;
      e.preventDefault();
      Alert.alert(t('canliYayin.yayiniBitir'), t('canliYayin.yayiniBitirBody'), [
        { text: t('canliYayin.kal'), style: 'cancel' },
        {
          text: t('canliYayin.bitirVeCik'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await yayiniSonlandir();
              navigation.dispatch(e.data.action);
            })();
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, yayiniSonlandir, baslatDurum, t]);

  const baslat = () => {
    islemiDene('canli_ac', async () => {
      if (!liveEnabled) {
        Alert.alert(
          t('canliYayin.ozellikKapali'),
          t('canliYayin.ozellikKapaliBody'),
        );
        return;
      }
      if (CanliBaslatKilitliMi() || loading) return;
      if (!title.trim()) {
        Alert.alert(t('canliYayin.baslikGerekli'));
        return;
      }

      setLoading(true);
      setBaslatDurum('preparing');
      setGeriSayim(3);
      // Expo CameraView'i önce bırak — LiveKit ile kamera kilidi çakışmasın
      setStudioKamera(false);
      const { KameraOnizlemeSerbestBirak } = await import(
        '../../src/moduller/livekit/kamera/KameraOnizlemeKilidi'
      );
      await KameraOnizlemeSerbestBirak(2_800);

      const sonuc = await CanliYayinBaslatMotoru({
        title: title.trim(),
        videoEnabled,
        onProgress: (p) => {
          setBaslatDurum(p.durum);
          if (p.durum === 'countdown' && typeof p.countdown === 'number') {
            setGeriSayim(p.countdown);
          } else if (
            p.durum === 'connecting' ||
            p.durum === 'publishing' ||
            p.durum === 'preparing'
          ) {
            setGeriSayim(-1);
            if (p.mesaj) setMedyaDurum(p.mesaj);
          } else if (p.durum === 'live' && typeof p.countdown === 'number') {
            setGeriSayim(0);
          }
        },
      });

      setLoading(false);

      if (!sonuc.ok) {
        setGeriSayim(null);
        setBaslatDurum('failed');
        setStudioKamera(true);
        sessionIdRef.current = null;
        await MedyaOdasiKes().catch(() => undefined);
        Alert.alert(t('canliYayin.canli'), sonuc.hata);
        setBaslatDurum('idle');
        return;
      }

      if (__DEV__ && sonuc.metrik) {
        console.log('[LIVE_START] metrik', sonuc.metrik);
      }

      sessionIdRef.current = sonuc.session.id;
      yayindaRef.current = true;
      const hostAd =
        profile?.display_name?.trim() ||
        profile?.username?.trim() ||
        t('gorusme.sen');
      setMeta({
        id: sonuc.session.id,
        host_id: user?.id ?? '',
        title: title.trim(),
        viewer_count: 0,
        like_count: 0,
        gift_count: 0,
        total_coins_earned: 0,
        hostAd,
        started_at: new Date().toISOString(),
      });
      setYayinda(true);
      setMedyaMock(!!sonuc.mock);
      setMedyaDurum(
        sonuc.mock
          ? t('canliYayin.mockYayin')
          : videoEnabled
            ? t('canliYayin.kameraAcik')
            : t('canliYayin.videoKapali'),
      );
      setGeriSayim(null);
      setBaslatDurum('live');
      await load();
    });
  };

  const bitir = async () => {
    setLoading(true);
    await yayiniSonlandir();
    setLoading(false);
    Alert.alert(t('canliYayin.yayinBitti'), t('canliYayin.yayinSonlandirildi'));
  };

  /** Host solo'da hediye yok; PK'de rakibe hediye */
  const hediyeAc = useCallback(() => {
    if (!meta || !pkMac?.host_a_id || !pkMac.host_b_id) return;
    const pkAlicilar = [
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
    ].filter((a) => a.id !== user?.id);
    const alici = pkAlicilar[0];
    if (!alici) return;
    magaza.ac({
      receiverId: alici.id,
      aliciAdi: alici.ad,
      liveSessionId: meta.id,
      pkAlicilar,
      animasyon: true,
      onBasarili: (_g, adet) => {
        setMeta((m) =>
          m ? { ...m, gift_count: m.gift_count + adet } : m,
        );
        void refreshWallet();
      },
    });
  }, [meta, pkMac, user?.id, magaza, refreshWallet]);

  const countdownVisible =
    !yayinda &&
    geriSayim != null &&
    (baslatDurum === 'countdown' ||
      baslatDurum === 'connecting' ||
      baslatDurum === 'publishing' ||
      baslatDurum === 'preparing');

  if (yayinda && meta) {
    return (
      <Screen edges={[]}>
        <ModulHataSiniri modulAdi="canli-yayin">
          <CanliYayinTiyatro
            rol="host"
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
            onHediye={pkMac ? hediyeAc : undefined}
            onBitir={() => void bitir()}
            onMeta={(patch) => setMeta((m) => (m ? { ...m, ...patch } : m))}
            pkMac={pkMac}
            onPk={() => {
              if (pkMac) {
                Alert.alert('PK', t('canliYayin.pkZaten'));
                return;
              }
              setPkDavetAcik(true);
            }}
          />
          <PkDavetPaneli
            visible={pkDavetAcik}
            fromLiveId={meta.id}
            selfHostId={user?.id ?? meta.host_id}
            onClose={() => setPkDavetAcik(false)}
            onGonderildi={() => {
              Alert.alert(
                t('canliYayin.pkDavetGonderildi'),
                t('canliYayin.pkDavetBody'),
              );
            }}
          />
          <PkDavetModal
            davet={gelenPkDavet}
            onKapat={pkDavetTemizle}
            onSonuc={(s) => {
              if (s.status === 'accepted') {
                void pkYenile();
                Alert.alert(
                  t('canliYayin.pkBasladi'),
                  t('canliYayin.pkBasladiBody'),
                );
              }
            }}
          />
          <HediyeMagazaBaglamasi
            magaza={magaza}
            misafirKart={false}
            animasyon={false}
          />
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

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="canli-yayin">
        <View style={{ flex: 1 }}>
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.header}>
                <CanliYayinMarkaBasligi
                  canliSayisi={list.length}
                  onGeri={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(tabs)' as any);
                  }}
                />
                <CanliYayinStudioKarti
                  title={title}
                  onChangeTitle={setTitle}
                  onBaslat={baslat}
                  loading={loading || CanliBaslatKilitliMi()}
                  placeholder={baslikOnerisi || t('canliYayin.placeholder')}
                  kameraOnizleme={studioKamera && !countdownVisible}
                />

                <Animated.View
                  entering={FadeInDown.delay(120)
                    .duration(AnimasyonTokenlari.yavas)
                    .springify()
                    .damping(18)}
                  style={styles.sectionRow}
                >
                  <View style={styles.sectionSol}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.section}>{t('canliYayin.simdiCanli')}</Text>
                  </View>
                  <View style={styles.sekmeSerit}>
                    {(
                      [
                        { id: 'hepsi' as const, label: t('canliYayin.hepsi') },
                        { id: 'takip' as const, label: t('canliYayin.takip') },
                      ] as const
                    ).map((s) => {
                      const aktif = canliSekme === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setCanliSekme(s.id)}
                          style={[styles.sekme, aktif && styles.sekmeAktif]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: aktif }}
                        >
                          <Text
                            style={[
                              styles.sekmeYazi,
                              aktif && styles.sekmeYaziAktif,
                            ]}
                          >
                            {s.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              </View>
            }
            ListEmptyComponent={
              <BosDurum
                icon="videocam-outline"
                title={
                  canliSekme === 'takip'
                    ? t('canliYayin.takipYokBaslik')
                    : t('canliYayin.canliYokBaslik')
                }
                body={
                  canliSekme === 'takip'
                    ? t('canliYayin.takipYokBody')
                    : t('canliYayin.canliYokBody')
                }
              />
            }
            renderItem={({ item, index }) => (
              <CanliYayinKarti
                item={item}
                index={index}
                onPress={() => router.push(`/canli/${item.id}` as any)}
              />
            )}
          />
          <CanliGeriSayimKatmani
            sayi={geriSayim ?? 3}
            visible={countdownVisible}
            mesaj={medyaDurum}
          />
        </View>
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
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
  header: {
    gap: BoslukTokenlari.md,
    paddingBottom: BoslukTokenlari.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.md,
  },
  sectionSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.primary,
  },
  section: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
  },
  sekmeSerit: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sekme: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
  },
  sekmeAktif: {
    backgroundColor: 'rgba(232,64,145,0.2)',
  },
  sekmeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  sekmeYaziAktif: {
    color: RenkTokenlari.primarySoft,
  },
  list: {
    flexGrow: 1,
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
  },
});
