import React, { memo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ProfilAvatarKucuk } from '../../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import {
  DurumMedyaHttpsMi,
  DurumMuzikPayloadAl,
  DurumOyunKazanciPayloadAl,
  DurumSesPayloadAl,
  type DurumOggesi,
} from '../../islemler/DurumIslemleri';
import { DurumMuzikKarti } from '../../bilesenler/DurumMuzikKarti';
import { DurumSesKarti } from '../../bilesenler/DurumSesKarti';
import { DurumOyunKazanciKart } from '../../bilesenler/DurumOyunKazanciKart';
import { DurumVideoOnizleme } from '../../bilesenler/DurumVideoOnizleme';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import { SilinmisGonderiKarti } from './SilinmisGonderiKarti';
import { DogrulanmisTik } from '../../../kullanici-profili/bilesenler/DogrulanmisTik';
import {
  type PaylasilanDurumOnizleme,
} from '../tipler';
import { useCeviri } from '../../../../i18n/useCeviri';
import { MesajBaglantiliMetin } from '../../../mesajlasma/bilesenler/MesajBaglantiliMetin';
import { BaglantiOnizlemeBlok } from '../../../baglanti/bilesenler/BaglantiOnizlemeBlok';

type Props = {
  onizleme: PaylasilanDurumOnizleme | null | undefined;
  note?: string | null;
  mine?: boolean;
  onLongPress?: () => void;
  yukleniyor?: boolean;
};

const CAPTION_LIMIT = 110;

function metinKisa(caption: string | null | undefined): {
  text: string;
  truncated: boolean;
} {
  const t = (caption ?? '').trim();
  if (!t) return { text: '', truncated: false };
  if (t.length <= CAPTION_LIMIT) return { text: t, truncated: false };
  return { text: `${t.slice(0, CAPTION_LIMIT).trimEnd()}…`, truncated: true };
}

