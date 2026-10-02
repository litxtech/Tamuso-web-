import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MesajLinkOnizlemeKarti } from '../../mesajlasma/bilesenler/MesajLinkOnizlemeKarti';
import { MesajLinkOnizlemeIste } from '../../mesajlasma/islemler/MesajLinkOnizlemeIste';
import { MesajIlkUrl } from '../../mesajlasma/yardimcilar/MesajUrlAyikla';
import type { MesajLinkOnizleme } from '../../mesajlasma/okuma/MesajlariGetir';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';

type Props = {
  metin: string | null | undefined;
  mine?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Metindeki ilk URL için OG önizleme kartı (durum, yorum, paylaşım).
 */
export function BaglantiOnizlemeBlok({ metin, mine = false, style }: Props) {
  const url = MesajIlkUrl(metin ?? '');
  const [preview, setPreview] = useState<MesajLinkOnizleme | null>(null);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!url || !OzellikBayragiAktifMi('link_preview_enabled')) {
      setPreview(null);
      setLoading(false);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    setPreview(null);
    const t = setTimeout(() => {
      void MesajLinkOnizlemeIste({ url }).then((r) => {
        if (seq !== seqRef.current) return;
        setPreview(
          r.ok
            ? r.preview
            : { url, title: null, description: null, image_url: null },
        );
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [url]);

  if (!url) return null;

  return (
    <View style={[styles.wrap, style]}>
      <MesajLinkOnizlemeKarti
        url={url}
        preview={preview}
        mine={mine}
        loading={loading && !preview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
});
