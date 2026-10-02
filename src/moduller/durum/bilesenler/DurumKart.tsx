import React, { memo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import type { DurumOggesi } from '../islemler/DurumIslemleri';
import {
  DurumMedyaHttpsMi,
  DurumMetinGonderisiMi,
  DurumMuzikPayloadAl,
  DurumOyunKazanciPayloadAl,
  DurumSesPayloadAl,
} from '../islemler/DurumIslemleri';
import { DurumZamanMetni } from '../islemler/DurumZaman';
import { DurumMuzikKarti } from './DurumMuzikKarti';
import { DurumSesKarti } from './DurumSesKarti';
import { DurumOyunKazanciKart } from './DurumOyunKazanciKart';
import { DurumVideoOnizleme } from './DurumVideoOnizleme';
import { DurumCaptionAcilir } from './DurumCaptionAcilir';
import { DurumEtkilesimCubugu } from './DurumEtkilesimCubugu';
import { UserIdentityRow } from '../../unvanlar/bilesenler/UserIdentityRow';
import { useUnvanKatalog } from '../../unvanlar/kancalar/useUnvanKatalog';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  oge: DurumOggesi;
  onPress: () => void;
  /** Resim gönderisinde medyaya basınca büyüt (yoksa onPress) */
  onResimPress?: () => void;
  onBegen: () => void;
  onYorum: () => void;
  onHediye: () => void;
  onProfil: () => void;
  onMenu?: () => void;
  /** FlatList görünür + sekme odakta → muted video / müzik önizleme (tek aktif) */
  videoAktif?: boolean;
  /** Paylaş — yoksa buton gizli */
  onPaylas?: () => void;
};

const AVATAR = 46;
/** Portrait görseller feed’i ele geçirmesin */
const MEDYA_MAX_H_ORAN = 0.62;
const MEDYA_FALLBACK_AR = 16 / 10;

const DurumFotograf = memo(function DurumFotograf({ uri }: { uri: string }) {
  const { height: ekranH } = useWindowDimensions();
  const maxH = Math.round(ekranH * MEDYA_MAX_H_ORAN);
  const [ar, setAr] = useState(MEDYA_FALLBACK_AR);
  const [wrapW, setWrapW] = useState(0);

  /**
   * width:% + aspectRatio + maxHeight aynı Image’da olunca RN yüksekliği
   * kısıtlarken genişliği de düşürür → kenarda bgElevated (siyah) şerit.
   * Çözüm: wrap her zaman full-width; yüksekliği ölçülen genişlikten hesapla;
   * Image absoluteFill + cover (portrait’te üst/alt kırpılır, yan şerit yok).
   */
  const boxH =
    wrapW > 0
      ? Math.min(Math.round(wrapW / Math.max(ar, 0.05)), maxH)
      : undefined;

  return (
    <View
      style={[
        styles.medyaWrap,
        boxH != null ? { height: boxH } : { aspectRatio: MEDYA_FALLBACK_AR },
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - wrapW) > 0.5) setWrapW(w);
      }}
    >
      <Image
        source={{ uri }}
        style={styles.medyaImg}
        resizeMode="cover"
        onLoad={(e) => {
          const w = e.nativeEvent?.source?.width;
          const h = e.nativeEvent?.source?.height;
          if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
            setAr(w / h);
          }
        }}
        onError={() => {
          /* bozuk URI — boş elevated yüzey kalsın */
        }}
      />
    </View>
  );
});

