import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import type { BannerCampaign } from '../core/BannerTypes';
import { BannerCard } from './BannerCard';
import { BannerRoomCard } from './BannerRoomCard';
import { BANNER_CAROUSEL_DEFAULT_MS } from '../core/BannerConstants';
import { bannerOdaKartMi } from '../core/BannerPlacementEngine';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  banners: BannerCampaign[];
  placement: string;
  screen?: string;
  sessionId: string;
  compact?: boolean;
  onDismiss?: (bannerId: string) => void;
  /** Admin simülasyon — tıklama kapalı */
  interaktif?: boolean;
};

/** Yatay şerit carousel — oda kartı karışmaz, tam genişlik */
function YataySeritCarousel({
  banners,
  placement,
  screen,
  sessionId,
  compact,
  onDismiss,
}: {
  banners: BannerCampaign[];
  placement: string;
  screen?: string;
  sessionId: string;
  compact?: boolean;
  onDismiss?: (bannerId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const autoMs = BANNER_CAROUSEL_DEFAULT_MS;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (banners.length <= 1 || paused || width <= 0) return;
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      indexRef.current = next;
      setIndex(next);
    }, autoMs);
    return () => clearInterval(id);
  }, [banners.length, paused, autoMs, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.max(0, Math.min(banners.length - 1, Math.round(x / width)));
    indexRef.current = i;
    setIndex(i);
  };

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <View style={styles.seritWrap} onLayout={onLayout}>
        <BannerCard
          banner={banners[0]}
          placement={placement}
          screen={screen}
          sessionId={sessionId}
          compact={compact}
          isVideoActive
          onDismiss={onDismiss}
        />
      </View>
    );
  }

  return (
    <View style={styles.seritWrap} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={(e) => {
            onScrollEnd(e);
            setPaused(false);
          }}
          decelerationRate="fast"
          style={{ width }}
        >
          {banners.map((b, i) => (
            <View key={b.id} style={{ width }}>
              <BannerCard
                banner={b}
                placement={placement}
                screen={screen}
                sessionId={sessionId}
                compact={compact}
                isVideoActive={i === index}
                onDismiss={onDismiss}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.dots}>
        {banners.map((b, i) => (
          <View
            key={b.id}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

/** Oda kartı satırı — feed ızgarası; yatay şeritle aynı satırda olmaz */
function OdaKartSatiri({
  banners,
  placement,
  screen,
  sessionId,
  interaktif,
}: {
  banners: BannerCampaign[];
  placement: string;
  screen?: string;
  sessionId: string;
  interaktif: boolean;
}) {
  if (banners.length === 0) return null;
  return (
    <View style={styles.roomRow}>
      {banners.slice(0, 2).map((b) => (
        <View key={b.id} style={styles.roomCol}>
          <BannerRoomCard
            banner={b}
            placement={placement}
            screen={screen}
            sessionId={sessionId}
            interaktif={interaktif}
          />
        </View>
      ))}
      {banners.length === 1 ? <View style={styles.roomCol} /> : null}
    </View>
  );
}

/**
 * Yatay (şerit) ve oda kartı ölçüleri ayrı satırlarda.
 * Aynı carousel’de karışmaz → boşluk / oran bozulması olmaz.
 */
export function BannerCarousel({
  banners,
  placement,
  screen,
  sessionId,
  compact,
  onDismiss,
  interaktif = true,
}: Props) {
  const { seritler, odaKartlari } = useMemo(() => {
    const serit: BannerCampaign[] = [];
    const oda: BannerCampaign[] = [];
    for (const b of banners) {
      if (bannerOdaKartMi(b)) oda.push(b);
      else serit.push(b);
    }
    return { seritler: serit, odaKartlari: oda };
  }, [banners]);

  if (seritler.length === 0 && odaKartlari.length === 0) return null;

  return (
    <View style={styles.kok}>
      {seritler.length > 0 ? (
        <YataySeritCarousel
          banners={seritler}
          placement={placement}
          screen={screen}
          sessionId={sessionId}
          compact={compact}
          onDismiss={onDismiss}
        />
      ) : null}
      {odaKartlari.length > 0 ? (
        <OdaKartSatiri
          banners={odaKartlari}
          placement={placement}
          screen={screen}
          sessionId={sessionId}
          interaktif={interaktif}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kok: {
    width: '100%',
    gap: BoslukTokenlari.sm,
  },
  seritWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  roomRow: {
    width: '100%',
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  roomCol: {
    flex: 1,
    minWidth: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: RenkTokenlari.primarySoft,
    width: 14,
  },
});