function PaylasilanGonderiKartiIc({
  onizleme,
  note,
  mine,
  onLongPress,
  yukleniyor,
}: Props) {
  const { t } = useCeviri();
  const [genis, setGenis] = useState(false);

  if (yukleniyor && !onizleme) {
    return (
      <View style={[styles.kart, mine ? styles.mine : styles.theirs]}>
        <Text style={styles.yukleniyor}>{t('ortak.yukleniyor')}</Text>
      </View>
    );
  }

  if (!onizleme || onizleme.availability !== 'AVAILABLE') {
    return (
      <Pressable onLongPress={onLongPress} delayLongPress={300}>
        <View style={styles.wrap}>
          {note ? (
            <Text style={mine ? styles.noteMine : styles.note}>{note}</Text>
          ) : null}
          <SilinmisGonderiKarti
            availability={onizleme?.availability ?? 'NOT_AVAILABLE'}
            message={onizleme?.message}
            mine={mine}
          />
        </View>
      </Pressable>
    );
  }

  const handle = onizleme.username ? `@${onizleme.username}` : null;
  const mediaUrl = onizleme.media_url ?? '';
  const https = DurumMedyaHttpsMi(mediaUrl);
  const isVideo = onizleme.media_type === 'video' && https;
  const isAudio = onizleme.media_type === 'audio';
  const isImage =
    https &&
    onizleme.media_type !== 'video' &&
    onizleme.media_type !== 'text' &&
    onizleme.media_type !== 'audio' &&
    onizleme.post_kind !== 'game_win' &&
    onizleme.post_kind !== 'music';
  const isText =
    !isAudio &&
    (onizleme.media_type === 'text' ||
      (!https &&
        onizleme.post_kind !== 'game_win' &&
        onizleme.post_kind !== 'music'));

  const fakeOge = {
    post_kind: onizleme.post_kind ?? 'media',
    payload: onizleme.payload ?? {},
  } as DurumOggesi;
  const kazanc = DurumOyunKazanciPayloadAl(fakeOge);
  const muzik = DurumMuzikPayloadAl(fakeOge);
  const ses = DurumSesPayloadAl({
    media_type: onizleme.media_type === 'audio' ? 'audio' : 'text',
    payload: onizleme.payload ?? {},
  });

  const cap = metinKisa(onizleme.caption);

  const profilGit = () => {
    if (!onizleme.user_id) return;
    try {
      router.push(`/kullanici/${onizleme.user_id}` as any);
    } catch {
      /* */
    }
  };

  const detayGit = () => {
    if (!onizleme.status_id) return;
    try {
      router.push(`/durum/${onizleme.status_id}` as any);
    } catch {
      /* */
    }
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[styles.wrap, mine ? styles.mine : styles.theirs]}
    >
      {note ? (
        <Text style={mine ? styles.noteMine : styles.note}>{note}</Text>
      ) : null}

      <Pressable
        onPress={detayGit}
        style={styles.kart}
        accessibilityRole="button"
        accessibilityLabel={t('durumX.paylasilanAc')}
      >
        <Pressable style={styles.owner} onPress={profilGit}>
          <ProfilAvatarKucuk
            size={32}
            displayName={onizleme.display_name ?? t('ortak.kullanici')}
            username={onizleme.username}
            avatarUrl={onizleme.avatar_url}
          />
          <View style={styles.ownerMetin}>
            <View style={styles.isimSatir}>
              <Text style={styles.isim} numberOfLines={1}>
                {onizleme.display_name ?? t('ortak.kullanici')}
              </Text>
              <DogrulanmisTik dogrulandi={onizleme.is_verified} size={13} />
            </View>
            {handle ? (
              <Text style={styles.handle} numberOfLines={1}>
                {handle}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {kazanc ? (
          <View style={styles.medyaWrap}>
            <DurumOyunKazanciKart payload={kazanc} />
          </View>
        ) : muzik ? (
          <View style={styles.medyaWrap}>
            <DurumMuzikKarti payload={muzik} />
          </View>
        ) : isAudio ? (
          <View style={styles.medyaWrap}>
            <DurumSesKarti
              oynaticiId={`paylas-ses:${onizleme.status_id}`}
              uri={mediaUrl}
              durationMs={ses?.duration_ms}
            />
          </View>
        ) : isVideo ? (
          <View style={styles.video}>
            <DurumVideoOnizleme
              uri={mediaUrl}
              style={StyleSheet.absoluteFill}
              aktif
              mod="kare"
            />
            <View style={styles.videoOverlay} pointerEvents="none">
              <Ionicons name="play-circle" size={40} color="#fff" />
            </View>
          </View>
        ) : isImage ? (
          <Image
            source={{ uri: mediaUrl.trim() }}
            style={styles.foto}
            resizeMode="cover"
          />
        ) : isText ? (
          <View style={styles.metinKutu}>
            <MesajBaglantiliMetin
              text={
                (onizleme.caption ?? '').trim() || t('durumX.metinGonderisi')
              }
              style={styles.metinPreview}
              numberOfLines={genis ? 12 : 4}
            />
            <BaglantiOnizlemeBlok metin={onizleme.caption} />
          </View>
        ) : null}

        {!isText && (onizleme.caption ?? '').trim() ? (
          <View style={styles.captionWrap}>
            <MesajBaglantiliMetin
              text={(onizleme.caption ?? '').trim()}
              style={styles.caption}
              numberOfLines={genis ? 8 : 3}
            />
            <BaglantiOnizlemeBlok metin={onizleme.caption} />
            {cap.truncated && !genis ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  setGenis(true);
                }}
                hitSlop={6}
              >
                <Text style={styles.devam}>…{t('durumX.devaminiGor')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isText && (onizleme.caption ?? '').trim().length > 160 && !genis ? (
          <Pressable onPress={() => setGenis(true)} hitSlop={6}>
            <Text style={styles.devam}>…{t('durumX.devaminiGor')}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Pressable>
  );
}

export const PaylasilanGonderiKarti = memo(PaylasilanGonderiKartiIc);

const styles = StyleSheet.create({
  wrap: {
    maxWidth: 268,
    gap: 6,
  },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  note: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  noteMine: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  kart: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: RenkTokenlari.bgElevated,
    gap: 0,
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  ownerMetin: { flex: 1, minWidth: 0, gap: 1 },
  isimSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  isim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  handle: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  medyaWrap: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  foto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  metinKutu: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metinPreview: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
  },
  captionWrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  caption: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  devam: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  yukleniyor: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    padding: 14,
  },
});

