import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { useCeviri } from '../../src/i18n/useCeviri';
import { TamusoBanner } from '../../src/banner';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import {
  fetchRoom,
  fetchRoomSeats,
  joinRoom,
  leaveRoom,
} from '../../src/services/api';
import { OdadanCikisYonlendir } from '../../src/moduller/ses-odalari/navigasyon/OdadanCikisYonlendir';
import { OdaCikisKilidiAktifMi } from '../../src/moduller/ses-odalari/navigasyon/OdaCikisKilidi';
import {
  OdaGirisAnimAnahtari,
  OdaGirisAnimasyonuGosterildiMi,
  OdaGirisAnimasyonuIsaretle,
  OdaGirisAnimasyonuOdaTemizle,
} from '../../src/moduller/ses-odalari/animasyon/OdaGirisAnimasyonOturumu';
import { OdayiSil } from '../../src/moduller/ses-odalari/islemler/OdayiSil';
import { HediyeKatalogunuGetir } from '../../src/moduller/hediyeler/okuma/HediyeKatalogunuGetir';
import { HediyeGonder } from '../../src/moduller/hediyeler/islemler/HediyeGonder';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import type { Gift, Profile, Room, RoomSeat } from '../../src/types/models';
import { ProfilGetir } from '../../src/moduller/kullanici-profili/okuma/ProfilGetir';
import type { CanliSohbetMesajGorunum } from '../../src/moduller/canli-sohbet/bilesenler/CanliSohbetMesajKarti';
import { colors, radii, typography } from '../../src/theme/colors';
import { HediyeAnimasyonuKuyrugu } from '../../src/moduller/hediyeler/animasyon/HediyeAnimasyonuKuyrugu';
import { HediyeAnimasyonKatmani } from '../../src/moduller/hediyeler/bilesenler/HediyeAnimasyonKatmani';
import { useOdaHediyeCanlisi } from '../../src/moduller/hediyeler/gercek-zamanli/useOdaHediyeCanlisi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { IcerikGuvenlikDugmesi } from '../../src/moduller/moderasyon/bilesenler/IcerikGuvenlikDugmesi';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { SesOdasiMikrofonDuzeni } from '../../src/moduller/ses-odalari/bilesenler/SesOdasiMikrofonDuzeni';
import { SahipGirisAnimasyonu } from '../../src/moduller/ses-odalari/bilesenler/SahipGirisAnimasyonu';
import { SeviyeGirisAnimasyonu } from '../../src/moduller/ses-odalari/bilesenler/SeviyeGirisAnimasyonu';
import { useOdaSeviyeGiris } from '../../src/moduller/ses-odalari/animasyon/useOdaSeviyeGiris';
import { OdaCanliAtmosfer } from '../../src/moduller/ses-odalari/bilesenler/OdaCanliAtmosfer';
import { OdaSahneArkaPlan } from '../../src/moduller/ses-odalari/bilesenler/OdaSahneArkaPlan';
import { OdaProfilCubugu } from '../../src/moduller/ses-odalari/bilesenler/OdaProfilCubugu';
import { OdaBilgiPaneli } from '../../src/moduller/ses-odalari/bilesenler/OdaBilgiPaneli';
import {
  OdaKatilimciAksiyonPaneli,
  type KatilimciAksiyonSatiri,
} from '../../src/moduller/ses-odalari/bilesenler/OdaKatilimciAksiyonPaneli';
import { LiderligiDevret } from '../../src/moduller/ses-odalari/islemler/LiderligiDevret';
import {
  MedyaHoparlorAyarla,
  MedyaKonusmaciyaYukselt,
  MedyaDinleyiciyeDusur,
  MedyaMikrofonAyarla,
  MedyaOdasiBaglan,
  MedyaOdasiKes,
  MedyaSesOturumunuYenile,
  MedyaUzakSesHacmiAyarla,
  MedyaYayinciMi,
} from '../../src/moduller/livekit/MedyaBaglantisi';
import {
  YardimciLiderAta,
  YardimciLiderKaldir,
} from '../../src/moduller/ses-odalari/islemler/YardimciLiderAta';
import { KonusmaciSesSeviyesi } from '../../src/moduller/livekit/ses/KonusmaciSesSeviyesi';
import { YeniOdaOnbellektenAl } from '../../src/moduller/ses-odalari/onbellek/YeniOdaOnbellek';
import {
  AktifSesOdasiArkaPlanaAl,
  AktifSesOdasiArkaPlandaMi,
  AktifSesOdasiBaslat,
  AktifSesOdasiBitir,
  AktifSesOdasiDurumunuAl,
  AktifSesOdasiGuncelle,
  AktifSesOdasiOneCikar,
} from '../../src/moduller/ses-odalari/oturum/AktifSesOdasiOturumu';
import { useSesOdasiPip } from '../../src/moduller/ses-odalari/pip/useSesOdasiPip';
import { MikrofonIstegiGonder } from '../../src/moduller/ses-odalari/mikrofon/MikrofonIstegiGonder';
import { HostTahtaOtur } from '../../src/moduller/ses-odalari/islemler/HostTahtaOtur';
import { KoltuktanAyril } from '../../src/moduller/ses-odalari/islemler/KoltuktanAyril';
import {
  KatilimciMenuAksiyonlari,
  OdaRoluHesapla,
  type KatilimciMenuAksiyonu,
} from '../../src/moduller/ses-odalari/yetki/OdaRolKontrol';
import { MikrofonIstekPaneli } from '../../src/moduller/ses-odalari/bilesenler/MikrofonIstekPaneli';
import { OdaDinleyiciPaneli } from '../../src/moduller/ses-odalari/bilesenler/OdaDinleyiciPaneli';
import { OdaSesHacmiButonu } from '../../src/moduller/ses-odalari/bilesenler/OdaSesHacmiButonu';
import { OdaMuzikButonu } from '../../src/moduller/oda-muzik/bilesenler/OdaMuzikButonu';
import { OdaMuzikPlak } from '../../src/moduller/oda-muzik/bilesenler/OdaMuzikPlak';
import { OdaMuzikKutuphanesiSheet } from '../../src/moduller/oda-muzik/bilesenler/OdaMuzikKutuphanesiSheet';
import { useOdaMuzikSession } from '../../src/moduller/oda-muzik/kancalar/useOdaMuzikSession';
import { useOdaMuzikDucking } from '../../src/moduller/oda-muzik/kancalar/useOdaMuzikDucking';
import {
  RoomMusicKomutCalistir,
  RoomMusicPause,
  RoomMusicQueueAdd,
  RoomMusicResume,
  RoomMusicSeek,
  RoomMusicSessionGet,
  RoomMusicSet,
  RoomMusicSetVolume,
  RoomMusicSkip,
  RoomMusicStop,
  type RoomMusicSession,
} from '../../src/moduller/oda-muzik/islemler/OdaMuzikApi';
import {
  OdaMuzikBitisDinle,
  OdaMuzikPozisyonMs,
} from '../../src/moduller/oda-muzik/oynatici/OdaMuzikOynatici';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import {
  ODA_DOCK_BTN,
  ODA_DOCK_ICON,
} from '../../src/moduller/ses-odalari/bilesenler/OdaButonOlculeri';
import { OdaKapakDuzenlePaneli } from '../../src/moduller/ses-odalari/bilesenler/OdaKapakDuzenlePaneli';
import { OdaOyunDockButonu } from '../../src/moduller/ses-odalari/bilesenler/OdaOyunDockButonu';
import { OdaCanliYorumAkisi } from '../../src/moduller/oda-sohbeti/bilesenler/OdaCanliYorumAkisi';
import { OdaCanliYorumComposer } from '../../src/moduller/oda-sohbeti/bilesenler/OdaCanliYorumComposer';
import {
  OdaModerasyonUygula,
  type ModerasyonAksiyonu,
} from '../../src/moduller/moderasyon/islemler/ModerasyonIslemleri';
import { HediyeMagazaPaneli } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaPaneli';
import type { HediyePkAlici } from '../../src/moduller/hediyeler/islemler/HediyeMagazaTipleri';
import { CoinYuklePaneli } from '../../src/moduller/cuzdan/bilesenler/CoinYuklePaneli';
import { useCoinYuklePaneli } from '../../src/moduller/cuzdan/islemler/useCoinYuklePaneli';
import { HEDIYE_FALLBACK_50 } from '../../src/moduller/hediyeler/katalog/HediyeFallback50';
import { AnalyticsOlayEkle } from '../../src/moduller/guvenlik/analytics/AnalyticsOlayEkle';
import { OyunOdaLazyKatmani } from '../../src/moduller/oyunlar/oda/OyunOdaLazyKatmani';
import { useGorunurOyunKodlari } from '../../src/moduller/oyunlar/ortak/hooks/useGorunurOyunKodlari';
import type { GameCode } from '../../src/moduller/oyunlar/ortak/tipler/OyunTipleri';
import { useKlavyeYuksekligi } from '../../src/bilesenler/klavye/useKlavyeYuksekligi';
import { SonGezileneKaydet, SonGezilendenSil } from '../../src/moduller/ana-sayfa/depolama/SonGezilenDepolama';

/**
 * Sesli oda — sahne (koltuklar) + canlı yayın tarzı float yorumlar + alt dock.
 */

function koltuklarEsit(a: RoomSeat[], b: RoomSeat[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.user_id !== y.user_id ||
      x.is_muted !== y.is_muted ||
      !!x.is_mic_locked !== !!y.is_mic_locked ||
      x.seat_index !== y.seat_index ||
      x.profile?.avatar_url !== y.profile?.avatar_url ||
      x.profile?.display_name !== y.profile?.display_name ||
      x.profile?.username !== y.profile?.username ||
      x.profile?.level !== y.profile?.level ||
      x.is_cohost !== y.is_cohost
    ) {
      return false;
    }
  }
  return true;
}

/** Realtime yenilemede profil kaybolursa önceki isim/avatar korunur */
function koltukProfilKoruyarakBirles(
  prev: RoomSeat[],
  next: RoomSeat[],
): RoomSeat[] {
  return next.map((s) => {
    if (!s.user_id) return s;
    const profilZayif =
      !s.profile ||
      (!s.profile.display_name && !s.profile.username && !s.profile.avatar_url);
    if (!profilZayif) return s;
    const eski =
      prev.find((p) => p.id === s.id && p.user_id === s.user_id) ??
      prev.find((p) => p.user_id === s.user_id);
    if (!eski?.profile) return s;
    return {
      ...s,
      profile: {
        ...eski.profile,
        ...(s.profile ?? {}),
        avatar_url: s.profile?.avatar_url ?? eski.profile.avatar_url,
        display_name: s.profile?.display_name ?? eski.profile.display_name,
        username: s.profile?.username ?? eski.profile.username,
        level: s.profile?.level ?? eski.profile.level,
      },
    };
  });
}

