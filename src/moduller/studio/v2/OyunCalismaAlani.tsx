import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { KABUK_JS } from './runtime/KabukKaynak';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

export type CalismaIstatistik = { fps: number; frameMs: number; drawCalls: number | null };

type Props = {
  manifest: unknown;
  urls: Record<string, string>;
  allowedHosts: string[];
  paused: boolean;
  restartKey: number;
  guvenliUst?: number;
  guvenliAlt?: number;
  onReady?: () => void;
  onIssue?: (code: string) => void;
  onStats?: (stats: CalismaIstatistik) => void;
  onSelect?: (id: string) => void;
};

type Belge = string;

const KABUK = KABUK_JS.replace(/<\/script/gi, '<\\/script');

function sayfaHtml(motor: string) {
  const govde = motor.replace(/<\/script/gi, '<\\/script');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" /><style>html,body{margin:0;height:100%;background:#070810;overflow:hidden}#c{width:100%;height:100%;display:block}#hud{position:absolute;left:16px;top:16px;color:#f4efe6;font:600 18px sans-serif;text-shadow:0 1px 4px #000}</style></head><body><canvas id="c"></canvas><div id="hud"></div><script>${govde}</script><script>${KABUK}</script></body></html>`;
}

const KESIN = new Set([
  'ENGINE_MISSING',
  'ENGINE_INIT_FAILED',
  'RUNTIME_MANIFEST_MISSING',
  'SCENE_GRAPH_MISSING',
  'GAMEPLAY_GRAPH_MISSING',
  'WEBGL_UNAVAILABLE',
  'RUNTIME_VERSION_UNSUPPORTED',
]);

/** Motoru Metro modülü olarak çalıştırmaz; WebView içine düz script olarak koyar. */
async function motorBelgesi(): Promise<string> {
  const asset = Asset.fromModule(require('../../../../assets/studio-runtime/playcanvas-1.73.4.db'));
  await asset.downloadAsync();
  const uri = asset.localUri;
  if (!uri || !uri.startsWith('file:')) throw new Error('ENGINE_MISSING');
  const yazi = await new File(uri).text();
  if (yazi.length < 1_000_000 || !yazi.includes('.pc={')) throw new Error('ENGINE_MISSING');
  return sayfaHtml(yazi);
}

