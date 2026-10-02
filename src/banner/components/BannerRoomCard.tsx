/**
 * Feed ses odası kartı boyutunda otomatik / ROOM_CARD banner.
 * AnaSayfaFeedKart oranını (≈0.76) ve çerçeve dilini taklit eder.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  BANNER_ROOM_CARD_NUMERIC,
  resolveBannerAspect,
} from '../core/BannerConstants';
import type { BannerCampaign } from '../core/BannerTypes';
import { BannerActionService } from '../services/BannerActionService';
import { useBannerTracking } from '../hooks/useBannerTracking';
import { MedyaUriGuvenli } from '../../moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { FeedPencereCerceve } from '../../moduller/ana-sayfa/bilesenler/FeedPencereCerceve';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  banner: BannerCampaign;
  placement: string;
  screen?: string;
  sessionId: string;
  /** Simülasyon / admin — tıklama kapalı */
  interaktif?: boolean;
};

export function BannerRoomCard({
  banner,
  placement,
  screen,
  sessionId,
  interaktif = true,
}: Props) {
  const aspect = useMemo(() => {
    const a = resolveBannerAspect(banner.size_type, banner.aspect_ratio);
    return a > 0 && a < 2 ? a : BANNER_ROOM_CARD_NUMERIC;
  }, [banner.size_type, banner.aspect_ratio]);

  const { onVisibilityChange } = useBannerTracking({
    bannerId: banner.id,
    sessionId,
    placement,
    screen,
  });

  const kapak = MedyaUriGuvenli(banner.media_url || banner.thumbnail_url);
  const gradient = (banner.gradient_json?.colors as string[] | undefined) ?? [
    RenkTokenlari.deepPlum,
    RenkTokenlari.primary,
  ];
  const actions = (banner.actions ?? []).filter((a) => a.action_type !== 'NONE');
  const canli = (banner.tags ?? []).includes('LIVE') || !!banner.badge?.toUpperCase().includes('LIVE');

  const onPress = useCallback(() => {
    if (!interaktif) return;
    const primary = actions[0];
    if (!primary) return;
    void BannerActionService.execute({
      bannerId: banner.id,
      action: primary,
      placement,
      screen,
    });
  }, [actions, banner.id, interaktif, placement, screen]);

  return (
    <View
      style={styles.dis}
      onLayout={() => onVisibilityChange(0.6)}
    >
      <FeedPencereCerceve renkler={['#E84091', '#C43BFF']}>
        <Pressable
          onPress={onPress}
          disabled={!interaktif}
          style={styles.press}
          accessibilityRole="button"
          accessibilityLabel={banner.title ?? banner.name}
        >
          <View style={[styles.kart, { aspectRatio: aspect }]}>
            {kapak ? (
              <Image
                source={{ uri: kapak }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[gradient[0] ?? RenkTokenlari.deepPlum, gradient[1] ?? RenkTokenlari.primary]}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(8,4,16,0.85)']}
              style={styles.altGradient}
            />
            <View style={styles.ust}>
              {canli || banner.badge ? (
                <View style={styles.rozet}>
                  {canli ? (
                    <View style={styles.canliNokta} />
                  ) : (
                    <Ionicons name="sparkles" size={10} color="#fff" />
                  )}
                  <Text style={styles.rozetYazi} numberOfLines={1}>
                    {(banner.badge || 'LIVE').toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              {banner.label ? (
                <View style={styles.labelRozet}>
                  <Text style={styles.labelYazi} numberOfLines={1}>
                    {banner.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.alt}>
              <Text style={styles.baslik} numberOfLines={2}>
                {banner.title || banner.name}
              </Text>
              {banner.subtitle ? (
                <Text style={styles.altBaslik} numberOfLines={1}>
                  {banner.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </FeedPencereCerceve>
    </View>
  );
}

const styles = StyleSheet.create({
  dis: { flex: 1 },
  press: { borderRadius: YaricapTokenlari.lg },
  kart: {
    overflow: 'hidden',
    borderRadius: YaricapTokenlari.lg - 2,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  altGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  ust: {
    position: 'absolute',
    top: BoslukTokenlari.sm,
    left: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '60%',
  },
  canliNokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.danger,
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  labelRozet: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232,64,145,0.75)',
    maxWidth: '40%',
  },
  labelYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  alt: {
    position: 'absolute',
    left: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    bottom: BoslukTokenlari.sm,
    gap: 2,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  altBaslik: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.8)',
  },
});
