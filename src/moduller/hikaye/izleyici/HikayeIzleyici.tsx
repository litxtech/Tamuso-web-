import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { useHediyeMagaza } from '../../hediyeler/islemler/useHediyeMagaza';
import { HediyeMagazaBaglamasi } from '../../hediyeler/bilesenler/HediyeMagazaBaglamasi';
import {
  MesajGonder,
  OzelSohbetAcVeyaGetir,
} from '../../mesajlasma/islemler/MesajGonder';
import { KullaniciGuvenlikMenusu } from '../../moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import type { HikayeGrup, HikayeOgesi, HikayeOverlay } from '../tipler';
import { HIKAYE_EFEKTLER, HIKAYE_MUZIK_KLIP_MS, type HikayeEfektId } from '../sabitler';
import {
  HikayeGoruntulemeKaydet,
  HikayeSessizeAl,
  HikayeSilOge,
  HikayeTepki,
} from '../islemler/HikayeIslemleri';
import { HikayeAnalitik } from '../islemler/HikayeAnalitik';
import { AnalyticsOlayEkle } from '../../guvenlik/analytics/AnalyticsOlayEkle';
import { CanliKesitKatil } from '../../canli-kesit/CanliKesitKatil';
import { HikayeOgeSuresiMs, HikayeZamanMetni } from '../islemler/HikayeZaman';
import { HikayeSuruklenebilirMetin } from '../besteci/HikayeSuruklenebilirMetin';
import { HikayeIlerlemeCubugu } from './HikayeIlerlemeCubugu';
import { HikayeYanitCubugu } from './HikayeYanitCubugu';
import { HikayeTepkiSeridi } from './HikayeTepkiSeridi';
import { HikayeMenuSheet } from './HikayeMenuSheet';
import { HikayeGoruntuleyenlerSheet } from './HikayeGoruntuleyenlerSheet';
import { HikayeMuzikCubugu } from './HikayeMuzikCubugu';
import { useKlavyeYuksekligi } from '../../../bilesenler/klavye/useKlavyeYuksekligi';

const { width: EKRAN_W, height: EKRAN_H } = Dimensions.get('window');

function hikayeYanitMetni(oge: HikayeOgesi): string | null {
  const overlay = oge.overlays?.find(
    (o) => o.type === 'text' && typeof o.text === 'string' && o.text.trim(),
  );
  const metin = overlay?.text?.trim() || oge.caption?.trim() || '';
  return metin || null;
}

function efektTintAl(oge: HikayeOgesi): string | null {
  const stil = oge.text_style;
  const id =
    stil && typeof stil.effect_id === 'string'
      ? (stil.effect_id as HikayeEfektId)
      : 'none';
  return HIKAYE_EFEKTLER.find((e) => e.id === id)?.tint ?? null;
}

function muzikOverlayAl(overlays: HikayeOverlay[] | null) {
  const m = overlays?.find((o) => o.type === 'music');
  if (!m?.ref_id) return null;
  const meta = (m.meta ?? {}) as Record<string, unknown>;
  return {
    track_id: m.ref_id,
    title:
      typeof meta.title === 'string'
        ? meta.title
        : typeof m.text === 'string'
          ? m.text
          : 'Music',
    cover_url: typeof meta.cover_url === 'string' ? meta.cover_url : null,
    audio_url: typeof meta.audio_url === 'string' ? meta.audio_url : null,
    artist_name:
      typeof meta.artist_name === 'string' ? meta.artist_name : null,
    clip_start_ms:
      typeof meta.clip_start_ms === 'number' ? meta.clip_start_ms : 0,
    clip_duration_ms:
      typeof meta.clip_duration_ms === 'number'
        ? meta.clip_duration_ms
        : null,
  };
}

