import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDil } from '../../i18n/DilSaglayici';
import { siteMetin } from '../web-tanitim/siteMetin';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { blogHtmlTemizle } from './blogHtmlTemizle';

type Blok =
  | { tur: 'h2' | 'h3' | 'p' | 'li' | 'quote'; metin: string }
  | { tur: 'img'; src: string; alt: string };

function coz(ham: string) {
  return ham
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function blogBloklari(html: string): Blok[] {
  let kaynak = blogHtmlTemizle(html);
  kaynak = kaynak.replace(/<div\b[^>]*>/gi, '<p>').replace(/<\/div>/gi, '</p>');
  const bloklar: Blok[] = [];
  const re = /<(h2|h3|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*?)\/?>/gi;
  let eslesme: RegExpExecArray | null;
  while ((eslesme = re.exec(kaynak))) {
    if (eslesme[3] != null) {
      const attrs = eslesme[3];
      const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? '';
      const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? '';
      if (src.startsWith('https://')) bloklar.push({ tur: 'img', src, alt });
      continue;
    }
    const tur = eslesme[1].toLowerCase() as 'h2' | 'h3' | 'p' | 'li' | 'blockquote';
    const metin = coz(eslesme[2] ?? '');
    if (!metin) continue;
    bloklar.push({ tur: tur === 'blockquote' ? 'quote' : tur, metin });
  }
  if (!bloklar.length) {
    const duz = coz(kaynak);
    if (duz) {
      for (const paragraf of duz.split(/\n{2,}/)) {
        const satir = paragraf.trim();
        if (satir) bloklar.push({ tur: 'p', metin: satir });
      }
    }
  }
  return bloklar;
}

const KES_KARAKTER = 720;

export function BlogHtmlGorunum({ html, kes = false }: { html: string; kes?: boolean }) {
  const { dil } = useDil();
  const s = siteMetin(dil);
  const bloklar = useMemo(() => blogBloklari(html), [html]);
  const [acik, setAcik] = useState(false);
  const uzun = useMemo(
    () => bloklar.reduce((n, b) => n + (b.tur === 'img' ? 80 : b.metin.length), 0),
    [bloklar],
  );
  const kisilabilir = kes && uzun > KES_KARAKTER;
  const kapali = kisilabilir && !acik;
  if (!bloklar.length) return null;
  return (
    <View>
      <View style={[styles.kutu, kapali && styles.kapali]}>
      {bloklar.map((blok, i) => {
        if (blok.tur === 'img') {
          return (
            <Image
              key={`g-${i}`}
              source={{ uri: blok.src }}
              accessibilityLabel={blok.alt || 'Yazı görseli'}
              style={styles.gorsel}
            />
          );
        }
        const stil =
          blok.tur === 'h2' ? styles.h2 : blok.tur === 'h3' ? styles.h3 : blok.tur === 'quote' ? styles.alinti : styles.p;
        const onek = blok.tur === 'li' ? '• ' : '';
        return (
          <Text key={`b-${i}`} style={stil}>
            {onek}
            {blok.metin}
          </Text>
        );
      })}
      </View>
      {kapali ? (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', C.bg]}
          style={styles.sis}
        />
      ) : null}
      {kisilabilir ? (
        <Pressable accessibilityRole="button" onPress={() => setAcik((v) => !v)} style={styles.daha}>
          <Text style={styles.dahaYazi}>{acik ? s.dahaAz : s.dahaFazla}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: 18 },
  h2: { color: C.text, fontSize: 24, lineHeight: 32, fontWeight: '700', marginTop: 12 },
  h3: { color: C.text, fontSize: 20, lineHeight: 28, fontWeight: '700', marginTop: 4 },
  p: { color: C.text, fontSize: 18, lineHeight: 32 },
  alinti: {
    color: C.textMuted,
    fontSize: 18,
    lineHeight: 32,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    paddingLeft: 16,
  },
  gorsel: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, marginVertical: 4 },
  kapali: { maxHeight: 460, overflow: 'hidden' },
  sis: { height: 72, marginTop: -72 },
  daha: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6 },
  dahaYazi: { color: C.primary, fontSize: 15, fontWeight: '700' },
});
