import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CamArkaplan } from '../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogHtmlGorunum } from './BlogHtmlGorunum';

export type BlogAiOnizleme = { baslik: string; html: string; ozet: string };

type Props = {
  baslik: string;
  calisiyor: boolean;
  onizleme: BlogAiOnizleme | null;
  kapat: () => void;
  gonder: (istek: string) => void;
};

function okunur(html: string) {
  return html
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function BlogAiKapisi({ baslik, calisiyor, onizleme, kapat, gonder }: Props) {
  const [istek, setIstek] = useState('');
  const [tam, setTam] = useState(false);
  const okumaRef = useRef<ScrollView | null>(null);
  const metin = useMemo(() => okunur(onizleme?.html ?? ''), [onizleme?.html]);
  const kelime = metin ? metin.split(/\s+/).filter(Boolean).length : 0;
  const dakika = kelime ? Math.max(1, Math.round(kelime / 180)) : 0;

  useEffect(() => {
    if (!onizleme?.html) return;
    if (calisiyor) okumaRef.current?.scrollToEnd({ animated: false });
    else okumaRef.current?.scrollTo({ y: 0, animated: false });
  }, [onizleme?.html, calisiyor]);

  return (
    <View style={styles.kabuk}>
      <CamArkaplan
        intensity={42}
        tint="dark"
        fallbackColor="rgba(14, 10, 28, 0.55)"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.icerik}>
        <View style={styles.ust}>
          <View style={styles.baslikSatir}>
            <Text style={styles.rozet}>{calisiyor ? 'YAZIYOR' : 'AI'}</Text>
            <Text style={styles.baslik} numberOfLines={1}>DeepSeek · {baslik}</Text>
          </View>
          <View style={styles.ustAksiyon}>
            {metin ? (
              <Pressable onPress={() => setTam(true)} hitSlop={8} accessibilityLabel="Tam ekranda oku">
                <Text style={styles.aksiyon}>Tam ekran</Text>
              </Pressable>
            ) : null}
            {istek.trim() ? (
              <Pressable onPress={() => setIstek('')} hitSlop={8} accessibilityLabel="Komutu temizle">
                <Text style={styles.aksiyon}>Temizle</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={kapat} hitSlop={8} accessibilityLabel="Kapat">
              <Text style={styles.aksiyon}>Kapat</Text>
            </Pressable>
          </View>
        </View>

        {onizleme?.baslik || metin || calisiyor ? (
          <View style={styles.okuma}>
            <View style={styles.okumaUst}>
              <Text style={styles.okumaEtiket}>{calisiyor ? 'Önizleme' : 'Okuma'}</Text>
              {dakika ? <Text style={styles.okumaEtiket}>{dakika} dk</Text> : null}
            </View>
            {onizleme?.baslik ? <Text style={styles.onBaslik}>{onizleme.baslik}</Text> : null}
            <ScrollView
              ref={okumaRef}
              style={styles.okumaKaydir}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {metin ? (
                <Text style={styles.okumaMetin}>{metin}</Text>
              ) : (
                <Text style={styles.okumaEtiket}>İlk cümle geliyor…</Text>
              )}
            </ScrollView>
          </View>
        ) : null}

        <TextInput
          value={istek}
          onChangeText={setIstek}
          placeholder="Konuyu yaz, hemen başlasın"
          placeholderTextColor="rgba(244,241,234,0.45)"
          style={styles.girdi}
          multiline
          autoFocus
          editable={!calisiyor}
          maxLength={4000}
        />
        <Pressable
          style={[styles.dugme, calisiyor && styles.soluk]}
          disabled={calisiyor}
          onPress={() => gonder(istek.trim())}
          accessibilityLabel="DeepSeek yazsın"
        >
          {calisiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.dugmeYazi}>Yaz</Text>}
        </Pressable>
      </View>

      <Modal visible={tam} animationType="fade" transparent onRequestClose={() => setTam(false)}>
        <View style={styles.tamPerde}>
          <CamArkaplan
            intensity={56}
            tint="dark"
            fallbackColor="rgba(8, 6, 16, 0.82)"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.tamUst}>
            <Text style={styles.baslik}>Okuma</Text>
            <Pressable onPress={() => setTam(false)} hitSlop={8} accessibilityLabel="Tam ekranı kapat">
              <Text style={styles.aksiyon}>Kapat</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.tamGovde} keyboardShouldPersistTaps="handled">
            {onizleme?.baslik ? <Text style={styles.tamBaslik}>{onizleme.baslik}</Text> : null}
            {onizleme?.ozet ? <Text style={styles.tamOzet}>{onizleme.ozet}</Text> : null}
            {dakika ? <Text style={styles.okumaEtiket}>{dakika} dk okuma</Text> : null}
            {onizleme?.html && !calisiyor ? (
              <BlogHtmlGorunum html={onizleme.html} />
            ) : (
              <Text style={styles.tamMetin}>{metin}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kabuk: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 160, 255, 0.35)',
    overflow: 'hidden',
    maxHeight: '58%',
  },
  icerik: { padding: 12, gap: 8 },
  ust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  rozet: {
    color: '#d7c6ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    borderWidth: 1,
    borderColor: 'rgba(186, 160, 255, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(120, 80, 220, 0.25)',
  },
  baslik: { color: R.text, fontWeight: '700', flexShrink: 1 },
  ustAksiyon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aksiyon: { color: '#d7c6ff', fontSize: 12, fontWeight: '700' },
  okuma: {
    borderWidth: 1,
    borderColor: 'rgba(186, 160, 255, 0.28)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    gap: 6,
  },
  okumaUst: { flexDirection: 'row', justifyContent: 'space-between' },
  okumaEtiket: { color: 'rgba(244,241,234,0.62)', fontSize: 12 },
  onBaslik: { color: R.text, fontSize: 16, fontWeight: '700' },
  okumaKaydir: { maxHeight: 168 },
  okumaMetin: { color: R.text, fontSize: 15, lineHeight: 22 },
  girdi: {
    borderWidth: 1,
    borderColor: 'rgba(186, 160, 255, 0.28)',
    borderRadius: 12,
    color: R.text,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 72,
    textAlignVertical: 'top',
  },
  dugme: {
    backgroundColor: 'rgba(124, 77, 255, 0.85)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dugmeYazi: { color: '#fff', fontWeight: '700' },
  soluk: { opacity: 0.7 },
  tamPerde: { flex: 1 },
  tamUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  tamGovde: { padding: 20, paddingBottom: 48, gap: 12 },
  tamBaslik: { color: R.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  tamOzet: { color: 'rgba(244,241,234,0.75)', fontSize: 16, lineHeight: 24 },
  tamMetin: { color: R.text, fontSize: 18, lineHeight: 30 },
});
