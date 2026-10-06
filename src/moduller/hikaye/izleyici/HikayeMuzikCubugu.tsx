import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { supabase } from '../../../lib/supabase';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  AiMuzikCal,
  AiMuzikCaliyorMu,
  AiMuzikCaliyorTrackId,
  AiMuzikDevam,
  AiMuzikDuraklat,
  AiMuzikDurdur,
  AiMuzikPozisyonSn,
  AiMuzikSeekVeOynat,
} from '../../ai-muzik/oynatici/AiMuzikOynatici';
import { AiMuzikParcaDetay } from '../../ai-muzik/islemler/AiMuzikApi';

export type HikayeMuzikMeta = {
  track_id: string;
  title: string;
  cover_url?: string | null;
  audio_url?: string | null;
  artist_name?: string | null;
  clip_start_ms?: number | null;
  clip_duration_ms?: number | null;
};

type Props = {
  music: HikayeMuzikMeta;
  paused?: boolean;
};

const PLAK = 48;

async function muzikUrlGetir(music: HikayeMuzikMeta): Promise<string | null> {
  if (music.audio_url) return music.audio_url;
  try {
    const d = await AiMuzikParcaDetay(music.track_id);
    return d?.track?.audio_url ?? null;
  } catch {
    return null;
  }
}

async function muzikBaslat(music: HikayeMuzikMeta) {
  const url = await muzikUrlGetir(music);
  if (!url) return;
  const startSn = Math.max(0, (music.clip_start_ms ?? 0) / 1000);
  await AiMuzikCal(url, music.track_id);
  if (startSn > 0.25) {
    await AiMuzikSeekVeOynat(startSn);
  }
}

async function paylasimOzetiGetir(trackId: string): Promise<{
  share_count: number;
  creator_name: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('hikaye_muzik_paylasim_ozeti', {
      p_track_id: trackId,
    });
    if (error) return { share_count: 0, creator_name: null };
    const root =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    if (!root || root.ok === false) {
      return { share_count: 0, creator_name: null };
    }
    return {
      share_count:
        typeof root.share_count === 'number'
          ? root.share_count
          : Number(root.share_count) || 0,
      creator_name:
        typeof root.creator_name === 'string' && root.creator_name.trim()
          ? root.creator_name.trim()
          : null,
    };
  } catch {
    return { share_count: 0, creator_name: null };
  }
}

/**
 * Story müzik — küçük dönen plak (sol alt).
 * Tıkla: isim / oluşturucu / benzersiz paylaşım sayısı / aynı müzikle paylaş.
 */
