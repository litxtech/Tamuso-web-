import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { DurumMuzikPayload } from '../../ai-muzik/tipler';
import { MsSureFormat } from '../../ai-muzik/utils/SureFormat';
import {
  AiMuzikCal,
  AiMuzikCaliyorMu,
  AiMuzikCaliyorTrackId,
  AiMuzikDuraklat,
  AiMuzikDurdur,
  AiMuzikPozisyonSn,
  AiMuzikSureSn,
} from '../../ai-muzik/oynatici/AiMuzikOynatici';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  payload: DurumMuzikPayload;
  /** Feed görünürlüğü — false olunca oynatma durur */
  aktif?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function formatSn(s: number): string {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`;
}

/**
 * Durum önizlemesinde müzik — detaya gitmeden play/pause.
 * Kart görünüm dışına çıkınca otomatik duraklar.
 */
export function DurumMuzikKarti({
  payload,
  aktif = true,
  compact,
  style,
}: Props) {
  const { t } = useCeviri();
  const cover = MedyaUriGuvenli(payload.cover_url);
  const unavailable = !payload.audio_url;
  const trackId = payload.track_id;
  const [, tick] = useState(0);

  const buCaliyor =
    !unavailable &&
    AiMuzikCaliyorTrackId() === trackId &&
    AiMuzikCaliyorMu();

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);

  // Scroll away / sekme kaybı → duraklat (diğer kartın çalmasına izin)
  useEffect(() => {
    if (aktif) return;
    if (AiMuzikCaliyorTrackId() === trackId) {
      AiMuzikDuraklat();
    }
  }, [aktif, trackId]);

  useEffect(() => {
    return () => {
      if (AiMuzikCaliyorTrackId() === trackId) {
        void AiMuzikDurdur();
      }
    };
  }, [trackId]);

  const toggle = async () => {
    if (unavailable) return;
    if (!payload.audio_url) return;
    if (AiMuzikCaliyorTrackId() === trackId && AiMuzikCaliyorMu()) {
      AiMuzikDuraklat();
      return;
    }
    await AiMuzikCal(payload.audio_url, trackId);
  };

  const detayaGit = () => {
    if (payload.track_id) router.push(`/ai-muzik/${payload.track_id}` as Href);
  };

  const pos = buCaliyor ? AiMuzikPozisyonSn() : 0;
  const dur =
    (buCaliyor ? AiMuzikSureSn() : 0) ||
    (payload.duration_ms ? payload.duration_ms / 1000 : 0);
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  if (compact) {
    return (
      <Pressable
        onPress={unavailable ? undefined : () => void toggle()}
        onLongPress={detayaGit}
        style={[styles.compact, style]}
        accessibilityRole="button"
        accessibilityLabel={
          buCaliyor ? t('durumX.duraklat') : t('durumX.onizlemedeCal')
        }
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons
          name={buCaliyor ? 'pause' : 'play'}
          size={16}
          color="#fff"
        />
        <Text style={styles.compactTitle} numberOfLines={1}>
          {unavailable ? t('durumX.muzikKullanilamiyor') : payload.title}
        </Text>
      </Pressable>
    );
  }

  if (unavailable) {
    return (
      <View style={[styles.card, style]}>
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.row}>
          <View style={[styles.cover, styles.coverBos]}>
            <Ionicons name="musical-notes-outline" size={22} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.unavailable}>{t('durumX.muzikKullanilamiyor')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#533483']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <Pressable onPress={detayaGit} hitSlop={4} accessibilityLabel={t('durumX.muzikDetayi')}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverBos]}>
              <Ionicons name="musical-notes" size={22} color="rgba(255,255,255,0.85)" />
            </View>
          )}
        </Pressable>
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={detayaGit}>
          <Text style={styles.badge}>{t('durumX.aiMuzikRozet')}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {payload.title}
          </Text>
          <Text style={styles.meta}>
            {buCaliyor
              ? `${formatSn(pos)} / ${formatSn(dur)}`
              : MsSureFormat(payload.duration_ms)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void toggle()}
          style={styles.playHit}
          accessibilityRole="button"
          accessibilityLabel={
            buCaliyor ? t('durumX.duraklat') : t('durumX.onizlemedeDinle')
          }
          hitSlop={8}
        >
          <Ionicons
            name={buCaliyor ? 'pause-circle' : 'play-circle'}
            size={44}
            color="rgba(255,255,255,0.95)"
          />
        </Pressable>
      </View>
      {buCaliyor || pct > 0 ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 96,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  coverBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    ...TipografiTokenlari.h2,
    color: '#fff',
    fontSize: 17,
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  playHit: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.primarySoft,
  },
  unavailable: {
    ...TipografiTokenlari.body,
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  compact: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    minHeight: 72,
    justifyContent: 'flex-end',
  },
  compactTitle: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    marginTop: 6,
  },
});
