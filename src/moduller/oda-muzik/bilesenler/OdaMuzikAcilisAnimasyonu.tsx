/**
 * Müzik açılınca ekranda kart → üst müzik butonuna tatlı kayma.
 * Dock bitince kaybolur; tekrar açmak için müzik butonuna tıkla.
 */

import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { ODA_UST_BTN } from '../../ses-odalari/bilesenler/OdaButonOlculeri';
import { useCeviri } from '../../../i18n/useCeviri';

export type MuzikButonHedef = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  /** Yeni parça / müzik açılışı anahtarı — değişince animasyon yeniden */
  animKey: string;
  title: string;
  artistName?: string | null;
  coverUrl?: string | null;
  /** Müzik butonunun ekran koordinatı (measureInWindow) */
  hedef: MuzikButonHedef | null;
  onBitti: () => void;
};

const KART_W = 220;
const KART_H = 72;

function OdaMuzikAcilisAnimasyonuInner({
  animKey,
  title,
  artistName,
  coverUrl,
  hedef,
  onBitti,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { width: ekranW } = useWindowDimensions();
  const cover = MedyaUriGuvenli(coverUrl);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.86);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    const basX = (ekranW - KART_W) / 2;
    const basY = insets.top + 88;
    // Başlangıç: ekranın üst-orta
    tx.value = basX;
    ty.value = basY;
    opacity.value = 0;
    scale.value = 0.86;

    const hx = hedef?.x ?? ekranW - 12 - ODA_UST_BTN * 4;
    const hy = hedef?.y ?? insets.top + 6;
    const hw = hedef?.w ?? ODA_UST_BTN;
    const hh = hedef?.h ?? ODA_UST_BTN;
    const hedefTx = hx + hw / 2 - KART_W / 2;
    const hedefTy = hy + hh / 2 - KART_H / 2;

    opacity.value = withSequence(
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withDelay(1100, withTiming(0, { duration: 520 })),
    );
    scale.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.back) }),
      withDelay(
        1100,
        withTiming(0.22, {
          duration: 560,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
    );
    tx.value = withDelay(
      1100,
      withTiming(hedefTx, {
        duration: 560,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    ty.value = withDelay(
      1100,
      withTiming(hedefTy, {
        duration: 560,
        easing: Easing.inOut(Easing.cubic),
      }),
    );

    const t = setTimeout(() => {
      onBitti();
    }, 1100 + 580);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, hedef?.x, hedef?.y, ekranW, insets.top]);

  const stil = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.katman} pointerEvents="none">
      <Animated.View style={[styles.kart, stil]}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverBos]}>
            <Ionicons
              name="musical-notes"
              size={18}
              color={RenkTokenlari.primarySoft}
            />
          </View>
        )}
        <View style={styles.metin}>
          <Text style={styles.etiket}>{t('odaMuzik.simdiCaliyor')}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {artistName ? (
            <Text style={styles.artist} numberOfLines={1}>
              {artistName}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

export const OdaMuzikAcilisAnimasyonu = memo(OdaMuzikAcilisAnimasyonuInner);

const styles = StyleSheet.create({
  katman: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  kart: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: KART_W,
    height: KART_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(22, 16, 32, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.35)',
    shadowColor: '#E84091',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
  },
  coverBos: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metin: { flex: 1, minWidth: 0 },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  artist: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 1,
  },
});
