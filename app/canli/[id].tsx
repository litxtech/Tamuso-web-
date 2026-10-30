import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth, useWallet } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  MedyaOdasiBaglan,
  MedyaOdasiKes,
  MedyaSonHedefOda,
} from '../../src/moduller/livekit/MedyaBaglantisi';
import {
  CanliOlcumBaslat,
  CanliOlcumIsaretle,
} from '../../src/moduller/canli-yayin/olcum/CanliIzlemeOlcum';
import { useCanliVideoOncelik } from '../../src/moduller/canli-yayin/islemler/useCanliVideoOncelik';
import {
  CanliYayinTiyatro,
  type CanliYayinMeta,
} from '../../src/moduller/canli-yayin/bilesenler/CanliYayinTiyatro';
import { CanliYayinVideoSahne } from '../../src/moduller/canli-yayin/bilesenler/CanliYayinVideoSahne';
import {
  CanliYayinBitir,
  CanliYayinIzleyiciCik,
  CanliYayinIzleyiciGir,
} from '../../src/moduller/canli-yayin/islemler/CanliYayinIslemleri';
import { LiveKitBaglantiYoneticisi } from '../../src/moduller/livekit/baglanti/LiveKitBaglantiYoneticisi';
import { useCanliYayinArkaPlanBitir } from '../../src/moduller/canli-yayin/islemler/useCanliYayinArkaPlanBitir';
import {
  CanliOdaAdi,
  CanliOncekiIzlemeyiBitir,
  CanliOnBaglantiAl,
  CanliOnizlemeAl,
  CanliOturumSatiriAl,
  CanliYayinOnIsit,
} from '../../src/moduller/canli-yayin/navigasyon/CanliYayinaGit';
import {
  AktifCanliYayinArkaPlanaAl,
  AktifCanliYayinArkaPlandaMi,
  AktifCanliYayinBaslat,
  AktifCanliYayinBitir,
  AktifCanliYayinDurumunuAl,
  AktifCanliYayinGuncelle,
  AktifCanliYayinKucultmeTazeMi,
  AktifCanliYayinOneCikar,
} from '../../src/moduller/canli-yayin/oturum/AktifCanliYayinOturumu';
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

/** SDK'nın kendi yeniden bağlanması bittikten sonra kontrollü deneme aralıkları */
const YENIDEN_DENEME_MS = [1_500, 3_000, 6_000] as const;

