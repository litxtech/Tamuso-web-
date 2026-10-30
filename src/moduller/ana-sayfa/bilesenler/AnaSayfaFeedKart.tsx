/**
 * Feed canlı kartı — hafif çizim (gölge/çoklu gradient yok).
 */

import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnaSayfaCanliNokta } from './AnaSayfaCanliNokta';
import { FeedPencereCerceve } from './FeedPencereCerceve';
import { OdaUyeAvatarYigini } from './OdaUyeAvatarYigini';
import { FEED_KART_ORANI } from '../sabitler/FeedKartOrani';
import type { FeedOggesi } from '../okuma/AnaSayfaIcerikleriniGetir';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { IcerikGuvenlikDugmesi } from '../../moderasyon/bilesenler/IcerikGuvenlikDugmesi';
import { useAuth } from '../../../contexts/AuthContext';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

const MODE_KEY: Record<string, CeviriAnahtari> = {
  party: 'modlar.parti',
  dating: 'modlar.flort',
  karaoke: 'modlar.karaoke',
  game: 'modlar.oyun',
  private: 'modlar.ozel',
  solo: 'modlar.tekli',
  pk: 'pk.baslik',
};

type Props = {
  oge: FeedOggesi;
  onPress: () => void;
  index?: number;
  aktif?: boolean;
  /** Kayıtlı akış canlı değil; dinleyici sayısı gösterilmez. */
  eskiVeri?: boolean;
};