function DurumKartIc({
  oge,
  onPress,
  onResimPress,
  onBegen,
  onYorum,
  onHediye,
  onProfil,
  onMenu,
  videoAktif = false,
  onPaylas,
}: Props) {
  const { t } = useCeviri();
  useUnvanKatalog();
  const handle = oge.username ? `@${oge.username}` : null;
  const kazanc = DurumOyunKazanciPayloadAl(oge);
  const muzik = DurumMuzikPayloadAl(oge);
  const ses = DurumSesPayloadAl(oge);
  const metinGonderisi = DurumMetinGonderisiMi(oge);
  const resimBuyutulebilir =
    !kazanc &&
    !muzik &&
    !ses &&
    !metinGonderisi &&
    oge.media_type !== 'video' &&
    oge.media_type !== 'audio' &&
    DurumMedyaHttpsMi(oge.media_url) &&
    typeof onResimPress === 'function';
  const videoUri = DurumMedyaHttpsMi(oge.media_url)
    ? oge.media_url.trim()
    : null;

  return (
    <Pressable
      style={styles.kart}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('durumX.gonderiDetayi')}
    >
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          onProfil();
        }}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={t('durumX.profiliAc')}
      >
        <ProfilAvatarKucuk
          size={AVATAR}
          displayName={oge.display_name}
          username={oge.username}
          avatarUrl={oge.avatar_url}
        />
      </Pressable>

      <View style={styles.govde}>
        <View style={styles.ustBlok}>
          <Pressable
            style={styles.ustSatir}
            onPress={(e) => {
              e.stopPropagation?.();
              onProfil();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('durumX.profiliAc')}
          >
            <UserIdentityRow
              displayName={oge.display_name}
              verified={!!oge.is_verified}
              titleId={oge.selected_title_id}
              size="COMPACT"
              nameStyle={styles.isim}
            />
            {handle ? (
              <Text style={styles.handle} numberOfLines={1}>
                {handle}
              </Text>
            ) : null}
            <Text style={styles.nokta}>·</Text>
            <Text style={styles.zaman}>{DurumZamanMetni(oge.created_at)}</Text>
          </Pressable>
          {onMenu ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onMenu();
              }}
              hitSlop={12}
              style={styles.menuBtn}
              accessibilityRole="button"
              accessibilityLabel={t('durumX.digerSecenekler')}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={RenkTokenlari.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {oge.caption ? (
          <DurumCaptionAcilir metin={oge.caption} style={styles.caption} />
        ) : null}

        {!metinGonderisi ? (
          ses ? (
            <View style={[styles.medyaHit, styles.medyaHitKart]}>
              <DurumSesKarti
                oynaticiId={`durum-ses:${oge.id}`}
                uri={oge.media_url}
                durationMs={ses.duration_ms}
                aktif={videoAktif}
              />
            </View>
          ) : muzik ? (
            <View style={[styles.medyaHit, styles.medyaHitKart]}>
              <DurumMuzikKarti payload={muzik} aktif={videoAktif} />
            </View>
          ) : (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if (resimBuyutulebilir) onResimPress?.();
              else onPress();
            }}
            style={[styles.medyaHit, !!kazanc && styles.medyaHitKart]}
            accessibilityRole="imagebutton"
            accessibilityLabel={resimBuyutulebilir ? t('durumX.resmiBuyut') : t('ortak.medya')}
          >
            {kazanc ? (
              <DurumOyunKazanciKart payload={kazanc} />
            ) : oge.media_type === 'video' ? (
              <View style={[styles.medyaVideo, styles.medyaBos]}>
                <DurumVideoOnizleme
                  uri={videoUri}
                  style={StyleSheet.absoluteFill}
                  aktif={videoAktif}
                />
                {!videoAktif || !videoUri ? (
                  <View style={styles.videoPlaceholder} pointerEvents="none">
                    <Ionicons
                      name="play-circle"
                      size={36}
                      color="rgba(255,255,255,0.8)"
                    />
                  </View>
                ) : null}
                <View style={styles.videoBadge} pointerEvents="none">
                  <Ionicons name="play" size={13} color="#fff" />
                </View>
              </View>
            ) : videoUri ? (
              <DurumFotograf uri={videoUri} />
            ) : (
              <View style={[styles.medyaVideo, styles.medyaBos]} />
            )}
          </Pressable>
          )
        ) : null}

        <DurumEtkilesimCubugu
          commentCount={Number(oge.comment_count ?? 0)}
          likeCount={Number(oge.like_count ?? 0)}
          likedByMe={!!oge.liked_by_me}
          giftCount={Number(oge.gift_count ?? 0)}
          viewCount={Number(oge.view_count ?? 0)}
          onYorum={onYorum}
          onBegen={onBegen}
          onHediye={onHediye}
          onPaylas={onPaylas}
        />
      </View>
    </Pressable>
  );
}

export const DurumKart = memo(DurumKartIc);

const styles = StyleSheet.create({
  kart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 18,
    paddingBottom: 20,
  },
  govde: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  ustBlok: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ustSatir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  isim: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  handle: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontSize: 14,
    flexShrink: 2,
  },
  nokta: {
    color: RenkTokenlari.textMuted,
    fontSize: 13,
  },
  zaman: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontSize: 14,
    flexShrink: 0,
  },
  caption: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontSize: 15,
    lineHeight: 21,
  },
  medyaHit: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  medyaHitKart: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  medyaWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  medyaImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  medyaVideo: {
    width: '100%',
    aspectRatio: MEDYA_FALLBACK_AR,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  medyaBos: {
    backgroundColor: RenkTokenlari.bgElevated,
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
