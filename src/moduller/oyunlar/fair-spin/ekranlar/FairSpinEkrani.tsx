/**
 * Fair Spin ekranı — tasarım Replit referansından; coin/sonuç sunucudan.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ModulHataSiniri } from '../../../../ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../admin/yetki/AdminYetkisiVarMi';
import { CoinYuklePaneli } from '../../../cuzdan/bilesenler/CoinYuklePaneli';
import { useCoinYuklePaneli } from '../../../cuzdan/islemler/useCoinYuklePaneli';
import {
  AUTOPLAY_GAP_MS,
  AUTOPLAY_OPTIONS,
  COUNTDOWN_STEP_MS,
  HIGH_WIN_MULT,
  HIGH_WIN_PAYOUT_MULT,
} from '../sabitler/FairSpinSabitleri';
import {
  fairSpinHataMesaji,
  fetchFairSpinConfig,
  markFairSpinRoundPlayed,
  newFairSpinIdempotencyKey,
  requestFairSpin,
  restoreUnfinishedFairSpinRound,
  warmupFairSpin,
} from '../servisler/FairSpinApi';
import type {
  FairSpinConfigPayload,
  FairSpinResult,
} from '../tipler/FairSpinTipleri';
import {
  isFairSpinSoundEnabled,
  preloadFairSpinAudio,
  setFairSpinSoundEnabled,
  stopFairSpinAudio,
} from '../ses/FairSpinAudio';
import { FairSpinWheel } from '../ui/FairSpinWheel';
import { FairSpinHighWinOverlay } from '../ui/FairSpinHighWinOverlay';
import { registerFairSpin } from '../FairSpinKayit';
import { useCeviri } from '../../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../../i18n/diller';

type Props = {
  roomId?: string | null;
  onClose?: () => void;
  embedded?: boolean;
  /** Admin oyun-test: coin düşmez */
  adminTestMode?: boolean;
};