/** Izleyici: tam ekran video + yorum + hediye + beğeni */
export default function CanliIzleyiciEkrani() {
  const { t } = useCeviri();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isGuest, refreshProfile } = useAuth();
  const { wallet, refreshWallet } = useWallet();
  const { upgradeAcik, upgradeKapat, upgradeAc } = useMisafirIslemKapisi(isGuest);
  const magaza = useHediyeMagaza();
  // Karttan gelen özet: sahne ağ beklemeden açılır, video arkadan bağlanır
  const [meta, setMeta] = useState<CanliYayinMeta | null>(() => {
    const on = CanliOnizlemeAl(typeof id === 'string' ? id : undefined);
    if (!on?.host_id || on.host_id === user?.id) return null;
    return {
      id: on.id,
      host_id: on.host_id,
      title: on.title ?? '',
      viewer_count: on.viewer_count ?? 0,
      like_count: 0,
      gift_count: 0,
      total_coins_earned: 0,
      hostAd: on.hostAd?.trim() || i18n.t('canliYayin.yayinci'),
      hostAvatar: on.hostAvatar ?? null,
      started_at: null,
    };
  });
  const [loading, setLoading] = useState(true);
  const [medyaDurum, setMedyaDurum] = useState(() => i18n.t('canliYayin.baglaniyor'));
  const [medyaMock, setMedyaMock] = useState(false);
  const [medyaHata, setMedyaHata] = useState(false);
  const [bitti, setBitti] = useState(false);
  const metaRef = useRef<CanliYayinMeta | null>(null);
  /** Bu ekranın LiveKit odası — çıkışta başka yayının bağlantısını kesmemek için */
  const odaAdiRef = useRef<string | null>(null);
  const odakliRef = useRef(false);
  const yenidenDenemeRef = useRef(0);
  const yenidenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** İlk tam yükleme bitti mi — refocus'ta yumuşak yeniden bağlanma */
  const yuklendiRef = useRef(false);
  const baglaniyorRef = useRef(false);
  const cikisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostModuRef = useRef(false);
  const [hostModu, setHostModu] = useState(false);
  const sosyalHazir = useCanliVideoOncelik(hostModu ? 'host' : 'izleyici');
  const { mac: pkMac } = useCanliPkMac({
    liveSessionId: meta?.id ?? (typeof id === 'string' ? id : undefined),
    enabled: !!meta?.id,
  });

  useCanliHediyeCanlisi({
    sessionId: meta?.id,
    selfUserId: user?.id,
    gifts: magaza.gifts,
    enabled: !!meta?.id && sosyalHazir,
  });

  useEffect(() => {
    if (typeof id !== 'string' || !id) return;
    const oda = CanliOdaAdi(id);
    CanliOlcumBaslat(oda);
    CanliOlcumIsaretle('ekran', oda);
  }, [id]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[CanliEkran]', {
      id,
      loading,
      meta: !!meta,
      hostModu,
      medyaHata,
      bitti,
    });
  }, [id, loading, meta, hostModu, medyaHata, bitti]);

  useEffect(() => {
    metaRef.current = meta;
    // Geri / kaydırma ile küçültünce mini çubuk güncel sayıları göstersin
    if (meta && AktifCanliYayinDurumunuAl()?.sessionId === meta.id) {
      AktifCanliYayinGuncelle({ meta });
    }
  }, [meta]);

  const load = useCallback(
    async (opts?: { soft?: boolean; iptal?: () => boolean }) => {
      if (!id) return;
      const soft = !!opts?.soft && !!metaRef.current;
      const iptal = opts?.iptal ?? (() => false);

      if (baglaniyorRef.current) return;
      baglaniyorRef.current = true;

      if (!soft) setLoading(true);
      else {
        setMedyaHata(false);
        setMedyaDurum(t('canliYayin.goruntuYeniden'));
      }

      try {
        const oturum = AktifCanliYayinDurumunuAl();
        const sicak =
          oturum?.sessionId === id &&
          (oturum.mock || LiveKitBaglantiYoneticisi.durumGetir() === 'connected');
        if (sicak && oturum) {
          setMeta(oturum.meta);
          const benHost = oturum.rol === 'host';
          hostModuRef.current = benHost;
          setHostModu(benHost);
          setMedyaMock(oturum.mock);
          setMedyaHata(false);
          setMedyaDurum(
            oturum.mock ? t('canliYayin.izlemeMock') : t('canliYayin.izleme'),
          );
          odaAdiRef.current = LiveKitBaglantiYoneticisi.odaAdi() ?? CanliOdaAdi(id);
          AktifCanliYayinOneCikar();
          yuklendiRef.current = true;
          return;
        }

        // Token kart dokunuşunda başlamadıysa şimdi başlasın (izleyici yolu)
        CanliYayinOnIsit(id);

        // Hızlı izleyici yolu: medya bağlantısı + izleyici kaydı + yayın satırı
        // aynı anda. Kart dokunuşunda başlamış bağlantı varsa o kullanılır.
        const onizleme = CanliOnizlemeAl(id);
        const hostOlabilir = !!user?.id && onizleme?.host_id === user.id;
        const hizliIzleyici =
          !soft && !hostOlabilir && CanliOncekiIzlemeyiBitir(id);
        const erkenOda = CanliOdaAdi(id);
        odaAdiRef.current = erkenOda;
        const erkenMedya = hizliIzleyici
          ? (CanliOnBaglantiAl(id) ??
            MedyaOdasiBaglan({ roomName: erkenOda, role: 'listener', video: true }))
          : null;
        const erkenGir = hizliIzleyici ? CanliYayinIzleyiciGir(id) : null;
        const erkenIptal = () => {
          if (erkenMedya) void MedyaOdasiKes({ zorla: true });
        };

        let satir: Awaited<ReturnType<typeof CanliOturumSatiriAl>>;
        if (hizliIzleyici) {
          satir = await CanliOturumSatiriAl(id);
        } else {
          // Önceki blur disconnect yarışını kapat — yayın satırı okunurken paralel
          const [, s] = await Promise.all([MedyaOdasiKes(), CanliOturumSatiriAl(id)]);
          satir = s;
        }
        CanliOlcumIsaretle('satir', erkenOda);
        if (iptal()) return;

        const { data, error } = satir;
        if (error) {
          erkenIptal();
          throw new Error(error.message);
        }
        if (!data || !data.is_live) {
          erkenIptal();
          if (AktifCanliYayinDurumunuAl()?.sessionId === id) AktifCanliYayinBitir();
          setBitti(true);
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

        const benHost = !!user?.id && row.host_id === user.id;
        hostModuRef.current = benHost;
        setHostModu(benHost);

        const roomName = row.livekit_room_name ?? CanliOdaAdi(row.id);
        odaAdiRef.current = roomName;
        const medyaBaglan = () =>
          MedyaOdasiBaglan({
            roomName,
            role: benHost ? 'host' : 'listener',
            video: true,
            micAcik: benHost ? true : undefined,
            zorla: soft || benHost,
          });

        let medya: Awaited<ReturnType<typeof MedyaOdasiBaglan>>;
        if (benHost) {
          // Erken izleyici bağlantısı açıldıysa bitsin; yayıncı token'ıyla zorla yeniden
          if (erkenMedya) await erkenMedya.catch(() => undefined);
          medya = await medyaBaglan();
        } else {
          // Eski yayınlarda oda adı id'den türemez: erken bağlantı (ve yeniden
          // bağlanma zinciri) bitmeden doğru odaya geçilirse sonra yanlış odaya döner
          const dogruOdaya = async () => {
            if (erkenMedya) await erkenMedya.catch(() => undefined);
            return medyaBaglan();
          };
          const [gir, sonuc] = await Promise.all([
            erkenGir ?? CanliYayinIzleyiciGir(row.id),
            erkenMedya && roomName === erkenOda ? erkenMedya : dogruOdaya(),
          ]);
          if (iptal()) return;
          if (!gir.ok) {
            await MedyaOdasiKes({ zorla: true });
            Alert.alert(t('canliYayin.canli'), gir.hata);
            setMeta(null);
            return;
          }
          setMeta((m) => (m ? { ...m, viewer_count: gir.viewer_count } : m));
          medya = sonuc;
        }
        if (benHost && medya.ok && !medya.mock) {
          await LiveKitBaglantiYoneticisi.kameraAcVeBekle(6_000);
        }
        if (!benHost && !medya.ok) {
          /* izleyici hata metni aşağıda */
        } else if (benHost && !medya.ok) {
          await CanliYayinBitir(row.id).catch(() => undefined);
          setMeta(null);
          setHostModu(false);
          hostModuRef.current = false;
          Alert.alert(t('canliYayin.canli'), medya.hata);
          return;
        }
        if (iptal()) return;
        setMedyaDurum(
          medya.ok
            ? medya.mock
              ? t('canliYayin.izlemeMock')
              : t('canliYayin.izleme')
            : medya.hata,
        );
        setMedyaHata(!medya.ok);
        setMedyaMock(!!(medya.ok && medya.mock));
        yuklendiRef.current = true;
        if (medya.ok) {
          AktifCanliYayinBaslat({
            sessionId: row.id,
            rol: benHost ? 'host' : 'izleyici',
            hostId: row.host_id,
            meta: {
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
            },
            mock: !!medya.mock,
          });
        }
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
    [id, t, user?.id],
  );

  // İzleyici: SDK kendi yeniden bağlanmasından vazgeçince sınırlı, aralıklı deneme.
  // Deneme biterse sonsuz yükleme yerine hata + "Tekrar dene" gösterilir.
  const yenidenDenemeZamanla = useCallback(() => {
    if (hostModuRef.current) return;
    if (yenidenTimerRef.current) clearTimeout(yenidenTimerRef.current);
    const deneme = yenidenDenemeRef.current;
    if (deneme >= YENIDEN_DENEME_MS.length) {
      setMedyaHata(true);
      setMedyaDurum(t('canliYayin.baglantiKoptu'));
      return;
    }
    yenidenTimerRef.current = setTimeout(() => {
      yenidenTimerRef.current = null;
      if (!metaRef.current || hostModuRef.current) return;
      if (LiveKitBaglantiYoneticisi.durumGetir() === 'connected') return;
      const hedef = MedyaSonHedefOda();
      if (hedef && odaAdiRef.current && hedef !== odaAdiRef.current) return;
      if (!odakliRef.current || AppState.currentState !== 'active') {
        setMedyaHata(true);
        setMedyaDurum(t('canliYayin.baglantiKoptu'));
        return;
      }
      yenidenDenemeRef.current = deneme + 1;
      void load({ soft: true }).then(() => {
        if (
          odakliRef.current &&
          !hostModuRef.current &&
          LiveKitBaglantiYoneticisi.durumGetir() !== 'connected'
        ) {
          yenidenDenemeZamanlaRef.current();
        }
      });
    }, YENIDEN_DENEME_MS[deneme]);
  }, [load, t]);
  const yenidenDenemeZamanlaRef = useRef(yenidenDenemeZamanla);
  yenidenDenemeZamanlaRef.current = yenidenDenemeZamanla;

  useEffect(() => {
    if (hostModu || !id) return;
    const birak = LiveKitBaglantiYoneticisi.dinle((_durum, detay) => {
      if (detay === 'connected' || detay === 'reconnected') {
        yenidenDenemeRef.current = 0;
        if (yenidenTimerRef.current) {
          clearTimeout(yenidenTimerRef.current);
          yenidenTimerRef.current = null;
        }
      } else if (detay === 'disconnected') {
        const hedef = MedyaSonHedefOda();
        if (hedef && odaAdiRef.current && hedef !== odaAdiRef.current) return;
        yenidenDenemeZamanlaRef.current();
      }
    });
    return () => {
      birak();
      if (yenidenTimerRef.current) {
        clearTimeout(yenidenTimerRef.current);
        yenidenTimerRef.current = null;
      }
    };
  }, [hostModu, id]);

  const tekrarDene = useCallback(() => {
    if (yenidenTimerRef.current) {
      clearTimeout(yenidenTimerRef.current);
      yenidenTimerRef.current = null;
    }
    yenidenDenemeRef.current = 0;
    setMedyaHata(false);
    void load({ soft: true });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      odakliRef.current = true;
      if (cikisTimerRef.current) {
        clearTimeout(cikisTimerRef.current);
        cikisTimerRef.current = null;
      }
      const soft = yuklendiRef.current && !!metaRef.current;
      void load({ soft, iptal: () => iptal });
      return () => {
        iptal = true;
        odakliRef.current = false;
        const d = AktifCanliYayinDurumunuAl();
        if (
          (d?.arkaPlanda && d.sessionId === id) ||
          (AktifCanliYayinKucultmeTazeMi() && d?.sessionId === id) ||
          AktifCanliYayinArkaPlandaMi()
        ) {
          return;
        }
        cikisTimerRef.current = setTimeout(() => {
          cikisTimerRef.current = null;
          const sonraki = AktifCanliYayinDurumunuAl();
          if (
            sonraki?.arkaPlanda ||
            (AktifCanliYayinKucultmeTazeMi() && sonraki?.sessionId === id) ||
            AktifCanliYayinArkaPlandaMi()
          ) {
            return;
          }
          if (id) {
            if (hostModuRef.current) {
              void CanliYayinBitir(id).catch(() => undefined);
            } else {
              void CanliYayinIzleyiciCik(id).catch(() => undefined);
            }
          }
          // Bu arada başka bir yayına geçildiyse onun oturumu / bağlantısı kalsın
          if (!sonraki || sonraki.sessionId === id) AktifCanliYayinBitir();
          const hedef = MedyaSonHedefOda();
          if (!hedef || !odaAdiRef.current || hedef === odaAdiRef.current) {
            void MedyaOdasiKes();
          }
        }, 700);
      };
    }, [load, id]),
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      const d = AktifCanliYayinDurumunuAl();
      if (!d || d.sessionId !== id) return;
      if (d.arkaPlanda) return;
      e.preventDefault();
      AktifCanliYayinArkaPlanaAl();
      const action = e.data.action;
      setTimeout(() => navigation.dispatch(action), 0);
    });
    return unsub;
  }, [navigation, id]);

  useEffect(() => {
    if (!hostModu || !id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const birak = LiveKitBaglantiYoneticisi.dinle((_durum, detay) => {
      if (detay === 'disconnected') {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (LiveKitBaglantiYoneticisi.durumGetir() === 'connected') return;
          if (AppState.currentState !== 'active') return;
          hostModuRef.current = false;
          AktifCanliYayinBitir();
          void CanliYayinBitir(id).catch(() => undefined);
          void MedyaOdasiKes();
          Alert.alert(t('canliYayin.baglantiKoptu'), t('canliYayin.yayinBitti'));
          router.back();
        }, 4000);
      } else if (detay === 'reconnected' || detay === 'connected') {
        if (timer) clearTimeout(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      birak();
    };
  }, [hostModu, id, t]);

  useCanliYayinArkaPlanBitir(hostModu, () => {
    if (!id) return;
    hostModuRef.current = false;
    AktifCanliYayinBitir();
    void CanliYayinBitir(id).catch(() => undefined);
    void MedyaOdasiKes({ hizli: true });
    setHostModu(false);
    setMeta(null);
  });

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
            AktifCanliYayinBitir();
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
            AktifCanliYayinBitir();
            void MedyaOdasiKes().catch(() => undefined);
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
    // Kart özeti olmadan açıldı (bildirim / bağlantı): ara sayfa yerine doğrudan
    // video sahnesi — bağlantı yayın satırıyla paralel, görüntü gelir gelmez akar
    return (
      <Screen koyuSahne edges={[]}>
        <CanliYayinVideoSahne rol="izleyici" />
      </Screen>
    );
  }

  if (!meta) {
    return (
      <Screen koyuSahne edges={['top']}>
        <View style={styles.bos}>
          <Text style={styles.bosTitle}>
            {bitti ? t('canliYayin.yayinSonaErdi') : t('canliYayin.yayinBulunamadi')}
          </Text>
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
          rol={hostModu ? 'host' : 'izleyici'}
          meta={meta}
          medyaDurum={medyaDurum}
          medyaMock={medyaMock}
          medyaHata={medyaHata}
          onTekrarDene={hostModu ? undefined : tekrarDene}
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
          onBitir={
            hostModu
              ? () => {
                  hostModuRef.current = false;
                  AktifCanliYayinBitir();
                  void CanliYayinBitir(meta.id);
                  void MedyaOdasiKes();
                  router.back();
                }
              : undefined
          }
          onCikis={() => {
            AktifCanliYayinBitir();
            if (hostModu) {
              hostModuRef.current = false;
              void CanliYayinBitir(meta.id);
              void MedyaOdasiKes();
            }
            router.back();
          }}
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
