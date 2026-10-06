import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { useKlavyeYuksekligi } from '../../../bilesenler/klavye/useKlavyeYuksekligi';
import { MesajMuzikSecimSheet } from '../../mesajlasma/bilesenler/MesajMuzikSecimSheet';
import {
  AiMuzikCal,
  AiMuzikDurdur,
  AiMuzikSeekVeOynat,
} from '../../ai-muzik/oynatici/AiMuzikOynatici';
import { AiMuzikParcaDetay } from '../../ai-muzik/islemler/AiMuzikApi';
import type { AiMuzikTrackOzet } from '../../ai-muzik/tipler';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  HIKAYE_CAPTION_MAX,
  HIKAYE_EFEKTLER,
  HIKAYE_METIN_ARKAPLANLAR,
  HIKAYE_METIN_RENKLER,
  HIKAYE_MUZIK_KLIP_MS,
  type HikayeEfektId,
} from '../sabitler';
import type { HikayeGorunurluk, HikayeMedyaTuru, HikayeOverlay } from '../tipler';
import { HikayeSuruklenebilirMetin } from './HikayeSuruklenebilirMetin';
import { HikayeMuzikKlipSecici } from './HikayeMuzikKlipSecici';
import { HikayeEditorVideo } from './HikayeEditorVideo';
import {
  HikayeVideoKirpici,
  type HikayeVideoTrim,
} from './HikayeVideoKirpici';

const { width: EKRAN_W } = Dimensions.get('window');
const EDITOR_PLAK = 48;

export type HikayeMuzikSecim = {
  track_id: string;
  title: string;
  cover_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  artist_name?: string | null;
  /** Instagram: kullanıcının seçtiği başlangıç (ms) */
  clip_start_ms: number;
};

export type HikayeEditorSonuc = {
  overlays: HikayeOverlay[];
  effectId: HikayeEfektId;
  backgroundColor: string | null;
  music: HikayeMuzikSecim | null;
  link: { url: string; label: string } | null;
  caption: string;
  videoTrim: HikayeVideoTrim | null;
};

type Props = {
  mediaType: HikayeMedyaTuru;
  mediaUri: string | null;
  initialCaption?: string;
  initialBackground?: string;
  initialMusic?: HikayeMuzikSecim | null;
  /** Video süresi (ms) — kırpma için */
  initialDurationMs?: number | null;
  busy?: boolean;
  publishLabel: string;
  onPublish: (sonuc: HikayeEditorSonuc) => void;
  onBack: () => void;
  visibility?: HikayeGorunurluk;
  onVisibilityChange?: (v: HikayeGorunurluk) => void;
};

/**
 * Snapchat tarzı hikaye editörü — medya kartı + alt dock:
 * sürüklenebilir metin, efekt (efektsiz dahil), müzik, link.
 * Alt araç çubuğu klavyenin üstünde kalır.
 */
