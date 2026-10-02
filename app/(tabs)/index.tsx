import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  DeviceEventEmitter,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { YUZEN_TAB_ICERIK_BOSLUGU, ANA_TAB_YENIDEN_EVENT } from '../../src/components/YuzenTabBar';
import { useAuth } from '../../src/contexts/AuthContext';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { useOzellikBayraklari } from '../../src/moduller/ozellik-bayraklari/OzellikBayrakSaglayici';
import { HamburgerMenuyuKur } from '../../src/moduller/ana-sayfa/menu/HamburgerMenuyuKur';
import { useDuyuruRozet } from '../../src/moduller/duyurular/islemler/useDuyuruRozet';
import {
  HamburgerMenuCacheAbone,
  HamburgerMenuCacheDisktenYukle,
  HamburgerMenuCacheSurum,
  HamburgerMenuyuYukle,
  HamburgerMenuRealtimeKur,
} from '../../src/moduller/ana-sayfa/menu/HamburgerMenuCache';
import {
  CanliFeedGetir,
  type FeedOggesi,
} from '../../src/moduller/ana-sayfa/okuma/AnaSayfaIcerikleriniGetir';
import {
  feedIzgarasiniKur,
  type FeedIzgaraOgesi,
} from '../../src/moduller/ana-sayfa/okuma/AnaSayfaFeedIzgarasi';
import { AnaSayfaAtmosfer } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaAtmosfer';
import { AnaSayfaFeedKart } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaFeedKart';
import {
  AnaSayfaFiltreCipleri,
  type FeedFiltre,
  type FeedFiltreOgesi,
} from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaFiltreCipleri';
import { AnaSayfaAramaCubugu } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaAramaCubugu';
import { AnaSayfaAramaOnerileri } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaAramaOnerileri';
import { AnaSayfaIskelet } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaIskelet';
import { AnaSayfaSonGezilenSeridi } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaSonGezilenSeridi';
import { AnaSayfaCanliYayinSeridi } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaCanliYayinSeridi';
import { AnaSayfaSesOdasiSeridi } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaSesOdasiSeridi';
import { AnaSayfaPremiumBolumBasligi } from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaPremiumBolumBasligi';
import {
  SonGezilenBitmisCanlilariTemizle,
  SonGezilenleriCanliIleBirles,
  SonGezilenleriGetir,
  type SonGezilenGorunum,
  type SonGezilenKayit,
} from '../../src/moduller/ana-sayfa/depolama/SonGezilenDepolama';
import { SesOdasinaHrefIleGit } from '../../src/moduller/ses-odalari/navigasyon/SesOdasinaGit';
import {
  AnaSayfaCekmeceMenu,
  AnaSayfaProfilMenuDugmesi,
  type AnaSayfaMenuOgesi,
} from '../../src/moduller/ana-sayfa/bilesenler/AnaSayfaCekmeceMenu';
import { CihazPushTokeniniKaydet } from '../../src/moduller/bildirimler/kayit/CihazPushTokeniniKaydet';
import { useBildirimler } from '../../src/moduller/bildirimler/baglam/BildirimSaglayici';
import { BildirimZiliDugmesi } from '../../src/moduller/bildirimler/bilesenler/BildirimZiliDugmesi';
import { useAjansYonetim } from '../../src/moduller/ajanslar/kancalar/useAjansYonetim';
import { supabase } from '../../src/lib/supabase';
import { CanliFeedCache } from '../../src/moduller/ana-sayfa/onbellek/CanliFeedCache';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TamusoBanner } from '../../src/banner';
import {
  buildFeedBannerRows,
  FeedBannerRowView,
} from '../../src/banner/components/FeedBannerRows';
import { useTemayaAboneOl } from '../../src/tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../src/i18n/useCeviri';