export function HikayeMuzikCubugu({ music, paused }: Props) {
  const { t } = useCeviri();
  const [caliyor, setCaliyor] = useState(false);
  const [detayAcik, setDetayAcik] = useState(false);
  const [olusturucu, setOlusturucu] = useState<string | null>(
    music.artist_name ?? null,
  );
  const [paylasimSayisi, setPaylasimSayisi] = useState<number | null>(null);
  const cover = MedyaUriGuvenli(music.cover_url);
  const rot = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCaliyor(
        AiMuzikCaliyorTrackId() === music.track_id && AiMuzikCaliyorMu(),
      );
    }, 400);
    return () => clearInterval(id);
  }, [music.track_id]);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      if (paused) return;
      await muzikBaslat(music);
      if (iptal) return;
    })();
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.track_id, music.clip_start_ms]);

  useEffect(() => {
    if (AiMuzikCaliyorTrackId() !== music.track_id) return;
    if (paused) AiMuzikDuraklat();
    else AiMuzikDevam();
  }, [paused, music.track_id]);

  // Seçilen müzik klibini (15 sn) video boyunca döngüle — video 15 sn’ye kesilmez
  useEffect(() => {
    const klipMs = music.clip_duration_ms ?? 15_000;
    const basSn = Math.max(0, (music.clip_start_ms ?? 0) / 1000);
    const bitSn = basSn + Math.max(1, klipMs / 1000);
    const id = setInterval(() => {
      if (paused) return;
      if (AiMuzikCaliyorTrackId() !== music.track_id) return;
      if (!AiMuzikCaliyorMu()) return;
      const poz = AiMuzikPozisyonSn();
      if (poz >= bitSn - 0.15) {
        void AiMuzikSeekVeOynat(basSn);
      }
    }, 250);
    return () => clearInterval(id);
  }, [
    music.track_id,
    music.clip_start_ms,
    music.clip_duration_ms,
    paused,
  ]);

  useEffect(() => {
    return () => {
      if (AiMuzikCaliyorTrackId() === music.track_id) {
        void AiMuzikDurdur();
      }
    };
  }, [music.track_id]);

  useEffect(() => {
    if (caliyor && !paused) {
      const bas = rot.value % 360;
      rot.value = bas;
      rot.value = withRepeat(
        withTiming(bas + 360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rot);
    }
  }, [caliyor, paused, rot]);

  useEffect(() => {
    if (music.artist_name) {
      setOlusturucu(music.artist_name);
    }
    let iptal = false;
    void (async () => {
      const ozet = await paylasimOzetiGetir(music.track_id);
      if (iptal) return;
      setPaylasimSayisi(ozet.share_count);
      if (ozet.creator_name) {
        setOlusturucu(ozet.creator_name);
        return;
      }
      if (music.artist_name) return;
      try {
        const d = await AiMuzikParcaDetay(music.track_id);
        if (iptal) return;
        const ad =
          d?.creator?.display_name?.trim() ||
          d?.creator?.username?.trim() ||
          null;
        setOlusturucu(ad);
      } catch {
        /* */
      }
    })();
    return () => {
      iptal = true;
    };
  }, [music.track_id, music.artist_name]);

  const plakStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value % 360}deg` }],
  }));

  const detayAc = () => {
    setDetayAcik(true);
    void (async () => {
      const ozet = await paylasimOzetiGetir(music.track_id);
      setPaylasimSayisi(ozet.share_count);
      if (ozet.creator_name) setOlusturucu(ozet.creator_name);
    })();
  };

  const ayniMuziklePaylas = () => {
    setDetayAcik(false);
    router.push({
      pathname: '/hikaye/olustur',
      params: {
        musicTrackId: music.track_id,
        musicTitle: music.title,
        musicCover: music.cover_url ?? '',
        musicArtist: olusturucu ?? music.artist_name ?? '',
      },
    } as any);
  };

  return (
    <>
      <Pressable
        style={styles.plakWrap}
        onPress={detayAc}
        accessibilityLabel={music.title}
      >
        <Animated.View style={[styles.plak, plakStil]}>
          <View style={styles.plakDis}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.kapak} />
            ) : (
              <View style={[styles.kapak, styles.kapakBos]}>
                <Ionicons name="musical-notes" size={14} color="#fff" />
              </View>
            )}
            <View style={styles.merkezDelik} />
          </View>
        </Animated.View>
      </Pressable>

      <Modal
        visible={detayAcik}
        transparent
        animationType="fade"
        onRequestClose={() => setDetayAcik(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setDetayAcik(false)}>
          <Pressable style={styles.kart} onPress={(e) => e.stopPropagation()}>
            <View style={styles.kartUst}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.kartKapak} />
              ) : (
                <View style={[styles.kartKapak, styles.kapakBos]}>
                  <Ionicons name="musical-notes" size={28} color="#fff" />
                </View>
              )}
              <View style={styles.kartMetin}>
                <Text style={styles.kartBaslik} numberOfLines={2}>
                  {music.title}
                </Text>
                <Text style={styles.kartAlt} numberOfLines={1}>
                  {olusturucu || t('hikaye.muzikOlusturucuYok')}
                </Text>
                <Text style={styles.kartSayi} numberOfLines={1}>
                  {t('hikaye.muzikPaylasimSayisi', {
                    n: paylasimSayisi ?? 0,
                  })}
                </Text>
              </View>
            </View>
            <Pressable style={styles.paylasBtn} onPress={ayniMuziklePaylas}>
              <Ionicons name="musical-notes" size={18} color="#fff" />
              <Text style={styles.paylasYazi}>{t('hikaye.ayniMuzikle')}</Text>
            </Pressable>
            <Pressable
              style={styles.kapatBtn}
              onPress={() => setDetayAcik(false)}
            >
              <Text style={styles.kapatYazi}>{t('ortak.kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  plakWrap: {
    alignSelf: 'flex-start',
  },
  plak: {
    width: PLAK,
    height: PLAK,
  },
  plakDis: {
    width: PLAK,
    height: PLAK,
    borderRadius: PLAK / 2,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  kapak: {
    width: PLAK - 8,
    height: PLAK - 8,
    borderRadius: (PLAK - 8) / 2,
  },
  kapakBos: {
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merkezDelik: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a0a0a',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: 16,
    gap: 14,
  },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kartKapak: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  kartMetin: { flex: 1, minWidth: 0, gap: 3 },
  kartBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kartAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  kartSayi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  paylasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RenkTokenlari.primary,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.pill,
  },
  paylasYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  kapatBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  kapatYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
});
