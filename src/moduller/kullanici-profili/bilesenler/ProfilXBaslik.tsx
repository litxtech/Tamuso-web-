import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TakipSayaciniFormatla } from '../../takip/TakipSayacFormat';
import { DogrulanmisTik } from './DogrulanmisTik';
import { ProfilAvatarCerceve } from './ProfilAvatarCerceve';
import { ProfilOnizlemeGorseli } from './ProfilOnizlemeGorseli';
import { useCeviri } from '../../../i18n/useCeviri';
import { UserTitleBadge } from '../../unvanlar/bilesenler/UserTitleBadge';
import { UnvanSunumunuCoz } from '../../unvanlar/okuma/UnvanSunumunuCoz';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { useUnvanKatalog } from '../../unvanlar/kancalar/useUnvanKatalog';
import { HikayeCanliHalka } from '../../hikaye/bilesenler/HikayeCanliHalka';
import { HikayeOnizlemeGorselMi } from '../../hikaye/yardimcilar/HikayeAvatarDaireUri';

export const PROFIL_X_COVER_H = 150;
export const PROFIL_X_AVATAR = 76;

const LOCALE_MAP: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

function katilmaMetni(
  createdAt: string | null | undefined,
  locale: string,
  t: (key: 'profil.katildi', opts: { tarih: string }) => string,
): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const ayYil = d.toLocaleDateString(LOCALE_MAP[locale] ?? locale, {
    month: 'long',
    year: 'numeric',
  });
  return t('profil.katildi', { tarih: ayYil });
}

