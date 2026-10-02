import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useKlavyeYuksekligi } from '../../src/bilesenler/klavye/useKlavyeYuksekligi';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  MesajlariGetir,
  MesajThreadEngelliMi,
  type DirektMesaj,
} from '../../src/moduller/mesajlasma/okuma/MesajlariGetir';
import {
  MesajGonder,
  MesajPeerLastReadGet,
  MesajSil,
  MesajSohbetSil,
  MesajThreadArsivle,
  MesajThreadOkundu,
  OzelSohbetAcVeyaGetir,
} from '../../src/moduller/mesajlasma/islemler/MesajGonder';
import { MesajGonderVeyaKuyruk } from '../../src/moduller/mesajlasma/islemler/MesajGonderVeyaKuyruk';
import { MesajDuzenle } from '../../src/moduller/mesajlasma/islemler/MesajDuzenle';
import {
  MesajSabitle,
  MesajSabitlemeyiKaldir,
  MesajSabitlenenleriGetir,
  type MesajSabitKayit,
} from '../../src/moduller/mesajlasma/islemler/MesajSabitle';
import {
  MesajThreadMuteGet,
  MesajThreadSessizeAl,
  MesajThreadSessiziAc,
} from '../../src/moduller/mesajlasma/islemler/MesajSessizeAl';
import { MesajHedefCevresindeGetir } from '../../src/moduller/mesajlasma/islemler/MesajHedefCevresindeGetir';
import { DmMedyalariSec, DmMedyaUriYukle, type DmMedyaTaslak } from '../../src/moduller/mesajlasma/islemler/DmMedyasiYukle';
import { MesajKullaniciAramaPaneli } from '../../src/moduller/mesajlasma/bilesenler/MesajKullaniciAramaPaneli';
import { MesajBaloncugu } from '../../src/moduller/mesajlasma/bilesenler/MesajBaloncugu';
import { MesajMedyaSecimPaneli } from '../../src/moduller/mesajlasma/bilesenler/MesajMedyaSecimPaneli';
import { MesajMedyaOnizlemePaneli } from '../../src/moduller/mesajlasma/bilesenler/MesajMedyaOnizlemePaneli';
import { MesajMedyaGoruntuleyici } from '../../src/moduller/mesajlasma/bilesenler/MesajMedyaGoruntuleyici';
import { GALERI_COKLU_LIMIT } from '../../src/ortak/medya/ImagePickerHazirMi';
import { MesajYanitOnizleme } from '../../src/moduller/mesajlasma/bilesenler/MesajYanitOnizleme';
import { MesajComposerLinkOnizleme } from '../../src/moduller/mesajlasma/bilesenler/MesajComposerLinkOnizleme';
import { MesajDuzenlemeBasligi } from '../../src/moduller/mesajlasma/bilesenler/MesajDuzenlemeBasligi';
import { MesajSabitBar } from '../../src/moduller/mesajlasma/bilesenler/MesajSabitBar';
import {
  MesajUzunBasMenu,
  type MesajMenuAksiyon,
} from '../../src/moduller/mesajlasma/bilesenler/MesajUzunBasMenu';
import { MesajSessizeSheet } from '../../src/moduller/mesajlasma/bilesenler/MesajSessizeSheet';
import { MesajMuzikSecimSheet } from '../../src/moduller/mesajlasma/bilesenler/MesajMuzikSecimSheet';
import { MesajSesKayitDugmesi } from '../../src/moduller/mesajlasma/bilesenler/MesajSesKayitDugmesi';
import { MesajSesYoneticisi } from '../../src/moduller/mesajlasma/ses/MesajSesYoneticisi';
import { MesajLinkOnizlemeDoldur } from '../../src/moduller/mesajlasma/islemler/MesajLinkOnizlemeDoldur';
import { MesajIlkUrl } from '../../src/moduller/mesajlasma/yardimcilar/MesajUrlAyikla';
import {
  MesajOutboxFlushSonucAboneOl,
  MesajOutboxOturumBagla,
} from '../../src/moduller/mesajlasma/depolama/MesajOutboxDepolama';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import type { AiMuzikTrackOzet } from '../../src/moduller/ai-muzik/tipler';
import {
  MesajPeerOkunduYayinla,
  useMesajKanali,
} from '../../src/moduller/mesajlasma/gercek-zamanli/useMesajKanali';
import type { ArananKullanici } from '../../src/moduller/mesajlasma/okuma/KullanicilariAra';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  GorusmeBaslat,
  MesajThreadKarsiProfil,
} from '../../src/moduller/gorusme/islemler/GorusmeIslemleri';
import type { ThreadKarsiProfil } from '../../src/moduller/gorusme/tipler';
import { KullaniciGuvenlikMenusu } from '../../src/moduller/moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { ImagePickerOnIsit } from '../../src/ortak/medya/ImagePickerHazirMi';
import { useHediyeMagaza } from '../../src/moduller/hediyeler/islemler/useHediyeMagaza';
import { HediyeMagazaBaglamasi } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaBaglamasi';
import { MaviTikRozeti } from '../../src/moduller/mesajlasma/bilesenler/MaviTikRozeti';
import { MesajHizliAksiyonSeridi } from '../../src/moduller/mesajlasma/bilesenler/MesajHizliAksiyonSeridi';
import { PlatformResmiHesapPaneli } from '../../src/moduller/cuzdan/bilesenler/PlatformResmiHesapPaneli';
import { AjansPaketTeklifSecSheet } from '../../src/moduller/cuzdan/bilesenler/AjansPaketTeklifSecSheet';
import { usePaylasilanDurumOnizleme } from '../../src/moduller/durum/paylasim/usePaylasilanDurumOnizleme';
import {
  TakasMahkemeKaraAc,
  TakasMahkemeKapat,
} from '../../src/moduller/cuzdan/takas/TakasMahkemeIslemleri';
import { CuzdanHesabiGarantile } from '../../src/moduller/cuzdan/takas/CuzdanHesabi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { useMesajTaslak } from '../../src/moduller/mesajlasma/depolama/useMesajTaslak';
import {
  MesajTaslakKaydet,
  MesajTaslakKayitGetir,
  MesajTaslakSil,
} from '../../src/moduller/mesajlasma/depolama/MesajTaslakDepolama';
import {
  MESAJ_SAYFA_BOYUTU,
  MesajSayfaOnbellekOku,
  MesajSayfaOnbellekOkuSync,
  MesajSayfaOnbellekYaz,
} from '../../src/moduller/mesajlasma/depolama/MesajSayfaOnbellek';

function uuidYerel(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** expo-router bazen id'yi string[] verir — tek string'e indir */
function rotaParamString(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === 'string' && x.length > 0);
    return first;
  }
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
}

