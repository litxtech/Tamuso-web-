import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OyunCalismaAlani } from '../../src/moduller/studio/v2/OyunCalismaAlani';
import {
  DEDE_VARLIKLAR,
  DEDE_VARSAYILAN,
  dedeAnahtar,
  dedeManifest,
  dedeYamaMetni,
  dedeYamaUygula,
  type DedeCascade,
} from '../../src/moduller/studio/v2/runtime/dede/onizleme';

const SEKME = ['Oyun', 'Sahne', 'Varlık', 'Mantık', 'Ses', 'Test'] as const;

export default function DedeStudio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sekme, setSekme] = useState<(typeof SEKME)[number]>('Oyun');
  const [oynuyor, setOynuyor] = useState(false);
  const [cascade, setCascade] = useState<DedeCascade>(DEDE_VARSAYILAN);
  const [portrait, setPortrait] = useState('');
  const [istek, setIstek] = useState('Arka planı gece yap.');
  const [ozet, setOzet] = useState<string | null>(null);
  const [anahtar, setAnahtar] = useState(0);
  const manifest = useMemo(
    () => dedeManifest({ ...cascade, portrait: portrait || undefined }),
    [cascade, portrait],
  );

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/dede/character.jpg'));
        await asset.downloadAsync();
        if (!asset.localUri || iptal) return;
        const ham = await new File(asset.localUri).base64();
        if (!iptal) setPortrait(`data:image/jpeg;base64,${ham}`);
      } catch {
        /* Portre inmezse gövde sahne içinde durur. */
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const uygula = () => {
    const yama = dedeYamaMetni(istek);
    if (!yama) {
      setOzet('Bu cümle için yama çıkmadı.');
      return;
    }
    setCascade((c) => dedeYamaUygula(c, yama));
    setAnahtar((n) => n + 1);
    setOzet(yama.operations.map((op) => `${op.operation} ${JSON.stringify(op.properties)}`).join('\n'));
  };

  if (oynuyor) {
    return (
      <View style={styles.sahne}>
        <OyunCalismaAlani
          manifest={manifest}
          urls={{}}
          allowedHosts={[]}
          paused={false}
          restartKey={anahtar}
          guvenliUst={insets.top + 8}
          guvenliAlt={insets.bottom + 8}
        />
        <Pressable style={[styles.geri, { top: insets.top + 8 }]} onPress={() => setOynuyor(false)} accessibilityRole="button">
          <Text style={styles.geriYazi}>Studio</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.kok, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.ust}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.hafif}>Geri</Text>
        </Pressable>
        <Text style={styles.ad}>DEDE</Text>
        <Text style={styles.rozet}>Playable</Text>
      </View>
      <Image source={require('../../assets/dede/cover.jpg')} style={styles.kapak} />
      <Pressable style={styles.oyna} onPress={() => setOynuyor(true)} accessibilityRole="button" accessibilityLabel="OYNAT">
        <Text style={styles.oynaYazi}>▶ OYNAT</Text>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sekme}>
        {SEKME.map((ad) => (
          <Pressable key={ad} onPress={() => setSekme(ad)} style={[styles.cip, sekme === ad && styles.cipAcik]} accessibilityRole="button">
            <Text style={styles.cipYazi}>{ad === 'Sahne' ? 'Scene' : ad === 'Varlık' ? 'Assets' : ad === 'Mantık' ? 'Logic' : ad === 'Ses' ? 'Audio' : ad === 'Oyun' ? 'Edit' : 'Test'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.govde}>
        {sekme === 'Oyun' ? (
          <>
            <Text style={styles.baslik}>Düzenle</Text>
            <Text style={styles.metin}>Küçük istekler GamePatch olur. Oyun baştan üretilmez. Bakiye TEST kredisidir.</Text>
            <TextInput value={istek} onChangeText={setIstek} style={styles.girdi} placeholderTextColor="rgba(255,255,255,0.35)" />
            <Pressable style={styles.ikincil} onPress={uygula} accessibilityRole="button">
              <Text style={styles.oynaYazi}>Yamayı uygula</Text>
            </Pressable>
            {ozet ? <Text style={styles.metin}>{ozet}</Text> : null}
          </>
        ) : null}
        {sekme === 'Sahne' ? (
          <>
            <Text style={styles.baslik}>Scene</Text>
            {manifest.scene.entities.map((e) => (
              <Text key={e.id} style={styles.metin}>{e.name} · {e.role}</Text>
            ))}
            <Text style={styles.metin}>Gök: {cascade.sky} · Kaftan: {cascade.robe} · Kristal: {cascade.gemScale}</Text>
          </>
        ) : null}
        {sekme === 'Varlık' ? (
          <>
            <Text style={styles.baslik}>Assets</Text>
            {DEDE_VARLIKLAR.map((v) => (
              <Text key={v.id} style={styles.metin}>{dedeAnahtar(v.id)} · {v.source}</Text>
            ))}
          </>
        ) : null}
        {sekme === 'Mantık' ? (
          <>
            <Text style={styles.baslik}>Logic</Text>
            <Text style={styles.metin}>BOOT → LOADING → READY → ROUND_START → POPULATE_GRID → EVALUATE → WIN → REMOVE_WINNERS → CASCADE → MULTIPLIER → RE_EVALUATE → ROUND_END → BIG_WIN → BONUS → PAUSED → ERROR</Text>
            <Text style={styles.metin}>Giriş: {manifest.gameplay.entry} · {manifest.gameplay.nodes[0]?.action}</Text>
          </>
        ) : null}
        {sekme === 'Ses' ? (
          <>
            <Text style={styles.baslik}>Audio</Text>
            <Text style={styles.metin}>symbol_drop, symbol_land, symbol_win, symbol_break, cascade, multiplier_spawn, multiplier_collect, button_press, round_start, round_end, big_win, bonus_trigger, UI_open, UI_close</Text>
            <Text style={styles.metin}>Müzik ve ortam sesi oyun içinde üretilir. Ayrı bir klip inmezse oyun sessiz uyarıyla sürer.</Text>
          </>
        ) : null}
        {sekme === 'Test' ? (
          <>
            <Text style={styles.baslik}>Test</Text>
            <Text style={styles.metin}>Başlangıç TEST 10.000. Bahis 10, 25, 50, 100. Tohum varsayılanı DEDE_TEST_001. Oyun içindeki T paneli: tohum, bakiye, çöküş, çarpan, büyük kazanç, varlık hatası, sessiz, yeniden başlat.</Text>
            <Text style={styles.metin}>Üretim cüzdanı, Coin defteri ve ajans bakiyesi bu ekrandan değişmez.</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: '#120818', paddingHorizontal: 16, gap: 10 },
  sahne: { flex: 1, backgroundColor: '#07060c' },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ad: { color: '#f6e7bf', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  hafif: { color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  rozet: { color: '#d7b45a', fontWeight: '800' },
  kapak: { width: '100%', height: 220, borderRadius: 18 },
  oyna: { minHeight: 56, borderRadius: 28, backgroundColor: '#8a5a16', alignItems: 'center', justifyContent: 'center' },
  oynaYazi: { color: '#fff8e8', fontWeight: '900', letterSpacing: 0.8 },
  sekme: { gap: 8 },
  cip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: '#241433' },
  cipAcik: { backgroundColor: '#6d3b93' },
  cipYazi: { color: '#f6e7bf', fontWeight: '700' },
  govde: { gap: 8, paddingBottom: 24 },
  baslik: { color: '#fff', fontWeight: '800', fontSize: 16 },
  metin: { color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
  girdi: { minHeight: 72, borderRadius: 12, padding: 12, color: '#fff', backgroundColor: '#241433' },
  ikincil: { minHeight: 44, borderRadius: 12, backgroundColor: '#3a2158', alignItems: 'center', justifyContent: 'center' },
  geri: { position: 'absolute', left: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(18,8,28,0.72)' },
  geriYazi: { color: '#f6e7bf', fontWeight: '800' },
});
