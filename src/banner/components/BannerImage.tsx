import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BANNER_BORDER_RADIUS } from '../core/BannerConstants';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../i18n/useCeviri';

type Props = {
  uri?: string | null;
  alt?: string | null;
  aspectRatio: number;
  /** Compact strip: köşeler kartla aynı (üst-only radius yok) */
  flush?: boolean;
};

export function BannerImage({ uri, alt, aspectRatio, flush }: Props) {
  const { t } = useCeviri();
  const [failed, setFailed] = useState(false);
  const safeUri = MedyaUriGuvenli(uri);
  const radius = flush
    ? undefined
    : {
        borderTopLeftRadius: BANNER_BORDER_RADIUS,
        borderTopRightRadius: BANNER_BORDER_RADIUS,
      };

  if (!safeUri || failed) {
    return <View style={[styles.fallback, { aspectRatio }, radius]} />;
  }

  return (
    <Image
      source={{ uri: safeUri }}
      style={[styles.img, { aspectRatio }, radius]}
      resizeMode="cover"
      accessibilityLabel={alt ?? t('banner.gorselA11y')}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  img: {
    width: '100%',
    backgroundColor: RenkTokenlari.surface,
  },
  fallback: {
    width: '100%',
    backgroundColor: RenkTokenlari.surface,
  },
});