export default function MesajDetayEkrani() {
  const { t } = useCeviri();
  const { id: idHam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = rotaParamString(idHam);
  const threadId = id && id !== 'yeni' ? id : undefined;
  const { user, isGuest, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { acik: klavyeAcik } = useKlavyeYuksekligi();
  const composerPadBottom = klavyeAcik
    ? BoslukTokenlari.sm
    : Math.max(insets.bottom, BoslukTokenlari.md);
  const magaza = useHediyeMagaza();
  const [mesajlar, setMesajlar] = useState<DirektMesaj[]>([]);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [aciliyor, setAciliyor] = useState(false);
  const [peer, setPeer] = useState<ThreadKarsiProfil | null>(null);
  const [engelli, setEngelli] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [medyaSecimAcik, setMedyaSecimAcik] = useState(false);
  const [medyaTaslaklar, setMedyaTaslaklar] = useState<DmMedyaTaslak[]>([]);
  const [medyaViewOnce, setMedyaViewOnce] = useState(false);
  const [medyaGonderiyor, setMedyaGonderiyor] = useState(false);
  const [medyaTaslakTur, setMedyaTaslakTur] = useState<'image' | 'video' | null>(
    null,
  );
  const [guvenlikAcik, setGuvenlikAcik] = useState(false);
  const [platformHesapAcik, setPlatformHesapAcik] = useState(false);
  const [medyaGoruntule, setMedyaGoruntule] = useState<{
    uri: string;
    tur: 'image' | 'video';
  } | null>(null);
  const [raporIcerik, setRaporIcerik] = useState<{
    contentId: string;
    preview: string;
    mediaUrl?: string | null;
  } | null>(null);
  const [yanitHedef, setYanitHedef] = useState<DirektMesaj | null>(null);
  const [duzenleHedef, setDuzenleHedef] = useState<DirektMesaj | null>(null);
  const [menuMesaj, setMenuMesaj] = useState<DirektMesaj | null>(null);
  const [menuAksiyonlar, setMenuAksiyonlar] = useState<MesajMenuAksiyon[]>([]);
  const [pins, setPins] = useState<MesajSabitKayit[]>([]);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [sessizeAcik, setSessizeAcik] = useState(false);
  const [muzikSecimAcik, setMuzikSecimAcik] = useState(false);
  const [paketTeklifAcik, setPaketTeklifAcik] = useState(false);
  const [vurguMesajId, setVurguMesajId] = useState<string | null>(null);
  const [eskiYukleniyor, setEskiYukleniyor] = useState(false);
  const [eskiKaldi, setEskiKaldi] = useState(true);
  const listRef = useRef<FlatList<DirektMesaj>>(null);
  const eskiYuklemeKilit = useRef(false);
  const eskiScrollFixBekliyor = useRef(false);
  const scrollYRef = useRef(0);
  const contentHRef = useRef(0);
  const ilkAcilisScrollRef = useRef(true);
  /** Kullanıcı alttayken yeni yükseklik alta yapışsın; yukarıdayken çekme. */
  const altaYapistirRef = useRef(true);
  const listeYukseklikRef = useRef(0);
  const mesajlarRef = useRef<DirektMesaj[]>([]);
  const mahkemeMi = peer?.thread_kind === 'mahkeme';
  const mahkemeKapali = !!peer?.closed_at;

  mesajlarRef.current = mesajlar;

  const mesajMap = useMemo(() => {
    const m: Record<string, DirektMesaj> = {};
    for (const x of mesajlar) m[x.id] = x;
    return m;
  }, [mesajlar]);

  const {
    metin,
    setMetin,
    taslakHazir,
    gonderimBasladi,
    gonderimBasarisiz,
    gonderimBasarili,
    taslakFlush,
  } = useMesajTaslak({
    userId: user?.id,
    conversationId: threadId,
    pasifMi: engelli || mahkemeKapali,
  });

  const sharedStatusIds = useMemo(
    () =>
      mesajlar
        .filter((m) => m.message_type === 'shared_post' && !!m.ref_id)
        .map((m) => m.ref_id as string),
    [mesajlar],
  );
  const { map: sharedPostMap, yukleniyor: sharedPostYukleniyor } =
    usePaylasilanDurumOnizleme(sharedStatusIds);

  useEffect(() => {
    const kuyruk = mesajlar
      .filter((m) => m.message_type === 'voice')
      .map((m) => {
        const url = MedyaUriGuvenli(m.media_url);
        return url ? { key: m.id, url } : null;
      })
      .filter((x): x is { key: string; url: string } => !!x);
    MesajSesYoneticisi.sesliKuyrukAyarla(kuyruk);
  }, [mesajlar]);

  useEffect(() => {
    ImagePickerOnIsit({ izinIste: true });
  }, []);

  useEffect(() => {
    MesajOutboxOturumBagla(user?.id ?? null);
    return () => {
      if (!user?.id) MesajOutboxOturumBagla(null);
    };
  }, [user?.id]);

  const listeAltaKaydir = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  useEffect(() => {
    const evt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(evt, listeAltaKaydir);
    return () => sub.remove();
  }, [listeAltaKaydir]);

  const mergeMesaj = useCallback((msg: DirektMesaj) => {
    if (!msg?.id) return;
    const prev = mesajlarRef.current;
    const byClient =
      msg.client_id &&
      prev.findIndex(
        (m) => m.client_id === msg.client_id || m.id === msg.client_id,
      );
    let next: DirektMesaj[];
    if (typeof byClient === 'number' && byClient >= 0) {
      next = [...prev];
      next[byClient] = { ...msg, _localStatus: 'sent' };
    } else if (prev.some((m) => m.id === msg.id)) {
      next = prev.map((m) =>
        m.id === msg.id ? { ...msg, _localStatus: 'sent' } : m,
      );
    } else if (msg.deleted_at) {
      next = prev.filter((m) => m.id !== msg.id);
    } else {
      next = [...prev, { ...msg, _localStatus: 'sent' }];
    }
    mesajlarRef.current = next;
    setMesajlar(next);
    if (threadId) MesajSayfaOnbellekYaz(threadId, next);
    listeAltaKaydir();
  }, [listeAltaKaydir, threadId]);

  useEffect(() => {
    return MesajOutboxFlushSonucAboneOl((sonuc) => {
      if (sonuc.ok && sonuc.mesaj) {
        mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
      } else if (!sonuc.ok) {
        setMesajlar((p) =>
          p.map((m) =>
            m.client_id === sonuc.clientId || m.id === sonuc.clientId
              ? { ...m, _localStatus: 'failed' }
              : m,
          ),
        );
      }
    });
  }, [mergeMesaj]);

  useMesajKanali(
    engelli ? undefined : threadId,
    (msg, event) => {
      if (engelli) return;
      if (event === 'DELETE') {
        setMesajlar((p) => p.filter((m) => m.id !== msg.id));
        return;
      }
      if (msg.deleted_at) {
        setMesajlar((p) => p.filter((m) => m.id !== msg.id));
        return;
      }
      mergeMesaj(msg);
      // Karsi mesaji geldiyse okundu isaretle + yayinla
      if (msg.sender_id && msg.sender_id !== user?.id && threadId) {
        const at = new Date().toISOString();
        void MesajThreadOkundu(threadId).then(() => {
          void MesajPeerOkunduYayinla(threadId, at, user?.id);
        });
      }
      // Gelen/güncellenen mesajda link önizlemesi eksikse doldur
      if (
        OzellikBayragiAktifMi('link_preview_enabled') &&
        (msg.link_url || MesajIlkUrl(msg.body)) &&
        !(msg.link_preview?.title || msg.link_preview?.image_url)
      ) {
        void MesajLinkOnizlemeDoldur(msg).then((preview) => {
          if (!preview) return;
          setMesajlar((p) =>
            p.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    link_url: m.link_url || msg.link_url || MesajIlkUrl(msg.body),
                    link_preview: preview,
                  }
                : m,
            ),
          );
        });
      }
    },
    (at, fromUserId) => {
      if (engelli) return;
      if (fromUserId && fromUserId === user?.id) return;
      setPeerLastReadAt((prev) => {
        if (!prev) return at;
        return new Date(at).getTime() >= new Date(prev).getTime() ? at : prev;
      });
    },
  );

  const load = useCallback(async () => {
    if (!threadId) return;
    ilkAcilisScrollRef.current = true;
    setEskiKaldi(true);

    // Instagram: önce bellek/disk önbelleği — boş ekran bekletme
    const syncCache = MesajSayfaOnbellekOkuSync(threadId);
    if (syncCache?.length) {
      setMesajlar(
        syncCache.map((m) => ({ ...m, _localStatus: 'sent' as const })),
      );
      listeAltaKaydir();
    } else {
      void MesajSayfaOnbellekOku(threadId).then((disk) => {
        if (!disk?.length) return;
        setMesajlar((cur) =>
          cur.length > 0
            ? cur
            : disk.map((m) => ({ ...m, _localStatus: 'sent' as const })),
        );
        listeAltaKaydir();
      });
    }

    try {
      // Mesajları engel/profil ile paralel çek — açılış gecikmesini kısalt
      const [bloklu, msgs, karsi, peerRead] = await Promise.all([
        MesajThreadEngelliMi(threadId),
        MesajlariGetir({ threadId, limit: MESAJ_SAYFA_BOYUTU }),
        MesajThreadKarsiProfil(threadId).catch(() => null),
        MesajPeerLastReadGet(threadId),
      ]);
      setEngelli(bloklu);
      setPeer(karsi);
      setPeerLastReadAt(peerRead);

      if (bloklu) {
        setMesajlar([]);
        return;
      }

      const temiz = msgs
        .filter((m) => typeof m?.id === 'string' && m.id.length > 0)
        .map((m) => ({ ...m, _localStatus: 'sent' as const }));
      setMesajlar(temiz);
      setEskiKaldi(msgs.length >= MESAJ_SAYFA_BOYUTU);
      // Eksik link önizlemelerini arka planda doldur
      if (OzellikBayragiAktifMi('link_preview_enabled')) {
        for (const m of temiz) {
          if (
            (m.link_url || MesajIlkUrl(m.body)) &&
            !(m.link_preview?.title || m.link_preview?.image_url)
          ) {
            void MesajLinkOnizlemeDoldur(m).then((preview) => {
              if (!preview) return;
              setMesajlar((p) =>
                p.map((x) =>
                  x.id === m.id
                    ? {
                        ...x,
                        link_url:
                          x.link_url || m.link_url || MesajIlkUrl(m.body),
                        link_preview: preview,
                      }
                    : x,
                ),
              );
            });
          }
        }
      }
      MesajSayfaOnbellekYaz(threadId, temiz);

      if (OzellikBayragiAktifMi('message_pin_enabled')) {
        setPins(await MesajSabitlenenleriGetir(threadId));
      } else {
        setPins([]);
      }
      if (OzellikBayragiAktifMi('conversation_mute_enabled')) {
        setMutedUntil(await MesajThreadMuteGet(threadId));
      } else {
        setMutedUntil(null);
      }
      const at = new Date().toISOString();
      void MesajThreadOkundu(threadId).then(() => {
        void MesajPeerOkunduYayinla(threadId, at, user?.id);
      });
      listeAltaKaydir();
      ilkAcilisScrollRef.current = false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('engellen')) {
        setEngelli(true);
        setMesajlar([]);
        return;
      }
      // Önbellek varken ağı silme — boş ekrana düşme
      if (!MesajSayfaOnbellekOkuSync(threadId)?.length) {
        setMesajlar([]);
      }
    }
  }, [threadId, user?.id, listeAltaKaydir]);

  const eskiMesajlariYukle = useCallback(async () => {
    if (!threadId || engelli || !eskiKaldi || eskiYuklemeKilit.current) return;
    const mevcut = mesajlarRef.current;
    if (mevcut.length === 0) return;
    const oldest = mevcut[0];
    if (!oldest?.created_at) return;

    eskiYuklemeKilit.current = true;
    eskiScrollFixBekliyor.current = true;
    setEskiYukleniyor(true);
    try {
      const more = await MesajlariGetir({
        threadId,
        limit: MESAJ_SAYFA_BOYUTU,
        before: oldest.created_at,
      });
      if (more.length < MESAJ_SAYFA_BOYUTU) setEskiKaldi(false);
      if (more.length === 0) {
        eskiScrollFixBekliyor.current = false;
        eskiYuklemeKilit.current = false;
        setEskiYukleniyor(false);
        return;
      }
      const ek = more
        .filter((m) => typeof m?.id === 'string' && m.id.length > 0)
        .map((m) => ({ ...m, _localStatus: 'sent' as const }));
      const mevcutIds = new Set(mesajlarRef.current.map((m) => m.id));
      const yeni = ek.filter((m) => !mevcutIds.has(m.id));
      if (yeni.length === 0) {
        eskiScrollFixBekliyor.current = false;
        eskiYuklemeKilit.current = false;
        setEskiYukleniyor(false);
        return;
      }
      setMesajlar((prev) => [...yeni, ...prev]);
    } catch {
      eskiScrollFixBekliyor.current = false;
      eskiYuklemeKilit.current = false;
      setEskiYukleniyor(false);
    } finally {
      // kilit onContentSizeChange sonrası açılır; timeout yedek
      setTimeout(() => {
        if (eskiYuklemeKilit.current) {
          eskiYuklemeKilit.current = false;
          eskiScrollFixBekliyor.current = false;
          setEskiYukleniyor(false);
        }
      }, 800);
    }
  }, [threadId, engelli, eskiKaldi]);

  const onListeScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      const gorunen = e.nativeEvent.layoutMeasurement.height;
      if (gorunen > 0) listeYukseklikRef.current = gorunen;
      // Instagram: üste yaklaşınca önceki sayfa
      if (y < 100) void eskiMesajlariYukle();
    },
    [eskiMesajlariYukle],
  );

  const altaDurumunuYaz = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const kalan =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      altaYapistirRef.current = kalan < 120;
      scrollYRef.current = contentOffset.y;
      if (layoutMeasurement.height > 0) {
        listeYukseklikRef.current = layoutMeasurement.height;
      }
    },
    [],
  );

  const onListeContentSizeChange = useCallback((_w: number, h: number) => {
    const onceki = contentHRef.current;
    if (eskiScrollFixBekliyor.current && onceki > 0) {
      const delta = h - onceki;
      if (delta > 0) {
        const sonraki = scrollYRef.current + delta;
        scrollYRef.current = sonraki;
        listRef.current?.scrollToOffset({
          offset: sonraki,
          animated: false,
        });
      }
      eskiScrollFixBekliyor.current = false;
      eskiYuklemeKilit.current = false;
      setEskiYukleniyor(false);
      contentHRef.current = h;
      return;
    }

    contentHRef.current = h;
    const altaTakili = ilkAcilisScrollRef.current || altaYapistirRef.current;
    if (!altaTakili) return;

    const gorunen = listeYukseklikRef.current;
    if (gorunen > 0) {
      const hedef = Math.max(0, h - gorunen);
      // Zaten alttayız — tekrar scrollToEnd görsel zıplama döngüsü kurar.
      if (Math.abs(hedef - scrollYRef.current) < 4) {
        ilkAcilisScrollRef.current = false;
        return;
      }
    }
    listRef.current?.scrollToEnd({ animated: false });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        taslakFlush();
        MesajSesYoneticisi.otomatikSirayiKes();
      };
    }, [load, taslakFlush]),
  );

  const ara = async (tur: 'audio' | 'video') => {
    if (!id || id === 'yeni') return;
    if (engelli) {
      Alert.alert(t('mesajSohbet.engelliBaslik'), t('mesajSohbet.engelliIletisim'));
      return;
    }
    if (isGuest) {
      Alert.alert(t('ortak.misafir'), t('mesajSohbet.misafirArama'));
      return;
    }
    Keyboard.dismiss();
    // Yerelde aynı thread görüşmesi varsa yenisini başlatma — devam et
    try {
      const { GorusmeOturumAl, GorusmeOturumSunumAyarla } = await import(
        '../../src/moduller/gorusme/oturum/GorusmeOturumYoneticisi'
      );
      const mevcut = GorusmeOturumAl();
      if (mevcut && mevcut.call.thread_id === id) {
        GorusmeOturumSunumAyarla('fullscreen');
        router.push(`/gorusme/${mevcut.callId}` as any);
        return;
      }
    } catch {
      /* ignore */
    }
    const r = await GorusmeBaslat(id, tur);
    if (!r.ok) {
      const msg = (r.hata || '').toLowerCase();
      const ghost =
        msg.includes('zaten aktif') || msg.includes('aktif bir gorusme');
      if (ghost) {
        try {
          const { GorusmeBenimAktifleriBitir } = await import(
            '../../src/moduller/gorusme/islemler/GorusmeIslemleri'
          );
          await GorusmeBenimAktifleriBitir('client_ghost_clear');
          const tekrar = await GorusmeBaslat(id, tur);
          if (tekrar.ok) {
            router.push(`/gorusme/${tekrar.call.id}` as any);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      Alert.alert(t('mesajSohbet.arama'), r.hata);
      return;
    }
    router.push(`/gorusme/${r.call.id}` as any);
  };

  const gonderMetin = async () => {
    if (!id || id === 'yeni' || !metin.trim() || !user?.id) return;
    const body = metin.trim();

    if (duzenleHedef && OzellikBayragiAktifMi('message_edit_enabled')) {
      setGonderiyor(true);
      const sonuc = await MesajDuzenle({
        messageId: duzenleHedef.id,
        newBody: body,
        expectedVersion: duzenleHedef.edit_version,
      });
      setGonderiyor(false);
      if (!sonuc.ok) {
        Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));
        return;
      }
      setMesajlar((p) =>
        p.map((m) => (m.id === sonuc.mesaj.id ? { ...sonuc.mesaj, _localStatus: 'sent' } : m)),
      );
      setDuzenleHedef(null);
      setMetin('');
      await gonderimBasarili();
      return;
    }

    const clientId = uuidYerel();
    const replyToId =
      OzellikBayragiAktifMi('message_reply_enabled') && yanitHedef
        ? yanitHedef.id
        : null;
    const temp: DirektMesaj = {
      id: clientId,
      thread_id: id,
      sender_id: user.id,
      body,
      message_type: 'text',
      client_id: clientId,
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
      _localStatus: 'sending',
    };
    gonderimBasladi(body);
    setYanitHedef(null);
    if (user.id) {
      void MesajTaslakKaydet(user.id, id, '', { replyToMessageId: null });
    }
    setMesajlar((p) => [...p, temp]);
    listeAltaKaydir();

    setGonderiyor(true);
    const sonuc = await MesajGonderVeyaKuyruk({
      userId: user.id,
      girdi: {
        threadId: id,
        body,
        clientId,
        messageType: 'text',
        replyToId,
      },
    });
    setGonderiyor(false);

    if (!sonuc.ok) {
      setMesajlar((p) =>
        p.map((m) =>
          m.id === clientId ? { ...m, _localStatus: 'failed' } : m,
        ),
      );
      gonderimBasarisiz(body);
      Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));
      return;
    }
    if (sonuc.queued) {
      setMesajlar((p) =>
        p.map((m) =>
          m.id === clientId || m.client_id === clientId
            ? { ...m, _localStatus: 'queued' }
            : m,
        ),
      );
      await gonderimBasarili();
      return;
    }
    await gonderimBasarili();
    mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
    const linkUrl =
      sonuc.mesaj.link_url || MesajIlkUrl(sonuc.mesaj.body);
    if (OzellikBayragiAktifMi('link_preview_enabled') && linkUrl) {
      void MesajLinkOnizlemeDoldur({
        ...sonuc.mesaj,
        link_url: sonuc.mesaj.link_url || linkUrl,
      }).then((preview) => {
        if (!preview) return;
        setMesajlar((p) =>
          p.map((m) =>
            m.id === sonuc.mesaj.id
              ? {
                  ...m,
                  link_url: m.link_url || linkUrl,
                  link_preview: preview,
                }
              : m,
          ),
        );
      });
    }
  };

  const sesliMesajGonder = async (payload: {
    url: string;
    durationMs: number;
    mime: string;
  }) => {
    if (!id || id === 'yeni' || !user?.id) return;
    if (!OzellikBayragiAktifMi('voice_message_enabled')) return;
    const clientId = uuidYerel();
    const replyToId =
      OzellikBayragiAktifMi('message_reply_enabled') && yanitHedef
        ? yanitHedef.id
        : null;
    const temp: DirektMesaj = {
      id: clientId,
      thread_id: id,
      sender_id: user.id,
      body: null,
      message_type: 'voice',
      media_url: payload.url,
      client_id: clientId,
      reply_to_id: replyToId,
      media_meta: {
        duration_ms: payload.durationMs,
        mime: payload.mime,
      },
      created_at: new Date().toISOString(),
      _localStatus: 'sending',
    };
    setYanitHedef(null);
    setMesajlar((p) => [...p, temp]);
    const sonuc = await MesajGonder({
      threadId: id,
      body: '',
      messageType: 'voice',
      mediaUrl: payload.url,
      clientId,
      replyToId,
      mediaMeta: {
        duration_ms: payload.durationMs,
        mime: payload.mime,
      },
    });
    if (!sonuc.ok) {
      setMesajlar((p) =>
        p.map((m) =>
          m.id === clientId ? { ...m, _localStatus: 'failed' } : m,
        ),
      );
      Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));
      return;
    }
    mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
  };

  const hizliMetinGonder = useCallback(
    async (body: string) => {
      if (!id || id === 'yeni' || !user?.id || !body.trim()) return;
      const clientId = uuidYerel();
      const temp: DirektMesaj = {
        id: clientId,
        thread_id: id,
        sender_id: user.id,
        body: body.trim(),
        message_type: 'text',
        client_id: clientId,
        created_at: new Date().toISOString(),
        _localStatus: 'sending',
      };
      setMesajlar((p) => [...p, temp]);
      const sonuc = await MesajGonder({
        threadId: id,
        body: body.trim(),
        clientId,
        messageType: 'text',
      });
      if (!sonuc.ok) {
        setMesajlar((p) =>
          p.map((m) =>
            m.id === clientId ? { ...m, _localStatus: 'failed' } : m,
          ),
        );
        Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));
        return;
      }
      mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
    },
    [id, user?.id, mergeMesaj],
  );

  const cuzdanNoPaylas = useCallback(() => {
    void (async () => {
      const r = await CuzdanHesabiGarantile();
      if (!r.ok || !r.hesap.wallet_number) {
        Alert.alert(t('cuzdan.baslik'), r.ok === false ? r.hata : t('mesajSohbet.cuzdanNoYok'));
        return;
      }
      const no = r.hesap.wallet_number.replace(/\D/g, '');
      const formatli = no.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      await hizliMetinGonder(t('mesajSohbet.cuzdanNoPaylasMetin', { no: formatli }));
    })();
  }, [hizliMetinGonder]);

  const idPaylas = useCallback(() => {
    const pid = profile?.public_user_id;
    if (!pid) {
      Alert.alert('ID', t('mesajSohbet.idYok'));
      return;
    }
    void hizliMetinGonder(t('mesajSohbet.idPaylasMetin', { id: pid }));
  }, [hizliMetinGonder, profile?.public_user_id]);

  const medyaTaslakTemizle = useCallback(() => {
    setMedyaTaslaklar([]);
    setMedyaViewOnce(false);
    setMedyaTaslakTur(null);
    setMedyaGonderiyor(false);
  }, []);

  const medyaSecVeOnizle = async (
    tur: 'image' | 'video',
    kaynak: 'galeri' | 'kamera' = 'galeri',
    mevcut?: DmMedyaTaslak[],
  ) => {
    if (!id || id === 'yeni' || !user?.id) return;
    if (isGuest) {
      Alert.alert(t('ortak.misafir'), t('mesajSohbet.misafirMedya'));
      return;
    }
    const onceki = mevcut ?? medyaTaslaklar;
    const kalan = Math.max(0, GALERI_COKLU_LIMIT - onceki.length);
    if (kalan <= 0) return;

    const secim = await DmMedyalariSec(tur, {
      kaynak,
      maxAdet: kaynak === 'kamera' ? 1 : kalan,
    });
    if (!secim.ok) {
      if (!secim.iptal) Alert.alert(t('ortak.medya'), secim.hata);
      return;
    }
    const birlesik = [...onceki, ...secim.items].slice(0, GALERI_COKLU_LIMIT);
    setMedyaTaslaklar(birlesik);
    setMedyaTaslakTur(tur);
    if (birlesik.length > 1) setMedyaViewOnce(false);
  };

  const medyaOnaylaGonder = async () => {
    if (!id || id === 'yeni' || !user?.id || medyaTaslaklar.length === 0) return;
    if (medyaGonderiyor) return;

    const items = [...medyaTaslaklar];
    const useViewOnce =
      medyaViewOnce &&
      OzellikBayragiAktifMi('view_once_enabled') &&
      items.length === 1;

    setMedyaGonderiyor(true);
    setMedyaTaslaklar([]);
    setMedyaViewOnce(false);
    setMedyaTaslakTur(null);

    try {
      for (const item of items) {
        const up = await DmMedyaUriYukle(item);
        if (!up.ok) {
          Alert.alert(t('ortak.medya'), up.hata);
          continue;
        }

        const clientId = uuidYerel();
        const temp: DirektMesaj = {
          id: clientId,
          thread_id: id,
          sender_id: user.id,
          body: null,
          message_type: up.messageType,
          media_url: up.url,
          client_id: clientId,
          view_once: useViewOnce,
          created_at: new Date().toISOString(),
          _localStatus: 'sending',
        };
        setMesajlar((p) => [...p, temp]);
        listeAltaKaydir();

        const sonuc = await MesajGonder({
          threadId: id,
          body: '',
          messageType: up.messageType,
          mediaUrl: up.url,
          clientId,
          viewOnce: useViewOnce,
        });
        if (!sonuc.ok) {
          setMesajlar((p) =>
            p.map((m) =>
              m.id === clientId ? { ...m, _localStatus: 'failed' } : m,
            ),
          );
          Alert.alert(
            t('mesajSohbet.gonderilemedi'),
            sonuc.hata ?? t('ortak.hata'),
          );
          continue;
        }
        mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
      }
    } finally {
      setMedyaGonderiyor(false);
    }
  };

  const mesajMenu = (item: DirektMesaj) => {
    const mine = item.sender_id === user?.id;
    const aksiyonlar: MesajMenuAksiyon[] = [];
    if (
      OzellikBayragiAktifMi('message_reply_enabled') &&
      item._localStatus !== 'sending' &&
      item._localStatus !== 'queued'
    ) {
      aksiyonlar.push('reply');
    }
    if (
      mine &&
      item.message_type === 'text' &&
      OzellikBayragiAktifMi('message_edit_enabled') &&
      item._localStatus !== 'sending'
    ) {
      aksiyonlar.push('edit');
    }
    if (
      OzellikBayragiAktifMi('message_pin_enabled') &&
      item._localStatus !== 'sending' &&
      item._localStatus !== 'queued' &&
      item._localStatus !== 'failed'
    ) {
      const pinned = pins.some((p) => p.message_id === item.id);
      aksiyonlar.push(pinned ? 'unpin' : 'pin');
    }
    if (item.body) aksiyonlar.push('copy');
    if (item._localStatus === 'failed') aksiyonlar.push('retry');
    aksiyonlar.push('delete_me');
    if (mine && item._localStatus !== 'sending' && item._localStatus !== 'queued') {
      aksiyonlar.push('delete_everyone');
    }
    if (!mine) aksiyonlar.push('report');
    setMenuMesaj(item);
    setMenuAksiyonlar(aksiyonlar);
  };

  const menuAksiyonIsle = (aksiyon: MesajMenuAksiyon) => {
    const item = menuMesaj;
    if (!item || !id || id === 'yeni') return;
    switch (aksiyon) {
      case 'reply':
        setDuzenleHedef(null);
        setYanitHedef(item);
        if (user?.id) {
          void MesajTaslakKaydet(user.id, id, metin, {
            replyToMessageId: item.id,
          });
        }
        break;
      case 'edit':
        setYanitHedef(null);
        setDuzenleHedef(item);
        setMetin(item.body ?? '');
        break;
      case 'pin':
        void MesajSabitle(item.id).then((r) => {
          if (!r.ok) Alert.alert(t('mesajV2.pin'), r.hata);
          else setPins((p) => [r.pin, ...p.filter((x) => x.message_id !== item.id)]);
        });
        break;
      case 'unpin':
        void MesajSabitlemeyiKaldir(item.id).then((r) => {
          if (!r.ok) Alert.alert(t('mesajV2.unpin'), r.hata);
          else setPins((p) => p.filter((x) => x.message_id !== item.id));
        });
        break;
      case 'copy':
        void (async () => {
          if (!item.body) return;
          const Clipboard = await import('expo-clipboard');
          await Clipboard.setStringAsync(item.body);
        })();
        break;
      case 'retry':
        if (item.client_id && user?.id) {
          setMesajlar((p) =>
            p.map((m) =>
              m.id === item.id ? { ...m, _localStatus: 'sending' } : m,
            ),
          );
          void MesajGonder({
            threadId: id,
            body: item.body ?? '',
            messageType: (item.message_type as any) || 'text',
            mediaUrl: item.media_url,
            clientId: item.client_id,
            replyToId: item.reply_to_id,
            musicTrackId: item.music_track_id,
            viewOnce: item.view_once,
            mediaMeta: item.media_meta,
          }).then((r) => {
            if (!r.ok) {
              setMesajlar((p) =>
                p.map((m) =>
                  m.id === item.id ? { ...m, _localStatus: 'failed' } : m,
                ),
              );
              return;
            }
            mergeMesaj({ ...r.mesaj, _localStatus: 'sent' });
          });
        }
        break;
      case 'delete_me':
        void MesajSil(item.id, 'me').then((r) => {
          if (!r.ok) Alert.alert(t('mesajSohbet.sil'), r.hata);
          else setMesajlar((p) => p.filter((m) => m.id !== item.id));
        });
        break;
      case 'delete_everyone':
        void MesajSil(item.id, 'everyone').then((r) => {
          if (!r.ok) Alert.alert(t('mesajSohbet.sil'), r.hata);
          else setMesajlar((p) => p.filter((m) => m.id !== item.id));
        });
        break;
      case 'report':
        setRaporIcerik({
          contentId: item.id,
          preview:
            item.body ||
            (item.message_type === 'shared_post'
              ? t('mesajSohbet.paylasilanGonderi')
              : `[${item.message_type}]`),
          mediaUrl: item.media_url,
        });
        setGuvenlikAcik(true);
        break;
      default:
        break;
    }
    setMenuMesaj(null);
  };

  const hedefeGit = (messageId: string) => {
    if (!threadId) return;
    const vurgu = () => {
      setVurguMesajId(messageId);
      setTimeout(() => setVurguMesajId((cur) => (cur === messageId ? null : cur)), 1600);
    };
    const idx = mesajlar.findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true });
      } catch {
        /* ignore */
      }
      vurgu();
      return;
    }
    void MesajHedefCevresindeGetir({ threadId, messageId }).then((r) => {
      if (!r.ok) return;
      setMesajlar(
        r.mesajlar.map((m) => ({ ...m, _localStatus: 'sent' as const })),
      );
      requestAnimationFrame(() => {
        const i = r.mesajlar.findIndex((m) => m.id === messageId);
        if (i >= 0) {
          try {
            listRef.current?.scrollToIndex({ index: i, animated: true });
          } catch {
            /* ignore */
          }
        }
        vurgu();
      });
    });
  };

  const muzikGonder = async (track: AiMuzikTrackOzet) => {
    if (!id || id === 'yeni' || !user?.id) return;
    if (!OzellikBayragiAktifMi('music_message_enabled')) return;
    const clientId = uuidYerel();
    const temp: DirektMesaj = {
      id: clientId,
      thread_id: id,
      sender_id: user.id,
      body: null,
      message_type: 'music',
      client_id: clientId,
      music_track_id: track.id,
      media_meta: {
        music_snapshot: {
          title: track.title,
          cover_url: track.cover_url,
          artist_name: '',
          duration_ms: track.duration_ms,
        },
      },
      created_at: new Date().toISOString(),
      _localStatus: 'sending',
    };
    setMesajlar((p) => [...p, temp]);
    const sonuc = await MesajGonder({
      threadId: id,
      body: '',
      messageType: 'music',
      musicTrackId: track.id,
      clientId,
      replyToId: yanitHedef?.id ?? null,
    });
    setYanitHedef(null);
    if (!sonuc.ok) {
      setMesajlar((p) =>
        p.map((m) =>
          m.id === clientId ? { ...m, _localStatus: 'failed' } : m,
        ),
      );
      Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));
      return;
    }
    mergeMesaj({ ...sonuc.mesaj, _localStatus: 'sent' });
  };

  const sohbetMenu = () => {
    if (!id || id === 'yeni') return;

    if (mahkemeMi) {
      const uyeler = peer?.uyeler ?? [];
      const opts: {
        text: string;
        style?: 'cancel' | 'destructive';
        onPress?: () => void;
      }[] = [
        {
          text: t('mesajSohbet.platformHesaplari'),
          onPress: () => setPlatformHesapAcik(true),
        },
      ];

      if (peer?.can_moderate && peer.dispute_id && !mahkemeKapali) {
        const hedefler = uyeler.filter(
          (u) => u.rol !== 'yargic' && u.id !== user?.id,
        );
        for (const h of hedefler) {
          opts.push({
            text: t('mesajSohbet.karaTaraf', { ad: h.display_name || h.username || t('mesajSohbet.taraf') }),
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                t('mesajSohbet.karaIslem'),
                t('mesajSohbet.karaAcSoru', { ad: h.display_name || h.username }),
                [
                  { text: t('ortak.vazgec'), style: 'cancel' },
                  {
                    text: t('mesajSohbet.karaAc'),
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        const r = await TakasMahkemeKaraAc({
                          disputeId: peer.dispute_id!,
                          targetUserId: h.id,
                          reason:
                            t('mesajSohbet.karaSebep'),
                        });
                        if (!r.ok) Alert.alert(t('mesajSohbet.karaIslem'), r.hata);
                        else {
                          Alert.alert(t('mesajSohbet.karaAcildi'), t('mesajSohbet.karaAcildiBody'));
                          void load();
                        }
                      })();
                    },
                  },
                ],
              );
            },
          });
        }
        opts.push({
          text: t('mesajSohbet.mahkemeyiKapat'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('mesajSohbet.mahkemeyiKapat'),
              t('mesajSohbet.mahkemeyiKapatSoru'),
              [
                { text: t('ortak.vazgec'), style: 'cancel' },
                {
                  text: t('ortak.kapat'),
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      const r = await TakasMahkemeKapat({
                        disputeId: peer.dispute_id!,
                        note: t('mesajSohbet.mahkemeKapatNot'),
                      });
                      if (!r.ok) Alert.alert(t('ortak.kapat'), r.hata);
                      else void load();
                    })();
                  },
                },
              ],
            );
          },
        });
      }

      opts.push(
        {
          text: t('mesajlar.arsivle'),
          onPress: () => {
            void (async () => {
              const r = await MesajThreadArsivle(id, true);
              if (!r.ok) Alert.alert(t('mesajSohbet.arsiv'), r.hata);
              else router.back();
            })();
          },
        },
        { text: t('ortak.vazgec'), style: 'cancel' },
      );

      Alert.alert(
        peer?.thread_title || peer?.display_name || t('mesajSohbet.mahkeme'),
        mahkemeKapali
          ? t('mesajSohbet.mahkemeKapali')
          : t('mesajSohbet.yargicPanel'),
        opts,
      );
      return;
    }

    Alert.alert(
      peer?.agency_name || peer?.display_name || peer?.username || t('mesajSohbet.sohbet'),
      undefined,
      [
        peer?.peer_agency_id
          ? {
              text: t('mesajSohbet.ajansProfili'),
              onPress: () =>
                router.push(`/ajans/profil/${peer.peer_agency_id}` as any),
            }
          : peer?.id
            ? {
                text: t('profil.baslik'),
                onPress: () => router.push(`/kullanici/${peer.id}` as any),
              }
            : undefined,
        peer?.id && !engelli
          ? {
              text: t('mesajSohbet.hediyeGonder'),
              onPress: () =>
                magaza.ac({
                  receiverId: peer.id,
                  aliciAdi:
                    peer.agency_name || peer.display_name || peer.username,
                  animasyon: false,
                  onBasarili: (gift, adet) => {
                    void MesajGonder({
                      threadId: id,
                      body: t('mesajSohbet.hediyeGonderdi', { emoji: `🎁 ${gift.emoji}`, ad: gift.name, adet: adet > 1 ? ` ×${adet}` : '' }),
                      messageType: 'text',
                      clientId: uuidYerel(),
                    }).then((r) => {
                      if (r.ok) mergeMesaj(r.mesaj);
                    });
                  },
                }),
            }
          : undefined,
        {
          text: t('mesajlar.arsivle'),
          onPress: () => {
            void (async () => {
              const r = await MesajThreadArsivle(id, true);
              if (!r.ok) Alert.alert(t('mesajSohbet.arsiv'), r.hata);
              else {
                Alert.alert(t('mesajSohbet.arsivlendi'), t('mesajSohbet.arsivlendiBody'));
                router.back();
              }
            })();
          },
        },
        OzellikBayragiAktifMi('conversation_mute_enabled')
          ? {
              text: mutedUntil
                ? t('mesajV2.unmute')
                : t('mesajV2.muteNotifications'),
              onPress: () => setSessizeAcik(true),
            }
          : undefined,
        OzellikBayragiAktifMi('music_message_enabled')
          ? {
              text: t('mesajV2.shareMusic'),
              onPress: () => setMuzikSecimAcik(true),
            }
          : undefined,
        {
          text: t('mesajSohbet.sohbetiSil'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('mesajSohbet.sohbetiSil'),
              t('mesajSohbet.sohbetiSilBody'),
              [
                { text: t('ortak.vazgec'), style: 'cancel' },
                {
                  text: t('ortak.sil'),
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      const r = await MesajSohbetSil(id);
                      if (!r.ok) {
                        Alert.alert(t('mesajSohbet.silinemedi'), r.hata);
                        return;
                      }
                      if (user?.id) await MesajTaslakSil(user.id, id);
                      router.replace('/(tabs)/messages' as any);
                    })();
                  },
                },
              ],
            );
          },
        },
        {
          text: t('mesajSohbet.engelleBildir'),
          onPress: () => setGuvenlikAcik(true),
        },
        { text: t('ortak.vazgec'), style: 'cancel' },
      ].filter(Boolean) as {
        text: string;
        style?: 'cancel' | 'destructive';
        onPress?: () => void;
      }[],
    );
  };

  const kullaniciSec = async (kullanici: ArananKullanici) => {
    if (aciliyor) return;
    setAciliyor(true);
    const sonuc = await OzelSohbetAcVeyaGetir(kullanici.id);
    setAciliyor(false);
    if (!sonuc.ok) {
      Alert.alert(t('mesajSohbet.sohbetAcilamadi'), sonuc.hata);
      return;
    }
    router.replace(`/mesaj/${sonuc.threadId}` as any);
  };

  if (id === 'yeni') {
    return (
      <Screen edges={['top', 'bottom']}>
        <ModulHataSiniri modulAdi="mesajlasma">
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={RenkTokenlari.text} />
            </Pressable>
            <View style={styles.topCopy}>
              <Text style={styles.topFisilti}>{t('mesajSohbet.yeniSohbetFisilti')}</Text>
              <Text style={styles.topTitle}>{t('mesajSohbet.kullaniciAra')}</Text>
            </View>
            <View style={styles.backBtn} />
          </View>
          <MesajKullaniciAramaPaneli
            haricUserId={user?.id}
            onSec={(k) => void kullaniciSec(k)}
            seciliyor={aciliyor}
          />
        </ModulHataSiniri>
      </Screen>
    );
  }

  if (!threadId) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ModulHataSiniri modulAdi="mesajlasma">
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={RenkTokenlari.text} />
            </Pressable>
            <View style={styles.topCopy}>
              <Text style={styles.topTitle}>{t('mesajSohbet.sohbetBulunamadi')}</Text>
              <Text style={styles.topFisilti}>{t('mesajSohbet.sohbetBulunamadiAlt')}</Text>
            </View>
            <View style={styles.backBtn} />
          </View>
        </ModulHataSiniri>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="mesajlasma">
        <KlavyeGuvenliAlan style={styles.flex}>
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={RenkTokenlari.text} />
            </Pressable>
            <Pressable
              style={styles.topCopy}
              onPress={() => {
                if (mahkemeMi) {
                  setPlatformHesapAcik(true);
                  return;
                }
                if (peer?.peer_agency_id) {
                  router.push(`/ajans/profil/${peer.peer_agency_id}` as any);
                  return;
                }
                sohbetMenu();
              }}
            >
              <View style={styles.topAdSatir}>
                <Text style={styles.topTitle} numberOfLines={1}>
                  {peer?.agency_name ||
                    peer?.thread_title ||
                    peer?.display_name ||
                    peer?.username ||
                    t('mesajSohbet.mesajBaslik')}
                </Text>
                {mahkemeMi || peer?.is_platform_official || peer?.is_platform_yargic ? (
                  <MaviTikRozeti size={16} />
                ) : null}
              </View>
              <Text style={styles.topFisilti}>
                {mahkemeMi
                  ? mahkemeKapali
                    ? t('mesajSohbet.mahkemeKapaliFisilti')
                    : t('mesajSohbet.yargicFisilti')
                  : peer?.peer_agency_id
                    ? t('mesajSohbet.ajansFisilti')
                    : t('mesajSohbet.cevrimiciFisilti')}
              </Text>
            </Pressable>
            <View style={styles.aramaBtnlar}>
              {!mahkemeMi && !engelli ? (
                <>
                  <Pressable style={styles.aramaBtn} onPress={() => void ara('audio')}>
                    <Ionicons name="call" size={20} color={RenkTokenlari.mint} />
                  </Pressable>
                  <Pressable style={styles.aramaBtn} onPress={() => void ara('video')}>
                    <Ionicons
                      name="videocam"
                      size={22}
                      color={RenkTokenlari.primarySoft}
                    />
                  </Pressable>
                </>
              ) : null}
              <Pressable style={styles.aramaBtn} onPress={sohbetMenu}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={RenkTokenlari.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {OzellikBayragiAktifMi('message_pin_enabled') ? (
            <MesajSabitBar
              pins={pins}
              mesajMap={mesajMap}
              onJump={hedefeGit}
              onUnpin={(messageId) => {
                void MesajSabitlemeyiKaldir(messageId).then((r) => {
                  if (r.ok) setPins((p) => p.filter((x) => x.message_id !== messageId));
                });
              }}
            />
          ) : null}

          <FlatList
            ref={listRef}
            style={styles.listFlex}
            data={mesajlar}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              ilkAcilisScrollRef.current = false;
            }}
            onScrollEndDrag={altaDurumunuYaz}
            onMomentumScrollEnd={altaDurumunuYaz}
            onScroll={onListeScroll}
            scrollEventThrottle={16}
            onContentSizeChange={onListeContentSizeChange}
            onLayout={(e) => {
              listeYukseklikRef.current = e.nativeEvent.layout.height;
            }}
            removeClippedSubviews={false}
            initialNumToRender={MESAJ_SAYFA_BOYUTU}
            maxToRenderPerBatch={MESAJ_SAYFA_BOYUTU}
            windowSize={11}
            contentContainerStyle={[
              styles.list,
              mesajlar.length === 0 && styles.listEmpty,
            ]}
            ListHeaderComponent={
              eskiYukleniyor ? (
                <View style={styles.eskiYukleBaslik}>
                  <ActivityIndicator color={RenkTokenlari.primarySoft} />
                </View>
              ) : null
            }
            ListFooterComponent={<View style={styles.listFooterBosluk} />}
            ListEmptyComponent={
              <View style={styles.emptyChatWrap}>
                <Text style={styles.emptyChat}>{t('mesajSohbet.bosChat')}</Text>
                <Text style={styles.emptyChatAlt}>
                  {t('mesajSohbet.bosChatAlt')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MesajBaloncugu
                item={item}
                mine={item.sender_id === user?.id}
                peerLastReadAt={peerLastReadAt}
                highlighted={vurguMesajId === item.id}
                onLongPress={() => mesajMenu(item)}
                onReply={(m) => {
                  setDuzenleHedef(null);
                  setYanitHedef(m);
                  if (user?.id && threadId) {
                    void MesajTaslakKaydet(user.id, threadId, metin, {
                      replyToMessageId: m.id,
                    });
                  }
                }}
                onMedyaAc={(uri, tur) => setMedyaGoruntule({ uri, tur })}
                replyTo={
                  item.reply_to_id ? mesajMap[item.reply_to_id] ?? null : null
                }
                onReplyPress={hedefeGit}
                onViewOncePatch={(patch) => {
                  setMesajlar((p) =>
                    p.map((m) => (m.id === item.id ? { ...m, ...patch } : m)),
                  );
                }}
                sharedPostOnizleme={
                  item.message_type === 'shared_post' && item.ref_id
                    ? sharedPostMap[item.ref_id]
                    : null
                }
                sharedPostYukleniyor={
                  item.message_type === 'shared_post' && sharedPostYukleniyor
                }
              />
            )}
          />

          {engelli ? (
            <View
              style={[
                styles.composer,
                { paddingBottom: composerPadBottom },
              ]}
            >
              <Text style={styles.kapaliUyari}>
                {t('mesajSohbet.engelliComposer')}
              </Text>
              <Pressable
                onPress={() =>
                  router.push('/engellenen-kullanicilar' as any)
                }
                style={{ marginTop: 8 }}
              >
                <Text
                  style={{
                    ...TipografiTokenlari.caption,
                    color: RenkTokenlari.primarySoft,
                    textAlign: 'center',
                    fontWeight: '700',
                  }}
                >{t('mesajSohbet.engellenenleriYonet')}</Text>
              </Pressable>
            </View>
          ) : mahkemeKapali ? (
            <View
              style={[
                styles.composer,
                { paddingBottom: composerPadBottom },
              ]}
            >
              <Text style={styles.kapaliUyari}>
                {t('mesajSohbet.mahkemeKapaliComposer')}
              </Text>
            </View>
          ) : (
          <View>
            {!mahkemeMi ? (
              <MesajHizliAksiyonSeridi
                ajansMi={!!peer?.peer_agency_id}
                onCuzdanNoPaylas={cuzdanNoPaylas}
                onIdPaylas={idPaylas}
                onMetinPaylas={(m) => void hizliMetinGonder(m)}
                onPaketTeklif={
                  peer?.peer_agency_id
                    ? () => setPaketTeklifAcik(true)
                    : undefined
                }
              />
            ) : null}
            <MesajDuzenlemeBasligi
              visible={!!duzenleHedef}
              onIptal={() => {
                setDuzenleHedef(null);
                setMetin('');
              }}
            />
            <MesajYanitOnizleme
              replyTo={yanitHedef}
              yazarAdi={
                yanitHedef
                  ? yanitHedef.sender_id === user?.id
                    ? t('mesajV2.you')
                    : peer?.display_name || peer?.username || null
                  : null
              }
              onKapat={() => {
                setYanitHedef(null);
                if (user?.id && threadId) {
                  void MesajTaslakKaydet(user.id, threadId, metin, {
                    replyToMessageId: null,
                  });
                }
              }}
            />
            <MesajComposerLinkOnizleme metin={metin} />
          <View
            style={[
              styles.composer,
              { paddingBottom: composerPadBottom },
            ]}
          >
            {!mahkemeMi ? (
            <Pressable
              style={styles.attachModern}
              onPress={() => {
                if (!peer?.id) return;
                setMedyaGoruntule(null);
                magaza.ac({
                  receiverId: peer.id,
                  aliciAdi: peer.display_name || peer.username,
                  animasyon: false,
                  onBasarili: (gift, adet) => {
                    void MesajGonder({
                      threadId,
                      body: t('mesajSohbet.hediyeGonderdi', { emoji: `🎁 ${gift.emoji}`, ad: gift.name, adet: adet > 1 ? ` ×${adet}` : '' }),
                      messageType: 'text',
                      clientId: uuidYerel(),
                    }).then((r) => {
                      if (r.ok) mergeMesaj(r.mesaj);
                    });
                  },
                });
              }}
              accessibilityLabel={t('mesajSohbet.hediyeA11y')}
            >
              <LinearGradient
                colors={['rgba(255,180,90,0.28)', 'rgba(255,180,90,0.08)']}
                style={styles.attachGrad}
              >
                <Ionicons name="gift" size={20} color={RenkTokenlari.accent} />
              </LinearGradient>
            </Pressable>
            ) : null}
            <Pressable
              style={styles.attachModern}
              onPress={() => {
                Keyboard.dismiss();
                setMedyaGoruntule(null);
                setMedyaSecimAcik(true);
              }}
              accessibilityLabel={t('mesajSohbet.medyaGonderA11y')}
            >
              <LinearGradient
                colors={['rgba(90,220,200,0.28)', 'rgba(140,120,255,0.14)']}
                style={styles.attachGrad}
              >
                <Ionicons name="images" size={20} color={RenkTokenlari.mint} />
              </LinearGradient>
            </Pressable>
            {taslakHazir ? (
            <TextInput
              value={metin}
              onChangeText={setMetin}
              placeholder={t('mesajSohbet.yazPlaceholder')}
              placeholderTextColor={RenkTokenlari.textDim}
              style={styles.input}
              multiline
              maxLength={4000}
              blurOnSubmit={false}
            />
            ) : (
              <View style={[styles.input, styles.inputTaslakBekliyor]} />
            )}
            {metin.trim() || duzenleHedef ? (
            <Pressable
              style={[
                styles.sendHit,
                (!metin.trim() || gonderiyor) && styles.sendDisabled,
              ]}
              onPress={() => void gonderMetin()}
              disabled={!metin.trim() || gonderiyor}
            >
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                style={styles.sendBtn}
              >
                <Ionicons name="send" size={18} color="#12040C" />
              </LinearGradient>
            </Pressable>
            ) : OzellikBayragiAktifMi('voice_message_enabled') ? (
              <MesajSesKayitDugmesi
                disabled={gonderiyor || isGuest}
                onGonderildi={(p) => void sesliMesajGonder(p)}
                onHata={(h) => Alert.alert(t('mesajSohbet.gonderilemedi'), h)}
              />
            ) : (
            <Pressable
              style={[styles.sendHit, styles.sendDisabled]}
              disabled
            >
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                style={styles.sendBtn}
              >
                <Ionicons name="send" size={18} color="#12040C" />
              </LinearGradient>
            </Pressable>
            )}
          </View>
          </View>
          )}

        </KlavyeGuvenliAlan>

        <PlatformResmiHesapPaneli
          acik={platformHesapAcik}
          onKapat={() => setPlatformHesapAcik(false)}
        />

        {peer?.id && !mahkemeMi ? (
          <KullaniciGuvenlikMenusu
            visible={guvenlikAcik}
            targetUserId={peer.id}
            targetName={peer.display_name || peer.username}
            contentType={raporIcerik ? 'dm_message' : 'user'}
            contentId={raporIcerik?.contentId}
            contentPreview={raporIcerik?.preview}
            contentMediaUrl={MedyaUriGuvenli(raporIcerik?.mediaUrl)}
            isGuest={isGuest}
            onClose={() => {
              setGuvenlikAcik(false);
              setRaporIcerik(null);
            }}
            onBlocked={() => {
              setEngelli(true);
              setMesajlar([]);
              setGuvenlikAcik(false);
              setRaporIcerik(null);
              if (user?.id && threadId) {
                void MesajTaslakSil(user.id, threadId);
              }
              router.back();
            }}
          />
        ) : null}

        <HediyeMagazaBaglamasi magaza={magaza} animasyon={false} />

        <MesajMedyaSecimPaneli
          visible={medyaSecimAcik}
          onClose={() => setMedyaSecimAcik(false)}
          onSec={(secim) => {
            void medyaSecVeOnizle(secim.tur, secim.kaynak, []);
          }}
        />

        <MesajMedyaOnizlemePaneli
          visible={medyaTaslaklar.length > 0}
          items={medyaTaslaklar}
          gonderiyor={medyaGonderiyor}
          viewOnceEnabled={OzellikBayragiAktifMi('view_once_enabled')}
          viewOnce={medyaViewOnce}
          onViewOnceChange={(v) => {
            if (v && medyaTaslaklar.length > 1) return;
            setMedyaViewOnce(v);
          }}
          onItemsChange={(items) => {
            setMedyaTaslaklar(items);
            if (items.length === 0) medyaTaslakTemizle();
            if (items.length > 1) setMedyaViewOnce(false);
          }}
          onEkle={
            medyaTaslakTur
              ? () => void medyaSecVeOnizle(medyaTaslakTur, 'galeri')
              : undefined
          }
          onVazgec={medyaTaslakTemizle}
          onGonder={() => void medyaOnaylaGonder()}
        />

        <MesajMedyaGoruntuleyici
          uri={medyaGoruntule?.uri ?? null}
          tur={medyaGoruntule?.tur ?? null}
          onKapat={() => setMedyaGoruntule(null)}
        />

        <MesajUzunBasMenu
          visible={!!menuMesaj}
          onClose={() => setMenuMesaj(null)}
          aksiyonlar={menuAksiyonlar}
          onSec={menuAksiyonIsle}
        />

        <MesajSessizeSheet
          visible={sessizeAcik}
          onClose={() => setSessizeAcik(false)}
          mutedUntil={mutedUntil}
          onMute={(opts) => {
            if (!threadId) return;
            void MesajThreadSessizeAl({
              threadId,
              minutes: opts.minutes,
              forever: opts.forever,
            }).then((r) => {
              if (!r.ok) Alert.alert(t('mesajV2.muteNotifications'), r.hata);
              else setMutedUntil(r.mutedUntil);
            });
          }}
          onUnmute={() => {
            if (!threadId) return;
            void MesajThreadSessiziAc(threadId).then((r) => {
              if (!r.ok) Alert.alert(t('mesajV2.unmute'), r.hata);
              else setMutedUntil(null);
            });
          }}
        />

        <MesajMuzikSecimSheet
          visible={muzikSecimAcik}
          onClose={() => setMuzikSecimAcik(false)}
          onSec={(track) => void muzikGonder(track)}
        />

        {peer?.peer_agency_id && threadId ? (
          <AjansPaketTeklifSecSheet
            visible={paketTeklifAcik}
            agencyId={peer.peer_agency_id}
            threadId={threadId}
            onClose={() => setPaketTeklifAcik(false)}
            onGonderildi={() => {
              void load();
            }}
          />
        ) : null}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listFlex: { flex: 1, minHeight: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  topAdSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  aramaBtnlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  aramaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  topFisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontSize: 10,
  },
  topTitle: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
    flexShrink: 1,
  },
  kapaliUyari: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
    /** Son balon kenarı composer / hızlı şerit altına girmesin */
    paddingBottom: BoslukTokenlari.md,
    gap: 6,
    flexGrow: 1,
  },
  listFooterBosluk: {
    height: BoslukTokenlari.lg,
  },
  eskiYukleBaslik: {
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmpty: { justifyContent: 'center' },
  emptyChatWrap: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  emptyChat: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  emptyChatAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  attach: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachModern: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  attachGrad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: YaricapTokenlari.pill,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  inputTaslakBekliyor: {
    opacity: 0.55,
  },
  sendHit: { borderRadius: YaricapTokenlari.pill, overflow: 'hidden' },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