function sayacBicimle(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function AnaSayfaFeedKartIc({ oge, onPress, eskiVeri }: Props) {
  const { t } = useCeviri();
  const { isGuest } = useAuth();
  const ses = oge.tur === 'oda';
  const contentId = oge.id.includes(':') ? oge.id.split(':')[1]! : oge.id;
  const hostAd =
    oge.host?.display_name ??
    (oge.host?.username ? `@${oge.host.username}` : t('anaSayfa.evSahibi'));
  const modKey = oge.mode && MODE_KEY[oge.mode] ? MODE_KEY[oge.mode] : null;
  const mod = modKey ? t(modKey) : null;
  const kapak = MedyaUriGuvenli(oge.cover_url);
  const hostAvatar = MedyaUriGuvenli(oge.host?.avatar_url);
  const uyeAvatarlari =
    oge.uye_avatarlari && oge.uye_avatarlari.length > 0
      ? oge.uye_avatarlari
      : hostAvatar
        ? [hostAvatar]
        : [];

  const ana = ses
    ? RenkTokenlari.primary
    : oge.popular
      ? RenkTokenlari.accent
      : RenkTokenlari.primary;
  const anaYumusak = ses
    ? RenkTokenlari.primarySoft
    : oge.popular
      ? '#FFD36B'
      : RenkTokenlari.primarySoft;
  const aura = ses
    ? (['#E84091', '#C43BFF'] as const)
    : oge.popular
      ? (['#F0B429', '#E84091'] as const)
      : (['#E84091', '#C43BFF'] as const);

  return (
    <View style={styles.dis}>
      <FeedPencereCerceve renkler={aura}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${oge.title}. ${ses ? t('anaSayfa.filtreSes') : t('anaSayfa.menuCanliYayin')}`}
          style={styles.press}
        >
          <View style={styles.kart}>
            {kapak ? (
              <Image
                source={{ uri: kapak }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.bosKapak]}>
                <Ionicons
                  name={ses ? 'mic' : 'videocam'}
                  size={36}
                  color={`${anaYumusak}44`}
                />
              </View>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(8,8,17,0.88)']}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.ust}>
              <View style={styles.ustSol}>
                <View style={[styles.rozet, { borderColor: `${anaYumusak}80` }]}>
                  {eskiVeri ? null : (
                    <AnaSayfaCanliNokta boyut={5} renk={anaYumusak} nabiz={false} />
                  )}
                  <Text style={[styles.rozetYazi, { color: anaYumusak }]}>
                    {eskiVeri
                      ? t('cevrimdisi.sonGorulen')
                      : ses
                        ? t('olusturTab.rozetSes')
                        : t('anaSayfa.canliRozet')}
                  </Text>
                </View>
                {oge.kendim ? (
                  <View style={styles.sabitRozet}>
                    <Ionicons name="pin" size={9} color="#F5E6A8" />
                    <Text style={styles.sabitYazi}>
                      {ses ? t('anaSayfa.odanRozet') : t('anaSayfa.yayininRozet')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.ustSag}>
                {!eskiVeri && oge.listener_count > 0 ? (
                  <View style={styles.sayac}>
                    <Ionicons
                      name={ses ? 'headset' : 'eye'}
                      size={10}
                      color={RenkTokenlari.textOnOverlay}
                    />
                    <Text style={styles.sayacYazi}>
                      {sayacBicimle(oge.listener_count)}
                    </Text>
                  </View>
                ) : null}
                <IcerikGuvenlikDugmesi
                  tur={ses ? 'room' : 'live'}
                  contentId={contentId}
                  roomId={ses ? contentId : null}
                  targetUserId={oge.host?.id}
                  title={oge.title}
                  isGuest={isGuest}
                  koyu
                />
              </View>
            </View>

            <View style={styles.alt}>
              {oge.popular && !ses ? (
                <View style={styles.populer}>
                  <Ionicons name="flame" size={10} color="#FFD36B" />
                  <Text style={styles.populerYazi}>{t('anaSayfa.populer')}</Text>
                </View>
              ) : mod ? (
                <Text style={[styles.mod, { color: anaYumusak }]}>
                  {mod.toUpperCase()}
                </Text>
              ) : null}
              <Text style={styles.baslik} numberOfLines={2}>
                {oge.title}
              </Text>
              {ses ? (
                <View style={styles.islem}>
                  <Ionicons name="gift" size={11} color="#F5E6A8" />
                  <Text style={styles.islemYazi}>
                    {sayacBicimle(oge.hediye_islem ?? 0)}
                  </Text>
                  <Ionicons name="game-controller" size={11} color="#C9B6FF" />
                  <Text style={styles.islemYazi}>
                    {sayacBicimle(oge.oyun_islem ?? 0)}
                  </Text>
                </View>
              ) : null}
              {ses ? (
                <View style={styles.uyeOnizleme}>
                  <OdaUyeAvatarYigini
                    avatarlar={uyeAvatarlari}
                    max={5}
                    boyut={18}
                    overlap={6}
                    borderColor={`${ana}99`}
                  />
                  <Text style={styles.hostAd} numberOfLines={1}>
                    {hostAd}
                  </Text>
                </View>
              ) : (
                <View style={styles.host}>
                  <View
                    style={[styles.avatarHalka, { borderColor: `${anaYumusak}AA` }]}
                  >
                    {hostAvatar ? (
                      <Image source={{ uri: hostAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarBos]}>
                        <Ionicons
                          name="person"
                          size={9}
                          color={RenkTokenlari.textOnOverlay}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.hostAd} numberOfLines={1}>
                    {hostAd}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </FeedPencereCerceve>
    </View>
  );
}

export const AnaSayfaFeedKart = memo(
  AnaSayfaFeedKartIc,
  (a, b) =>
    a.oge.id === b.oge.id &&
    a.oge.title === b.oge.title &&
    a.oge.listener_count === b.oge.listener_count &&
    a.oge.hediye_islem === b.oge.hediye_islem &&
    a.oge.oyun_islem === b.oge.oyun_islem &&
    a.oge.cover_url === b.oge.cover_url &&
    a.oge.tur === b.oge.tur &&
    a.oge.kendim === b.oge.kendim &&
    a.eskiVeri === b.eskiVeri &&
    a.onPress === b.onPress,
);

const styles = StyleSheet.create({
  dis: { flex: 1 },
  press: { borderRadius: YaricapTokenlari.lg },
  kart: {
    aspectRatio: FEED_KART_ORANI,
    overflow: 'hidden',
    borderRadius: YaricapTokenlari.lg - 2,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  bosKapak: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  ust: {
    position: 'absolute',
    top: BoslukTokenlari.sm,
    left: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ustSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  ustSag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.chipFill,
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sabitRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245,230,168,0.5)',
    backgroundColor: 'rgba(58,42,8,0.72)',
  },
  sabitYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#F5E6A8',
  },
  sayac: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.chipFill,
  },
  sayacYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
  },
  alt: {
    position: 'absolute',
    left: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    bottom: BoslukTokenlari.sm,
    gap: 4,
  },
  populer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
  },
  populerYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    color: '#FFD36B',
    fontWeight: '700',
  },
  mod: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
    lineHeight: 16,
  },
  islem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  islemYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
  },
  uyeOnizleme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  avatarHalka: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
  },
  hostAd: {
    ...TipografiTokenlari.micro,
    flex: 1,
    color: RenkTokenlari.textOnOverlay,
    opacity: 0.82,
    fontWeight: '600',
  },
});