function linkOverlayAl(
  overlays: HikayeOverlay[] | null,
  attachment?: Record<string, unknown> | null,
) {
  const l = overlays?.find((o) => o.type === 'link');
  const urlFromOverlay =
    (typeof l?.url === 'string' && l.url) ||
    (typeof l?.meta?.url === 'string' ? String(l.meta.url) : null);
  if (urlFromOverlay) {
    const label =
      l?.text ||
      (typeof l?.meta?.label === 'string' ? String(l.meta.label) : urlFromOverlay);
    return { url: urlFromOverlay, label };
  }

  if (attachment && attachment.type === 'link') {
    const url =
      (typeof attachment.url === 'string' && attachment.url) ||
      (typeof attachment.ref_id === 'string' &&
      /^https?:\/\//i.test(attachment.ref_id)
        ? attachment.ref_id
        : null) ||
      (typeof attachment.label === 'string' &&
      /^https?:\/\//i.test(String(attachment.label))
        ? String(attachment.label)
        : null);
    if (url) {
      const label =
        (typeof attachment.label === 'string' && attachment.label) ||
        (typeof attachment.text === 'string' && attachment.text) ||
        url;
      return { url, label: String(label) };
    }
  }
  return null;
}

function paylasimRozetAl(
  overlays: HikayeOverlay[] | null,
  attachment?: Record<string, unknown> | null,
): {
  kind: string;
  title: string;
  subtitle?: string | null;
} | null {
  const shared =
    overlays?.find((o) => o.type.startsWith('shared_')) ??
    (attachment &&
    typeof attachment.type === 'string' &&
    String(attachment.type).startsWith('shared_')
      ? ({
          type: attachment.type,
          text:
            typeof attachment.text === 'string' ? attachment.text : undefined,
          meta: attachment,
        } as HikayeOverlay)
      : null);
  if (!shared) return null;

  const meta = (shared.meta ?? {}) as Record<string, unknown>;
  const postKind =
    typeof meta.post_kind === 'string' ? meta.post_kind : null;
  const payload =
    meta.payload && typeof meta.payload === 'object'
      ? (meta.payload as Record<string, unknown>)
      : null;

  if (postKind === 'game_win' || payload?.game_title) {
    const title =
      (typeof payload?.game_title === 'string' && payload.game_title) ||
      'Oyun';
    const win = Number(payload?.total_win ?? 0);
    return {
      kind: 'game_win',
      title,
      subtitle: win > 0 ? `+${Math.round(win)}` : null,
    };
  }

  if (shared.type === 'shared_post') {
    return {
      kind: 'shared_post',
      title: shared.text || 'Gönderi',
      subtitle: null,
    };
  }
  if (shared.type === 'shared_profile') {
    return { kind: 'shared_profile', title: shared.text || 'Profil', subtitle: null };
  }
  if (shared.type === 'shared_room') {
    return { kind: 'shared_room', title: shared.text || 'Oda', subtitle: null };
  }
  if (shared.type === 'shared_live') {
    return { kind: 'shared_live', title: shared.text || 'Canlı', subtitle: null };
  }
  if (shared.type === 'shared_agency') {
    return { kind: 'shared_agency', title: shared.text || 'Ajans', subtitle: null };
  }
  return null;
}

function kesitKaynagi(attachment?: Record<string, unknown> | null): {
  liveId: string | null;
  pkId: string | null;
  pk: boolean;
} | null {
  if (!attachment) return null;
  const kaynak = attachment.source_type;
  if (kaynak !== 'live' && kaynak !== 'pk') return null;
  const liveId = typeof attachment.ref_id === 'string' ? attachment.ref_id : null;
  const pkId =
    typeof attachment.source_pk_id === 'string' ? attachment.source_pk_id : null;
  return { liveId, pkId, pk: kaynak === 'pk' };
}

type Props = {
  grup: HikayeGrup;
  baslangicIndex?: number;
  onBitti?: () => void;
  onKapat?: () => void;
};