export function OyunCalismaAlani({ manifest, urls, allowedHosts, paused, restartKey, guvenliUst = 16, guvenliAlt = 16, onReady, onIssue, onStats, onSelect }: Props) {
  const { t } = useCeviri();
  const webRef = useRef<WebView>(null);
  const [belge, setBelge] = useState<Belge | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [ayrinti, setAyrinti] = useState(false);
  const [deneme, setDeneme] = useState(0);
  const hazir = useRef(false);

  useEffect(() => {
    let iptal = false;
    hazir.current = false;
    setBelge(null);
    setHata(null);
    setUyari(null);
    (async () => {
      try {
        const html = await Promise.race([
          motorBelgesi(),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('ENGINE_INIT_FAILED')), 15000)),
        ]);
        if (!iptal) setBelge(html);
      } catch (err) {
        const kod = err instanceof Error && err.message.startsWith('ENGINE') ? err.message : 'ENGINE_MISSING';
        console.log('[studio] engine', kod);
        if (!iptal) {
          setHata(kod);
          onIssue?.(kod);
        }
      }
    })();
    return () => {
      iptal = true;
    };
  }, [deneme]);

  useEffect(() => {
    if (!belge || hata) return;
    const zaman = setTimeout(() => {
      if (!hazir.current) {
        setHata('ENGINE_INIT_FAILED');
        onIssue?.('ENGINE_INIT_FAILED');
      }
    }, 20000);
    return () => clearTimeout(zaman);
  }, [belge, hata]);

  const yukle = useMemo(() => JSON.stringify({ type: 'LOAD', manifest, urls, allowedHosts }), [manifest, urls, allowedHosts]);

  const gonder = (raw: string) => {
    webRef.current?.postMessage(raw);
  };

  useEffect(() => {
    if (!hazir.current) return;
    gonder(yukle);
  }, [yukle]);

  useEffect(() => {
    if (!hazir.current) return;
    gonder(JSON.stringify({ type: 'RESTART' }));
    gonder(yukle);
  }, [restartKey]);

  useEffect(() => {
    if (!hazir.current) return;
    gonder(JSON.stringify({ type: 'SAFE', top: guvenliUst, bottom: guvenliAlt, left: 16 }));
  }, [guvenliUst, guvenliAlt]);

  useEffect(() => {
    if (!hazir.current) return;
    gonder(JSON.stringify({ type: paused ? 'PAUSE' : 'RESUME' }));
  }, [paused]);

  const mesaj = (raw: string) => {
    let data: { type?: string; code?: string; id?: string; fps?: number; frameMs?: number; drawCalls?: number | null };
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data.type === 'BOOTED') {
      hazir.current = true;
      gonder(yukle);
      gonder(JSON.stringify({ type: 'SAFE', top: guvenliUst, bottom: guvenliAlt, left: 16 }));
    }
    if (data.type === 'HAPTIC') {
      const kind = data.code;
      const titre = kind === 'big'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(kind === 'play' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      void titre.catch(() => undefined);
    }
    if (data.type === 'READY') onReady?.();
    if (data.type === 'SELECT' && data.id) onSelect?.(data.id);
    if (data.type === 'ISSUE' && data.code) {
      onIssue?.(data.code);
      if (KESIN.has(data.code)) setHata(data.code);
      else setUyari(data.code);
    }
    if (data.type === 'STATS') onStats?.({ fps: Number(data.fps ?? 0), frameMs: Number(data.frameMs ?? 0), drawCalls: data.drawCalls ?? null });
  };

  if (hata || !belge) {
    return (
      <View style={styles.bos}>
        {hata ? (
          <>
            <Text style={styles.baslik}>{t('studio.motorBaslik')}</Text>
            <Text style={styles.hata}>{t('studio.motorGovde')}</Text>
            <Pressable style={styles.dugme} onPress={() => setDeneme((n) => n + 1)} accessibilityRole="button">
              <Text style={styles.dugmeYazi}>{t('studio.tekrarDene')}</Text>
            </Pressable>
            <Pressable onPress={() => setAyrinti((v) => !v)} accessibilityRole="button">
              <Text style={styles.ayrinti}>{t('studio.ayrintilar')}</Text>
            </Pressable>
            {ayrinti ? <Text style={styles.kod}>{hata}</Text> : null}
          </>
        ) : (
          <>
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
            <Text style={styles.hata}>{t('studio.motorYukleniyor')}</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View
      style={styles.alan}
      onLayout={(e) => {
        const olcu = e.nativeEvent?.layout;
        if (!olcu || !hazir.current || olcu.width <= 0 || olcu.height <= 0) return;
        gonder(JSON.stringify({ type: 'RESIZE', width: olcu.width, height: olcu.height }));
      }}
    >
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: belge, baseUrl: 'https://tamuso-game.local' }}
        onMessage={(e: WebViewMessageEvent) => mesaj(e.nativeEvent.data)}
        onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:blank') || req.url.startsWith('https://tamuso-game.local') || req.url.startsWith('data:')}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
      />
      {uyari ? (
        <View style={[styles.uyariKutu, { bottom: guvenliAlt }]} pointerEvents="box-none">
          <Text style={styles.uyari}>{uyari.startsWith('AUDIO') ? t('studio.sesYuklenemedi') : t('studio.varlikInmedi')}</Text>
          <Pressable onPress={() => setAyrinti((v) => !v)} accessibilityRole="button">
            <Text style={styles.ayrinti}>{t('studio.ayrintilar')}</Text>
          </Pressable>
          {ayrinti ? <Text style={styles.kod}>{uyari}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alan: { ...StyleSheet.absoluteFillObject, backgroundColor: '#070810' },
  web: { ...StyleSheet.absoluteFillObject, backgroundColor: '#070810' },
  bos: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07060c', padding: 24, gap: 12 },
  baslik: { color: RenkTokenlari.text, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  hata: { color: RenkTokenlari.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  dugme: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: RenkTokenlari.primary, alignItems: 'center', justifyContent: 'center' },
  dugmeYazi: { color: '#fff', fontWeight: '700' },
  ayrinti: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  kod: { color: RenkTokenlari.textMuted, fontSize: 12 },
  uyariKutu: { position: 'absolute', left: 16, right: 88, gap: 4 },
  uyari: { color: RenkTokenlari.danger, fontWeight: '700' },
});
