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
import {
  ANA_SAYFA_BOLUM_CEVIR,
  AnaSayfaBolumleriniGetir,
} from '../../src/moduller/ana-sayfa/okuma/AnaSayfaBolumleriniGetir';
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

const BOLUM_IKON: Record<string, keyof typeof Ionicons.glyphMap> = {
  official_city_rooms: 'business-outline',
  city_league: 'trophy-outline',
  events: 'calendar-outline',
  pk_now: 'flash-outline',
  popular_agencies: 'people-outline',
  creators_for_you: 'star-outline',
};

const BOLUM_TINT: Record<string, string> = {
  official_city_rooms: RenkTokenlari.primarySoft,
  city_league: RenkTokenlari.accent,
  events: RenkTokenlari.magenta,
  pk_now: RenkTokenlari.accent,
  popular_agencies: RenkTokenlari.violet,
  creators_for_you: RenkTokenlari.mint,
};

function bolumHedef(kod: string): string {
  if (kod === 'city_league') return '/sehir/lig';
  if (kod === 'official_city_rooms') return '/sehir';
  if (kod === 'events') return '/platform';
  if (kod === 'pk_now') return '/pk';
  if (kod === 'popular_agencies') return '/ajans';
  return '/kesfet';
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
  const { yonetimHref } = useAjansYonetim();
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
  const bolumler = useMemo(() => AnaSayfaBolumleriniGetir().filter((b) => b.aktif), []);

  const load = useCallback(async (mod: 'ilk' | 'sessiz' | 'pull' = 'sessiz') => {
    if (mod === 'sessiz' && kaydiriyor.current) return;
    const nesil = ++loadNesil.current;
    try {
      if (mod === 'ilk') setLoading(true);
      if (mod === 'pull') setRefreshing(true);

      const [data, gezilenHam] = await Promise.all([
        Promise.race([
          CanliFeedGetir(40, profile?.id, {
            // Sessiz yenilemede ekstra avatar sorgusu atla (ısınma)
            uyeAvatar: mod !== 'sessiz',
            // Pull / ilk: cache bypass
            force: mod === 'pull' || mod === 'ilk',
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

  const menuOgeleri = useMemo<AnaSayfaMenuOgesi[]>(() => {
    const dunyalar = bolumler
      .filter(
        (b) =>
          !['live_now', 'voice_rooms', 'trending', 'popular_agencies', 'pk_now'].includes(
            b.kod,
          ),
      )
      .map((b) => {
        const cevir = ANA_SAYFA_BOLUM_CEVIR[b.kod];
        return {
          key: b.kod,
          baslik: t(cevir.baslik),
          alt: t(cevir.alt),
          icon: BOLUM_IKON[b.kod] ?? 'compass-outline',
          tint: BOLUM_TINT[b.kod] ?? RenkTokenlari.primary,
          href: bolumHedef(b.kod),
        };
      });

    /** Tab / ortadaki + ile çakışanlar yok: create, rooms, kesfet */
    const ekstra: AnaSayfaMenuOgesi[] = [
      {
        key: 'live',
        baslik: t('anaSayfa.menuCanliYayin'),
        alt: t('anaSayfa.menuCanliYayinAlt'),
        icon: 'videocam-outline',
        tint: RenkTokenlari.live,
        href: '/canli',
      },
      {
        key: 'agency_manage',
        baslik: t('ajans.ajansim'),
        alt: t('anaSayfa.menuAjansimAlt'),
        icon: 'briefcase-outline',
        tint: RenkTokenlari.magenta,
        href: yonetimHref,
      },
      {
        key: 'host',
        baslik: t('anaSayfa.menuHostOl'),
        alt: t('anaSayfa.menuHostOlAlt'),
        icon: 'mic-outline',
        tint: RenkTokenlari.mint,
        href: '/host',
      },
      {
        key: 'pk',
        baslik: t('pk.baslik'),
        alt: t('anaSayfa.menuPkAlt'),
        icon: 'flash-outline',
        tint: RenkTokenlari.accent,
        href: '/pk',
      },
      {
        key: 'ranks',
        baslik: t('anaSayfa.menuSiralama'),
        alt: t('anaSayfa.menuSiralamaAlt'),
        icon: 'trophy-outline',
        tint: RenkTokenlari.violet,
        href: '/siralamalar',
      },
      {
        key: 'fikir',
        baslik: t('anaSayfa.menuFikir'),
        alt: t('anaSayfa.menuFikirAlt'),
        icon: 'bulb-outline',
        tint: RenkTokenlari.accent,
        href: '/fikirler',
      },
      ...(OzellikBayragiAktifMi('ai_music_enabled')
        ? [
            {
              key: 'ai_muzik',
              baslik: t('anaSayfa.menuAiMuzik'),
              alt: t('anaSayfa.menuAiMuzikAlt'),
              icon: 'sparkles-outline' as const,
              tint: RenkTokenlari.primarySoft,
              href: '/ai-muzik',
            },
          ]
        : []),
      ...(OzellikBayragiAktifMi('people_discovery_enabled')
        ? [
            {
              key: 'kisiler',
              baslik: t('kisiler.baslik'),
              alt: t('anaSayfa.menuKisilerAlt'),
              icon: 'people-outline' as const,
              tint: RenkTokenlari.magenta,
              href: '/kisiler',
            },
          ]
        : []),
      {
        key: 'destek',
        baslik: t('ayarlar.canliDestek'),
        alt: t('anaSayfa.menuDestekAlt'),
        icon: 'headset-outline',
        tint: RenkTokenlari.primarySoft,
        href: '/destek',
      },
      {
        key: 'bildir',
        baslik: t('bildir.baslik'),
        alt: t('anaSayfa.menuBildirAlt'),
        icon: 'flag-outline',
        tint: RenkTokenlari.danger,
        href: '/bildir',
      },
      ...(isAdmin
        ? [
            {
              key: 'admin_oyun_test',
              baslik: t('anaSayfa.menuOyunTesti'),
              alt: t('anaSayfa.menuOyunTestiAlt'),
              icon: 'flask-outline' as const,
              tint: RenkTokenlari.violet,
              href: '/admin/oyun-test',
            },
            {
              key: 'admin_panel',
              baslik: t('anaSayfa.menuAdminPanel'),
              alt: t('anaSayfa.menuAdminPanelAlt'),
              icon: 'shield-checkmark-outline' as const,
              tint: RenkTokenlari.accent,
              href: '/admin',
            },
          ]
        : []),
    ];

    const keys = new Set<string>(dunyalar.map((d) => d.key));
    return [...dunyalar, ...ekstra.filter((e) => !keys.has(e.key))];
  }, [bolumler, yonetimHref, isAdmin, t]);

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
    router.push(oge.href as any);
  }, []);

  const sonGezilenAc = useCallback((oge: SonGezilenGorunum) => {
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
    if (filtre !== 'tumu') {
      if (sonGezilenGorunum.length === 0) return null;
      return (
        <AnaSayfaSonGezilenSeridi
          ogeler={sonGezilenGorunum}
          onPress={sonGezilenAc}
        />
      );
    }
    return (
      <View>
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
    filtre,
    sonGezilenGorunum,
    sonGezilenAc,
    canliOgeler,
    sesOgeler,
    feedOgeAc,
    izgara.length,
    t,
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

            <View
              style={[
                styles.ustAksiyon,
                { paddingTop: insets.top + BoslukTokenlari.sm },
              ]}
            >
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

            <TamusoBanner placement="HOME_TOP" screen="HOME" compact />

            {loading && feed.length === 0 ? (
              <AnaSayfaIskelet satir={3} />
            ) : (
              <FlatList
                ref={listeRef}
                data={feedRows}
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
                  filtre === 'tumu' && !arama.trim() ? (
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
            )}
          </View>
        </AnaSayfaCekmeceMenu>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ustAksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.sm,
    gap: 4,
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
  root: { flex: 1 },
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