export function ProfilXBaslik({
  coverUri,
  avatarUri,
  displayName,
  username,
  bio,
  verified,
  titleId,
  createdAt,
  country,
  publicUserId,
  guestBadge,
  followingCount,
  followersCount,
  postsCount,
  pendingFollowRequests,
  gosterTakip = true,
  gosterTakipci = true,
  gosterGonderi = false,
  level = 1,
  tacGizli = false,
  coverHExtra = 0,
  overlayTop,
  ustSol,
  ustSag,
  aksiyonSlot,
  onTakipPress,
  onTakipciPress,
  onIstekPress,
  onCoverPress,
  onAvatarPress,
  onAvatarLongPress,
  hasStory = false,
  hasUnseenStory = false,
  /** Story varken avatar yerine gösterilecek önizleme */
  storyPreviewUri = null,
  children,
}: {
  coverUri: string | null;
  avatarUri: string | null;
  displayName: string;
  username?: string | null;
  bio?: string | null;
  verified?: boolean;
  /** Dinamik vitrin ünvanı (presentation — yetki değil) */
  titleId?: string | null;
  createdAt?: string | null;
  country?: string | null;
  publicUserId?: string | number | null;
  guestBadge?: boolean;
  followingCount?: number | null;
  followersCount?: number | null;
  postsCount?: number | null;
  pendingFollowRequests?: number | null;
  gosterTakip?: boolean;
  gosterTakipci?: boolean;
  gosterGonderi?: boolean;
  level?: number;
  tacGizli?: boolean;
  /** Kapak yüksekliğine eklenecek (safe area vb.) */
  coverHExtra?: number;
  /** Overlay butonlarının top değeri; verilmezse safe area + sm */
  overlayTop?: number;
  ustSol?: ReactNode;
  ustSag?: ReactNode;
  aksiyonSlot?: ReactNode;
  onTakipPress?: () => void;
  onTakipciPress?: () => void;
  onIstekPress?: () => void;
  onCoverPress?: () => void;
  onAvatarPress?: () => void;
  /** Instagram: story varken uzun bas = foto büyüt */
  onAvatarLongPress?: () => void;
  /** Aktif hikaye varsa halka çiz */
  hasStory?: boolean;
  hasUnseenStory?: boolean;
  storyPreviewUri?: string | null;
  children?: ReactNode;
}) {
  const { t, i18n, dil } = useCeviri();
  const insets = useSafeAreaInsets();
  const { width: ekranW } = useWindowDimensions();
  useUnvanKatalog();
  const title =
    OzellikBayragiAktifMi('user_titles_enabled') && titleId
      ? UnvanSunumunuCoz(titleId, dil)
      : null;
  const coverH = PROFIL_X_COVER_H + coverHExtra;
  const top = overlayTop ?? insets.top + BoslukTokenlari.sm;
  const katildi = katilmaMetni(createdAt, i18n.language, t);
  const avatarHarf = (displayName.trim().slice(0, 1) || '?').toUpperCase();
  const safeCoverUri = MedyaUriGuvenli(coverUri);
  const safeAvatarUri = MedyaUriGuvenli(avatarUri);
  const storyOnizleme = HikayeOnizlemeGorselMi(storyPreviewUri)
    ? MedyaUriGuvenli(storyPreviewUri)
    : null;
  /** Story varken kare önizleme; yoksa / video ise profil resmi */
  const avatarGosterUri =
    hasStory && storyOnizleme ? storyOnizleme : safeAvatarUri;
  const avatarPx = Math.round(PROFIL_X_AVATAR * 3);

  const avatarPlaceholder = (
    <LinearGradient
      colors={[...RenkTokenlari.gradientPrimary]}
      style={StyleSheet.absoluteFillObject}
    >
      <View style={styles.avatarHarfWrap}>
        <Text style={styles.avatarHarf}>{avatarHarf}</Text>
      </View>
    </LinearGradient>
  );

  const avatarIcerik = (
    <Pressable
      onPress={onAvatarPress}
      onLongPress={onAvatarLongPress}
      delayLongPress={280}
      style={[styles.avatarWrap, !hasStory && styles.avatarWrapKenar]}
      accessibilityLabel={
        hasStory
          ? t('hikaye.kullaniciHikayeA11y', { ad: displayName })
          : t('profil.profilFotografi')
      }
      disabled={!onAvatarPress}
      collapsable={false}
    >
      {hasStory ? (
        <HikayeCanliHalka
          size={PROFIL_X_AVATAR}
          hasUnseen={hasUnseenStory}
          thickness={3}
        >
          <ProfilOnizlemeGorseli
            uri={avatarGosterUri}
            style={styles.avatarImgDaire}
            genislik={avatarPx}
            yukseklik={avatarPx}
            accessibilityLabel={t('profil.profilFotografi')}
          >
            {avatarPlaceholder}
          </ProfilOnizlemeGorseli>
        </HikayeCanliHalka>
      ) : (
        <ProfilOnizlemeGorseli
          uri={safeAvatarUri}
          style={styles.avatarImgDaire}
          genislik={avatarPx}
          yukseklik={avatarPx}
          accessibilityLabel={t('profil.profilFotografi')}
        >
          {avatarPlaceholder}
        </ProfilOnizlemeGorseli>
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View
        style={[styles.coverWrap, { width: ekranW, height: coverH }]}
        collapsable={false}
      >
        <ProfilOnizlemeGorseli
          uri={safeCoverUri}
          style={{ width: ekranW, height: coverH }}
          genislik={Math.round(ekranW * 2)}
          yukseklik={Math.round(coverH * 2)}
          accessibilityLabel={t('profil.kapakFotografi')}
        >
          <LinearGradient
            colors={[...RenkTokenlari.gradientPlaceholder]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: ekranW, height: coverH }}
          />
        </ProfilOnizlemeGorseli>
        <LinearGradient
          colors={['transparent', RenkTokenlari.bg]}
          style={styles.coverFade}
          pointerEvents="none"
        />
        <Pressable
          onPress={onCoverPress}
          style={StyleSheet.absoluteFillObject}
          accessibilityLabel={t('profil.kapakFotografi')}
          disabled={!safeCoverUri || !onCoverPress}
        />

        {ustSol ? (
          <View style={[styles.ustSol, { top }]} pointerEvents="box-none">
            {ustSol}
          </View>
        ) : null}
        {ustSag ? (
          <View style={[styles.ustSag, { top }]} pointerEvents="box-none">
            {ustSag}
          </View>
        ) : null}
      </View>

      <View style={styles.avatarRow}>
        <ModulHataSiniri
          modulAdi="profil-avatar"
          varyant="kart"
          yedek={<View style={styles.avatarHit}>{avatarIcerik}</View>}
        >
          <View style={styles.avatarHit}>
            <ProfilAvatarCerceve
              size={PROFIL_X_AVATAR}
              level={Number(level) || 1}
              gizli={tacGizli}
            >
              {avatarIcerik}
            </ProfilAvatarCerceve>
          </View>
        </ModulHataSiniri>
        {aksiyonSlot ? (
          <View style={styles.aksiyonSlot}>{aksiyonSlot}</View>
        ) : null}
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { flexShrink: 1 }]} numberOfLines={2}>
            {displayName}
          </Text>
          {verified ? <DogrulanmisTik size={18} /> : null}
          {title ? <UserTitleBadge title={title} size="NORMAL" /> : null}
        </View>
        {username ? (
          <Text style={styles.username}>@{username}</Text>
        ) : null}
        {publicUserId != null && String(publicUserId).length > 0 ? (
          <Text style={styles.publicId}>ID {publicUserId}</Text>
        ) : null}
        {guestBadge ? (
          <View style={styles.guestBadge}>
            <Text style={styles.guestBadgeText}>{t('profil.misafirRozet')}</Text>
          </View>
        ) : null}
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}

        {(katildi || country) ? (
          <View style={styles.metaRow}>
            {country ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={RenkTokenlari.textMuted}
                />
                <Text style={styles.metaText}>{country}</Text>
              </View>
            ) : null}
            {katildi ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={RenkTokenlari.textMuted}
                />
                <Text style={styles.metaText}>{katildi}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {(pendingFollowRequests ?? 0) > 0 && onIstekPress ? (
          <Pressable
            onPress={onIstekPress}
            style={({ pressed }) => [
              styles.istekRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.countN}>{pendingFollowRequests}</Text>
            <Text style={styles.countL}> {t('profil.takipIstegi')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.countRow}>
          {gosterTakip ? (
            <Pressable
              style={styles.countItem}
              onPress={onTakipPress}
              disabled={!onTakipPress}
              accessibilityRole="button"
              accessibilityLabel={t('takip.takipEdilenler')}
            >
              <Text style={styles.countN}>
                {TakipSayaciniFormatla(followingCount ?? 0, dil)}
              </Text>
              <Text style={styles.countL}> {t('profil.takip')}</Text>
            </Pressable>
          ) : null}
          {gosterTakipci ? (
            <Pressable
              style={styles.countItem}
              onPress={onTakipciPress}
              disabled={!onTakipciPress}
              accessibilityRole="button"
              accessibilityLabel={t('profil.takipci')}
            >
              <Text style={styles.countN}>
                {TakipSayaciniFormatla(followersCount ?? 0, dil)}
              </Text>
              <Text style={styles.countL}> {t('profil.takipci')}</Text>
            </Pressable>
          ) : null}
          {gosterGonderi ? (
            <View style={styles.countItem}>
              <Text style={styles.countN}>
                {TakipSayaciniFormatla(postsCount ?? 0, dil)}
              </Text>
              <Text style={styles.countL}> {t('profil.gonderiSayaci')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

/** X tarzı tek sekme çizgisi — Gönderiler */
export function ProfilXGonderiSekme({
  onPaylas,
}: {
  onPaylas?: () => void;
}) {
  const { t } = useCeviri();
  return (
    <View style={styles.sekmeWrap}>
      <View style={styles.sekmeSatir}>
        <View style={styles.sekmeAktif}>
          <Text style={styles.sekmeYazi}>{t('profil.gonderiler')}</Text>
          <View style={styles.sekmeCizgi} />
        </View>
        {onPaylas ? (
          <Pressable onPress={onPaylas} hitSlop={8} style={styles.paylasHit}>
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={RenkTokenlari.primarySoft}
            />
            <Text style={styles.paylasYazi}>{t('ortak.paylas')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const profilXOverlayBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: RenkTokenlari.chipFill,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1,
  borderColor: RenkTokenlari.border,
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  coverWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  coverFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  ustSol: {
    position: 'absolute',
    left: BoslukTokenlari.lg,
    zIndex: 2,
    flexDirection: 'row',
    gap: 8,
  },
  ustSag: {
    position: 'absolute',
    right: BoslukTokenlari.lg,
    zIndex: 2,
    flexDirection: 'row',
    gap: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingStart: 0,
    paddingEnd: BoslukTokenlari.lg,
    marginTop: -(PROFIL_X_AVATAR / 2 + 4),
    zIndex: 2,
    minHeight: PROFIL_X_AVATAR / 2 + 8,
  },
  avatarHit: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: '100%',
    height: '100%',
    borderRadius: PROFIL_X_AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.surface,
  },
  avatarWrapKenar: {
    borderWidth: 2.5,
    borderColor: RenkTokenlari.bg,
  },
  avatarImgDaire: {
    width: '100%',
    height: '100%',
  },
  avatarImgFill: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarHarfWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    ...TipografiTokenlari.title,
    color: '#12040C',
    fontWeight: '800',
  },
  aksiyonSlot: {
    flexShrink: 1,
    marginBottom: 4,
    maxWidth: '58%',
    alignItems: 'flex-end',
  },
  identity: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 2,
    gap: 1,
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  name: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontWeight: '800',
    flexShrink: 1,
  },
  username: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
  publicId: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  guestBadge: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: RenkTokenlari.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
  },
  guestBadgeText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
  },
  bio: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    marginTop: BoslukTokenlari.sm,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.md,
    marginTop: BoslukTokenlari.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  istekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: BoslukTokenlari.sm,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.md,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countN: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  countL: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  children: {
    width: '100%',
    marginTop: BoslukTokenlari.md,
  },
  pressed: { opacity: 0.85 },
  sekmeWrap: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
    marginTop: BoslukTokenlari.md,
  },
  sekmeSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
  },
  sekmeAktif: {
    alignItems: 'center',
    paddingTop: BoslukTokenlari.sm,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
    paddingBottom: 10,
  },
  sekmeCizgi: {
    height: 3,
    width: '100%',
    minWidth: 64,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.primary,
  },
  paylasHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paylasYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