export function HikayeMedyaEditoru({
  mediaType,
  mediaUri,
  initialCaption = '',
  initialBackground,
  initialMusic = null,
  initialDurationMs = null,
  busy,
  publishLabel,
  onPublish,
  onBack,
  visibility = 'public',
  onVisibilityChange,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { yukseklik: klavyeH } = useKlavyeYuksekligi(0);
  const linkUrlRef = useRef<TextInput>(null);
  const [canvasSize, setCanvasSize] = useState({ w: EKRAN_W, h: 400 });

  const [overlays, setOverlays] = useState<HikayeOverlay[]>(() =>
    mediaType === 'text'
      ? [
          {
            type: 'text',
            text: initialCaption || '',
            x: 0.5,
            y: 0.45,
            scale: 1,
            color: '#FFFFFF',
          },
        ]
      : [],
  );
  const [editIndex, setEditIndex] = useState<number | null>(
    mediaType === 'text' ? 0 : null,
  );
  const [effectId, setEffectId] = useState<HikayeEfektId>('none');
  const [bg, setBg] = useState(
    initialBackground ?? HIKAYE_METIN_ARKAPLANLAR[0]!,
  );
  const [music, setMusic] = useState<HikayeMuzikSecim | null>(initialMusic);
  const [muzikAcik, setMuzikAcik] = useState(false);
  const [linkAcik, setLinkAcik] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [link, setLink] = useState<{ url: string; label: string } | null>(null);
  const [panel, setPanel] = useState<'none' | 'efekt' | 'renk' | 'bg'>('none');
  const [caption, setCaption] = useState('');
  const [gizlilikAcik, setGizlilikAcik] = useState(false);
  const [videoTrim, setVideoTrim] = useState<HikayeVideoTrim>(() => {
    const full = Math.max(1000, Number(initialDurationMs ?? 0) || 30_000);
    return { startMs: 0, endMs: full };
  });
  const [olculenVideoMs, setOlculenVideoMs] = useState<number | null>(null);
  const efektifVideoMs = Math.max(
    1000,
    olculenVideoMs ?? Math.max(1000, Number(initialDurationMs ?? 0) || 30_000),
  );

  React.useEffect(() => {
    setVideoTrim((prev) => {
      const maxPencere = efektifVideoMs;
      if (
        prev.endMs <= efektifVideoMs &&
        prev.startMs < efektifVideoMs - 100 &&
        prev.endMs - prev.startMs <= maxPencere
      ) {
        return prev;
      }
      const startMs = Math.min(
        prev.startMs,
        Math.max(0, efektifVideoMs - 500),
      );
      const endMs = Math.min(
        efektifVideoMs,
        Math.max(startMs + 500, Math.min(prev.endMs, startMs + maxPencere)),
      );
      return { startMs, endMs };
    });
  }, [efektifVideoMs]);

  // Müzik seçilince önizlemede çal (video sessiz)
  useEffect(() => {
    let iptal = false;
    void (async () => {
      if (!music) {
        void AiMuzikDurdur();
        return;
      }
      let url = music.audio_url;
      if (!url) {
        try {
          const d = await AiMuzikParcaDetay(music.track_id);
          url = d?.track?.audio_url ?? null;
        } catch {
          url = null;
        }
      }
      if (iptal || !url) return;
      await AiMuzikCal(url, music.track_id);
      const startSn = Math.max(0, (music.clip_start_ms ?? 0) / 1000);
      if (startSn > 0.2) await AiMuzikSeekVeOynat(startSn);
    })();
    return () => {
      iptal = true;
      void AiMuzikDurdur();
    };
  }, [music?.track_id, music?.clip_start_ms, music?.audio_url]);

  const efektTint = useMemo(
    () => HIKAYE_EFEKTLER.find((e) => e.id === effectId)?.tint ?? null,
    [effectId],
  );

  const duzenlemeyiKapat = useCallback(() => {
    Keyboard.dismiss();
    setEditIndex(null);
  }, []);

  useEffect(() => {
    if (!linkAcik) return;
    const tmr = setTimeout(() => linkUrlRef.current?.focus(), 80);
    return () => clearTimeout(tmr);
  }, [linkAcik]);

  const metinEkle = () => {
    setPanel('none');
    setLinkAcik(false);
    const yeni: HikayeOverlay = {
      type: 'text',
      text: '',
      x: 0.5,
      y: 0.4 + overlays.length * 0.06,
      scale: 1,
      color: '#FFFFFF',
    };
    setOverlays((prev) => [...prev, yeni]);
    setEditIndex(overlays.length);
  };

  const muzikSec = useCallback(async (track: AiMuzikTrackOzet & {
    artist_name?: string | null;
    audio_url?: string | null;
  }) => {
    setMuzikAcik(false);
    let audio: string | null = track.audio_url ?? null;
    let artist: string | null = track.artist_name ?? null;
    if (!audio || !artist) {
      try {
        const detay = await AiMuzikParcaDetay(track.id);
        audio = audio || detay?.track?.audio_url || null;
        artist =
          artist ||
          detay?.creator?.display_name?.trim() ||
          detay?.creator?.username?.trim() ||
          null;
      } catch {
        /* katalog parçalarında detail yine music_tracks üzerinden gelir */
      }
    }
    setMusic({
      track_id: track.id,
      title: track.title,
      cover_url: track.cover_thumb_url ?? track.cover_url,
      audio_url: audio,
      duration_ms: track.duration_ms,
      artist_name: artist,
      clip_start_ms: 0,
    });
  }, []);

  const linkKaydet = () => {
    const u = linkUrl.trim();
    if (!/^https?:\/\//i.test(u)) return;
    Keyboard.dismiss();
    setLink({
      url: u,
      label: linkLabel.trim() || t('hikaye.linkEtiket'),
    });
    setLinkAcik(false);
  };

  const panelAc = (hedef: 'efekt' | 'renk' | 'bg') => {
    duzenlemeyiKapat();
    setLinkAcik(false);
    setPanel((p) => (p === hedef ? 'none' : hedef));
  };

  const efektPanelAc = useCallback(() => {
    duzenlemeyiKapat();
    setLinkAcik(false);
    setPanel('efekt');
  }, [duzenlemeyiKapat]);

  const plakRot = useSharedValue(0);
  useEffect(() => {
    if (music) {
      const bas = plakRot.value % 360;
      plakRot.value = bas;
      plakRot.value = withRepeat(
        withTiming(bas + 360, { duration: 4000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(plakRot);
      plakRot.value = 0;
    }
  }, [music?.track_id, plakRot, music]);

  const plakStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${plakRot.value % 360}deg` }],
  }));

  const efektKaydir = useMemo(
    () =>
      Gesture.Pan()
        .enabled(editIndex == null)
        .activeOffsetX(36)
        .failOffsetY([-28, 28])
        .onEnd((e) => {
          if (e.translationX > 56) {
            runOnJS(efektPanelAc)();
          }
        }),
    [editIndex, efektPanelAc],
  );

  const linkToggle = () => {
    duzenlemeyiKapat();
    setPanel('none');
    setLinkAcik((v) => !v);
  };

  const muzikAc = () => {
    duzenlemeyiKapat();
    setPanel('none');
    setLinkAcik(false);
    setMuzikAcik(true);
  };

  const yayinla = () => {
    Keyboard.dismiss();
    setEditIndex(null);
    const temiz = overlays
      .map((o) => ({
        ...o,
        text: (o.text ?? '').trim(),
      }))
      .filter((o) => o.type !== 'text' || (o.text && o.text.length > 0));

    const musicOverlay: HikayeOverlay | null = music
      ? {
          type: 'music',
          ref_id: music.track_id,
          meta: {
            title: music.title,
            cover_url: music.cover_url,
            audio_url: music.audio_url,
            duration_ms: music.duration_ms,
            artist_name: music.artist_name ?? null,
            clip_start_ms: music.clip_start_ms ?? 0,
            // Şarkı seçim penceresi 15 sn; video süresi müzikle sınırlanmaz (izleyicide döngü)
            clip_duration_ms: HIKAYE_MUZIK_KLIP_MS,
            mute_original: mediaType === 'video',
          },
        }
      : null;

    const linkOverlay: HikayeOverlay | null = link
      ? {
          type: 'link',
          url: link.url,
          text: link.label,
          x: 0.5,
          y: 0.82,
          meta: { label: link.label, url: link.url },
        }
      : null;

    const hepsi = [
      ...temiz,
      ...(musicOverlay ? [musicOverlay] : []),
      ...(linkOverlay ? [linkOverlay] : []),
    ];

    onPublish({
      overlays: hepsi,
      effectId,
      backgroundColor: mediaType === 'text' ? bg : null,
      music,
      link,
      caption:
        mediaType === 'text'
          ? temiz.find((o) => o.type === 'text')?.text ?? ''
          : caption.trim(),
      videoTrim: mediaType === 'video' ? videoTrim : null,
    });
  };

  const altPad = Math.max(insets.bottom, 10) + (klavyeH > 0 ? klavyeH : 0);

  const aracButon = (
    ikon: keyof typeof Ionicons.glyphMap,
    etiket: string,
    onPress: () => void,
    aktif?: boolean,
  ) => (
    <Pressable
      style={[styles.aracYuvarlak, aktif && styles.aracAktif]}
      onPress={onPress}
      accessibilityLabel={etiket}
    >
      <Ionicons name={ikon} size={20} color="#fff" />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.kartWrap,
          { paddingTop: insets.top + 8, paddingBottom: altPad + 72 },
        ]}
      >
        <GestureDetector gesture={efektKaydir}>
          <View
            style={styles.kart}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                setCanvasSize({ w: width, h: height });
              }
            }}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={duzenlemeyiKapat}
            >
              {mediaType === 'text' || !mediaUri ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}
                />
              ) : mediaType === 'video' ? (
                <HikayeEditorVideo
                  key={music ? 'm' : 'v'}
                  uri={mediaUri}
                  muted={!!music}
                  contentFit="cover"
                  trimStartSn={videoTrim.startMs / 1000}
                  trimEndSn={videoTrim.endMs / 1000}
                  onDurationMs={setOlculenVideoMs}
                />
              ) : (
                <Image
                  source={{ uri: mediaUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
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
            </Pressable>

            {overlays.map((o, i) =>
              o.type === 'text' ? (
                <HikayeSuruklenebilirMetin
                  key={`t-${i}`}
                  overlay={o}
                  editing={editIndex === i}
                  canvasW={canvasSize.w}
                  canvasH={canvasSize.h}
                  onChangeText={(text) =>
                    setOverlays((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, text } : x)),
                    )
                  }
                  onMoveEnd={(x, y) => {
                    setOverlays((prev) =>
                      prev.map((x0, idx) =>
                        idx === i ? { ...x0, x, y } : x0,
                      ),
                    );
                    duzenlemeyiKapat();
                  }}
                  onBlurEdit={duzenlemeyiKapat}
                  onTap={() => setEditIndex(i)}
                />
              ) : null,
            )}

            {link ? (
              <View style={styles.linkRozet}>
                <Ionicons name="link" size={14} color="#fff" />
                <Text style={styles.linkYazi} numberOfLines={1}>
                  {link.label}
                </Text>
                <Pressable onPress={() => setLink(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            {music ? (
              <View style={styles.muzikPlakWrap} pointerEvents="box-none">
                <Animated.View style={[styles.muzikPlak, plakStil]}>
                  <View style={styles.muzikPlakDis}>
                    {MedyaUriGuvenli(music.cover_url) ? (
                      <Image
                        source={{ uri: MedyaUriGuvenli(music.cover_url)! }}
                        style={styles.muzikKapak}
                      />
                    ) : (
                      <View style={[styles.muzikKapak, styles.muzikKapakBos]}>
                        <Ionicons name="musical-notes" size={14} color="#fff" />
                      </View>
                    )}
                    <View style={styles.muzikDelik} />
                  </View>
                </Animated.View>
                <Pressable
                  style={styles.muzikKaldir}
                  onPress={() => setMusic(null)}
                  hitSlop={10}
                >
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={styles.kartKapat}
              onPress={onBack}
              hitSlop={10}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>

            {onVisibilityChange ? (
              <View style={styles.gizlilikWrap} pointerEvents="box-none">
                <Pressable
                  style={styles.gizlilikBtn}
                  onPress={() => setGizlilikAcik((v) => !v)}
                  accessibilityLabel={t('hikaye.gorunurlukHerkes')}
                >
                  <Ionicons
                    name={
                      visibility === 'public'
                        ? 'globe-outline'
                        : visibility === 'close_friends'
                          ? 'heart-outline'
                          : 'people-outline'
                    }
                    size={22}
                    color="#fff"
                  />
                </Pressable>
                {gizlilikAcik ? (
                  <View style={styles.gizlilikMenu}>
                    {(
                      [
                        ['public', 'globe-outline', t('hikaye.gorunurlukHerkes')],
                        [
                          'followers',
                          'people-outline',
                          t('hikaye.gorunurlukTakipciler'),
                        ],
                        [
                          'close_friends',
                          'heart-outline',
                          t('hikaye.gorunurlukYakin'),
                        ],
                      ] as const
                    ).map(([kod, ikon, etiket]) => (
                      <Pressable
                        key={kod}
                        style={[
                          styles.gizlilikSecenek,
                          visibility === kod && styles.gizlilikSecenekAktif,
                        ]}
                        onPress={() => {
                          onVisibilityChange(kod);
                          setGizlilikAcik(false);
                        }}
                      >
                        <Ionicons name={ikon} size={18} color="#fff" />
                        <Text style={styles.gizlilikEtiket}>{etiket}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </GestureDetector>
      </View>

      <View
        style={[styles.altDock, { paddingBottom: altPad }]}
        pointerEvents="box-none"
      >
        {mediaType === 'video' ? (
          <HikayeVideoKirpici
            durationMs={efektifVideoMs}
            trim={videoTrim}
            onChange={setVideoTrim}
          />
        ) : null}
        {music ? (
          <HikayeMuzikKlipSecici
            title={music.title}
            trackDurationMs={music.duration_ms}
            clipStartMs={music.clip_start_ms ?? 0}
            onChangeStart={(ms) =>
              setMusic((m) => (m ? { ...m, clip_start_ms: ms } : m))
            }
          />
        ) : null}

        {mediaType !== 'text' ? (
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={t('hikaye.captionPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.caption}
            maxLength={HIKAYE_CAPTION_MAX}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        ) : null}

        {panel === 'efekt' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.efektSerit}
          >
            {HIKAYE_EFEKTLER.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setEffectId(e.id)}
                style={[
                  styles.efektKart,
                  effectId === e.id && styles.efektSecili,
                ]}
              >
                <View
                  style={[
                    styles.efektOnizleme,
                    {
                      backgroundColor: e.tint ?? 'rgba(255,255,255,0.08)',
                    },
                  ]}
                />
                <Text style={styles.efektEtiket}>{t(e.labelKey as any)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {panel === 'renk' ? (
          <View style={styles.renkSerit}>
            {HIKAYE_METIN_RENKLER.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  if (editIndex == null) return;
                  setOverlays((prev) =>
                    prev.map((x, i) =>
                      i === editIndex ? { ...x, color: c } : x,
                    ),
                  );
                }}
                style={[
                  styles.renk,
                  { backgroundColor: c },
                  editIndex != null &&
                    overlays[editIndex]?.color === c &&
                    styles.renkSecili,
                ]}
              />
            ))}
          </View>
        ) : null}

        {panel === 'bg' && mediaType === 'text' ? (
          <View style={styles.renkSerit}>
            {HIKAYE_METIN_ARKAPLANLAR.map((c) => (
              <Pressable
                key={c}
                onPress={() => setBg(c)}
                style={[
                  styles.renk,
                  { backgroundColor: c },
                  bg === c && styles.renkSecili,
                ]}
              />
            ))}
          </View>
        ) : null}

        {linkAcik ? (
          <View style={styles.linkPanel}>
            <TextInput
              ref={linkUrlRef}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="next"
              style={styles.linkInput}
            />
            <TextInput
              value={linkLabel}
              onChangeText={setLinkLabel}
              placeholder={t('hikaye.linkEtiket')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={linkKaydet}
              style={styles.linkInput}
            />
            <Pressable onPress={linkKaydet} style={styles.linkKaydet}>
              <Text style={styles.linkKaydetYazi}>{t('ortak.ekle')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.altBar}>
          <View style={styles.araclarSol}>
            {aracButon('text', t('hikaye.metin'), metinEkle)}
            {aracButon(
              'color-filter',
              t('hikaye.efekt'),
              () => panelAc('efekt'),
              panel === 'efekt',
            )}
            {aracButon(
              'color-palette',
              t('hikaye.renk'),
              () => panelAc('renk'),
              panel === 'renk',
            )}
            {mediaType === 'text'
              ? aracButon(
                  'image',
                  t('hikaye.arkaplan'),
                  () => panelAc('bg'),
                  panel === 'bg',
                )
              : null}
            {aracButon(
              'musical-notes',
              t('hikaye.muzik'),
              muzikAc,
              !!music,
            )}
            {aracButon(
              'link',
              t('hikaye.link'),
              linkToggle,
              linkAcik || !!link,
            )}
          </View>

          <Pressable
            onPress={yayinla}
            disabled={!!busy}
            style={[styles.gonderBtn, busy && styles.gonderDisabled]}
            accessibilityLabel={publishLabel}
          >
            {busy ? (
              <Text style={styles.gonderYazi}>…</Text>
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <MesajMuzikSecimSheet
        visible={muzikAcik}
        onClose={() => setMuzikAcik(false)}
        onSec={(tr) => void muzikSec(tr)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  kartWrap: {
    flex: 1,
    paddingHorizontal: 10,
  },
  kart: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  kartKapat: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  gizlilikWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 9,
    alignItems: 'flex-end',
  },
  gizlilikBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gizlilikMenu: {
    marginTop: 8,
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderRadius: 14,
    padding: 6,
    gap: 4,
    minWidth: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  gizlilikSecenek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gizlilikSecenekAktif: {
    backgroundColor: 'rgba(232,64,145,0.45)',
  },
  gizlilikEtiket: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '600',
  },
  altDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  caption: {
    ...TipografiTokenlari.body,
    color: '#fff',
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 6,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 4,
  },
  altBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
  },
  araclarSol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  aracYuvarlak: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aracAktif: {
    backgroundColor: 'rgba(232,64,145,0.55)',
  },
  gonderBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  gonderDisabled: { opacity: 0.55 },
  gonderYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  efektSerit: {
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 8,
  },
  efektKart: { alignItems: 'center', width: 64 },
  efektSecili: {
    opacity: 1,
  },
  efektOnizleme: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  efektEtiket: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    marginTop: 4,
  },
  renkSerit: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  renk: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  renkSecili: { borderColor: '#fff' },
  muzikPlakWrap: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    width: EDITOR_PLAK + 8,
    height: EDITOR_PLAK + 8,
  },
  muzikPlak: {
    width: EDITOR_PLAK,
    height: EDITOR_PLAK,
  },
  muzikPlakDis: {
    width: EDITOR_PLAK,
    height: EDITOR_PLAK,
    borderRadius: EDITOR_PLAK / 2,
    backgroundColor: '#111',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  muzikKapak: {
    width: EDITOR_PLAK - 10,
    height: EDITOR_PLAK - 10,
    borderRadius: (EDITOR_PLAK - 10) / 2,
  },
  muzikKapakBos: {
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muzikDelik: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0a0a0a',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  muzikKaldir: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
  },
  linkRozet: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    left: 48,
    right: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,64,145,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
  },
  linkYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    flex: 1,
    fontWeight: '700',
  },
  linkPanel: {
    paddingHorizontal: 14,
    gap: 8,
    paddingVertical: 8,
  },
  linkInput: {
    ...TipografiTokenlari.body,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkKaydet: {
    alignSelf: 'flex-end',
    backgroundColor: RenkTokenlari.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  linkKaydetYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
});
