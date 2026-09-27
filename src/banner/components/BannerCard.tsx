import React, { useCallback, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BANNER_BG,
  BANNER_BORDER,
  BANNER_BORDER_RADIUS,
  BANNER_COMPACT_MAX_HEIGHT,
  BANNER_TAP_MAX_MOVE_PX,
  resolveBannerAspect,
} from '../core/BannerConstants';
import type { BannerAction, BannerCampaign } from '../core/BannerTypes';
import { BannerImage } from './BannerImage';
import { BannerVideo } from './BannerVideo';
import { BannerContent } from './BannerContent';
import { BannerCTA } from './BannerCTA';
import { useBannerTracking } from '../hooks/useBannerTracking';
import { BannerActionService } from '../services/BannerActionService';
import { BannerTrackingService } from '../services/BannerTrackingService';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../i18n/useCeviri';

type Props = {
  banner: BannerCampaign;
  placement: string;
  screen?: string;
  sessionId: string;
  compact?: boolean;
  isVideoActive?: boolean;
  onDismiss?: (bannerId: string) => void;
  debug?: boolean;
};

export function BannerCard({
  banner,
  placement,
  screen,
  sessionId,
  compact,
  isVideoActive = true,
  onDismiss,
  debug,
}: Props) {
  const { t } = useCeviri();
  const aspect = useMemo(
    () => resolveBannerAspect(banner.size_type, banner.aspect_ratio),
    [banner.size_type, banner.aspect_ratio],
  );

  const { onVisibilityChange, trackEvent } = useBannerTracking({
    bannerId: banner.id,
    sessionId,
    placement,
    screen,
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const heightRef = useRef(0);
  const overlay = !!compact;

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      heightRef.current = e.nativeEvent.layout.height;
      onVisibilityChange(0.6);
    },
    [onVisibilityChange],
  );

  const mediaType = banner.media_type;
  const showVideo =
    (mediaType === 'VIDEO' || mediaType === 'VIDEO_TEXT') && !!banner.media_url;
  const showImage =
    (mediaType === 'IMAGE' ||
      mediaType === 'IMAGE_TEXT' ||
      mediaType === 'VIDEO_TEXT') &&
    !!banner.media_url &&
    !showVideo;
  const showGradient = mediaType === 'GRADIENT';
  const autoGorsel =
    (banner.id.startsWith('auto-event-') ||
      banner.id.startsWith('promo-') ||
      banner.id.startsWith('auto-room-')) &&
    !(banner.tags ?? []).includes('ROOM_CARD');
  const showText =
    !autoGorsel &&
    (mediaType === 'IMAGE_TEXT' ||
      mediaType === 'VIDEO_TEXT' ||
      mediaType === 'GRADIENT' ||
      !!banner.title);

  const actions = (banner.actions ?? []).filter(
    (a) => a.action_type !== 'NONE',
  );

  const runAction = useCallback(
    async (action: BannerAction) => {
      await BannerActionService.execute({
        bannerId: banner.id,
        action,
        placement,
        screen,
      });
    },
    [banner.id, placement, screen],
  );

  const onCardPress = useCallback(() => {
    const primary = actions[0];
    if (primary) void runAction(primary);
  }, [actions, runAction]);

  const handleDismiss = useCallback(() => {
    void BannerTrackingService.trackEvent({
      bannerId: banner.id,
      eventType: 'dismiss',
      placement,
      screen,
    });
    onDismiss?.(banner.id);
  }, [banner.id, onDismiss, placement, screen]);

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      style={[styles.card, compact && styles.compact]}
      onLayout={onLayout}
      accessibilityLabel={
        banner.title?.trim() ||
        (autoGorsel ? t('banner.tanitim') : banner.name) ||
        t('banner.tanitimBanner')
      }
    >
      <Pressable
        onPressIn={(e) => {
          touchStart.current = {
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
          };
        }}
        onPress={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (start) {
            const dx = Math.abs(e.nativeEvent.pageX - start.x);
            const dy = Math.abs(e.nativeEvent.pageY - start.y);
            if (dx > BANNER_TAP_MAX_MOVE_PX || dy > BANNER_TAP_MAX_MOVE_PX) {
              return;
            }
          }
          onCardPress();
        }}
      >
        <View>
          {showGradient && (
            <LinearGradient
              colors={
                (banner.gradient_json?.colors as [string, string]) ??
                ([RenkTokenlari.deepPlum, RenkTokenlari.primary] as [
                  string,
                  string,
                ])
              }
              style={[styles.gradient, { aspectRatio: aspect }]}
            />
          )}
          {showVideo && (
            <BannerVideo
              uri={banner.media_url}
              thumbnailUrl={banner.thumbnail_url}
              alt={banner.media_alt}
              aspectRatio={aspect}
              autoplay={banner.autoplay_video}
              loop={banner.loop_video}
              isActive={isVideoActive}
              onStart={() => trackEvent('video_start')}
              onComplete={() => trackEvent('video_complete')}
            />
          )}
          {showImage && (
            <BannerImage
              uri={banner.media_url}
              alt={banner.media_alt}
              aspectRatio={aspect}
              flush={overlay}
            />
          )}
          {!showVideo && !showImage && !showGradient && (
            <View
              style={[
                styles.gradient,
                { aspectRatio: aspect, backgroundColor: RenkTokenlari.surface },
              ]}
            />
          )}

          {overlay && showText && (
            <>
              <LinearGradient
                colors={['transparent', 'rgba(8,4,16,0.88)']}
                style={styles.overlayFade}
                pointerEvents="none"
              />
              <View style={styles.overlayContent} pointerEvents="box-none">
                <BannerContent banner={banner} compact overlay />
              </View>
            </>
          )}
        </View>
      </Pressable>

      {!overlay && showText && <BannerContent banner={banner} compact={compact} />}
      {!overlay && (
        <BannerCTA actions={actions} onPress={(a) => void runAction(a)} />
      )}

      {banner.dismissible && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('banner.kapatA11y')}
          style={styles.dismiss}
          onPress={handleDismiss}
          hitSlop={10}
        >
          <Ionicons name="close" size={16} color={RenkTokenlari.textMuted} />
        </Pressable>
      )}

      {debug && (
        <View style={styles.debug} pointerEvents="none" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: BANNER_BORDER_RADIUS,
    backgroundColor: BANNER_BG,
    borderWidth: 1,
    borderColor: BANNER_BORDER,
    overflow: 'hidden',
  },
  compact: {
    maxHeight: BANNER_COMPACT_MAX_HEIGHT,
  },
  gradient: {
    width: '100%',
  },
  overlayFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '35%',
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  dismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 2,
  },
  debug: {
    position: 'absolute',
    bottom: 4,
    left: 8,
  },
});