export function FairSpinEkrani({
  roomId = null,
  onClose,
  embedded = false,
  adminTestMode = false,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil] ?? 'tr-TR';
  const formatCoins = (n: number) => Math.floor(n).toLocaleString(locale);
  const insets = useSafeAreaInsets();
  const { width, height: winH } = useWindowDimensions();
  const { profile } = useAuth();
  const isAdmin = AdminYetkisiVarMi(profile);
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

  const [config, setConfig] = useState<FairSpinConfigPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [targetSegmentId, setTargetSegmentId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FairSpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHighWin, setShowHighWin] = useState(false);
  const [soundOn, setSoundOn] = useState(isFairSpinSoundEnabled());
  const [adminTest, setAdminTest] = useState(adminTestMode);
  const [autoplayLeft, setAutoplayLeft] = useState(0);
  const [areaH, setAreaH] = useState(0);
  const [flashWin, setFlashWin] = useState<{
    key: number;
    multiplier: number;
    payout: number;
  } | null>(null);

  const pendingResultRef = useRef<FairSpinResult | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoplayGapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinLockRef = useRef(false);
  const autoplayLeftRef = useRef(0);
  const autoplayStopRef = useRef(false);
  const balanceRef = useRef(0);
  const spinningRef = useRef(false);
  const flashKeyRef = useRef(0);
  const flashOpacity = useSharedValue(0);
  const flashScale = useSharedValue(0.92);

  // Konsol ~210 + header 48 + safe — kalan alan çarka
  const consoleBudget = 210 + Math.max(insets.bottom, 10);
  const headerBudget = embedded ? 40 : 48 + insets.top;
  const availH =
    areaH > 40
      ? areaH
      : Math.max(180, winH - consoleBudget - headerBudget);
  const wheelSize = Math.min(
    300,
    Math.max(200, width - 36),
    Math.max(180, availH - 12),
  );

  const setAutoplayRemaining = useCallback((n: number) => {
    const next = Math.max(0, Math.floor(n));
    autoplayLeftRef.current = next;
    setAutoplayLeft(next);
  }, []);

  const stopAutoplay = useCallback(() => {
    autoplayStopRef.current = true;
    setAutoplayRemaining(0);
    if (autoplayGapRef.current) {
      clearTimeout(autoplayGapRef.current);
      autoplayGapRef.current = null;
    }
  }, [setAutoplayRemaining]);

  const yenileConfig = useCallback(async () => {
    const cfg = await fetchFairSpinConfig();
    setConfig(cfg);
    setBalance(cfg.balance);
    balanceRef.current = cfg.balance;
    const presets = cfg.betPresets?.length ? cfg.betPresets : [10, 50, 100, 500, 1000];
    setBetAmount((prev) => {
      if (presets.includes(prev)) return prev;
      return presets[0] ?? cfg.minBet;
    });
    return cfg;
  }, []);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    registerFairSpin();
    void preloadFairSpinAudio();
    void warmupFairSpin();
    let alive = true;
    void (async () => {
      try {
        const unfinished = await restoreUnfinishedFairSpinRound();
        if (unfinished?.result && alive) {
          setLastResult(unfinished.result);
          // Animasyon bitene kadar kazanç gizle — yalnızca bahis düşmüş bakiye
          setBalance(
            unfinished.result.balanceAfter - unfinished.result.payout,
          );
          setTargetSegmentId(unfinished.result.segmentId);
          pendingResultRef.current = unfinished.result;
          setSpinning(true);
        }
        if (alive) await yenileConfig();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoplayGapRef.current) clearTimeout(autoplayGapRef.current);
      stopFairSpinAudio();
    };
  }, [yenileConfig]);

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  const showFlashWin = useCallback(
    (res: FairSpinResult) => {
      flashKeyRef.current += 1;
      setFlashWin({
        key: flashKeyRef.current,
        multiplier: res.multiplier,
        payout: res.payout,
      });
      flashOpacity.value = 0;
      flashScale.value = 0.86;
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 720 }),
        withTiming(0, { duration: 280 }),
      );
      flashScale.value = withSequence(
        withTiming(1.06, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 220 }),
        withTiming(0.96, { duration: 280 }),
      );
    },
    [flashOpacity, flashScale],
  );

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
  }));

  const onSpinEnd = useCallback(() => {
    setSpinning(false);
    spinLockRef.current = false;
    stopFairSpinAudio();
    const res = pendingResultRef.current;
    pendingResultRef.current = null;
    setTargetSegmentId(null);
    if (!res) return;
    setLastResult(res);
    setBalance(res.balanceAfter);
    balanceRef.current = res.balanceAfter;
    void markFairSpinRoundPlayed(res.roundId);

    const inAuto = autoplayLeftRef.current > 0;
    // Her turda (özellikle oto) kazanç flaşı
    showFlashWin(res);

    if (inAuto) {
      setAutoplayRemaining(autoplayLeftRef.current - 1);
      return;
    }

    const high =
      res.multiplier >= HIGH_WIN_MULT ||
      res.payout >= res.betAmount * HIGH_WIN_PAYOUT_MULT;
    if (high && res.payout > 0) setShowHighWin(true);
    else if (res.payout > 0) setShowResult(true);
  }, [setAutoplayRemaining, showFlashWin]);

  const executeSpin = useCallback(
    async (bet: number, _cfg: FairSpinConfigPayload) => {
      const key = newFairSpinIdempotencyKey();
      const res = await requestFairSpin({
        betAmount: bet,
        idempotencyKey: key,
        roomId,
        adminTest: isAdmin && adminTest && !roomId,
      });
      if (!res.ok) {
        clearCountdown();
        setSpinning(false);
        spinLockRef.current = false;
        stopFairSpinAudio();
        stopAutoplay();
        if (res.code === 'insufficient_balance') {
          coinYukleAc();
          return;
        }
        Alert.alert(t('oyun.fairSpin'), fairSpinHataMesaji(res.hata, res.code));
        void yenileConfig();
        return;
      }
      pendingResultRef.current = res.data;
      // Çark bitene kadar kazanç/kayıp sızmasın — yalnızca bahis düşmüş bakiye
      setBalance(res.data.balanceAfter - res.data.payout);
      balanceRef.current = res.data.balanceAfter - res.data.payout;
      setTargetSegmentId(res.data.segmentId);
    },
    [
      adminTest,
      coinYukleAc,
      isAdmin,
      roomId,
      stopAutoplay,
      t,
      yenileConfig,
    ],
  );

  const handleSpin = useCallback(
    (opts?: { skipCountdown?: boolean }) => {
      if (!config || spinningRef.current || spinLockRef.current) return;
      if (config.maintenance || config.gamePaused) {
        stopAutoplay();
        Alert.alert(
          t('oyun.fairSpin'),
          config.maintenanceMessage || t('oyun.fairSpinKapali'),
        );
        return;
      }
      const bal = balanceRef.current;
      if (
        betAmount < config.minBet ||
        betAmount > config.maxBet ||
        (!(isAdmin && adminTest && !roomId) && betAmount > bal)
      ) {
        stopAutoplay();
        if (betAmount > bal) coinYukleAc();
        else Alert.alert(t('oyun.fairSpin'), t('oyun.fairSpinGecersizBahis'));
        return;
      }

      spinLockRef.current = true;
      setSpinning(true);
      setTargetSegmentId(null);
      setLastResult(null);
      setShowResult(false);
      setShowHighWin(false);
      stopFairSpinAudio();
      // Bahis anında düşsün; kazanç yalnızca çark bitince
      if (!(isAdmin && adminTest && !roomId)) {
        setBalance((b) => {
          const next = Math.max(0, b - betAmount);
          balanceRef.current = next;
          return next;
        });
      }

      const skip =
        opts?.skipCountdown === true || autoplayLeftRef.current > 0;
      if (skip) {
        clearCountdown();
        void executeSpin(betAmount, config);
        return;
      }

      let count = 3;
      setCountdown(3);
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearCountdown();
          void executeSpin(betAmount, config);
        }
      }, COUNTDOWN_STEP_MS);
    },
    [
      adminTest,
      betAmount,
      coinYukleAc,
      config,
      executeSpin,
      isAdmin,
      roomId,
      stopAutoplay,
      t,
    ],
  );

  // Oto tur zinciri: tur bitince sıradaki
  useEffect(() => {
    if (spinning || loading || !config) return;
    if (autoplayLeft <= 0) return;
    if (autoplayStopRef.current) {
      autoplayStopRef.current = false;
      setAutoplayRemaining(0);
      return;
    }
    if (autoplayGapRef.current) clearTimeout(autoplayGapRef.current);
    autoplayGapRef.current = setTimeout(() => {
      autoplayGapRef.current = null;
      handleSpin({ skipCountdown: true });
    }, AUTOPLAY_GAP_MS);
    return () => {
      if (autoplayGapRef.current) {
        clearTimeout(autoplayGapRef.current);
        autoplayGapRef.current = null;
      }
    };
  }, [
    autoplayLeft,
    config,
    handleSpin,
    loading,
    setAutoplayRemaining,
    spinning,
  ]);

  const startAutoplay = useCallback(
    (n: number) => {
      if (!config || spinning || spinLockRef.current) return;
      const freeBet = isAdmin && adminTest && !roomId;
      const maxByBalance = freeBet
        ? n
        : betAmount > 0
          ? Math.floor(balance / betAmount)
          : 0;
      const allowed = Math.min(n, Math.max(0, maxByBalance));
      if (allowed <= 0) {
        coinYukleAc();
        return;
      }
      autoplayStopRef.current = false;
      setShowResult(false);
      setShowHighWin(false);
      setAutoplayRemaining(allowed);
    },
    [
      adminTest,
      balance,
      betAmount,
      coinYukleAc,
      config,
      isAdmin,
      roomId,
      setAutoplayRemaining,
      spinning,
    ],
  );

  const presets = useMemo(
    () => config?.betPresets ?? [10, 50, 100, 500, 1000],
    [config],
  );

  if (loading || !config) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator color="#e6ce92" size="large" />
        <Text style={styles.yukleniyor}>{t('oyun.fairSpinYukleniyor')}</Text>
      </View>
    );
  }

  return (
    <ModulHataSiniri modulAdi="fair-spin" varyant="ekran">
      <LinearGradient
        colors={['#141428', '#0a0a12', '#07070c']}
        locations={[0, 0.45, 1]}
        style={[styles.root, { paddingTop: embedded ? 4 : insets.top }]}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t('oyun.fairSpin')}</Text>
          <Pressable
            onPress={() => {
              const next = !soundOn;
              setSoundOn(next);
              setFairSpinSoundEnabled(next);
            }}
            style={styles.iconBtn}
          >
            <Ionicons
              name={soundOn ? 'volume-high' : 'volume-mute'}
              size={20}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </View>

        <View
          style={styles.gameArea}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - areaH) > 2) setAreaH(h);
          }}
        >
          <View
            style={[
              styles.stageGlow,
              {
                width: wheelSize * 0.85,
                height: wheelSize * 0.85,
                borderRadius: (wheelSize * 0.85) / 2,
              },
            ]}
          />
          <FairSpinWheel
            segments={config.segments}
            spinning={spinning}
            targetSegmentId={targetSegmentId}
            countdown={countdown}
            onSpinEnd={onSpinEnd}
            size={wheelSize}
          />
          {flashWin ? (
            <Animated.View
              key={flashWin.key}
              pointerEvents="none"
              style={[styles.flashWin, flashStyle]}
            >
              <LinearGradient
                colors={
                  flashWin.payout > 0
                    ? ['rgba(230,206,146,0.95)', 'rgba(180,140,60,0.92)']
                    : ['rgba(60,60,75,0.95)', 'rgba(35,35,48,0.95)']
                }
                style={styles.flashWinInner}
              >
                <Text
                  style={[
                    styles.flashMult,
                    flashWin.payout <= 0 && { color: 'rgba(255,255,255,0.7)' },
                  ]}
                >
                  {flashWin.multiplier}x
                </Text>
                <Text
                  style={[
                    styles.flashPayout,
                    flashWin.payout <= 0 && { color: 'rgba(255,255,255,0.55)' },
                  ]}
                >
                  {flashWin.payout > 0
                    ? `+${formatCoins(flashWin.payout)}`
                    : '0'}
                </Text>
              </LinearGradient>
            </Animated.View>
          ) : null}
        </View>

        <LinearGradient
          colors={['rgba(28,28,40,0.98)', 'rgba(12,12,18,1)']}
          style={[styles.console, { paddingBottom: Math.max(insets.bottom, 10) }]}
        >
          <View style={styles.actionRow}>
            <LinearGradient
              colors={['rgba(45,45,58,0.95)', 'rgba(22,22,30,0.98)']}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>{t('oyun.fairSpinCuzdan')}</Text>
              <View style={styles.balanceRow}>
                <Ionicons name="ellipse" size={14} color="#e6ce92" />
                <Text style={styles.balanceValue}>{formatCoins(balance)}</Text>
              </View>
            </LinearGradient>
            <Pressable
              onPress={() => {
                if (autoplayLeft > 0) {
                  stopAutoplay();
                  return;
                }
                handleSpin();
              }}
              disabled={spinning && autoplayLeft <= 0}
              style={[
                styles.spinBtnWrap,
                spinning && autoplayLeft <= 0 && styles.spinBtnDisabled,
              ]}
            >
              <LinearGradient
                colors={
                  autoplayLeft > 0
                    ? ['#5a6a8a', '#3a4560']
                    : spinning
                      ? ['#9a8550', '#7a6840']
                      : ['#f0d98a', '#d4b36a', '#b8964a']
                }
                style={styles.spinBtn}
              >
                <Text style={styles.spinBtnText}>
                  {autoplayLeft > 0
                    ? `${t('oyun.fairSpinDur')} · ${autoplayLeft}`
                    : spinning
                      ? '...'
                      : t('oyun.fairSpinCevir')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.betInfo}>
            {t('oyun.fairSpinSecili', {
              tutar: formatCoins(betAmount),
              min: config.minBet,
              max: config.maxBet,
            })}
          </Text>
          <View style={styles.chips}>
            {presets.map((amount) => (
              <Pressable
                key={amount}
                disabled={spinning || autoplayLeft > 0}
                onPress={() => setBetAmount(amount)}
                style={[
                  styles.chip,
                  betAmount === amount && styles.chipActive,
                ]}
              >
                <Text style={styles.chipText}>
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.otoLabel}>{t('oyun.fairSpinOto')}</Text>
          <View style={styles.chips}>
            {AUTOPLAY_OPTIONS.map((n) => (
              <Pressable
                key={n}
                disabled={spinning || autoplayLeft > 0}
                onPress={() => startAutoplay(n)}
                style={[
                  styles.chip,
                  styles.otoChip,
                  autoplayLeft === n && styles.chipActive,
                ]}
              >
                <Text style={styles.chipText}>{n}</Text>
              </Pressable>
            ))}
          </View>

          {isAdmin && !roomId ? (
            <Pressable
              onPress={() => setAdminTest((v) => !v)}
              style={styles.adminRow}
            >
              <Ionicons
                name={adminTest ? 'flask' : 'flask-outline'}
                size={14}
                color={adminTest ? '#22d3ee' : 'rgba(255,255,255,0.4)'}
              />
              <Text
                style={[
                  styles.adminText,
                  adminTest && { color: '#22d3ee' },
                ]}
              >
                {t('oyun.fairSpinAdminTest')}
              </Text>
            </Pressable>
          ) : null}
        </LinearGradient>

        <FairSpinHighWinOverlay
          visible={showHighWin}
          multiplier={lastResult?.multiplier ?? 0}
          payout={lastResult?.payout ?? 0}
          onClose={() => setShowHighWin(false)}
        />

        <Modal
          visible={showResult}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResult(false)}
        >
          <View style={styles.resultBackdrop}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEyebrow}>{t('oyun.fairSpinIslemTamam')}</Text>
              <Text style={styles.resultMult}>{lastResult?.multiplier ?? 0}x</Text>
              <Text style={styles.resultLabel}>{t('oyun.fairSpinKazanilan')}</Text>
              <Text style={styles.resultPayout}>
                {formatCoins(lastResult?.payout ?? 0)}
              </Text>
              <Pressable
                style={styles.resultBtn}
                onPress={() => setShowResult(false)}
              >
                <Text style={styles.resultBtnText}>{t('oyun.fairSpinKapat')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <CoinYuklePaneli
          visible={coinYukleAcik}
          packages={coinPaketleri}
          locked={coinYukleKilit}
          coins={balance}
          onBuy={coinSatinAl}
          onClose={coinYukleKapat}
          upgradeAcik={coinUpgradeAcik}
          upgradeKapat={coinUpgradeKapat}
          onPaketleriYenile={coinPaketleriYenile}
        />
      </LinearGradient>
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  merkez: {
    flex: 1,
    backgroundColor: '#0a0a12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  yukleniyor: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 3,
    fontSize: 13,
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  stageGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(230,206,146,0.06)',
  },
  flashWin: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    zIndex: 20,
  },
  flashWinInner: {
    minWidth: 140,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  flashMult: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1520',
    letterSpacing: 0.5,
  },
  flashPayout: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1520',
    fontVariant: ['tabular-nums'],
  },
  console: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  balanceCard: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  balanceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  spinBtnWrap: { flex: 1.35, height: 48, borderRadius: 12, overflow: 'hidden' },
  spinBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  spinBtnDisabled: { opacity: 0.55 },
  spinBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#1a1520',
  },
  betInfo: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  chips: { flexDirection: 'row', gap: 6 },
  otoLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
  },
  otoChip: {
    backgroundColor: 'rgba(34,211,238,0.06)',
    borderColor: 'rgba(34,211,238,0.18)',
  },
  chip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    borderColor: '#e6ce92',
    backgroundColor: 'rgba(230,206,146,0.18)',
  },
  chipText: { color: 'rgba(255,255,255,0.75)', fontWeight: '800', fontSize: 11 },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  adminText: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  resultBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#14141c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  resultEyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  resultMult: { fontSize: 40, fontWeight: '300', color: '#fff', marginBottom: 16 },
  resultLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    marginBottom: 4,
  },
  resultPayout: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  resultBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d4b36a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnText: { fontWeight: '800', letterSpacing: 1, color: '#1a1520' },
});
