import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  MedyaUriKucuk,
  MedyaUriOnizlemeGuvenli,
} from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  /** Hedef kutu genişliği — render/image için */
  genislik?: number;
  /** Hedef kutu yüksekliği — render/image için */
  yukseklik?: number;
  accessibilityLabel?: string;
  onHata?: () => void;
  children?: React.ReactNode;
};

/**
 * Profil kapak/avatar küçük önizleme.
 * Supabase render ile küçültülmüş URL; olmazsa orijinal; ikisi de olmazsa children.
 */
export function ProfilOnizlemeGorseli({
  uri,
  style,
  genislik,
  yukseklik,
  accessibilityLabel,
  onHata,
  children,
}: Props) {
  const orijinal = MedyaUriOnizlemeGuvenli(uri);
  const kucuk = useMemo(() => {
    if (!orijinal) return null;
    if (/^(file|content|ph|assets-library):/i.test(orijinal)) return orijinal;
    return MedyaUriKucuk(orijinal, { w: genislik, h: yukseklik });
  }, [orijinal, genislik, yukseklik]);

  const [asama, setAsama] = useState<'kucuk' | 'orijinal' | 'yok'>('kucuk');

  useEffect(() => {
    setAsama(kucuk ? 'kucuk' : orijinal ? 'orijinal' : 'yok');
  }, [kucuk, orijinal]);

  const aktif =
    asama === 'kucuk' ? kucuk : asama === 'orijinal' ? orijinal : null;

  if (!aktif) {
    return (
      <View style={[styles.kutu, style]} collapsable={false}>
        {children ?? null}
      </View>
    );
  }

  return (
    <View style={[styles.kutu, style]} collapsable={false}>
      <Image
        key={`${asama}:${aktif}`}
        source={{ uri: aktif }}
        style={styles.img}
        resizeMode="cover"
        accessibilityLabel={accessibilityLabel}
        onError={() => {
          if (asama === 'kucuk' && orijinal && orijinal !== aktif) {
            setAsama('orijinal');
            return;
          }
          setAsama('yok');
          onHata?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  img: {
    width: '100%',
    height: '100%',
  },
});