function koltuklariUygula(
  prev: RoomSeat[],
  next: RoomSeat[],
): RoomSeat[] {
  const birlesik = koltukProfilKoruyarakBirles(prev, next);
  return koltuklarEsit(prev, birlesik) ? prev : birlesik;
}

/** Strict Mode / Fast Refresh ayni topic'e ikinci .on() eklemesin. */
function odaRealtimeKanaliniTemizle(imza: string) {
  for (const ch of supabase.getChannels()) {
    const topic = ch.topic ?? '';
    if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
      void supabase.removeChannel(ch);
    }
  }
}

export default function RoomScreen() {
  const { t } = useCeviri();
  const { id, oyun: oyunParam } = useLocalSearchParams<{ id: string; oyun?: string }>();
  const { user, refreshWallet, adjustWallet, isGuest, refreshProfile, wallet, profile } =
    useAuth();
  const { upgradeAcik, upgradeKapat, upgradeAc, islemiDene } = useMisafirIslemKapisi(isGuest);
  const coinYukle = useCoinYuklePaneli();
  const { yukseklik: klavyeH, acik: klavyeAcik } = useKlavyeYuksekligi(0);
  const insets = useSafeAreaInsets();

  const [room, setRoom] = useState<Room | null>(null);
  const [odaOdakli, setOdaOdakli] = useState(true);
  const [seats, setSeats] = useState<RoomSeat[]>([]);
  const [gifts, setGifts] = useState<Gift[]>(HEDIYE_FALLBACK_50);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [memberRole, setMemberRole] = useState<
    'host' | 'cohost' | 'speaker' | 'listener' | null
  >(null);
  const [cikiyor, setCikiyor] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [hediyeAliciIdler, setHediyeAliciIdler] = useState<string[]>([]);
  const [gameOpen, setGameOpen] = useState(false);
  const [odaKartAcik, setOdaKartAcik] = useState(false);
  const [odaBilgiAcik, setOdaBilgiAcik] = useState(false);
  const [katilimciMenu, setKatilimciMenu] = useState<{
    seat: RoomSeat;
    baslik: string;
    aksiyonlar: KatilimciAksiyonSatiri[];
  } | null>(null);
  const katilimciAksiyonRef = useRef<
    ((a: KatilimciMenuAksiyonu) => void) | null
  >(null);
  const [muzikSheetAcik, setMuzikSheetAcik] = useState(false);
  const [dinleyiciAcik, setDinleyiciAcik] = useState(false);
  /** Uzak konuşma sesi (hoparlör) — 0..1 */
  const [odaSesHacmi, setOdaSesHacmi] = useState(1);
  const odaSesHacmiRef = useRef(1);
  odaSesHacmiRef.current = odaSesHacmi;
  const [hostProfilYedek, setHostProfilYedek] = useState<Profile | null>(null);
  const [balonOyunKodu, setBalonOyunKodu] = useState<GameCode | null>(null);
  const [lastGift, setLastGift] = useState<string | null>(null);
  const [lkDurum, setLkDurum] = useState(() => t('sesOda.hazir'));
  /** İlk LiveKit join bitti — konuşmacı yükseltme effect'ini tetikler */
  const [medyaHazirTick, setMedyaHazirTick] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);
  const [yorumYenile, setYorumYenile] = useState(0);
  /** Yorum paneli kapalıyken gelen yeni mesaj / hediye sayısı */
  const [yorumUyari, setYorumUyari] = useState(0);
  /** Oyun oturumu açıkken lazy katman unmount olmasın */
  const [oyunMonteli, setOyunMonteli] = useState(false);
  const [sahipGiris, setSahipGiris] = useState<{
    ad: string;
    avatarUrl: string | null;
  } | null>(null);
  const konusmaciYukseltildi = React.useRef(false);
  /** Focus remount — gecikmeli disconnect'i iptal etmek için */
  const odaFocusNesil = React.useRef(0);
  /** load() nesli — stale MedyaOdasiBaglan sonucunu yut */
  const odaLoadNesil = React.useRef(0);
  /** İlk LiveKit join bitti mi (yükseltme effect yarışını keser) */
  const medyaIlkBaglantiBitti = React.useRef(false);
  const sahipTahtOnceki = React.useRef<boolean | null>(null);

  const isDemo = useMemo(() => id?.startsWith('demo'), [id]);
  const isPlatformAdmin = AdminYetkisiVarMi(profile);
  const isHost = !!user?.id && !!room?.host_id && user.id === room.host_id;
  const isCohost =
    !isHost &&
    (memberRole === 'cohost' ||
      (!!user?.id && seats.some((s) => s.user_id === user.id && s.is_cohost)));
  const isModerator = isHost || isCohost || isPlatformAdmin;
  const muzikFlag = OzellikBayragiAktifMi('voice_room_music_enabled');
  const duckFlag = OzellikBayragiAktifMi('music_ducking_enabled');
  const {
    session: muzikSession,
    yenile: muzikYenile,
    setSession: muzikSessionUygula,
  } = useOdaMuzikSession(
    muzikFlag && room?.id && !isDemo ? room.id : null,
  );

  /** Stale version / çift tap → conflict; uncaught promise bırakma */
  const muzikKomut = React.useCallback(
    async (run: (expectedVersion: number) => Promise<RoomMusicSession>) => {
      if (!room?.id) return false;
      try {
        const next = await RoomMusicKomutCalistir(room.id, run);
        await muzikSessionUygula(next);
        return true;
      } catch {
        await muzikYenile();
        return false;
      }
    },
    [room?.id, muzikSessionUygula, muzikYenile],
  );
  useOdaMuzikDucking(
    Boolean(
      muzikFlag &&
        duckFlag &&
        muzikSession?.ducking_enabled &&
        muzikSession?.state === 'PLAYING',
    ),
  );
  const muzikYonetebilir = Boolean(muzikSession?.can_manage ?? isModerator);
  const muzikCalıyor = muzikSession?.state === 'PLAYING';
  const muzikLiderBen =
    !!user?.id && muzikSession?.leader_user_id === user.id;

  useEffect(() => {
    if (!room?.id || !muzikLiderBen) return;
    return OdaMuzikBitisDinle(() => {
      void muzikKomut(async () => {
        const guncel = await RoomMusicSessionGet(room.id);
        if (guncel.state !== 'PLAYING') return guncel;
        if ((guncel.queue?.length ?? 0) > 0) {
          return RoomMusicSkip(room.id, 1, guncel.version);
        }
        return RoomMusicStop(room.id, guncel.version);
      });
    });
  }, [muzikKomut, muzikLiderBen, room?.id]);

  // Yorum paneli kapalıyken yeni chat/hediye → Yorumlar butonunda uyarı
  useEffect(() => {
    if (chatOpen) {
      setYorumUyari(0);
      return;
    }
    if (isDemo || !room?.id) return;

    const imza = `oda-yorum-uyari-${room.id}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
        void supabase.removeChannel(ch);
      }
    }

    const uid = user?.id ?? null;
    const channel = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const sender = payload.new?.user_id;
          if (uid && sender === uid) return;
          setYorumUyari((n) => Math.min(99, n + 1));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `room_id=eq.${room.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const sender = payload.new?.sender_id;
          if (uid && sender === uid) return;
          setYorumUyari((n) => Math.min(99, n + 1));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatOpen, isDemo, room?.id, user?.id]);

  const seviyeGirisSelf = useMemo(() => {
    if (!user?.id || isDemo) return null;
    const level = typeof profile?.level === 'number' ? profile.level : 0;
    return {
      userId: user.id,
      ad:
        profile?.display_name?.trim() ||
        profile?.username?.trim() ||
        t('gorusme.sen'),
      avatarUrl: profile?.avatar_url ?? null,
      level,
    };
  }, [
    user?.id,
    isDemo,
    profile?.level,
    profile?.display_name,
    profile?.username,
    profile?.avatar_url,
  ]);

  const { aktif: seviyeGiris, bitti: seviyeGirisBitti } = useOdaSeviyeGiris({
    roomId: !isDemo && room?.id ? room.id : null,
    enabled: !loading && !isDemo && !!room?.id,
    hostMu: isHost,
    self: seviyeGirisSelf,
  });

  const {
    codes: gorunurOyunKodlari,
    anyVisible: herhangiOyunGorunur,
    platformAcik: oyunPlatformAcik,
    yenile: gorunurOyunlariYenile,
  } = useGorunurOyunKodlari({
    enabled: !isDemo,
  });
  const oyunlarAcik = oyunPlatformAcik && herhangiOyunGorunur;

  useFocusEffect(
    useCallback(() => {
      setOdaOdakli(true);
      if (!isDemo) void gorunurOyunlariYenile();
      return () => setOdaOdakli(false);
    }, [isDemo, gorunurOyunlariYenile]),
  );

  /** Android PiP: oda odaklıyken Home → küçük pencere */
  useSesOdasiPip({
    etkin: odaOdakli && !loading && !!room && !cikiyor,
    roomTitle: room?.title,
  });

  React.useEffect(() => {
    const kod = Array.isArray(oyunParam) ? oyunParam[0] : oyunParam;
    if (!kod || isDemo) return;
    Keyboard.dismiss();
    setBalonOyunKodu(kod as GameCode);
    setGameOpen(true);
    setOyunMonteli(true);
  }, [oyunParam, isDemo]);

  useOdaHediyeCanlisi({
    roomId: room?.id,
    selfUserId: user?.id,
    gifts,
    enabled: !isDemo && !!room?.id,
  });

  /** Admin odayı kapattığında herkesi çıkar · feed zaten is_live=false ile düşer */
  React.useEffect(() => {
    if (!id || isDemo) return;
    const imza = `room-force-end-${id}`;
    odaRealtimeKanaliniTemizle(imza);
    const topic = `${imza}-${Date.now().toString(36)}`;
    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const next = payload.new as {
            is_live?: boolean;
            host_id?: string;
            max_seats?: number;
            microphone_capacity?: number | null;
            capacity_tier_code?: string | null;
            cover_url?: string | null;
            theme_code?: string | null;
            title?: string;
            topic?: string | null;
          } | null;
          if (next?.host_id) {
            setRoom((prev) =>
              prev ? { ...prev, host_id: next.host_id as string } : prev,
            );
          }
          if (
            next &&
            (next.cover_url !== undefined ||
              next.theme_code !== undefined ||
              next.title !== undefined ||
              next.topic !== undefined)
          ) {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    ...(next.cover_url !== undefined
                      ? { cover_url: next.cover_url }
                      : null),
                    ...(next.theme_code !== undefined
                      ? { theme_code: next.theme_code }
                      : null),
                    ...(next.title !== undefined ? { title: next.title } : null),
                    ...(next.topic !== undefined ? { topic: next.topic } : null),
                  }
                : prev,
            );
            if (next.title) AktifSesOdasiGuncelle({ title: next.title });
          }
          if (
            next &&
            (next.max_seats != null ||
              next.microphone_capacity != null ||
              next.capacity_tier_code != null)
          ) {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    ...(next.max_seats != null
                      ? { max_seats: next.max_seats }
                      : null),
                    ...(next.microphone_capacity != null
                      ? { microphone_capacity: next.microphone_capacity }
                      : null),
                    ...(next.capacity_tier_code != null
                      ? { capacity_tier_code: next.capacity_tier_code }
                      : null),
                  }
                : prev,
            );
            void fetchRoomSeats(id)
              .then((s) => {
                setSeats((prev) => koltuklariUygula(prev, s));
              })
              .catch(() => undefined);
          }
          if (next && next.is_live === false) {
            void MedyaOdasiKes();
            AktifSesOdasiBitir();
            void SonGezilendenSil('oda', id);
            // Host odayı kendisi sildiyse zaten çıkış yönlendirmesi çalışıyor
            if (OdaCikisKilidiAktifMi()) return;
            Alert.alert(
              t('sesOda.odaKapatildi'),
              t('sesOda.yonetimKapattiFeed'),
              [{ text: t('ortak.tamam'), onPress: () => OdadanCikisYonlendir() }],
            );
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [id, isDemo]);

  const kendiKoltukta = useMemo(
    () => !!user?.id && seats.some((s) => s.user_id === user.id),
    [seats, user?.id],
  );

  const kendiKoltuk = useMemo(
    () => (user?.id ? seats.find((s) => s.user_id === user.id) ?? null : null),
    [seats, user?.id],
  );

  const kendiMicKilitli = !!kendiKoltuk?.is_mic_locked;
  const kendiModeratorMuted = !!kendiKoltuk?.is_muted;

  const koltukUserIds = useMemo(
    () =>
      seats
        .map((s) => s.user_id)
        .filter((id): id is string => !!id),
    [seats],
  );

  const sahipTahtta = useMemo(() => {
    if (!room?.host_id) return false;
    return seats.some(
      (s) => s.seat_index === 0 && s.user_id === room.host_id,
    );
  }, [seats, room?.host_id]);

  /** Oda sahibi tahta oturunca giriş animasyonu — oda başına 1 kez, flicker yok */
  const oncekiHostIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (loading || !room?.host_id || !room.id || seats.length === 0) return;

    if (
      oncekiHostIdRef.current !== null &&
      oncekiHostIdRef.current !== room.host_id
    ) {
      sahipTahtOnceki.current = false;
    }
    oncekiHostIdRef.current = room.host_id;

    if (sahipTahtOnceki.current === null) {
      // İlk snapshot: zaten tahttaysa animasyon yok (yeniden giriş / remount)
      sahipTahtOnceki.current = sahipTahtta;
      if (sahipTahtta) {
        OdaGirisAnimasyonuIsaretle(
          OdaGirisAnimAnahtari(room.id, 'sahip', room.host_id),
        );
      }
      return;
    }

    if (!sahipTahtOnceki.current && sahipTahtta) {
      const key = OdaGirisAnimAnahtari(room.id, 'sahip', room.host_id);
      if (!OdaGirisAnimasyonuGosterildiMi(key)) {
        OdaGirisAnimasyonuIsaretle(key);
        const taht = seats.find(
          (s) => s.seat_index === 0 && s.user_id === room.host_id,
        );
        const ad =
          taht?.profile?.display_name?.trim() ||
          taht?.profile?.username?.trim() ||
          t('sesOda.odaSahibi');
        setSahipGiris({
          ad,
          avatarUrl: taht?.profile?.avatar_url ?? null,
        });
      }
    }
    sahipTahtOnceki.current = sahipTahtta;
  }, [loading, room?.id, room?.host_id, sahipTahtta, seats]);

  const oyunAktif = gameOpen || oyunMonteli;

  /** Oyun katmanı açıkken sohbet klavyesi kalmasın — kontrolleri örter */
  React.useEffect(() => {
    if (!oyunAktif) return;
    Keyboard.dismiss();
  }, [oyunAktif]);

  /** Başvuru kabul edilmeden / koltuktan düşünce ses yayınlanmaz */
  React.useEffect(() => {
    if (isDemo || isHost || !user?.id || !room) return;
    if (kendiKoltukta) return;
    // Profil ziyaretinde koltuk state geçici boşalırsa mic'i ezme
    if (AktifSesOdasiArkaPlandaMi()) return;
    // Seats henüz gelmedi / boş flicker — demote etme (yanlış reconnect)
    if (loading || seats.length === 0) return;
    const oncekiYayinci = konusmaciYukseltildi.current;
    konusmaciYukseltildi.current = false;
    setMuted(true);
    MedyaMikrofonAyarla(false);
    AktifSesOdasiGuncelle({ micAcik: false });
    // Mute yetmez: konuşmacı token'ı canPublish açık kalır — dinleyiciye düşür
    if (oncekiYayinci) {
      const roomName = room.livekit_room_name ?? `voice_${room.id}`;
      void MedyaDinleyiciyeDusur(roomName).then((medya) => {
        if (medya.ok) {
          setLkDurum(medya.mock ? t('sesOda.demoDinleyici') : t('sesOda.bagliDinleyici'));
        }
      });
    }
  }, [isDemo, isHost, user?.id, kendiKoltukta, room, loading, seats.length]);

  /** Moderator mute / mic lock → yerel LiveKit mic gerçekten kapansın */
  React.useEffect(() => {
    if (isDemo || !kendiKoltukta) return;
    if (!kendiModeratorMuted && !kendiMicKilitli) return;
    setMuted(true);
    MedyaMikrofonAyarla(false);
    AktifSesOdasiGuncelle({ micAcik: false });
  }, [isDemo, kendiKoltukta, kendiModeratorMuted, kendiMicKilitli]);

  /** Mikrofon kabulü sonrası konuşmacı token'ına yükselt */
  React.useEffect(() => {
    if (isDemo || !room || !user?.id || isHost) return;
    if (!kendiKoltukta) return;
    // Profil ziyareti / arka plan: token veya mic'e dokunma
    if (AktifSesOdasiArkaPlandaMi()) return;
    // load() join bitmeden ikinci join atma
    if (!medyaIlkBaglantiBitti.current) return;
    // Zaten yayıncıysa zorla reconnect etme → LeaveRequest race
    if (MedyaYayinciMi()) {
      konusmaciYukseltildi.current = true;
      return;
    }
    // load() zaten speaker bağladıysa tekrar join etme
    if (konusmaciYukseltildi.current) return;
    konusmaciYukseltildi.current = true;
    const roomName = room.livekit_room_name ?? `voice_${room.id}`;
    void (async () => {
      const medya = await MedyaKonusmaciyaYukselt(roomName);
      if (medya.ok) {
        // Koltuk izni → mikrofon AÇIK (moderatör mute/kilit yoksa)
        const micAcik = !kendiModeratorMuted && !kendiMicKilitli;
        setMuted(!micAcik);
        MedyaMikrofonAyarla(micAcik);
        MedyaHoparlorAyarla(true);
        MedyaUzakSesHacmiAyarla(odaSesHacmiRef.current);
        setLkDurum(medya.mock ? t('sesOda.demoKonusmaci') : t('sesOda.bagliKonusmaci'));
        AktifSesOdasiGuncelle({ micAcik });
      } else {
        konusmaciYukseltildi.current = false;
        if (medya.hata !== t('sesOda.baglantiIptalEdildi') && medya.hata !== 'Ba\u011flant\u0131 iptal edildi') {
          Alert.alert(t('sesOda.mikrofon'), medya.hata ?? t('sesOda.konusmaciBaglantiHatasi'));
        }
      }
    })();
  }, [
    isDemo,
    room,
    user?.id,
    isHost,
    kendiKoltukta,
    medyaHazirTick,
    kendiModeratorMuted,
    kendiMicKilitli,
  ]);

  /** Koltuk değişiklikleri (mic kabul / ayrılma) */
  React.useEffect(() => {
    if (isDemo || !room?.id) return;
    const yenile = () => {
      void fetchRoomSeats(room.id)
        .then((next) => {
          setSeats((prev) => koltuklariUygula(prev, next));
        })
        .catch(() => undefined);
    };
    const imza = `oda-koltuk-${room.id}`;
    odaRealtimeKanaliniTemizle(imza);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
    channel = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_seats',
          filter: `room_id=eq.${room.id}`,
        },
        yenile,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${room.id}`,
        },
        (payload: {
          eventType?: string;
          new?: Record<string, unknown> | null;
          old?: Record<string, unknown> | null;
        }) => {
          yenile();
          // Kendi rolümüz event payload'dan — ekstra SELECT yok
          const uid = user?.id;
          if (!uid) return;
          const row =
            payload.eventType === 'DELETE' ? payload.old : payload.new;
          if (!row || row.user_id !== uid) return;
          if (payload.eventType === 'DELETE') {
            setMemberRole(null);
            return;
          }
          const role = row.role as
            | 'host'
            | 'cohost'
            | 'speaker'
            | 'listener'
            | undefined;
          if (role) setMemberRole(role);
        },
      )
      .subscribe();
    } catch {
      channel = null;
    }
    // Realtime asıl kaynak; poll yalnızca yedek — sık çekim ısınma üretir
    const poll = setInterval(yenile, 15_000);
    return () => {
      clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isDemo, room?.id, user?.id]);

  const odadanAyril = useCallback(
    async (odayiSil: boolean) => {
      if (cikiyor) return;
      setCikiyor(true);
      try {
        KonusmaciSesSeviyesi.mockDurdur();
        AktifSesOdasiBitir();

        const roomId = room?.id;
        const uid = user?.id;
        const sil = odayiSil && isHost && !isDemo && !!roomId;

        // Önce üyelikten düş — aksi halde dinleyici listesinde hayalet kalır
        void MedyaOdasiKes().catch(() => undefined);
        if (uid && roomId && !isDemo) {
          try {
            if (sil) {
              const r = await OdayiSil(roomId);
              if (!r.ok) {
                Alert.alert(t('sesOda.oda'), r.hata);
                await leaveRoom(roomId, uid);
              } else {
                void AnalyticsOlayEkle('room_delete', { room_id: roomId });
              }
            } else {
              await leaveRoom(roomId, uid);
              void AnalyticsOlayEkle('room_leave', { room_id: roomId });
            }
          } catch {
            /* ağ hatası — yine de çık */
          }
        }
        OdadanCikisYonlendir();
      } finally {
        if (room?.id) OdaGirisAnimasyonuOdaTemizle(room.id);
        setCikiyor(false);
      }
    },
    [cikiyor, user?.id, room, isDemo, isHost],
  );

  /** Kick/ban: üyelik silinince (önceden üye olmuşken) odadan çıkar */
  const uyeOlduRef = React.useRef(false);
  React.useEffect(() => {
    if (memberRole) uyeOlduRef.current = true;
  }, [memberRole]);
  React.useEffect(() => {
    if (isDemo || isHost || loading || cikiyor) return;
    if (!uyeOlduRef.current) return;
    if (memberRole != null) return;
    uyeOlduRef.current = false;
    Alert.alert(t('sesOda.oda'), t('sesOda.odadanCikarildiniz'));
    void odadanAyril(false);
  }, [isDemo, isHost, loading, cikiyor, memberRole, odadanAyril]);

  const odadanCik = useCallback(() => {
    if (cikiyor) return;
    // Host çıkınca oda AÇIK kalır — kalıcı kapatma yalnız oda bilgisi / platform
    if (isHost && !isDemo) {
      Alert.alert(
        t('sesOda.odadanCik'),
        t('sesOda.hostCikisSoru'),
        [
          { text: t('sesOda.kal'), style: 'cancel' },
          {
            text: t('sesOda.cik'),
            style: 'destructive',
            onPress: () => void odadanAyril(false),
          },
        ],
      );
      return;
    }
    Alert.alert(t('sesOda.odadanCik'), t('sesOda.ayrilSoruKisa'), [
      { text: t('sesOda.kal'), style: 'cancel' },
      {
        text: t('sesOda.cik'),
        style: 'destructive',
        onPress: () => void odadanAyril(false),
      },
    ]);
  }, [cikiyor, isHost, isDemo, odadanAyril, t]);

  const odayiKaliciKapat = useCallback(() => {
    if (!isHost || isDemo || cikiyor) return;
    Alert.alert(
      t('sesOda.odayiKapat'),
      t('sesOda.odayiKapatSoru'),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('sesOda.evetKapat'),
          style: 'destructive',
          onPress: () => void odadanAyril(true),
        },
      ],
    );
  }, [isHost, isDemo, cikiyor, odadanAyril]);

  const mikrofonToggle = useCallback(() => {
    void islemiDene('mikrofon', async () => {
      if (isDemo) {
        setMuted((m) => !m);
        void Haptics.selectionAsync().catch(() => undefined);
        return;
      }
      if (!room) return;

      // Oda sahibi / koltuktaki konuşmacı: istek yok, doğrudan aç-kapa
      if (isHost || kendiKoltukta) {
        const sonraki = !muted;
        // Açmaya çalışıyorsa mic lock engeller; kapatmak her zaman serbest
        if (sonraki === false && kendiMicKilitli) {
          Alert.alert(
            t('sesOda.mikrofon'),
            t('sesOda.mikrofonKilitli'),
          );
          return;
        }
        if (sonraki === false && kendiModeratorMuted) {
          Alert.alert(
            t('sesOda.mikrofon'),
            t('sesOda.mikrofonYoneticiKapatti'),
          );
          return;
        }
        setMuted(sonraki);
        MedyaMikrofonAyarla(!sonraki);
        AktifSesOdasiGuncelle({ micAcik: !sonraki });
        // Clubhouse/Bigo: mute SFX yok — sadece hafif haptic
        void Haptics.selectionAsync().catch(() => undefined);
        return;
      }

      // Dinleyici: host'a mikrofon isteği
      if (muted) {
        const r = await MikrofonIstegiGonder(room.id);
        if (!r.ok) {
          Alert.alert(t('sesOda.mikrofon'), r.hata ?? t('sesOda.istekGonderilemedi'));
          return;
        }
        Alert.alert(
          t('sesOda.mikrofon'),
          t('sesOda.istekGonderildiKoltuk'),
        );
      }
    });
  }, [
    islemiDene,
    isDemo,
    room,
    isHost,
    kendiKoltukta,
    muted,
    kendiMicKilitli,
    kendiModeratorMuted,
  ]);

  const profileZiyaretEt = useCallback((userId: string) => {
    if (!userId || isDemo) return;
    AktifSesOdasiArkaPlanaAl();
    router.push(`/kullanici/${userId}` as any);
  }, [isDemo]);

  const odaSahibi = useMemo(() => {
    if (room?.host?.id && room.host.id === room.host_id) return room.host;
    if (hostProfilYedek?.id === room?.host_id) return hostProfilYedek;
    const taht = seats.find((s) => s.user_id === room?.host_id);
    if (taht?.profile && room?.host_id) {
      return {
        id: room.host_id,
        display_name: taht.profile.display_name ?? null,
        username: taht.profile.username ?? null,
        avatar_url: taht.profile.avatar_url ?? null,
        level: taht.profile.level ?? 1,
        bio: '',
      } as Profile;
    }
    return null;
  }, [room?.host, room?.host_id, hostProfilYedek, seats]);

  React.useEffect(() => {
    if (!room?.host_id || isDemo) {
      setHostProfilYedek(null);
      return;
    }
    if (room.host?.id === room.host_id) {
      setHostProfilYedek(null);
      return;
    }
    let iptal = false;
    void ProfilGetir(room.host_id).then((p) => {
      if (!iptal && p) setHostProfilYedek(p);
    });
    return () => {
      iptal = true;
    };
  }, [room?.host_id, room?.host?.id, isDemo]);

  const odaSahibiKartAc = useCallback(() => {
    if (!room?.host_id) return;
    profileZiyaretEt(room.host_id);
  }, [room?.host_id, profileZiyaretEt]);

  const yorumProfilAc = useCallback(
    (item: CanliSohbetMesajGorunum) => {
      profileZiyaretEt(item.user_id);
    },
    [profileZiyaretEt],
  );

  const moderasyonMesaji = (action: ModerasyonAksiyonu): string => {
    switch (action) {
      case 'mute':
        return t('sesOda.modMute');
      case 'unmute':
        return t('sesOda.modUnmute');
      case 'mic_lock':
        return t('sesOda.modMicLock');
      case 'mic_unlock':
        return t('sesOda.modMicUnlock');
      case 'unseat':
        return t('sesOda.modUnseat');
      case 'kick':
        return t('sesOda.modKick');
      case 'ban':
        return t('sesOda.modBan');
      case 'unban':
        return t('sesOda.modUnban');
      default:
        return t('sesOda.islemTamamlandi');
    }
  };

  const moderasyonUygula = (
    targetUserId: string,
    action: ModerasyonAksiyonu,
    onay?: { baslik: string; metin: string },
  ) => {
    if (!room || isDemo) {
      Alert.alert(t('sesOda.demo'), t('sesOda.demoModerasyon'));
      return;
    }
    const calistir = () => {
      void (async () => {
        const r = await OdaModerasyonUygula({
          roomId: room.id,
          targetUserId,
          action,
        });
        if (!r.ok) {
          if (__DEV__) console.warn('[moderasyon]', action, r.hata);
          Alert.alert(t('sesOda.moderasyon'), t('sesOda.islemBasarisiz'));
          return;
        }
        Alert.alert(t('ortak.tamam'), moderasyonMesaji(action));
        const s = await fetchRoomSeats(room.id).catch(() => null);
        if (s) setSeats(s);
      })();
    };
    if (onay) {
      Alert.alert(onay.baslik, onay.metin, [
        { text: t('ortak.vazgec'), style: 'cancel' },
        { text: t('ortak.onayla'), style: 'destructive', onPress: calistir },
      ]);
      return;
    }
    calistir();
  };

  const koltuktanAyrilSelf = useCallback(() => {
    if (!room || isDemo || !kendiKoltukta) return;
    Alert.alert(t('sesOda.koltuktanKalk'), t('sesOda.koltuktanKalkSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('sesOda.ayril'),
        onPress: () => {
          void (async () => {
            const r = await KoltuktanAyril(room.id);
            if (!r.ok) {
              if (__DEV__) console.warn('[koltuktan_ayril]', r.hata);
              Alert.alert(t('sesOda.koltuk'), t('sesOda.islemBasarisiz'));
              return;
            }
            setMuted(true);
            MedyaMikrofonAyarla(false);
            AktifSesOdasiGuncelle({ micAcik: false });
            const s = await fetchRoomSeats(room.id).catch(() => null);
            if (s) setSeats(s);
          })();
        },
      },
    ]);
  }, [room, isDemo, kendiKoltukta]);

  const liderligiDevret = useCallback(
    (yeniHostId: string) => {
      if (!room || isDemo) {
        Alert.alert(t('sesOda.demo'), t('sesOda.demoLiderlik'));
        return;
      }
      const hedef = seats.find((s) => s.user_id === yeniHostId);
      const ad =
        hedef?.profile?.display_name?.trim() ||
        hedef?.profile?.username?.trim() ||
        t('sesOda.buKullaniciya');
      Alert.alert(
        t('sesOda.liderligiDevret'),
        t('sesOda.liderligiDevretSoru', { ad }),
        [
          { text: t('ortak.iptal'), style: 'cancel' },
          {
            text: t('sesOda.devret'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const r = await LiderligiDevret({
                  roomId: room.id,
                  yeniHostId,
                });
                if (!r.ok) {
                  Alert.alert(t('sesOda.liderlik'), r.hata ?? t('sesOda.devredilemedi'));
                  return;
                }
                setRoom((prev) =>
                  prev
                    ? {
                        ...prev,
                        host_id: yeniHostId,
                        host: null,
                      }
                    : prev,
                );
                const s = await fetchRoomSeats(room.id).catch(() => null);
                if (s) setSeats(s);
              })();
            },
          },
        ],
      );
    },
    [room, isDemo, seats],
  );

  const yardimciLiderToggle = useCallback(
    (hedefId: string, suanCohost: boolean) => {
      if (!room || isDemo || !isHost) return;
      const baslik = suanCohost
        ? t('sesOda.yoneticiYetkisiniKaldir')
        : t('sesOda.yoneticiYap');
      const metin = suanCohost
        ? t('sesOda.yoneticiKaldirSoru')
        : t('sesOda.yoneticiYapSoru');
      Alert.alert(baslik, metin, [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.onayla'),
          onPress: () => {
            void (async () => {
              const r = suanCohost
                ? await YardimciLiderKaldir({
                    roomId: room.id,
                    userId: hedefId,
                  })
                : await YardimciLiderAta({
                    roomId: room.id,
                    userId: hedefId,
                  });
              if (!r.ok) {
                if (__DEV__) console.warn('[admin]', r.hata);
                Alert.alert(t('sesOda.yonetici'), t('sesOda.islemBasarisiz'));
                return;
              }
              Alert.alert(
                t('ortak.tamam'),
                suanCohost
                  ? t('sesOda.yoneticiKaldirildi')
                  : t('sesOda.yoneticiVerildi'),
              );
              const s = await fetchRoomSeats(room.id).catch(() => null);
              if (s) setSeats(s);
            })();
          },
        },
      ]);
    },
    [room, isDemo, isHost],
  );

  const koltukMenusu = useCallback(
    (seat: RoomSeat) => {
      // Boş koltuk: dinleyici hedef koltuk için talep gönderir
      if (!seat.user_id) {
        if (isDemo || !room || !user?.id) return;
        if (isHost || kendiKoltukta) return;
        if (seat.seat_index === 0) {
          Alert.alert(t('sesOda.taht'), t('sesOda.tahtSadeceSahip'));
          return;
        }
        if (seat.is_locked) {
          Alert.alert(t('sesOda.koltuk'), t('sesOda.koltukKilitli'));
          return;
        }
        void islemiDene('mikrofon', async () => {
          Alert.alert(
            t('sesOda.koltukTalebi'),
            t('sesOda.koltukTalebiSoru', { n: seat.seat_index + 1 }),
            [
              { text: t('ortak.vazgec'), style: 'cancel' },
              {
                text: t('sesOda.istekGonder'),
                onPress: () => {
                  void (async () => {
                    const r = await MikrofonIstegiGonder(
                      room.id,
                      seat.seat_index,
                    );
                    if (!r.ok) {
                      Alert.alert(t('sesOda.koltuk'), r.hata ?? t('sesOda.istekGonderilemedi'));
                      return;
                    }
                    Alert.alert(
                      t('sesOda.koltuk'),
                      t('sesOda.istekGonderildiBuKoltuk'),
                    );
                  })();
                },
              },
            ],
          );
        });
        return;
      }

      const name =
        seat.profile?.display_name?.trim() ||
        seat.profile?.username?.trim() ||
        seat.user_id.slice(0, 8);

      const actorRole = OdaRoluHesapla({
        userId: user?.id,
        hostId: room?.host_id,
        memberRole,
        isCohostSeat: isCohost,
        isPlatformAdmin,
      });
      const targetIsOwner =
        !!room?.host_id && seat.user_id === room.host_id;
      // Platform admin host dahil herkesi yönetebilir
      const targetIsAdmin = !!seat.is_cohost && !targetIsOwner;
      const targetIsSelf = seat.user_id === user?.id;

      const aksiyonlar = KatilimciMenuAksiyonlari({
        actorRole,
        targetIsOwner: isPlatformAdmin ? false : targetIsOwner,
        targetIsAdmin: isPlatformAdmin ? false : targetIsAdmin,
        targetOnSeat: true,
        targetMicLocked: !!seat.is_mic_locked,
        targetIsSelf,
      });

      const aksiyonCalistir = (a: KatilimciMenuAksiyonu) => {
        switch (a) {
          case 'profil':
            profileZiyaretEt(seat.user_id!);
            break;
          case 'koltuktan_ayril':
            koltuktanAyrilSelf();
            break;
          case 'mute':
            moderasyonUygula(seat.user_id!, 'mute');
            break;
          case 'mic_lock':
            moderasyonUygula(seat.user_id!, 'mic_lock');
            break;
          case 'mic_unlock':
            moderasyonUygula(seat.user_id!, 'mic_unlock');
            break;
          case 'unseat':
            moderasyonUygula(seat.user_id!, 'unseat');
            break;
          case 'admin_ata':
            yardimciLiderToggle(seat.user_id!, false);
            break;
          case 'admin_kaldir':
            yardimciLiderToggle(seat.user_id!, true);
            break;
          case 'lider_devret':
            liderligiDevret(seat.user_id!);
            break;
          case 'kick':
            moderasyonUygula(seat.user_id!, 'kick', {
              baslik: t('sesOda.odadanCikar'),
              metin: t('sesOda.odadanCikarSoru', { ad: name }),
            });
            break;
          case 'ban':
            moderasyonUygula(seat.user_id!, 'ban', {
              baslik: t('sesOda.yasakla'),
              metin: t('sesOda.yasaklaSoru', { ad: name }),
            });
            break;
          default:
            break;
        }
      };

      const etiket = (a: KatilimciMenuAksiyonu): string => {
        switch (a) {
          case 'profil':
            return t('sesOda.menuProfiliniGor');
          case 'koltuktan_ayril':
            return t('sesOda.menuKoltuktanKalk');
          case 'mute':
            return t('sesOda.menuMikrofonuKapat');
          case 'mic_lock':
            return t('sesOda.menuMikrofonuKilitle');
          case 'mic_unlock':
            return t('sesOda.menuMikrofonKilidiniAc');
          case 'unseat':
            return t('sesOda.menuKoltuktanIndir');
          case 'admin_ata':
            return t('sesOda.menuYoneticiYap');
          case 'admin_kaldir':
            return t('sesOda.menuYoneticiYetkisiniKaldir');
          case 'lider_devret':
            return t('sesOda.menuLiderligiDevret');
          case 'kick':
            return t('sesOda.menuOdadanCikar');
          case 'ban':
            return t('sesOda.menuEngelleYasakla');
          default:
            return a;
        }
      };

      setKatilimciMenu({
        seat,
        baslik: name,
        aksiyonlar: aksiyonlar.map((a) => ({
          id: a,
          etiket: etiket(a),
          destructive:
            a === 'kick' || a === 'ban' || a === 'koltuktan_ayril',
        })),
      });
      // Panel onAksiyon → aynı seat ile çalıştır
      katilimciAksiyonRef.current = aksiyonCalistir;
    },
    [
      isDemo,
      room,
      user?.id,
      isHost,
      isCohost,
      isPlatformAdmin,
      kendiKoltukta,
      memberRole,
      islemiDene,
      liderligiDevret,
      yardimciLiderToggle,
      profileZiyaretEt,
      koltuktanAyrilSelf,
    ],
  );

  const koltukTik = useCallback(
    (seat: RoomSeat) => {
      if (!seat.user_id) {
        koltukMenusu(seat);
        return;
      }
      profileZiyaretEt(seat.user_id);
    },
    [koltukMenusu, profileZiyaretEt],
  );

  const load = useCallback(async () => {
    const loadNesil = ++odaLoadNesil.current;
    medyaIlkBaglantiBitti.current = false;
    if (!id || isDemo) {
      medyaIlkBaglantiBitti.current = true;
      setRoom({
        id: id ?? 'demo',
        host_id: 'demo',
        title: t('sesOda.demoCanliOda'),
        topic: t('sesOda.demoTopic'),
        cover_url: null,
        mode: 'dating',
        max_seats: 8,
        is_live: true,
        is_locked: false,
        listener_count: 42,
        total_coins_earned: 900,
        created_at: new Date().toISOString(),
        layout_code: 'floating_glass',
        theme_code: 'midnight_plum',
      });
      setSeats(
        Array.from({ length: 8 }, (_, seat_index) => ({
          id: `s${seat_index}`,
          room_id: id ?? 'demo',
          seat_index,
          user_id: seat_index === 0 ? 'demo' : null,
          is_muted: false,
          is_locked: false,
          profile:
            seat_index === 0
              ? {
                  id: 'demo',
                  username: 'host',
                  display_name: t('kesfet.evSahibi'),
                  bio: '',
                  avatar_url: null,
                  gender: 'female',
                  birth_date: null,
                  country: null,
                  language: 'tr',
                  is_host: true,
                  is_verified: true,
                  level: 10,
                  xp: 0,
                  created_at: new Date().toISOString(),
                }
              : null,
        })),
      );
      KonusmaciSesSeviyesi.mockBaslat('demo');
      setLkDurum(t('sesOda.demo'));
      setLoading(false);
      return;
    }

    try {
      // Yeni açılan oda: önbellekten anında UI — kullanıcı beklemesin
      const onbellek = YeniOdaOnbellektenAl(id);
      if (onbellek) {
        setRoom(onbellek.room);
        setSeats(onbellek.seats);
        setLoading(false);
        if (user?.id === onbellek.room.host_id) {
          setMuted(true);
          konusmaciYukseltildi.current = true;
        } else if (onbellek.seats.some((seat) => seat.user_id === user?.id)) {
          setMuted(true);
          konusmaciYukseltildi.current = true;
        }
      } else {
        setLoading(true);
      }

      // Hediyeler UI'ı bloklamasın
      void HediyeKatalogunuGetir()
        .then((g) => {
          if (g.length >= 20) setGifts(g);
          else if (g.length) {
            setGifts(
              [
                ...g,
                ...HEDIYE_FALLBACK_50.filter((f) => !g.some((x) => x.code === f.code)),
              ].slice(0, 50),
            );
          }
        })
        .catch(() => undefined);

      const [r, s] = await Promise.all([
        onbellek ? Promise.resolve(onbellek.room) : fetchRoom(id),
        onbellek
          ? fetchRoomSeats(id).catch(() => onbellek.seats)
          : fetchRoomSeats(id),
      ]);

      if (loadNesil !== odaLoadNesil.current) return;

      if (!r || !r.is_live) {
        setRoom(null);
        void SonGezilendenSil('oda', id);
        if (!OdaCikisKilidiAktifMi()) {
          Alert.alert(t('sesOda.oda'), t('sesOda.odaArtikCanliDegil'));
          OdadanCikisYonlendir();
        }
        return;
      }
      setRoom(r);
      setSeats(s);
      setLoading(false);

      void SonGezileneKaydet({
        id: r.id,
        tur: 'oda',
        title: r.title,
        coverUrl: r.cover_url ?? r.host?.avatar_url ?? null,
        hostAd:
          r.host?.display_name?.trim() ||
          (r.host?.username ? `@${r.host.username}` : null),
        hostAvatar: r.host?.avatar_url ?? null,
        mode: r.mode ?? null,
        href: `/lobi/${r.id}`,
        uyeAvatarlari: s
          .filter((seat) => !!seat.user_id)
          .sort((a, b) => a.seat_index - b.seat_index)
          .slice(0, 6)
          .map((seat) => seat.profile?.avatar_url ?? null),
      });

      const hostMu = !!user?.id && user.id === r.host_id;
      const koltukta =
        !!user?.id && s.some((seat) => seat.user_id === user.id);
      // Effect yarışını kes: load speaker/host bağlarken yükseltme effect'i dinleyici join atmasın
      if (hostMu || koltukta) {
        konusmaciYukseltildi.current = true;
      }
      if (hostMu) {
        const tahtta = s.some(
          (seat) => seat.seat_index === 0 && seat.user_id === user.id,
        );
        if (!tahtta) {
          void HostTahtaOtur(r.id).then(async (res) => {
            if (!res.ok) return;
            if (loadNesil !== odaLoadNesil.current) return;
            const next = await fetchRoomSeats(r.id).catch(() => null);
            if (next && loadNesil === odaLoadNesil.current) setSeats(next);
          });
        }
      }
      if (user?.id) {
        // Host createRoom'da zaten üye — await etme
        void joinRoom(id, user.id, hostMu ? 'host' : 'listener').catch(
          () => undefined,
        );
        void AnalyticsOlayEkle('room_join', { room_id: id });
        void supabase
          .from('room_members')
          .select('role')
          .eq('room_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (loadNesil !== odaLoadNesil.current) return;
            if (hostMu) setMemberRole('host');
            else
              setMemberRole(
                (data?.role as
                  | 'host'
                  | 'cohost'
                  | 'speaker'
                  | 'listener'
                  | null) ?? 'listener',
              );
          });
      }

      const roomName = r.livekit_room_name ?? `voice_${id}`;
      setLkDurum(t('sesOda.sesBaglaniyor'));
      const medya = await MedyaOdasiBaglan({
        roomName,
        role: hostMu ? 'host' : koltukta ? 'speaker' : 'listener',
        // Host / koltuktaki: mic açık; dinleyici: kapalı
        micAcik: hostMu || koltukta,
      });
      if (loadNesil !== odaLoadNesil.current) return;
      medyaIlkBaglantiBitti.current = true;
      setMedyaHazirTick((n) => n + 1);
      if (medya.ok) {
        setLkDurum(
          medya.mock ? t('sesOda.demo') : t('sesOda.bagliOnEk'),
        );
        MedyaHoparlorAyarla(true);
        MedyaUzakSesHacmiAyarla(odaSesHacmiRef.current);

        // Aynı oda oturumu (profil ziyareti vb.): mic tercihini koru — kapatma
        const oncekiOturum = AktifSesOdasiDurumunuAl();
        const ayniOturum = oncekiOturum?.roomId === r.id;

        if (hostMu || koltukta) {
          konusmaciYukseltildi.current = true;
        } else {
          konusmaciYukseltildi.current = false;
        }

        // Profil dönüşü: önceki mic. Yeni host/koltuk: açık. Dinleyici: kapalı.
        const micAcikKalacak = ayniOturum
          ? !!oncekiOturum?.micAcik
          : !!(hostMu || koltukta);

        setMuted(!micAcikKalacak);
        MedyaMikrofonAyarla(micAcikKalacak);

        // Join sonrası soft routing — kullanıcı ses tercihini koru
        MedyaUzakSesHacmiAyarla(odaSesHacmiRef.current);
        setTimeout(() => {
          if (loadNesil !== odaLoadNesil.current) return;
          MedyaSesOturumunuYenile(false);
          MedyaHoparlorAyarla(true);
          MedyaUzakSesHacmiAyarla(odaSesHacmiRef.current);
          if (micAcikKalacak) MedyaMikrofonAyarla(true);
        }, 400);
        if (medya.mock && r.host_id) KonusmaciSesSeviyesi.mockBaslat(r.host_id);

        if (ayniOturum) {
          AktifSesOdasiGuncelle({
            title: r.title,
            dinleyiciSayisi: r.listener_count ?? 0,
            micAcik: micAcikKalacak,
          });
        } else {
          AktifSesOdasiBaslat({
            roomId: r.id,
            title: r.title,
            micAcik: micAcikKalacak,
            dinleyiciSayisi: r.listener_count ?? 0,
          });
        }
        AktifSesOdasiOneCikar();
      } else {
        setLkDurum(medya.hata ?? t('ortak.baglantiHatasi'));
        if (
          (hostMu || koltukta) &&
          medya.hata !== t('sesOda.baglantiIptalEdildi') &&
          medya.hata !== 'Ba\u011flant\u0131 iptal edildi'
        ) {
          konusmaciYukseltildi.current = false;
          Alert.alert(
            t('sesOda.sesBaglantisi'),
            medya.hata ?? t('sesOda.sesBaglantisiHata'),
          );
        }
      }
    } catch (e) {
      if (loadNesil !== odaLoadNesil.current) return;
      medyaIlkBaglantiBitti.current = true;
      setMedyaHazirTick((n) => n + 1);
      Alert.alert(t('sesOda.odaYuklenemedi'), e instanceof Error ? e.message : t('ortak.hata'));
      setLoading(false);
    }
  }, [id, isDemo, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const oturum = ++odaFocusNesil.current;
      let iptal = false;
      const profilDonusu = AktifSesOdasiArkaPlandaMi();
      const micAcikOnce =
        profilDonusu && AktifSesOdasiDurumunuAl()?.roomId === id
          ? !!AktifSesOdasiDurumunuAl()?.micAcik
          : null;
      AktifSesOdasiOneCikar();
      void (async () => {
        await load();
        if (oturum !== odaFocusNesil.current) return;
        if (!iptal) {
          MedyaSesOturumunuYenile(false);
          MedyaHoparlorAyarla(true);
          // Profil dönüşünde açık mic'i yenile sonrası geri koy
          if (micAcikOnce) {
            setMuted(false);
            MedyaMikrofonAyarla(true);
            AktifSesOdasiGuncelle({ micAcik: true });
          }
        }
      })();
      return () => {
        iptal = true;
        // Profil ziyareti: ses + mic açık kalsın
        if (AktifSesOdasiArkaPlandaMi()) return;
        KonusmaciSesSeviyesi.mockDurdur();
        // Strict Mode / hızlı remount LiveKit'i öldürmesin — yeni focus iptal eder.
        // 500ms kısa kalıyordu: join hâlâ Connecting iken Kes → LeaveRequest.
        setTimeout(() => {
          if (odaFocusNesil.current !== oturum) return;
          if (AktifSesOdasiArkaPlandaMi()) return;
          void MedyaOdasiKes();
          AktifSesOdasiBitir();
        }, 1800);
      };
    }, [load, id]),
  );

  const hediyeAlicilari = useMemo(() => {
    if (!room?.host_id) return [] as HediyePkAlici[];
    const liste: HediyePkAlici[] = [];
    const ekle = (
      id: string,
      ad: string,
      rol: 'sahip' | 'konuk',
      avatarUrl?: string | null,
    ) => {
      if (!id || id === user?.id || liste.some((x) => x.id === id)) return;
      liste.push({ id, ad, rol, avatarUrl: avatarUrl ?? null });
    };
    const sahipAd =
      odaSahibi?.display_name?.trim() ||
      odaSahibi?.username?.trim() ||
      room.host?.display_name?.trim() ||
      room.host?.username?.trim() ||
      t('kesfet.evSahibi');
    ekle(
      room.host_id,
      sahipAd,
      'sahip',
      odaSahibi?.avatar_url ?? room.host?.avatar_url,
    );
    const koltuklar = [...seats]
      .filter((s) => s.user_id && s.user_id !== room.host_id)
      .sort((a, b) => a.seat_index - b.seat_index);
    for (const koltuk of koltuklar) {
      if (!koltuk.user_id) continue;
      const ad =
        koltuk.profile?.display_name?.trim() ||
        koltuk.profile?.username?.trim() ||
        t('ortak.kullanici');
      ekle(koltuk.user_id, ad, 'konuk', koltuk.profile?.avatar_url);
    }
    return liste;
  }, [odaSahibi, room?.host, room?.host_id, seats, t, user?.id]);

  const hediyeKartAcikOnce = useRef(false);
  useEffect(() => {
    const yeniAcildi = giftOpen && !hediyeKartAcikOnce.current;
    hediyeKartAcikOnce.current = giftOpen;
    if (!giftOpen) return;
    setHediyeAliciIdler((cur) => {
      const gecerli = cur.filter((id) => hediyeAlicilari.some((a) => a.id === id));
      if (yeniAcildi && gecerli.length === 0) {
        const ilk = hediyeAlicilari[0]?.id;
        return ilk ? [ilk] : [];
      }
      return gecerli;
    });
  }, [giftOpen, hediyeAlicilari]);

  const hediyeAliciToggle = useCallback((id: string) => {
    setHediyeAliciIdler((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }, []);

  const onSendGift = (gift: Gift, quantity = 1) => {
    if (!user || !room) return;
    const secilen = hediyeAlicilari.filter((a) => hediyeAliciIdler.includes(a.id));
    if (secilen.length === 0) {
      Alert.alert(t('hediye.baslik'), t('hediye.aliciBulunamadi'));
      return;
    }
    const adet = Math.max(1, quantity);
    const maliyet = gift.coin_cost * adet * secilen.length;
    if (maliyet > (wallet?.coins ?? 0)) {
      // Panel içi coin modu — HediyeMagazaPaneli yetmezken coinAc çağırır
      coinYukle.paketleriYenile();
      return;
    }
    const aliciAdlari = secilen.map((a) => a.ad).join(', ');
    const aliciAvatarlar = secilen.map((a) => ({
      ad: a.ad,
      avatarUrl: a.avatarUrl ?? null,
    }));
    islemiDene('hediye_gonder', async () => {
      if (isDemo) {
        setLastGift(
          t('sesOda.hediyeSatir', {
            emoji: gift.emoji,
            ad: gift.name,
            adet: adet > 1 ? ` ×${adet}` : '',
            alici: aliciAdlari,
          }),
        );
        HediyeAnimasyonuKuyrugu.ekle({
          giftId: gift.id,
          emoji: gift.emoji,
          name: adet > 1 ? `${gift.name} x${adet}` : gift.name,
          senderName: profile?.display_name ?? profile?.username ?? t('gorusme.sen'),
          receiverName: aliciAdlari,
          alicilar: aliciAvatarlar,
          durationMs: 2200,
          fullScreen: gift.coin_cost >= 999 || adet >= 77,
          coinCost: gift.coin_cost,
          quantity: adet,
        });
        setTimeout(() => setLastGift(null), 1800);
        setGiftOpen(false);
        return;
      }
      if (gift.id.startsWith('fb_')) {
        Alert.alert(t('sesOda.hediye'), t('sesOda.katalogYukleniyor'));
        return;
      }
      const giden: typeof secilen = [];
      let harcanan = 0;
      for (const alici of secilen) {
        const sonuc = await HediyeGonder({
          giftId: gift.id,
          receiverId: alici.id,
          roomId: room.id,
          quantity: adet,
        });
        if (!sonuc.ok) {
          const yetersiz = /insufficient|yetersiz/i.test(sonuc.hata ?? '');
          if (yetersiz) {
            coinYukle.paketleriYenile();
            Alert.alert(t('sesOda.yetersizCoin'), t('sesOda.hediyeCoinYukle'));
          } else {
            Alert.alert(t('sesOda.hediye'), sonuc.hata ?? t('sesOda.gonderilemedi'));
          }
          break;
        }
        harcanan += sonuc.coinsSpent;
        giden.push(alici);
      }
      if (harcanan > 0) {
        adjustWallet({ coins: -harcanan });
      }
      void refreshWallet();
      if (giden.length === 0) return;
      const gidenAdlar = giden.map((a) => a.ad).join(', ');
      setLastGift(
        t('sesOda.hediyeSatir', {
          emoji: gift.emoji,
          ad: gift.name,
          adet: adet > 1 ? ` ×${adet}` : '',
          alici: gidenAdlar,
        }),
      );
      HediyeAnimasyonuKuyrugu.ekle({
        giftId: gift.id,
        emoji: gift.emoji,
        name: adet > 1 ? `${gift.name} x${adet}` : gift.name,
        senderName: profile?.display_name ?? profile?.username ?? t('gorusme.sen'),
        receiverName: gidenAdlar,
        alicilar: giden.map((a) => ({
          ad: a.ad,
          avatarUrl: a.avatarUrl ?? null,
        })),
        durationMs: 2200,
        fullScreen: gift.coin_cost >= 999 || adet >= 77,
        coinCost: gift.coin_cost,
        quantity: adet,
      });
      setTimeout(() => setLastGift(null), 1800);
      void (async () => {
        try {
          const { SehirHediyeSonrasiOzet } = await import(
            '../../src/moduller/sehirler/islemler/SehirModernIslemleri'
          );
          const ozet = await SehirHediyeSonrasiOzet();
          if (ozet.has_city && (ozet.last_delta ?? 0) > 0) {
            Alert.alert(
              t('sesOda.sehireGuc'),
              t('sesOda.sehireGucBody', {
                sehir: ozet.city_name,
                delta: ozet.last_delta,
                toplam: ozet.today_power,
              }),
            );
          }
        } catch {
          /* şehir opsiyonel */
        }
      })();
      void AnalyticsOlayEkle('gift_send', {
        gift_id: gift.id,
        room_id: room.id,
        quantity: adet,
      });
      setGiftOpen(false);
    });
  };

  // Spinner yok — tıklanınca sahne hemen açılsın; veri arka planda gelir
  if (!room) {
    if (loading) {
      return <Screen koyuSahne edges={['top']} />;
    }
    return (
      <Screen koyuSahne>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 80 }}>
          {t('sesOda.odaBulunamadi')}
        </Text>
      </Screen>
    );
  }


  return (
    <Screen koyuSahne edges={['top']}>
      <OdaSahneArkaPlan url={room.cover_url} themeCode={room.theme_code} />

      <SahipGirisAnimasyonu
        gorunur={!!sahipGiris}
        ad={sahipGiris?.ad ?? ''}
        avatarUrl={sahipGiris?.avatarUrl}
        onBitti={() => setSahipGiris(null)}
      />
      <SeviyeGirisAnimasyonu
        gorunur={!!seviyeGiris}
        ad={seviyeGiris?.ad ?? ''}
        level={seviyeGiris?.level ?? 0}
        kademe={seviyeGiris?.kademe ?? 'bronz'}
        avatarUrl={seviyeGiris?.avatarUrl}
        onBitti={seviyeGirisBitti}
      />

      {room && isModerator && !isDemo ? (
        <OdaKapakDuzenlePaneli
          visible={odaKartAcik}
          roomId={room.id}
          title={room.title}
          topic={room.topic}
          coverUrl={room.cover_url}
          themeCode={room.theme_code}
          layoutCode={room.layout_code}
          maxSeats={room.max_seats ?? (seats.length || 8)}
          doluKoltuk={seats.filter((s) => !!s.user_id).length}
          onClose={() => setOdaKartAcik(false)}
          onKaydedildi={(next) => {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    title: next.title,
                    topic: next.topic,
                    cover_url: next.cover_url,
                    theme_code: next.theme_code,
                    ...(next.layout_code !== undefined
                      ? { layout_code: next.layout_code }
                      : null),
                    ...(next.max_seats != null
                      ? { max_seats: next.max_seats }
                      : null),
                    ...(next.capacity_tier_code != null
                      ? { capacity_tier_code: next.capacity_tier_code }
                      : null),
                    ...(next.max_seats != null
                      ? { microphone_capacity: next.max_seats }
                      : null),
                  }
                : prev,
            );
            AktifSesOdasiGuncelle({ title: next.title });
            if (next.max_seats != null) {
              void fetchRoomSeats(room.id)
                .then((s) => {
                  setSeats((prev) => koltuklariUygula(prev, s));
                })
                .catch(() => undefined);
            }
          }}
        />
      ) : null}

      <OdaKatilimciAksiyonPaneli
        visible={!!katilimciMenu}
        onClose={() => setKatilimciMenu(null)}
        baslik={katilimciMenu?.baslik ?? ''}
        altBaslik={t('sesOda.aksiyonSec')}
        aksiyonlar={katilimciMenu?.aksiyonlar ?? []}
        onAksiyon={(a) => {
          const fn = katilimciAksiyonRef.current;
          setKatilimciMenu(null);
          fn?.(a);
        }}
      />

      <OdaBilgiPaneli
        visible={odaBilgiAcik}
        onClose={() => setOdaBilgiAcik(false)}
        room={room}
        hostAd={odaSahibi?.display_name ?? (isHost ? profile?.display_name : null)}
        hostUsername={
          odaSahibi?.username ?? (isHost ? profile?.username : null)
        }
        canCloseRoom={isHost && !isDemo}
        onOdayiKapat={odayiKaliciKapat}
      />

      <View style={styles.root}>
        {/* Klavye açıkken sahneye dokununca kapanır — alt kartın üstünde değil */}
        {klavyeAcik ? (
          <Pressable
            style={styles.klavyeKapatKatman}
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.klavyeyiKapat')}
          />
        ) : null}

        {/* SAHNE */}
        <View style={styles.stage} pointerEvents={klavyeAcik ? 'box-none' : 'auto'}>
          <OdaCanliAtmosfer yogunluk="kapali" themeCode={room.theme_code} />
          <View style={styles.topBar}>
            <View style={styles.topBarSol}>
              <OdaProfilCubugu
                displayName={
                  odaSahibi?.display_name ??
                  (isHost ? profile?.display_name : null) ??
                  t('sesOda.odaSahibi')
                }
                username={
                  odaSahibi?.username ?? (isHost ? profile?.username : null)
                }
                avatarUrl={
                  odaSahibi?.avatar_url ?? (isHost ? profile?.avatar_url : null)
                }
                level={odaSahibi?.level ?? (isHost ? profile?.level : null)}
                altEtiket={t('sesOda.odaSahibi')}
                onPress={odaSahibiKartAc}
              />
              {muzikFlag && muzikCalıyor && muzikSession?.track ? (
                <OdaMuzikPlak
                  title={muzikSession.track.title}
                  artistName={muzikSession.track.artist_name}
                  coverUrl={muzikSession.track.cover_url}
                  spinning={muzikSession.state === 'PLAYING'}
                />
              ) : null}
              {room.room_code ? (
                <Pressable
                  onPress={() => setOdaBilgiAcik(true)}
                  style={styles.odaNoPill}
                  accessibilityRole="button"
                  accessibilityLabel={t('sesOda.odaNumarasiA11y', { kod: room.room_code })}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={11}
                    color="rgba(255,224,138,0.85)"
                  />
                  <Text style={styles.odaNoYazi} numberOfLines={1}>
                    {room.room_code}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.topBarSpacer} />
            <View style={styles.topBarSag}>
              {muzikFlag ? (
                <OdaMuzikButonu
                  playing={muzikCalıyor}
                  onPress={() => setMuzikSheetAcik(true)}
                />
              ) : null}
              <ModulHataSiniri modulAdi="oda-dinleyici" varyant="kart">
                <OdaDinleyiciPaneli
                  roomId={room.id}
                  demoMi={isDemo}
                  currentUserId={user?.id}
                  koltukUserIds={koltukUserIds}
                  onProfil={profileZiyaretEt}
                  boyut="ust"
                  gosterButon={false}
                  acikDis={dinleyiciAcik}
                  onAcikChange={setDinleyiciAcik}
                />
              </ModulHataSiniri>
              <Pressable
                style={styles.livePill}
                accessibilityLabel={t('sesOda.canliDinleyici')}
                onPress={() => setDinleyiciAcik(true)}
              >
                <View
                  style={[
                    styles.liveDot,
                    /bagli|bağlı/i.test(lkDurum) && {
                      backgroundColor: colors.mint,
                    },
                  ]}
                />
                <Text style={styles.liveText}>{room.listener_count}</Text>
              </Pressable>
              {isModerator && !isDemo ? (
                <Pressable
                  onPress={() => setOdaKartAcik(true)}
                  style={styles.ustIconBtn}
                  accessibilityLabel={t('sesOda.odaKartiDuzenle')}
                  accessibilityRole="button"
                >
                  <Ionicons name="images-outline" size={18} color="#F0D78C" />
                </Pressable>
              ) : null}
              {!isDemo && room ? (
                <IcerikGuvenlikDugmesi
                  tur="room"
                  contentId={room.id}
                  roomId={room.id}
                  targetUserId={room.host_id}
                  title={room.title}
                  isGuest={isGuest}
                  varyant="ikon"
                />
              ) : null}
              <Pressable
                onPress={odadanCik}
                disabled={cikiyor}
                style={styles.ustIconBtn}
                accessibilityLabel={t('sesOda.odadanCik')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color="#F7F2E8" />
              </Pressable>
            </View>
          </View>

          <TamusoBanner placement="VOICE_ROOM_TOP" screen="VOICE_ROOM" compact />

          <ScrollView
            style={styles.seatsWrap}
            contentContainerStyle={styles.seatsContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={32}
          >
            <SesOdasiMikrofonDuzeni
              seats={seats}
              hostId={room.host_id}
              layoutCode={room.layout_code}
              onSeatPress={koltukTik}
              onSeatLongPress={koltukMenusu}
            />
          </ScrollView>

          {/* Yorumlar — canlı yayın gibi sahne üstünde şeffaf float */}
          {chatOpen && !isDemo && !oyunAktif ? (
            <View
              style={[
                styles.yorumFloat,
                { height: klavyeAcik ? 140 : 200 },
              ]}
              pointerEvents="box-none"
            >
              <ModulHataSiniri modulAdi="oda-sohbeti" varyant="kart">
                <OdaCanliYorumAkisi
                  roomId={room.id}
                  currentUserId={user?.id}
                  hostId={room.host_id}
                  moderatorMu={isModerator}
                  yenileSinyali={yorumYenile}
                  baslikGizle
                  floatMod
                  onProfil={yorumProfilAc}
                  gifts={gifts}
                />
              </ModulHataSiniri>
            </View>
          ) : null}

          {oyunlarAcik && !isDemo && !klavyeAcik ? (
            <View style={styles.oyunFab} pointerEvents="box-none">
              <OdaOyunDockButonu
                aktif={gameOpen}
                onPress={() =>
                  islemiDene('oyun_baslat', () => {
                    Keyboard.dismiss();
                    setGiftOpen(false);
                    void gorunurOyunlariYenile();
                    setGameOpen(true);
                  })
                }
              />
            </View>
          ) : null}

          {lastGift ? (
            <View style={styles.giftToast}>
              <Text style={styles.giftToastText}>{lastGift}</Text>
            </View>
          ) : null}
        </View>

        {/* ALT DOCK — canlı yayın gibi şeffaf; yorumlar sahnede float */}
        {!oyunAktif ? (
        <View
          style={[
            styles.altDock,
            {
              marginBottom: klavyeAcik ? klavyeH : 0,
              paddingBottom: Math.max(insets.bottom, 6),
            },
          ]}
        >
          {!isDemo && !chatOpen ? (
            <Pressable
              onPress={() => {
                setYorumUyari(0);
                setChatOpen(true);
              }}
              style={[
                styles.yorumAcChip,
                yorumUyari > 0 && styles.yorumAcChipUyari,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                yorumUyari > 0
                  ? `${t('sesOda.yorumlariGoster')} (${yorumUyari})`
                  : t('sesOda.yorumlariGoster')
              }
            >
              <View>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={yorumUyari > 0 ? '#fff' : colors.textMuted}
                />
                {yorumUyari > 0 ? (
                  <View style={styles.yorumUyariRozet}>
                    <Text style={styles.yorumUyariYazi}>
                      {yorumUyari > 9 ? '9+' : String(yorumUyari)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.yorumAcYazi,
                  yorumUyari > 0 && styles.yorumAcYaziUyari,
                ]}
              >
                {t('sesOda.yorumlar')}
              </Text>
            </Pressable>
          ) : chatOpen && !isDemo ? (
            <Pressable
              onPress={() => setChatOpen(false)}
              style={styles.yorumGizleChip}
              accessibilityRole="button"
              accessibilityLabel={t('canliYayin.a11yYorumlariGizle')}
              hitSlop={8}
            >
              <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.55)" />
            </Pressable>
          ) : null}

          <View style={styles.dockBolum}>
            {!isDemo ? (
              <View style={styles.composerSlot}>
                <OdaCanliYorumComposer
                  roomId={room.id}
                  canSend={!isGuest}
                  onNeedUpgrade={upgradeAc}
                  onFocus={() => {
                    if (!chatOpen) setChatOpen(true);
                  }}
                  onSent={() => {
                    setYorumYenile((n) => n + 1);
                    if (!chatOpen) setChatOpen(true);
                    Keyboard.dismiss();
                  }}
                />
              </View>
            ) : null}

            <View style={styles.controls}>
              <Pressable
                onPress={mikrofonToggle}
                style={[styles.controlBtn, !muted && styles.controlBtnAktif]}
                accessibilityLabel={muted ? t('sesOda.mikrofonuAc') : t('sesOda.mikrofonuKapat')}
                accessibilityRole="button"
              >
                <Ionicons
                  name={muted ? 'mic-off' : 'mic'}
                  size={ODA_DOCK_ICON}
                  color={muted ? colors.textMuted : colors.micOn}
                />
              </Pressable>

              <OdaSesHacmiButonu
                hacim={odaSesHacmi}
                onHacimDegisti={(h) => {
                  setOdaSesHacmi(h);
                  MedyaUzakSesHacmiAyarla(h);
                }}
              />

              {isModerator && !isDemo ? (
                <ModulHataSiniri modulAdi="mikrofon-istek" varyant="kart">
                  <MikrofonIstekPaneli
                    roomId={room.id}
                    onDegisti={() => {
                      void fetchRoomSeats(room.id)
                        .then((next) => {
                          setSeats((prev) => koltuklariUygula(prev, next));
                        })
                        .catch(() => undefined);
                    }}
                  />
                </ModulHataSiniri>
              ) : null}

              {!klavyeAcik ? (
                <Pressable
                  onPress={() =>
                    islemiDene('hediye_gonder', () => {
                      setGiftOpen((v) => !v);
                    })
                  }
                  style={styles.giftBtn}
                  accessibilityLabel={t('sesOda.hediyeGonder')}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={[...colors.gradientPrimary]}
                    style={styles.giftBtnInner}
                  >
                    <Ionicons name="gift" size={ODA_DOCK_ICON} color="#fff" />
                  </LinearGradient>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
        ) : null}

        {oyunlarAcik && room && user ? (
          <View
            pointerEvents="box-none"
            collapsable={false}
            style={styles.oyunOverlay}
          >
            <ModulHataSiniri modulAdi="oyunlar" varyant="kart">
              <OyunOdaLazyKatmani
                aktif={oyunAktif}
                roomMeta={{
                  roomId: room.id,
                  roomName: room.title ?? t('sesOda.sesOdasi'),
                  participantCount: seats.filter((s) => s.user_id).length,
                  micEnabled: !muted,
                }}
                isHost={isHost}
                selfUserId={user.id}
                hostDisplayName={
                  odaSahibi?.display_name ??
                  odaSahibi?.username ??
                  room.host_id?.slice(0, 8) ??
                  t('sesOda.kurucu')
                }
                startModalVisible={gameOpen}
                onStartModalClose={() => setGameOpen(false)}
                onGameStarted={() => setOyunMonteli(true)}
                onOverlayClosed={() => {
                  setGameOpen(false);
                  setOyunMonteli(false);
                  setBalonOyunKodu(null);
                  router.setParams({ oyun: undefined } as any);
                }}
                visibleGameCodes={gorunurOyunKodlari}
                initialGameCode={balonOyunKodu}
              />
            </ModulHataSiniri>
          </View>
        ) : null}
      </View>

      <ModulHataSiniri modulAdi="hediyeler" varyant="kart">
        <HediyeMagazaPaneli
          visible={giftOpen}
          gifts={gifts}
          coins={wallet?.coins}
          aliciAdi={
            hediyeAlicilari
              .filter((a) => hediyeAliciIdler.includes(a.id))
              .map((a) => a.ad)
              .join(', ') || null
          }
          pkAlicilar={hediyeAlicilari.length > 0 ? hediyeAlicilari : undefined}
          seciliAliciIdler={hediyeAliciIdler}
          onPkAliciSec={hediyeAliciToggle}
          onSend={onSendGift}
          onClose={() => setGiftOpen(false)}
          coinPackages={coinYukle.packages}
          coinLocked={coinYukle.purchaseLocked}
          onCoinBuy={coinYukle.satinAl}
          onCoinPaketHazirla={coinYukle.paketleriYenile}
        />
      </ModulHataSiniri>

      {muzikFlag && room && !isDemo ? (
        <OdaMuzikKutuphanesiSheet
          visible={muzikSheetAcik}
          canManage={muzikYonetebilir}
          session={muzikSession}
          onClose={() => setMuzikSheetAcik(false)}
          onSelect={async (trackId) => {
            const ok = await muzikKomut((v) =>
              RoomMusicSet(room.id, trackId, v),
            );
            if (ok) setMuzikSheetAcik(false);
          }}
          onQueue={async (trackId) => {
            try {
              const next = await RoomMusicQueueAdd(room.id, trackId);
              await muzikSessionUygula(next);
              if (next.state !== 'PLAYING' && next.state !== 'PAUSED') {
                await muzikKomut((v) => RoomMusicSkip(room.id, 1, v));
              }
            } catch {
              await muzikYenile();
            }
          }}
          onPause={() => {
            void muzikKomut((v) =>
              RoomMusicPause(room.id, OdaMuzikPozisyonMs(), v),
            );
          }}
          onResume={() => {
            void muzikKomut((v) => RoomMusicResume(room.id, v));
          }}
          onPrev={() => {
            void muzikKomut((v) => RoomMusicSkip(room.id, -1, v));
          }}
          onNext={() => {
            const sirada = (muzikSession?.queue?.length ?? 0) > 0;
            void muzikKomut((v) =>
              sirada
                ? RoomMusicSkip(room.id, 1, v)
                : RoomMusicStop(room.id, v),
            );
          }}
          onStop={() => {
            void muzikKomut((v) => RoomMusicStop(room.id, v));
          }}
          onSeek={(positionMs) => {
            void muzikKomut((v) => RoomMusicSeek(room.id, positionMs, v));
          }}
          onVolume={(volume) => {
            void muzikKomut((v) => RoomMusicSetVolume(room.id, volume, v));
          }}
        />
      ) : null}

      <CoinYuklePaneli
        visible={coinYukle.acik}
        packages={coinYukle.packages}
        locked={coinYukle.purchaseLocked}
        coins={wallet?.coins}
        onBuy={coinYukle.satinAl}
        onClose={coinYukle.kapat}
        upgradeAcik={coinYukle.upgradeAcik}
        upgradeKapat={coinYukle.upgradeKapat}
        onPaketleriYenile={coinYukle.paketleriYenile}
      />

      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={upgradeKapat}
        onCompleted={() => {
          void refreshProfile();
          void refreshWallet();
        }}
      />
      <HediyeAnimasyonKatmani />

      <TamusoBanner placement="VOICE_ROOM_BOTTOM" screen="VOICE_ROOM" compact />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
    position: 'relative',
  },
  stage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  klavyeKapatKatman: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  seatsWrap: {
    flex: 1,
    minHeight: 0,
    zIndex: 2,
  },
  seatsContent: {
    paddingTop: 4,
    paddingBottom: 28,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 6,
    flexShrink: 0,
    zIndex: 3,
  },
  topBarSol: {
    flexShrink: 1,
    maxWidth: 180,
  },
  topBarSpacer: {
    flex: 1,
    minWidth: 4,
  },
  odaNoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 6,
    maxWidth: 168,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 180, 41, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240, 180, 41, 0.35)',
  },
  odaNoYazi: {
    ...typography.caption,
    color: '#FFE08A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  topBarSag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  ustIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 64, 145, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.4)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
  },
  liveText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
  giftToast: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(232, 64, 145, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.4)',
    flexShrink: 0,
    zIndex: 4,
  },
  giftToastText: { ...typography.body, color: colors.text, fontWeight: '700' },
  oyunFab: {
    position: 'absolute',
    right: Platform.OS === 'android' ? 10 : 14,
    bottom: 10,
    zIndex: 12,
    elevation: 12,
    // Kaydırmayı engellemesin — sadece buton alanı
    pointerEvents: 'box-none',
  },
  oyunOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 400,
    elevation: 400,
  },
  altDock: {
    flexShrink: 0,
    backgroundColor: 'transparent',
    zIndex: 50,
    elevation: 50,
  },
  yorumFloat: {
    position: 'absolute',
    left: 8,
    bottom: 4,
    width: '78%',
    maxWidth: 340,
    zIndex: 8,
    elevation: 8,
  },
  yorumAcChip: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  yorumAcChipUyari: {
    borderColor: 'rgba(255,80,100,0.55)',
    backgroundColor: 'rgba(180,30,50,0.35)',
  },
  yorumGizleChip: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 2,
    width: 28,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  yorumAcYazi: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  yorumAcYaziUyari: {
    color: '#fff',
    fontWeight: '700',
  },
  yorumUyariRozet: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: '#FF3B5C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  yorumUyariYazi: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
  dockBolum: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
    zIndex: 90,
    elevation: 90,
  },
  composerSlot: {
    flex: 1,
    minWidth: 100,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  controlBtn: {
    width: ODA_DOCK_BTN,
    height: ODA_DOCK_BTN,
    borderRadius: ODA_DOCK_BTN / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    flexShrink: 0,
  },
  controlBtnAktif: {
    borderColor: 'rgba(61, 207, 176, 0.45)',
    backgroundColor: 'rgba(61, 207, 176, 0.16)',
  },
  giftBtn: {
    width: ODA_DOCK_BTN,
    height: ODA_DOCK_BTN,
    borderRadius: ODA_DOCK_BTN / 2,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 64, 145, 0.4)',
  },
  giftBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
