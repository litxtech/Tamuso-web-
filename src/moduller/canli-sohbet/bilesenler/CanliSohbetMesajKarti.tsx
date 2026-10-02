import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfilAvatarKucuk } from './ProfilAvatarKucuk';
import { SeviyeTaci } from '../../ses-odalari/bilesenler/SeviyeTaci';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import i18n from '../../../i18n';
import { CeviriMetinKarti } from '../../ai-ceviri/bilesenler/CeviriMetinKarti';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';

export type CanliSohbetMesajGorunum = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  /** chat (varsayılan) | gift — oda hediye satırı */
  tur?: 'chat' | 'gift';
  gift_emoji?: string | null;
  gift_name?: string | null;
  gift_quantity?: number | null;
};

type Props = {
  item: CanliSohbetMesajGorunum;
  mine?: boolean;
  onLongPress?: () => void;
  /** Avatar / isme kısa tık — profil sheet */
  onProfilPress?: (item: CanliSohbetMesajGorunum) => void;
  /** live: TikTok/Twitch/YouTube — kompakt, okunabilir overlay */
  varyant?: 'kart' | 'live';
  /** Float overlay'de zaman damgasını gizle — daha temiz satır */
  zamanGizle?: boolean;
};

function yorumZamani(iso: string): string {
  const tMs = new Date(iso).getTime();
  if (!Number.isFinite(tMs)) return '';
  const sn = Math.max(0, Math.floor((Date.now() - tMs) / 1000));
  if (sn < 45) return i18n.t('canliYayin.simdi');
  if (sn < 3600) return i18n.t('durumX.zamanDk', { n: Math.floor(sn / 60) });
  if (sn < 86400) return i18n.t('durumX.zamanSa', { n: Math.floor(sn / 3600) });
  const d = new Date(tMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Canli yorum satiri.
 * live: avatar + seviye tacı + isim + zaman + mesaj.
 */
export function CanliSohbetMesajKarti({
  item,
  mine,
  onLongPress,
  onProfilPress,
  varyant = 'kart',
  zamanGizle = false,
}: Props) {
  const { t } = useCeviri();
  const ad =
    item.display_name?.trim() ||
    item.username?.trim() ||
    t('ortak.kullanici');
  const seviye = typeof item.level === 'number' ? item.level : 0;
  const zaman = useMemo(() => yorumZamani(item.created_at), [item.created_at]);
  const profilA11y = t('kisilerX.profilA11y', { isim: ad });

  const hediyeMi = item.tur === 'gift';
  const ceviriAcik =
    !hediyeMi && OzellikBayragiAktifMi('live_chat_translation_enabled');

  if (varyant === 'live') {
    return (
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[
          styles.liveRow,
          mine && styles.liveRowMine,
          hediyeMi && styles.liveRowGift,
        ]}
      >
        <Pressable
          onPress={onProfilPress ? () => onProfilPress(item) : undefined}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={styles.liveAvatarWrap}
          accessibilityRole="button"
          accessibilityLabel={profilA11y}
        >
          <SeviyeTaci level={seviye} size="sm" avatarBoy={28}>
            <ProfilAvatarKucuk
              size={28}
              displayName={item.display_name}
              username={item.username}
              avatarUrl={item.avatar_url}
            />
          </SeviyeTaci>
        </Pressable>
        <View style={styles.liveGovde}>
          <View style={styles.liveUst}>
            <Pressable
              onPress={onProfilPress ? () => onProfilPress(item) : undefined}
              onLongPress={onLongPress}
              delayLongPress={350}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={profilA11y}
            >
              <Text
                style={[styles.liveAd, mine && styles.liveAdMine]}
                numberOfLines={1}
              >
                {ad}
              </Text>
            </Pressable>
            {!zamanGizle && zaman ? (
              <Text style={styles.liveZaman}>{zaman}</Text>
            ) : null}
          </View>
          {hediyeMi ? (
            <View style={styles.giftPill}>
              <Text style={styles.giftEmoji}>
                {item.gift_emoji?.trim() || '🎁'}
              </Text>
              <Text style={styles.giftBody} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          ) : (
            <CeviriMetinKarti
              text={item.body}
              context="live"
              varyant="live"
              enabled={ceviriAcik}
            />
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.kart, mine && styles.kartMine]}
    >
      <Pressable
        onPress={onProfilPress ? () => onProfilPress(item) : undefined}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={styles.kartAvatarWrap}
        accessibilityRole="button"
        accessibilityLabel={profilA11y}
      >
        <SeviyeTaci level={seviye} size="sm" avatarBoy={34}>
          <ProfilAvatarKucuk
            size={34}
            displayName={item.display_name}
            username={item.username}
            avatarUrl={item.avatar_url}
          />
        </SeviyeTaci>
      </Pressable>
      <View style={styles.body}>
        <View style={styles.liveUst}>
          <Pressable
            onPress={onProfilPress ? () => onProfilPress(item) : undefined}
            onLongPress={onLongPress}
            delayLongPress={350}
            hitSlop={4}
          >
            <Text style={[styles.ad, mine && styles.adMine]} numberOfLines={1}>
              {ad}
            </Text>
          </Pressable>
          {zaman ? <Text style={styles.liveZaman}>{zaman}</Text> : null}
        </View>
        <CeviriMetinKarti
          text={item.body}
          context="room"
          varyant="kart"
          enabled={ceviriAcik}
        />
      </View>
    </Pressable>
  );
}

/** Ustten soft fade — yorumlar panel icinde kaybolmasin */
export function CanliSohbetListeFade() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(12,10,18,0.95)', 'rgba(12,10,18,0)']}
      style={styles.fade}
    />
  );
}

const styles = StyleSheet.create({
  liveRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 3,
    paddingHorizontal: 2,
    maxWidth: '96%',
  },
  liveRowMine: {
    opacity: 1,
  },
  liveRowGift: {
    maxWidth: '98%',
  },
  giftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,180,90,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,180,90,0.3)',
    maxWidth: '100%',
  },
  giftEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  giftBody: {
    ...TipografiTokenlari.body,
    color: '#FFE6C2',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
    flexShrink: 1,
  },
  liveAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  kartAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveGovde: {
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  liveUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  liveAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '800',
    fontSize: 12,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liveAdMine: {
    color: RenkTokenlari.primarySoft,
  },
  liveZaman: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
    fontSize: 10,
  },
  liveBody: {
    ...TipografiTokenlari.body,
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  kart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 16, 24, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    maxWidth: '100%',
  },
  kartMine: {
    borderColor: 'rgba(232, 64, 145, 0.28)',
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '800',
    flexShrink: 1,
  },
  adMine: { color: RenkTokenlari.primarySoft },
  mesaj: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
  },
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
  },
});
