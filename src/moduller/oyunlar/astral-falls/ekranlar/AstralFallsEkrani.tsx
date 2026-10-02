/**
 * Astral Falls — WebView kabuğu (referans UI birebir; veri sunucudan).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ModulHataSiniri } from '../../../../ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../contexts/AuthContext';
import { CoinYuklePaneli } from '../../../cuzdan/bilesenler/CoinYuklePaneli';
import { useCoinYuklePaneli } from '../../../cuzdan/islemler/useCoinYuklePaneli';
import { registerAstralFalls } from '../AstralFallsKayit';
import { ASTRAL_FALLS_HTML_B64 } from '../web-player/AstralFallsHtmlBundle';
import {
  astralFallsHataMesaji,
  fetchAstralFallsConfig,
  markAstralFallsRoundPlayed,
  requestAstralFallsSpin,
  warmupAstralFalls,
} from '../servisler/AstralFallsApi';

type Props = {
  roomId?: string | null;
  onClose?: () => void;
  embedded?: boolean;
  adminTestMode?: boolean;
};

function decodeHtmlBundle(b64: string): string {
  // Metro-safe: base64 → UTF-8 (RN'de atob + percent decode)
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  try {
    return decodeURIComponent(escape(out));
  } catch {
    return out;
  }
}

function injectHost(msg: Record<string, unknown>): string {
  return `(function(){try{window.__astralHost&&window.__astralHost(${JSON.stringify(
    msg,
  )});}catch(e){} true;})();`;
}

export function AstralFallsEkrani({
  roomId = null,
  onClose,
  embedded = false,
  adminTestMode = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { patchWallet } = useAuth();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => decodeHtmlBundle(ASTRAL_FALLS_HTML_B64), []);
  const {
    acik: coinYukleAcik,
    ac: coinYukleAc,
    kapat: coinYukleKapat,
    packages: coinPaketleri,
    purchaseLocked: coinYukleKilit,
    satinAl: coinSatinAl,
    paketleriYenile: coinPaketleriYenile,
    upgradeAcik: coinUpgradeAcik,
    upgradeKapat: coinUpgradeKapat,
  } = useCoinYuklePaneli();

  const pushToWeb = useCallback((msg: Record<string, unknown>) => {
    webRef.current?.injectJavaScript(injectHost(msg));
  }, []);

  const yenileBakiye = useCallback(async () => {
    const cfg = await fetchAstralFallsConfig();
    patchWallet({ coins: cfg.balance });
    pushToWeb({
      type: 'init',
      balance: cfg.balance,
      freeSpins: cfg.freeSpins,
      freeBet: cfg.freeBet,
    });
    return cfg;
  }, [patchWallet, pushToWeb]);

  useEffect(() => {
    registerAstralFalls();
    void warmupAstralFalls();
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = String(msg.type ?? '');

      if (type === 'ready') {
        setReady(true);
        void yenileBakiye();
        return;
      }

      if (type === 'refreshBalance') {
        void yenileBakiye();
        return;
      }

      if (type === 'markPlayed') {
        const roundId = String(msg.roundId ?? '');
        void markAstralFallsRoundPlayed(roundId);
        void yenileBakiye();
        return;
      }

      if (type === 'requestSpin') {
        const idempotencyKey = String(msg.idempotencyKey ?? '');
        const betAmount = Number(msg.betAmount ?? 0);
        const freeMode = msg.freeMode === true;
        void (async () => {
          const res = await requestAstralFallsSpin({
            betAmount,
            idempotencyKey,
            roomId,
            freeMode,
            adminTest: adminTestMode,
          });
          if (!res.ok) {
            if (res.code === 'insufficient_balance') coinYukleAc();
            pushToWeb({
              type: 'spinResult',
              ok: false,
              idempotencyKey,
              error: astralFallsHataMesaji(res.hata, res.code),
              code: res.code,
            });
            void yenileBakiye();
            return;
          }
          const mid = Math.max(
            0,
            res.data.balanceAfter - Math.floor(res.data.payout),
          );
          patchWallet({ coins: mid });
          pushToWeb({
            type: 'spinResult',
            ok: true,
            idempotencyKey,
            plan: {
              initialGrid: res.data.initialGrid,
              cascades: res.data.cascades,
              payout: res.data.payout,
              scatterCount: res.data.scatterCount,
              freeSpinsAwarded: res.data.freeSpinsAwarded,
              multiplierTotal: res.data.multiplierTotal,
            },
            balanceAfter: res.data.balanceAfter,
            roundId: res.data.roundId,
            remainingFreeSpins: res.data.remainingFreeSpins,
            freeBet: res.data.freeBet,
          });
        })();
      }
    },
    [
      adminTestMode,
      coinYukleAc,
      patchWallet,
      pushToWeb,
      roomId,
      yenileBakiye,
    ],
  );

  if (!html) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator color="#e8c691" size="large" />
        <Text style={styles.yukleniyor}>Astral Falls yükleniyor</Text>
      </View>
    );
  }

  return (
    <ModulHataSiniri modulAdi="astral-falls" varyant="ekran">
      <View
        style={[
          styles.root,
          { paddingTop: embedded ? 0 : insets.top },
        ]}
      >
        {!embedded ? (
          <View style={styles.bar}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#f0dfbd" />
            </Pressable>
            <Text style={styles.barTitle}>ASTRAL FALLS</Text>
            <View style={styles.iconBtn} />
          </View>
        ) : null}
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html, baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : undefined }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          style={styles.web}
          onLoadEnd={() => {
            if (!ready) {
              // ready mesajı gelmezse yine de config gönder
              void yenileBakiye();
            }
          }}
        />
        <CoinYuklePaneli
          visible={coinYukleAcik}
          packages={coinPaketleri}
          locked={coinYukleKilit}
          coins={0}
          onBuy={coinSatinAl}
          onClose={coinYukleKapat}
          upgradeAcik={coinUpgradeAcik}
          upgradeKapat={coinUpgradeKapat}
          onPaketleriYenile={coinPaketleriYenile}
        />
      </View>
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111a2b' },
  web: { flex: 1, backgroundColor: '#111a2b' },
  bar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(221,199,159,0.12)',
    backgroundColor: 'rgba(13,24,39,0.95)',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTitle: {
    color: '#f0dfbd',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  merkez: {
    flex: 1,
    backgroundColor: '#111a2b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  yukleniyor: { color: 'rgba(240,223,189,0.55)', fontSize: 12, letterSpacing: 2 },
  hata: { color: '#e8c691', textAlign: 'center' },
  btn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#c99d63',
  },
  btnText: { color: '#172332', fontWeight: '700' },
});