function feedAramaFiltrele(feed: FeedOggesi[], q: string): FeedOggesi[] {
  const s = q.trim().toLocaleLowerCase('tr');
  if (!s) return feed;
  return feed.filter((o) => {
    const baslik = (o.title ?? '').toLocaleLowerCase('tr');
    const konu = (o.topic ?? '').toLocaleLowerCase('tr');
    const host =
      (o.host?.display_name ?? '').toLocaleLowerCase('tr') +
      ' ' +
      (o.host?.username ?? '').toLocaleLowerCase('tr');
    const mod = (o.mode ?? '').toLocaleLowerCase('tr');
    return (
      baslik.includes(s) ||
      konu.includes(s) ||
      host.includes(s) ||
      mod.includes(s)
    );
  });
}

/** Sessiz yenile — daha seyrek (ısınma / titreme) */
const YENILE_MS = 45_000;
const REALTIME_DEBOUNCE_MS = 6_000;

function feedAyniMi(a: FeedOggesi[], b: FeedOggesi[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.listener_count !== y.listener_count ||
      x.title !== y.title ||
      x.cover_url !== y.cover_url
    ) {
      return false;
    }
  }
  return true;
}

function sonGezilenAyniMi(
  a: SonGezilenKayit[],
  b: SonGezilenKayit[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.tur !== b[i]!.tur || a[i]!.id !== b[i]!.id) return false;
  }
  return true;
}