function HikayeVideo({
  uri,
  posterUri,
  paused,
  muted = false,
  trimStartSn = 0,
  trimEndSn = null,
  onHazir,
}: {
  uri: string;
  posterUri?: string | null;
  paused: boolean;
  muted?: boolean;
  trimStartSn?: number;
  trimEndSn?: number | null;
  onHazir?: () => void;
}) {
  const [posterGoster, setPosterGoster] = useState(true);
  const hazirBildirildi = useRef(false);
  const trimBasRef = useRef(trimStartSn);
  const trimBitRef = useRef(trimEndSn);
  trimBasRef.current = trimStartSn;
  trimBitRef.current = trimEndSn;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
    try {
      p.volume = muted ? 0 : 1;
    } catch {
      /* */
    }
    try {
      p.currentTime = Math.max(0, trimStartSn);
    } catch {
      /* */
    }
    p.play();
  });

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = muted ? 0 : 1;
    } catch {
      /* */
    }
  }, [muted, player]);

  // Yalnızca medya/trim değişince seek — paused toggle başa sarmamalı
  useEffect(() => {
    setPosterGoster(true);
    hazirBildirildi.current = false;
    try {
      player.currentTime = Math.max(0, trimStartSn);
      if (!paused) player.play();
    } catch {
      /* */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paused kasıtlı değil
  }, [uri, trimStartSn, player]);

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setPosterGoster(false);
        // İlk hazırlıkta trim başlangıcına al; resume'da currentTime korunsun
        if (!hazirBildirildi.current) {
          try {
            player.currentTime = Math.max(0, trimBasRef.current);
          } catch {
            /* */
          }
          hazirBildirildi.current = true;
          onHazir?.();
        }
      }
      if (status === 'error') {
        setPosterGoster(false);
        if (!hazirBildirildi.current) {
          hazirBildirildi.current = true;
          onHazir?.();
        }
      }
    });
    try {
      if (player.status === 'readyToPlay') {
        setPosterGoster(false);
        if (!hazirBildirildi.current) {
          hazirBildirildi.current = true;
          onHazir?.();
        }
      }
    } catch {
      /* */
    }
    return () => {
      try {
        sub.remove();
      } catch {
        /* */
      }
    };
  }, [player, onHazir, uri]);

  useEffect(() => {
    try {
      if (paused) player.pause();
      else player.play();
    } catch {
      /* native hazır değil */
    }
  }, [paused, player]);

  // Trim bitişinde story ilerleme zaten sonrakiye geçer; aşmayı kes
  useEffect(() => {
    const id = setInterval(() => {
      const bit = trimBitRef.current;
      if (bit == null) return;
      try {
        if (Number(player.currentTime ?? 0) >= bit - 0.05) {
          player.pause();
        }
      } catch {
        /* */
      }
    }, 200);
    return () => clearInterval(id);
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {posterUri && posterGoster ? (
        <Image
          source={{ uri: posterUri }}
        style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {posterGoster && !posterUri ? (
        <View style={styles.medyaYukle}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

export function HikayeIzleyici({
  grup,
  baslangicIndex = 0,
  onBitti,
  onKapat,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { yukseklik: klavyeY, acik: klavyeAcik } = useKlavyeYuksekligi();
  const hediye = useHediyeMagaza();
  const [items, setItems] = useState(grup.items);
  const [index, setIndex] = useState(
    Math.max(0, Math.min(baslangicIndex, Math.max(0, grup.items.length - 1))),
  );
  const [ilerleme, setIlerleme] = useState(0);
  const [duraklat, setDuraklat] = useState(false);
  const [yanitOdak, setYanitOdak] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const [izleyicilerAcik, setIzleyicilerAcik] = useState(false);
  const [bildirAcik, setBildirAcik] = useState(false);
  const [tepkiGoster, setTepkiGoster] = useState(false);
  /** Medya hazır olana kadar progress ilerlemesin — siyah ekran hissini keser */
  const [medyaHazir, setMedyaHazir] = useState(false);
  /** OS arka plan → duraklat; öne gelince sheet açık değilse kaldığı yerden devam */
  const arkaPlandaRef = useRef(false);
  const uiBlokeRef = useRef(false);

  useEffect(() => {
    uiBlokeRef.current =
      menuAcik || izleyicilerAcik || bildirAcik || hediye.acik;
  }, [menuAcik, izleyicilerAcik, bildirAcik, hediye.acik]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active') {
        arkaPlandaRef.current = true;
        setDuraklat(true);
        return;
      }
      if (!arkaPlandaRef.current) return;
      arkaPlandaRef.current = false;
      if (!uiBlokeRef.current) {
        setDuraklat(false);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setItems(grup.items);
    setIndex((i) =>
      Math.max(0, Math.min(i, Math.max(0, grup.items.length - 1))),
    );
  }, [grup.items]);

  const oge: HikayeOgesi | undefined = items[index];
  const muzik = useMemo(
    () => (oge ? muzikOverlayAl(oge.overlays) : null),
    [oge],
  );
  const videoTrim = useMemo(() => {
    if (!oge || oge.media_type !== 'video') return null;
    const stil = oge.text_style;
    const start =
      stil && typeof stil.video_trim_start_ms === 'number'
        ? stil.video_trim_start_ms
        : 0;
    const end =
      stil && typeof stil.video_trim_end_ms === 'number'
        ? stil.video_trim_end_ms
        : null;
    if (end == null && !(oge.duration_ms > 0)) return { startMs: 0, endMs: null as number | null };
    return {
      startMs: Math.max(0, start),
      endMs:
        end != null
          ? end
          : start + Math.max(500, oge.duration_ms || 0),
    };
  }, [oge]);
  const sureMs = useMemo(() => {
    if (!oge) return 5000;
    // Video: kırpılmış süre (sunucu duration_ms = trim uzunluğu)
    if (oge.media_type === 'video') {
      if (videoTrim?.endMs != null && videoTrim.endMs > videoTrim.startMs) {
        return Math.max(500, videoTrim.endMs - videoTrim.startMs);
      }
      return HikayeOgeSuresiMs('video', oge.duration_ms);
    }
    // Metin/görsel + müzik → 15 sn
    if (muzik) {
      return muzik.clip_duration_ms || HIKAYE_MUZIK_KLIP_MS;
    }
    return HikayeOgeSuresiMs(oge.media_type, oge.duration_ms);
  }, [oge, muzik, videoTrim]);
  const efektTint = useMemo(
    () => (oge ? efektTintAl(oge) : null),
    [oge],
  );
  const link = useMemo(
    () => (oge ? linkOverlayAl(oge.overlays, oge.attachment) : null),
    [oge],
  );
  const paylasimRozet = useMemo(
    () => (oge ? paylasimRozetAl(oge.overlays, oge.attachment) : null),
    [oge],
  );
  const kesit = oge ? kesitKaynagi(oge.attachment) : null;
  const kesitGoruldu = useRef<string | null>(null);
  useEffect(() => {
    if (!oge || !kesit || kesitGoruldu.current === oge.id) return;
    kesitGoruldu.current = oge.id;
    void AnalyticsOlayEkle('live_clip_story_viewed', {
      item_id: oge.id,
      live_id: kesit.liveId,
      pk_id: kesit.pkId,
    });
  }, [oge, kesit]);
  const metinOverlays = useMemo(
    () => (oge?.overlays ?? []).filter((o) => o.type === 'text'),
    [oge],
  );
  const [canvasSize, setCanvasSize] = useState({
    w: EKRAN_W - 16,
    h: EKRAN_H * 0.75,
  });
  const canvasSizeW = canvasSize.w;
  const canvasSizeH = canvasSize.h;


  const kaydedilen = useRef<Set<string>>(new Set());
  const scale = useSharedValue(1);

  // Sonraki görseli prefetch — siyah flash azalt
  useEffect(() => {
    const sonrakiOge = items[index + 1];
    const url = sonrakiOge?.thumbnail_url || sonrakiOge?.media_url;
    if (sonrakiOge?.media_type === 'image' && url) {
      void Image.prefetch(url).catch(() => undefined);
    }
    // Aktif görsel de ısıt
    if (oge?.media_type === 'image' && oge.media_url) {
      void Image.prefetch(oge.media_url).catch(() => undefined);
    }
  }, [index, items, oge?.media_url, oge?.media_type]);

  const medyaHazirOl = useCallback(() => {
    setMedyaHazir(true);
  }, []);
  const translateY = useSharedValue(0);

  const kapat = useCallback(() => {
    onKapat?.();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  }, [onKapat]);

  const sonraki = useCallback(() => {
    setIlerleme(0);
    setIndex((i) => {
      if (i >= items.length - 1) {
        queueMicrotask(() => {
          if (onBitti) onBitti();
          else kapat();
        });
        return i;
      }
      return i + 1;
    });
  }, [items.length, onBitti, kapat]);

  const onceki = useCallback(() => {
    setIlerleme(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Görüntüleme kaydı — görünürlük eşiği (~300ms); tepsi render'ı sayılmaz
  useEffect(() => {
    if (!oge) return;
    HikayeAnalitik('story_view_start', { media_type: oge.media_type });
    if (kaydedilen.current.has(oge.id)) return;
    const timer = setTimeout(() => {
      if (kaydedilen.current.has(oge.id)) return;
      kaydedilen.current.add(oge.id);
      void HikayeGoruntulemeKaydet(oge.id);
    }, 300);
    return () => clearTimeout(timer);
  }, [oge?.id]);

  // İlerleme tick — medya hazır değilse bekle (siyah ekranda süre akmasın)
  useEffect(() => {
    if (
      !oge ||
      !medyaHazir ||
      duraklat ||
      klavyeAcik ||
      yanitOdak ||
      menuAcik ||
      izleyicilerAcik ||
      bildirAcik ||
      hediye.acik
    ) {
      return;
    }
    const basla = Date.now() - ilerleme * sureMs;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - basla) / sureMs);
      setIlerleme(p);
      if (p >= 1) {
        clearInterval(id);
        HikayeAnalitik('story_view_complete');
        sonraki();
      }
    }, 50);
    return () => clearInterval(id);
    // ilerleme kasıtlı bağımlılık değil — tick kendi state’ini sürdürür
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    oge?.id,
    sureMs,
    medyaHazir,
    duraklat,
    klavyeAcik,
    yanitOdak,
    menuAcik,
    izleyicilerAcik,
    bildirAcik,
    hediye.acik,
    sonraki,
  ]);

  // Yeni oge → ilerleme sıfır; text hemen hazır
  useEffect(() => {
    setIlerleme(0);
    setTepkiGoster(false);
    if (!oge) {
      setMedyaHazir(false);
      return;
    }
    if (oge.media_type === 'text' || !oge.media_url) {
      setMedyaHazir(true);
      return;
    }
    setMedyaHazir(false);
    if (oge.media_type === 'image') {
      const t = setTimeout(() => setMedyaHazir(true), 1200);
      return () => clearTimeout(t);
    }
  }, [oge?.id]);

  const yanitGonder = useCallback(
    async (metin: string) => {
      if (!oge) return;
      const sohbet = await OzelSohbetAcVeyaGetir(grup.user_id);
      if (!sohbet.ok) {
        Alert.alert(t('ortak.hata'), sohbet.hata);
        return;
      }
      const gorselUrl = oge.media_type === 'image' ? oge.media_url : null;
      const videoUrl = oge.media_type === 'video' ? oge.media_url : null;
      const onizleme =
        oge.thumbnail_url ||
        gorselUrl ||
        null;
      const msg = await MesajGonder({
        threadId: sohbet.threadId,
        body: metin,
        messageType: 'text',
        mediaUrl: videoUrl || gorselUrl,
        mediaMeta: {
          type: 'story_reply',
          story_id: oge.story_id,
          story_item_id: oge.id,
          story_media_type: oge.media_type,
          thumbnail_url: onizleme,
          background_color: oge.background_color,
          story_text: hikayeYanitMetni(oge),
          owner_name: grup.display_name,
        },
      });
      if (!msg.ok) {
        Alert.alert(t('ortak.hata'), msg.hata);
        return;
      }
      HikayeAnalitik('story_reply');
    },
    [oge, grup.user_id, grup.display_name, t],
  );

  const tepkiVer = useCallback(
    async (emoji: string) => {
      if (!oge) return;
      const r = await HikayeTepki(oge.id, emoji);
      if (!r.ok) {
        Alert.alert(t('ortak.hata'), r.hata);
        return;
      }
      HikayeAnalitik('story_react');
      setTepkiGoster(false);
    },
    [oge, t],
  );

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(setDuraklat)(true);
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(e.scale, 3));
    })
    .onEnd(() => {
      scale.value = withTiming(1);
      runOnJS(setDuraklat)(false);
    });

  const longPress = Gesture.LongPress()
    .minDuration(180)
    .maxDistance(14)
    .onStart(() => {
      runOnJS(setDuraklat)(true);
    })
    .onFinalize(() => {
      runOnJS(setDuraklat)(false);
    });

  const goruntuleyenleriAc = useCallback(() => {
    if (!grup.is_mine) return;
    setDuraklat(true);
    setIzleyicilerAcik(true);
  }, [grup.is_mine]);

  // Sadece dikey sürüklemede aktif — tıklamayı engellemez
  const pan = Gesture.Pan()
    .activeOffsetY([-28, 28])
    .failOffsetX([-36, 36])
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 110) {
        runOnJS(kapat)();
        return;
      }
      if (e.translationY < -70) {
        translateY.value = withTiming(0);
        runOnJS(goruntuleyenleriAc)();
        return;
      }
      translateY.value = withTiming(0);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(16)
    .onEnd(() => {
      runOnJS(setTepkiGoster)(true);
    });

  // Çift tık başarısız olunca tek tık (önceki/sonraki)
  const tap = Gesture.Tap()
    .enabled(Platform.OS !== 'web')
    .maxDistance(16)
    .requireExternalGestureToFail(doubleTap)
    .onEnd((e) => {
      if (e.x < EKRAN_W * 0.35) runOnJS(onceki)();
      else runOnJS(sonraki)();
    });

  const composed = Gesture.Simultaneous(
    pinch,
    pan,
    longPress,
    Gesture.Exclusive(doubleTap, tap),
  );

  const medyaStil = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  if (!oge) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ModulHataSiniri modulAdi="hikaye-izleyici">
      <View style={styles.root}>
        <View
          style={[
            styles.kartWrap,
            {
              paddingTop: Math.max(insets.top, 8),
              paddingBottom: Math.max(insets.bottom, 8) + 58,
            },
          ]}
        >
          <GestureDetector gesture={composed}>
            <Animated.View
              style={[styles.kart, medyaStil]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setCanvasSize({ w: width, h: height });
                }
              }}
            >
              {oge.media_type === 'video' && oge.media_url ? (
                <HikayeVideo
                  key={`${oge.id}-${muzik ? 'm' : 'v'}`}
                  uri={oge.media_url}
                  posterUri={oge.thumbnail_url}
                  paused={duraklat || klavyeAcik || yanitOdak}
                  muted={!!muzik}
                  trimStartSn={(videoTrim?.startMs ?? 0) / 1000}
                  trimEndSn={
                    videoTrim?.endMs != null ? videoTrim.endMs / 1000 : null
                  }
                  onHazir={medyaHazirOl}
                />
              ) : oge.media_type === 'text' || !oge.media_url ? (
                <View
                  style={[
                    styles.metinSahne,
                    {
                      backgroundColor:
                        oge.background_color ?? RenkTokenlari.deepPlum,
                    },
                  ]}
                >
                  {metinOverlays.length === 0 ? (
                    <Text style={styles.metinBuyuk}>{oge.caption ?? ''}</Text>
                  ) : null}
                </View>
              ) : (
                <Image
                  source={{ uri: oge.media_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  onLoad={medyaHazirOl}
                  onError={medyaHazirOl}
                />
              )}

              {efektTint ? (
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: efektTint },
                  ]}
                />
              ) : null}

              {/* Üst okunabilirlik — Snapchat tarzı soft gölge */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.12)', 'transparent']}
                locations={[0, 0.45, 1]}
                style={styles.ustGradient}
              />

              <View style={styles.kartUst} pointerEvents="box-none">
                <HikayeIlerlemeCubugu
                  adet={items.length}
                  aktifIndex={index}
                  ilerleme={ilerleme}
                  duraklatildi={duraklat || klavyeAcik || yanitOdak}
                />
                <View style={styles.ustBar}>
                  <Pressable
                    style={styles.profil}
                    onPress={() =>
                      router.push(`/kullanici/${grup.user_id}` as any)
                    }
                  >
                    {grup.avatar_url ? (
                      <Image
                        source={{ uri: grup.avatar_url }}
                        style={styles.miniAvatar}
                      />
                    ) : (
                      <View style={[styles.miniAvatar, styles.avatarBos]} />
                    )}
                    <View style={styles.profilMetin}>
                      <Text style={styles.ad} numberOfLines={1}>
                        {grup.display_name}
                      </Text>
                      <Text style={styles.zaman}>
                        {HikayeZamanMetni(oge.created_at)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={kapat}
                    hitSlop={12}
                    style={styles.kapatBtn}
                    accessibilityLabel={t('ortak.kapat')}
                  >
                    <Ionicons name="close" size={26} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {metinOverlays.map((o, i) => (
                <HikayeSuruklenebilirMetin
                  key={`ov-${oge.id}-${i}`}
                  overlay={o}
                  canvasW={canvasSizeW}
                  canvasH={canvasSizeH}
                  draggable={false}
                />
              ))}

              {paylasimRozet ? (
                <View style={styles.paylasimRozet} pointerEvents="none">
                  <Ionicons
                    name={
                      paylasimRozet.kind === 'game_win'
                        ? 'trophy-outline'
                        : paylasimRozet.kind === 'shared_live'
                          ? 'radio-outline'
                          : 'share-outline'
                    }
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.paylasimBaslik} numberOfLines={1}>
                    {kesit
                      ? t(kesit.pk ? 'canliYayin.kesitPk' : 'canliYayin.kesitRozet')
                      : paylasimRozet.title}
                  </Text>
                  {paylasimRozet.subtitle ? (
                    <Text style={styles.paylasimAlt} numberOfLines={1}>
                      {paylasimRozet.subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {kesit ? (
                <CanliKesitKatil
                  liveId={kesit.liveId}
                  pkId={kesit.pkId}
                  pk={kesit.pk}
                />
              ) : null}

              {oge.caption && oge.media_type !== 'text' ? (
                <View style={styles.captionWrap} pointerEvents="none">
                  <Text style={styles.caption}>{oge.caption}</Text>
                </View>
              ) : null}

              {link ? (
                <Pressable
                  style={[styles.linkRozet, muzik ? styles.linkRozetUst : null]}
                  onPress={() => {
                    void Linking.openURL(link.url).catch(() => undefined);
                  }}
                >
                  <Ionicons name="link" size={14} color="#fff" />
                  <Text style={styles.linkYazi} numberOfLines={1}>
                    {link.label}
                  </Text>
                </Pressable>
              ) : null}

              {muzik ? (
                <View style={styles.muzikKartIci} pointerEvents="box-none">
                  <HikayeMuzikCubugu
                    music={muzik}
                    paused={duraklat || klavyeAcik || yanitOdak}
                  />
                </View>
              ) : null}
              {Platform.OS === 'web' ? (
                <View style={styles.webDokunus} pointerEvents="box-none">
                  <Pressable style={styles.webSol} onPress={onceki} />
                  <Pressable style={styles.webSag} onPress={sonraki} />
                </View>
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>

        <View
          style={[
            styles.alt,
            {
              bottom: klavyeY,
              paddingBottom: klavyeY > 0 ? 8 : Math.max(insets.bottom, 6),
            },
          ]}
        >
          {tepkiGoster ? (
            <HikayeTepkiSeridi
              onSec={(e) => void tepkiVer(e)}
              secili={oge.my_reaction}
            />
          ) : null}
          {grup.is_mine ? (
            <View style={styles.sahipAlt}>
              <Pressable
                style={styles.izleyiciBtn}
                onPress={() => {
                  setDuraklat(true);
                  setIzleyicilerAcik(true);
                }}
              >
                <Ionicons name="chevron-up" size={16} color="#fff" />
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.izleyiciYazi}>
                  {t('hikaye.goruntulemeSayisi', {
                    n: oge.view_count || grup.view_count || 0,
                  })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMenuAcik(true)}
                style={styles.menuBtn}
                hitSlop={10}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <HikayeYanitCubugu
              onGonder={yanitGonder}
              onOdak={setYanitOdak}
              onHediye={() => {
                HikayeAnalitik('story_gift_open');
                hediye.ac({
                  receiverId: grup.user_id,
                  aliciAdi: grup.display_name,
                });
              }}
              onMenu={() => setMenuAcik(true)}
            />
          )}
        </View>

        <HikayeMenuSheet
          visible={menuAcik}
          isMine={grup.is_mine}
          onClose={() => setMenuAcik(false)}
          onGoruntuleyenler={() => setIzleyicilerAcik(true)}
          onArsiv={() => router.push('/hikaye/arsiv' as any)}
          onSil={() => {
            void (async () => {
              if (!oge) return;
              const silinecekId = oge.id;
              const silIndex = index;
              const r = await HikayeSilOge(silinecekId);
              if (!r.ok) {
                Alert.alert(t('ortak.hata'), r.hata);
                return;
              }
              HikayeAnalitik('story_delete');
              setMenuAcik(false);
              const kalan = items.filter((x) => x.id !== silinecekId);
              if (kalan.length === 0) {
                kapat();
                return;
              }
              setItems(kalan);
              setIndex(Math.min(silIndex, kalan.length - 1));
              setIlerleme(0);
              setMedyaHazir(false);
              setDuraklat(false);
            })();
          }}
          onSessizeAl={() => {
            void (async () => {
              const r = await HikayeSessizeAl(grup.user_id);
              if (!r.ok) {
                Alert.alert(t('ortak.hata'), r.hata);
                return;
              }
              HikayeAnalitik('story_mute');
              Alert.alert(t('ortak.basarili'), t('hikaye.sessizeAlindi'));
            })();
          }}
          onBildir={() => {
            if (kesit) {
              void AnalyticsOlayEkle('live_clip_reported', {
                item_id: oge.id,
                live_id: kesit.liveId,
                pk_id: kesit.pkId,
              });
            }
            setBildirAcik(true);
          }}
        />

        <HikayeGoruntuleyenlerSheet
          visible={izleyicilerAcik}
          itemId={oge.id}
          storyId={oge.story_id}
          onClose={() => {
            setIzleyicilerAcik(false);
            setDuraklat(false);
          }}
        />

        <KullaniciGuvenlikMenusu
          visible={bildirAcik}
          targetUserId={grup.user_id}
          targetName={grup.display_name}
          contentType="story"
          contentId={oge.id}
          contentMediaUrl={oge.media_url}
          onClose={() => setBildirAcik(false)}
        />

        <HediyeMagazaBaglamasi magaza={hediye} />
      </View>
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    maxWidth: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  kartWrap: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 8,
    position: 'relative',
  },
  webDokunus: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 3,
  },
  webSol: {
    width: '35%',
    height: '100%',
  },
  webSag: {
    flex: 1,
    height: '100%',
  },
  kart: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  medyaYukle: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  metinSahne: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  metinBuyuk: {
    ...TipografiTokenlari.h2,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  ustGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 130,
    zIndex: 2,
  },
  kartUst: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  profil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  profilMetin: { flexShrink: 1 },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  avatarBos: { backgroundColor: 'rgba(255,255,255,0.2)' },
  ad: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
    maxWidth: 160,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 1 },
  },
  zaman: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 5,
  },
  kapatBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 64,
    zIndex: 6,
  },
  caption: {
    ...TipografiTokenlari.body,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
  },
  muzikKartIci: {
    position: 'absolute',
    left: 12,
    bottom: 14,
    zIndex: 8,
  },
  paylasimRozet: {
    position: 'absolute',
    top: 78,
    left: 12,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    zIndex: 7,
  },
  paylasimBaslik: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
    maxWidth: 140,
  },
  paylasimAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  linkRozet: {
    position: 'absolute',
    bottom: 58,
    alignSelf: 'center',
    left: 36,
    right: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,64,145,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    zIndex: 7,
  },
  linkRozetUst: {
    bottom: 74,
  },
  linkYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    flex: 1,
    fontWeight: '700',
  },
  alt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  sahipAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  izleyiciBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  izleyiciYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '600',
  },
  menuBtn: {
    position: 'absolute',
    right: 16,
  },
});
