import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MesajLinkOnizlemeKarti } from './MesajLinkOnizlemeKarti';
import { MesajLinkOnizlemeIste } from '../islemler/MesajLinkOnizlemeIste';
import { MesajIlkUrl } from '../yardimcilar/MesajUrlAyikla';
import type { MesajLinkOnizleme } from '../okuma/MesajlariGetir';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  metin: string;
};

type Onbellek = {
  url: string;
  preview: MesajLinkOnizleme | null;
};

/**
 * Composer: URL yazılırken canlı link önizlemesi (debounce + edge).
 */
export function MesajComposerLinkOnizleme({ metin }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<MesajLinkOnizleme | null>(null);
  const [loading, setLoading] = useState(false);
  const [gizli, setGizli] = useState(false);
  const cacheRef = useRef<Onbellek | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!OzellikBayragiAktifMi('link_preview_enabled')) {
      setUrl(null);
      setPreview(null);
      return;
    }
    const found = MesajIlkUrl(metin);
    if (!found) {
      setUrl(null);
      setPreview(null);
      setLoading(false);
      setGizli(false);
      return;
    }
    if (gizli && url && found === url) return;
    if (found !== url) setGizli(false);
    setUrl(found);

    if (cacheRef.current?.url === found) {
      setPreview(cacheRef.current.preview);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPreview(null);
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      void MesajLinkOnizlemeIste({ url: found }).then((r) => {
        if (seq !== seqRef.current) return;
        const p = r.ok
          ? r.preview
          : { url: found, title: null, description: null, image_url: null };
        cacheRef.current = { url: found, preview: p };
        setPreview(p);
        setLoading(false);
      });
    }, 450);
    return () => clearTimeout(t);
  }, [metin, gizli, url]);

  if (!url || gizli) return null;

  return (
    <View style={styles.wrap}>
      <MesajLinkOnizlemeKarti
        url={url}
        preview={preview}
        mine={false}
        compact
        loading={loading && !preview}
        onKapat={() => setGizli(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.sm,
    backgroundColor: 'transparent',
  },
});