/** Ana akım — keşif dashboard + canlı/ses filtreleri */
export default function HomeScreen() {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const navigation = useNavigation();
  const isAdmin = AdminYetkisiVarMi(profile);
  const { okunmamis, yenile: bildirimYenile } = useBildirimler();
  const { yonetimHref, ajanslar } = useAjansYonetim();
  const ajansHedef =
    ajanslar.find((a) => a.my_role === 'OWNER' || a.my_role === 'MANAGER')?.id ??
    null;
  const { surum: bayrakSurum } = useOzellikBayraklari();
  const [menuSurum, setMenuSurum] = useState(HamburgerMenuCacheSurum);
  const [feed, setFeed] = useState<FeedOggesi[]>([]);
  const [sonGezilen, setSonGezilen] = useState<SonGezilenKayit[]>([]);
  /** İlk açılış iskeleti — odak dönüşünde tekrar açılmaz */
  const [loading, setLoading] = useState(true);
  /** Sadece kullanıcı aşağı çekince */
  const [refreshing, setRefreshing] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const [filtre, setFiltre] = useState<FeedFiltre>('tumu');
  const [arama, setArama] = useState('');
  const odakli = useRef(false);
  const kaydiriyor = useRef(false);
  const ilkYuklemeBitti = useRef(false);
  const loadNesil = useRef(0);
  const listeRef = useRef<FlatList<FeedIzgaraOgesi>>(null);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      await HamburgerMenuCacheDisktenYukle();
      if (!iptal) setMenuSurum(HamburgerMenuCacheSurum());
      await HamburgerMenuyuYukle();
      if (!iptal) setMenuSurum(HamburgerMenuCacheSurum());
    })();
    const unsub = HamburgerMenuCacheAbone(() => {
      setMenuSurum(HamburgerMenuCacheSurum());
    });
    const stopRt = HamburgerMenuRealtimeKur();
    return () => {
      iptal = true;
      unsub();
      stopRt();
    };
  }, []);

  const load = useCallback(async (mod: 'ilk' | 'sessiz' | 'pull' = 'sessiz') => {
    if (mod === 'sessiz' && kaydiriyor.current) return;
    const nesil = ++loadNesil.current;
    try {
      const onbellek =
        mod === 'ilk'
          ? CanliFeedCache.al(40, profile?.id, false)
          : undefined;
      if (mod === 'ilk') {
        if (onbellek && onbellek.length > 0) {
          setFeed(onbellek);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }
      if (mod === 'pull') setRefreshing(true);

      const [data, gezilenHam] = await Promise.all([
        Promise.race([
          CanliFeedGetir(40, profile?.id, {
            // İlk boyama ve sessiz yenileme avatar sorgusunu beklemez
            uyeAvatar: mod === 'pull',
            // Pull taze çeker; ilk açılış eldeki önbelleği hemen gösterir
            force: mod === 'pull',
          }),
          new Promise<FeedOggesi[]>((_, reject) => {
            setTimeout(() => reject(new Error('feed-timeout')), 12_000);
          }),
        ]),
        SonGezilenleriGetir().catch(() => [] as SonGezilenKayit[]),
      ]);
      if (nesil !== loadNesil.current) return;
      setFeed((onceki) => {
        if (feedAyniMi(onceki, data)) return onceki;
        // Sessiz yenilemede eski üye avatarlarını koru
        if (mod === 'sessiz' && onceki.length > 0) {
          const eskiAvatar = new Map(
            onceki
              .filter((o) => o.tur === 'oda' && o.uye_avatarlari?.length)
              .map((o) => [o.id, o.uye_avatarlari!] as const),
          );
          if (eskiAvatar.size === 0) return data;
          return data.map((o) => {
            if (o.tur !== 'oda') return o;
            const oncekiAv = eskiAvatar.get(o.id);
            if (!oncekiAv?.length || (o.uye_avatarlari?.length ?? 0) > 0) {
              return o;
            }
            return { ...o, uye_avatarlari: oncekiAv };
          });
        }
        return data;
      });
      const aktifCanli = data
        .filter((f) => f.tur === 'canli')
        .map((f) => f.id.replace(/^canli:/, ''));
      const aktifOda = data
        .filter((f) => f.tur === 'oda')
        .map((f) => f.id.replace(/^oda:/, ''));
      const gezilen =
        gezilenHam.length > 0
          ? await SonGezilenBitmisCanlilariTemizle(aktifCanli, aktifOda).catch(
              () => gezilenHam,
            )
          : gezilenHam;
      if (nesil !== loadNesil.current) return;
      setSonGezilen((onceki) =>
        sonGezilenAyniMi(onceki, gezilen) ? onceki : gezilen,
      );
      if (mod === 'ilk') void CihazPushTokeniniKaydet();
    } catch {
      if (nesil !== loadNesil.current) return;
      if (mod === 'ilk') setFeed([]);
      void SonGezilenleriGetir()
        .then((g) => {
          if (nesil === loadNesil.current) setSonGezilen(g);
        })
        .catch(() => undefined);
    } finally {
      if (nesil !== loadNesil.current) return;
      if (mod === 'ilk') setLoading(false);
      if (mod === 'pull') setRefreshing(false);
      ilkYuklemeBitti.current = true;
    }
  }, [profile?.id]);

  /** Ana sayfada swipe-back / geçmiş geri kilit — sol kenar hamburger'a kalsın */
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      });

      const onBack = () => {
        if (menuAcik) {
          setMenuAcik(false);
          return true;
        }
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);

      return () => {
        sub.remove();
      };
    }, [navigation, menuAcik]),
  );

  useFocusEffect(
    useCallback(() => {
      odakli.current = true;
      kaydiriyor.current = false;
      setMenuAcik(false);
      // Oda/profil dönüşünde spinner açma — sessiz yenile
      void load(ilkYuklemeBitti.current ? 'sessiz' : 'ilk');
      void bildirimYenile();
      const timer = setInterval(() => {
        // Offline oda/canlı (is_live filter kaçırır) — TTL cache'i kırıp taze çek
        if (odakli.current) {
          CanliFeedCache.invalidate();
          void load('sessiz');
        }
      }, YENILE_MS);
      return () => {
        odakli.current = false;
        kaydiriyor.current = false;
        // Yarım kalan istek finally'de loading'i kaçırmasın
        loadNesil.current += 1;
        setRefreshing(false);
        setLoading(false);
        clearInterval(timer);
      };
    }, [load, bildirimYenile]),
  );

  /** Ana tab’a tekrar bas → feed en üste */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(ANA_TAB_YENIDEN_EVENT, () => {
      setMenuAcik(false);
      listeRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const topic = 'feed-live-rooms';
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    /** Yapısal değişiklik → refetch; metadata → yerel yama */
    const yapisalMi = (payload: {
      eventType?: string;
      old?: Record<string, unknown> | null;
      new?: Record<string, unknown> | null;
    }) => {
      const tip = payload.eventType;
      if (tip === 'INSERT' || tip === 'DELETE') return true;
      if (tip !== 'UPDATE') return true;
      const o = payload.old ?? {};
      const n = payload.new ?? {};
      return Boolean(o.is_live) !== Boolean(n.is_live);
    };

    const yerelYama = (payload: {
      eventType?: string;
      table?: string;
      old?: Record<string, unknown> | null;
      new?: Record<string, unknown> | null;
    }): boolean => {
      if (payload.eventType !== 'UPDATE') return false;
      const n = payload.new ?? {};
      if (!n.is_live) return false;
      const idHam = typeof n.id === 'string' ? n.id : null;
      if (!idHam) return false;
      const feedId =
        payload.table === 'live_sessions' ? `canli:${idHam}` : `oda:${idHam}`;
      const yeniSayi = Number(n.listener_count ?? n.viewer_count ?? 0);
      const yeniTitle = typeof n.title === 'string' ? n.title : undefined;
      const yeniCover =
        typeof n.cover_url === 'string' || n.cover_url === null
          ? (n.cover_url as string | null)
          : undefined;

      let yamalandi = false;
      setFeed((prev) => {
        const i = prev.findIndex((x) => x.id === feedId);
        if (i < 0) return prev;
        const cur = prev[i]!;
        const next = { ...cur };
        let degisti = false;
        if (
          Number.isFinite(yeniSayi) &&
          yeniSayi !== cur.listener_count &&
          Math.abs(yeniSayi - cur.listener_count) >= 1
        ) {
          next.listener_count = yeniSayi;
          degisti = true;
        }
        if (yeniTitle !== undefined && yeniTitle !== cur.title) {
          next.title = yeniTitle;
          degisti = true;
        }
        if (yeniCover !== undefined && yeniCover !== cur.cover_url) {
          next.cover_url = yeniCover;
          degisti = true;
        }
        if (!degisti) return prev;
        yamalandi = true;
        const kopya = prev.slice();
        kopya[i] = next;
        return kopya;
      });
      return yamalandi;
    };

    const yenile = (payload: {
      eventType?: string;
      table?: string;
      old?: Record<string, unknown> | null;
      new?: Record<string, unknown> | null;
    }) => {
      if (!odakli.current) return;
      if (kaydiriyor.current) return;

      // Canlı kayıt üzerinde hafif metadata → full refetch yok
      if (!yapisalMi(payload)) {
        yerelYama(payload);
        return;
      }

      CanliFeedCache.invalidate();
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (odakli.current) void loadRef.current('sessiz');
      }, REALTIME_DEBOUNCE_MS);
    };

    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: 'is_live=eq.true',
        },
        (payload) =>
          yenile({
            eventType: payload.eventType,
            table: 'rooms',
            old: payload.old as Record<string, unknown> | null,
            new: payload.new as Record<string, unknown> | null,
          }),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: 'is_live=eq.true',
        },
        (payload) =>
          yenile({
            eventType: payload.eventType,
            table: 'live_sessions',
            old: payload.old as Record<string, unknown> | null,
            new: payload.new as Record<string, unknown> | null,
          }),
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(kanal);
    };
  }, []);

  const duyuruRozet = useDuyuruRozet();
  const menuOgeleri = useMemo<AnaSayfaMenuOgesi[]>(() => {
    return HamburgerMenuyuKur({
      t,
      isAdmin,
      yonetimHref,
    }).map((oge) =>
      oge.key === 'announcements' ? { ...oge, rozet: duyuruRozet } : oge,
    );
  }, [yonetimHref, isAdmin, t, bayrakSurum, menuSurum, duyuruRozet]);

  const yayinSayisi = useMemo(() => feed.filter((o) => o.tur === 'canli').length, [feed]);
  const sesSayisi = useMemo(() => feed.filter((o) => o.tur === 'oda').length, [feed]);

  const filtrelenmisFeed = useMemo(
    () => feedAramaFiltrele(feed, arama),
    [feed, arama],
  );

  const canliOgeler = useMemo(
    () => filtrelenmisFeed.filter((o) => o.tur === 'canli').slice(0, 12),
    [filtrelenmisFeed],
  );
  const sesOgeler = useMemo(
    () => filtrelenmisFeed.filter((o) => o.tur === 'oda').slice(0, 12),
    [filtrelenmisFeed],
  );

  const sonGezilenGorunum = useMemo(
    () => SonGezilenleriCanliIleBirles(sonGezilen, feed),
    [sonGezilen, feed],
  );

  /** Tümü: önerilen ızgara; Canlı/Ses: tam ızgara */
  const izgara = useMemo(() => {
    if (filtre === 'tumu') {
      // Carousel'de gösterilenleri ızgarada da tut — "Sana özel" olarak skor sırası
      return feedIzgarasiniKur(filtrelenmisFeed, 'tumu').slice(0, 16);
    }
    return feedIzgarasiniKur(filtrelenmisFeed, filtre);
  }, [filtrelenmisFeed, filtre]);

  const feedRows = useMemo(
    () => (filtre === 'tumu' ? buildFeedBannerRows(izgara) : buildFeedBannerRows(izgara)),
    [izgara, filtre],
  );

  const filtreler = useMemo<FeedFiltreOgesi[]>(
    () => [
      {
        kod: 'tumu',
        etiket: t('anaSayfa.filtreTumu'),
        icon: 'sparkles',
        tint: RenkTokenlari.primarySoft,
      },
      {
        kod: 'canli',
        etiket: t('odalar.canli'),
        icon: 'videocam',
        sayi: yayinSayisi,
        tint: RenkTokenlari.primarySoft,
      },
      {
        kod: 'ses',
        etiket: t('anaSayfa.filtreSes'),
        icon: 'headset',
        sayi: sesSayisi,
        tint: RenkTokenlari.mint,
      },
    ],
    [sesSayisi, yayinSayisi, t],
  );

  const kartAc = useCallback((oge: FeedIzgaraOgesi) => {
    router.push(oge.oge.href as any);
  }, []);

  const feedOgeAc = useCallback((oge: FeedOggesi) => {
    if (oge.tur === 'oda' || /\/(?:lobi|room)\//.test(oge.href)) {
      void SesOdasinaHrefIleGit(oge.href);
      return;
    }
    router.push(oge.href as any);
  }, []);

  const sonGezilenAc = useCallback((oge: SonGezilenGorunum) => {
    if (oge.tur === 'oda' || /\/(?:lobi|room)\//.test(oge.href)) {
      void SesOdasinaHrefIleGit(oge.href);
      return;
    }
    router.push(oge.href as any);
  }, []);

  const bosMesaj =
    filtre === 'canli'
      ? {
          eyebrow: t('anaSayfa.bosCanliEyebrow'),
          baslik: t('anaSayfa.bosCanliBaslik'),
          alt: t('anaSayfa.bosCanliAlt'),
        }
      : filtre === 'ses'
        ? {
            eyebrow: t('anaSayfa.bosSesEyebrow'),
            baslik: t('anaSayfa.bosSesBaslik'),
            alt: t('anaSayfa.bosSesAlt'),
          }
        : arama.trim()
          ? {
              eyebrow: t('anaSayfa.bosAramaEyebrow'),
              baslik: t('anaSayfa.bosAramaBaslik'),
              alt: t('anaSayfa.bosAramaAlt'),
            }
          : {
              eyebrow: t('anaSayfa.bosSahneEyebrow'),
              baslik: t('anaSayfa.bosSahneBaslik'),
              alt: t('anaSayfa.bosSahneAlt'),
            };

  const listHeader = useMemo(() => {
    const ustChrome = (
      <View style={[styles.ustChrome, { paddingTop: insets.top + BoslukTokenlari.sm }]}>
        <View style={styles.ustAksiyon}>
          <AnaSayfaProfilMenuDugmesi
            onPress={() => setMenuAcik(true)}
            avatarUrl={profile?.avatar_url}
            harf={
              profile?.display_name?.trim()?.[0] ||
              profile?.username?.trim()?.[0] ||
              '?'
            }
          />
          <View style={styles.aramaEsnek}>
            <AnaSayfaAramaCubugu
              gomulu
              deger={arama}
              onDegisti={setArama}
              placeholder={t('anaSayfa.aramaPlaceholder')}
              onSubmit={() => {
                if (arama.trim()) router.push('/kesfet' as any);
              }}
            />
          </View>
          <BildirimZiliDugmesi
            sayi={okunmamis}
            onPress={() => router.push('/bildirimler' as any)}
          />
        </View>

        <AnaSayfaAramaOnerileri
          sorgu={arama}
          haricUserId={profile?.id}
          onKullaniciSec={(k) => {
            setArama('');
            router.push(`/kullanici/${k.id}` as any);
          }}
          onAjansSec={(a) => {
            setArama('');
            router.push(`/ajans/profil/${a.id}` as any);
          }}
          onOdaSec={(o) => {
            setArama('');
            void SesOdasinaHrefIleGit(`/lobi/${o.id}`);
          }}
          onCanliSec={(c) => {
            setArama('');
            router.push(`/canli/${c.id}` as any);
          }}
        />

        <View style={styles.filtreSatir}>
          {OzellikBayragiAktifMi('people_discovery_enabled') ? (
            <Pressable
              onPress={() => router.push('/kisiler' as any)}
              style={styles.kisilerCip}
              accessibilityRole="button"
              accessibilityLabel={t('kisiler.baslik')}
            >
              <LinearGradient
                colors={[RenkTokenlari.magenta, RenkTokenlari.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.kisilerCipIc}
              >
                <Ionicons name="people" size={13} color="#fff" />
                <Text style={styles.kisilerCipYazi}>{t('kisiler.baslik')}</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, marginLeft: -BoslukTokenlari.lg + 4 }}>
            <AnaSayfaFiltreCipleri ogeler={filtreler} secili={filtre} onSec={setFiltre} />
          </View>
        </View>

        {ajansHedef ? (
          <View style={styles.ajansCipSatir}>
            {(
              [
                { path: 'cuzdan', ikon: 'wallet-outline' as const, etiket: t('ajans.feedCuzdan') },
                { path: 'satis-linkleri', ikon: 'link-outline' as const, etiket: t('ajans.feedSatis') },
                { path: 'paketler', ikon: 'pricetags-outline' as const, etiket: t('ajans.feedPaket') },
              ] as const
            ).map((oge) => (
              <Pressable
                key={oge.path}
                onPress={() => router.push(`/ajans/${ajansHedef}/${oge.path}` as any)}
                style={styles.ajansCip}
                accessibilityRole="button"
                accessibilityLabel={oge.etiket}
              >
                <Ionicons name={oge.ikon} size={14} color={RenkTokenlari.text} />
                <Text style={styles.ajansCipYazi}>{oge.etiket}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TamusoBanner placement="HOME_TOP" screen="HOME" compact />
      </View>
    );

    if (loading && feed.length === 0) {
      return (
        <View>
          {ustChrome}
          <AnaSayfaIskelet satir={3} />
        </View>
      );
    }

    if (filtre !== 'tumu') {
      return (
        <View>
          {ustChrome}
          {sonGezilenGorunum.length > 0 ? (
            <AnaSayfaSonGezilenSeridi
              ogeler={sonGezilenGorunum}
              onPress={sonGezilenAc}
            />
          ) : null}
        </View>
      );
    }

    return (
      <View>
        {ustChrome}
        {sonGezilenGorunum.length > 0 ? (
          <AnaSayfaSonGezilenSeridi
            ogeler={sonGezilenGorunum}
            onPress={sonGezilenAc}
          />
        ) : null}
        <AnaSayfaCanliYayinSeridi
          ogeler={canliOgeler}
          onPress={feedOgeAc}
          onTumunuGor={() => setFiltre('canli')}
        />
        <AnaSayfaSesOdasiSeridi
          ogeler={sesOgeler}
          onPress={feedOgeAc}
          onTumunuGor={() => setFiltre('ses')}
        />
        {izgara.length > 0 ? (
          <AnaSayfaPremiumBolumBasligi baslik={t('durum.sanaOzel')} emoji="✨" />
        ) : null}
      </View>
    );
  }, [
    insets.top,
    profile?.avatar_url,
    profile?.display_name,
    profile?.username,
    profile?.id,
    okunmamis,
    arama,
    t,
    filtreler,
    filtre,
    loading,
    feed.length,
    sonGezilenGorunum,
    sonGezilenAc,
    canliOgeler,
    sesOgeler,
    feedOgeAc,
    izgara.length,
  ]);

  return (
    <Screen edges={[]} tabSayfaKaydir>
      <ModulHataSiniri modulAdi="ana-sayfa">
        <AnaSayfaCekmeceMenu
          acik={menuAcik}
          onAcikDegisti={setMenuAcik}
          ogeler={menuOgeleri}
          onOgeSec={(href) => router.push(href as any)}
          profil={{
            displayName:
              profile?.display_name ??
              (profile?.username ? `@${profile.username}` : t('ortak.misafir')),
            username: profile?.username,
            avatarUrl: profile?.avatar_url,
            level: profile?.level,
            xp: profile?.xp,
          }}
          onProfilPress={() => router.navigate('/(tabs)/profile')}
          onCoinPress={() => router.navigate('/(tabs)/wallet')}
          onRozetPress={() => router.push('/platform' as any)}
          onPremiumCtaPress={() => router.push('/platform' as any)}
          onCikisPress={() => {
            Alert.alert(t('auth.cikisBaslik'), t('auth.cikisSoru'), [
              { text: t('ortak.vazgec'), style: 'cancel' },
              {
                text: t('auth.cikisYap'),
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    await signOut();
                    router.replace('/(auth)/login');
                  })();
                },
              },
            ]);
          }}
        >
          <View style={styles.root}>
            <AnaSayfaAtmosfer />

            <FlatList
                ref={listeRef}
                data={loading && feed.length === 0 ? [] : feedRows}
                keyExtractor={(item) => item.key}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                initialNumToRender={2}
                windowSize={3}
                maxToRenderPerBatch={2}
                updateCellsBatchingPeriod={120}
                removeClippedSubviews
                scrollEventThrottle={48}
                onScrollBeginDrag={() => {
                  kaydiriyor.current = true;
                }}
                onScrollEndDrag={() => {
                  kaydiriyor.current = false;
                }}
                onMomentumScrollBegin={() => {
                  kaydiriyor.current = true;
                }}
                onMomentumScrollEnd={() => {
                  kaydiriyor.current = false;
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void load('pull')}
                    tintColor={RenkTokenlari.primary}
                    progressViewOffset={insets.top}
                  />
                }
                ListHeaderComponent={listHeader}
                ListFooterComponent={
                  <View style={styles.footer}>
                    <TamusoBanner
                      placement="HOME_BOTTOM"
                      screen="HOME"
                      compact
                      style={{ paddingHorizontal: 0 }}
                    />
                  </View>
                }
                ListEmptyComponent={
                  loading && feed.length === 0 ? null : filtre === 'tumu' && !arama.trim() ? (
                    <View style={{ height: 8 }} />
                  ) : (
                  <View>
                    <LinearGradient
                      colors={[...RenkTokenlari.gradientPlaceholder]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bos}
                    >
                      <View style={styles.bosUst}>
                        <Text style={styles.bosEyebrow}>{bosMesaj.eyebrow}</Text>
                      </View>
                      <Text style={styles.bosBaslik}>{bosMesaj.baslik}</Text>
                      <Text style={styles.bosAlt}>{bosMesaj.alt}</Text>
                      <View style={styles.bosAksiyonlar}>
                        <Pressable
                          onPress={() =>
                            filtre === 'canli'
                              ? router.push('/canli' as any)
                              : router.navigate('/(tabs)/create')
                          }
                          style={styles.bosBtn}
                        >
                          <LinearGradient
                            colors={[...RenkTokenlari.gradientPrimary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bosBtnIc}
                          >
                            <Ionicons
                              name={filtre === 'canli' ? 'videocam' : 'mic'}
                              size={15}
                              color={RenkTokenlari.textOnPrimary}
                            />
                            <Text style={styles.bosBtnYazi}>
                              {filtre === 'canli'
                                ? t('anaSayfa.yayinaCik')
                                : t('kesfet.sesOdasiAc')}
                            </Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push('/kesfet' as any)}
                          style={styles.bosBtnIkincil}
                        >
                          <Text style={styles.bosBtnIkincilYazi}>
                            {t('kesfet.baslik')}
                          </Text>
                        </Pressable>
                      </View>
                    </LinearGradient>
                  </View>
                  )
                }
                renderItem={({ item, index }) => {
                  if (item.kind === 'banner') {
                    return <FeedBannerRowView placement={item.placement} />;
                  }
                  if (item.kind !== 'pair' || !item.items?.length) {
                    return null;
                  }
                  return (
                    <View style={styles.satir}>
                      {item.items.map((oge: FeedIzgaraOgesi, i: number) => {
                        const kartIndex = index * 2 + i;
                        return (
                          <View key={`${oge.id}-${i}`} style={styles.kartWrap}>
                            <AnaSayfaFeedKart
                              oge={oge.oge}
                              index={kartIndex}
                              aktif={false}
                              onPress={() => kartAc(oge)}
                            />
                          </View>
                        );
                      })}
                      {item.items.length === 1 ? (
                        <View style={styles.kartWrap} pointerEvents="none" />
                      ) : null}
                    </View>
                  );
                }}
              />
          </View>
        </AnaSayfaCekmeceMenu>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** Tam genişlik — dolgu yok; sayfa zemini header arkasından devam eder */
  ustChrome: {
    marginHorizontal: -BoslukTokenlari.lg,
    backgroundColor: 'transparent',
  },
  ustAksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.sm,
    gap: 4,
    backgroundColor: 'transparent',
  },
  aramaEsnek: {
    flex: 1,
    minWidth: 0,
  },
  filtreSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: BoslukTokenlari.lg,
  },
  kisilerCip: {
    marginRight: 4,
  },
  kisilerCipIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
  },
  kisilerCipYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  ajansCipSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
  },
  ajansCip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ajansCipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.md + 2,
  },
  satir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.md,
  },
  kartWrap: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    marginTop: BoslukTokenlari.sm,
  },
  bos: {
    marginTop: BoslukTokenlari.md,
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(61,207,176,0.28)',
    gap: 8,
    overflow: 'hidden',
  },
  bosUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  bosEyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  bosBaslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    letterSpacing: -0.4,
  },
  bosAlt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginBottom: 10,
  },
  bosAksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    flexWrap: 'wrap',
  },
  bosBtn: {
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
  },
  bosBtnIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  bosBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
  bosBtnIkincil: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bosBtnIkincilYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
});
