/**
 * ZEUS — oynanabilir ekran.
 * Sonuç sunucuda üretilir; client yalnızca oynatır.
 * Admin oyun-test (oda yok) coin düşürmez.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModulHataSiniri } from '../../../../ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../admin/yetki/AdminYetkisiVarMi';
import { CoinYuklePaneli } from '../../../cuzdan/bilesenler/CoinYuklePaneli';
import { useCoinYuklePaneli } from '../../../cuzdan/islemler/useCoinYuklePaneli';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { BetSelector } from '../../kaskad/ui/BetSelector';
import { GameFooter } from '../../kaskad/ui/GameFooter';
import type { SpinButtonState } from '../../kaskad/ui/SpinButton';
import {
  beginZeusAudioSession,
  playZeusSfx,
  preloadZeusAudio,
  setZeusVoiceDuck,
  startZeusCountUp,
  startZeusMusic,
  stopZeusCountUp,
  stopAllZeusAudio,
} from '../ses/ZeusAudio';
import { ZeusArkaPlan } from '../arkaplan/ZeusArkaPlan';
import { preloadZeusAssets, resetZeusVisualCache, zeusVisualsCached } from '../assets/preloadZeusAssets';
import { UiImages } from '../assets/VisualAssets';
import {
  markZeusRoundPlayed,
  newZeusIdempotencyKey,
  requestZeusSpin,
  restoreUnfinishedZeusRound,
  warmupZeusSpin,
} from '../servisler/ZeusApi';
import {
  DEFAULT_MATH_CONFIG,
  FAST_SPEED_FACTOR,
  GAME_DISPLAY_NAME,
  HIGH_SYMBOLS,
  LOW_SYMBOLS,
  SYMBOL_LABELS,
  WIN_TIER_LABELS,
  clampAutoplayTours,
  maxAffordableAutoplayTours,
} from '../config/ZeusSabitleri';
import {
  dropDistancesBetween,
  dropDistancesFromAbove,
} from '../../ortak/grid/DusmeMesafeleri';
import { createEmptyGrid, generateInitialGrid } from '../grid/GridGenerator';
import { isEmptyInstanceId } from '../symbols/SymbolRules';
import { ZeusKarakter } from '../karakter/ZeusKarakter';
import { clampBet } from '../math/Paytable';
import { createPlaybackController } from '../motor/PlaybackEngine';
import { createSeededRng } from '../rng/SeededRng';
import { registerZeus } from '../ZeusKayit';
import type {
  GridMatrix,
  PerformanceProfile,
  ZeusPhase,
  ZeusSpinResult,
  ZeusSymbolType,
  ZeusWinTier,
} from '../tipler/ZeusTipleri';
import { GameBoard } from '../ui/GameBoard';
import { ZeusBaslik } from '../ui/ZeusBaslik';
import { ZeusKazanc } from '../ui/ZeusKazanc';
import { ZeusOnYukleme } from '../ui/ZeusOnYukleme';

export type ZeusEkraniProps = {
  roomId?: string | null;
  onClose: () => void;
  voiceActive?: boolean;
  /** Yalnızca Admin → Oyun testi. */
  adminTestMode?: boolean;
  /** Ses odası kartının içinde — üstte oda görünür. */
  embedded?: boolean;
};

function ZeusEkraniGovde({
  roomId = null,
  onClose,
  voiceActive = true,
  adminTestMode = false,
  embedded = false,
}: ZeusEkraniProps) {
  const insets = useSafeAreaInsets();
  const { wallet, profile, patchWallet } = useAuth();
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
  const isAdmin = AdminYetkisiVarMi(profile);
  const isAdminTest = isAdmin && adminTestMode && !roomId;
  const [ready, setReady] = useState(false);
  const [imagesWarmed, setImagesWarmed] = useState(zeusVisualsCached);
  const [preloadOk, setPreloadOk] = useState(zeusVisualsCached);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadPct, setLoadPct] = useState(8);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [spinHata, setSpinHata] = useState<string | null>(null);
  const [stageH, setStageH] = useState(0);

  const config = DEFAULT_MATH_CONFIG;
  const [bet, setBet] = useState(() =>
    clampBet(config, config.betPresets[1] ?? config.minBet),
  );
  const balance = wallet?.coins ?? 0;
  const [grid, setGrid] = useState<GridMatrix>(() =>
    createEmptyGrid(config.columns, config.rows),
  );
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [destroyingIds, setDestroyingIds] = useState<Set<string>>(new Set());
  const [dropping, setDropping] = useState<Record<string, number>>({});
  const [anticipation, setAnticipation] = useState(false);
  const [phase, setPhase] = useState<ZeusPhase>('BOOT');
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<ZeusSpinResult | null>(null);
  const [multTotal, setMultTotal] = useState(1);
  const [bonusMode, setBonusMode] = useState(false);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [persistentMult, setPersistentMult] = useState(0);
  const [autoplayLeft, setAutoplayLeft] = useState(0);
  const [bigWin, setBigWin] = useState<{
    tier: ZeusWinTier;
    amount: number;
  } | null>(null);
  const [retriggerToast, setRetriggerToast] = useState<number | null>(null);
  const [bonusToast, setBonusToast] = useState<number | null>(null);
  const [panelWin, setPanelWin] = useState(0);
  const [panelBase, setPanelBase] = useState(0);
  const [panelMult, setPanelMult] = useState(1);
  const [panelTier, setPanelTier] = useState<ZeusWinTier>('NONE');
  const [winSticky, setWinSticky] = useState(false);

  const performance: PerformanceProfile = 'MEDIUM';
  /** Varsayılan turbo — slotlar hızla iner, turlar kısa */
  const speedFactor = reduceMotion ? FAST_SPEED_FACTOR : 0.42;

  const remainingRef = useRef(0);
  const persistentRef = useRef(0);
  const autoplayStop = useRef(false);
  const autoplayLeftRef = useRef(0);
  const spinningRef = useRef(false);
  const leavingRef = useRef(false);
  const gridRef = useRef(grid);
  const playbackCancelRef = useRef<(() => void) | null>(null);
  const pendingSpinKeyRef = useRef<string | null>(null);
  const unfinishedRef = useRef<ZeusSpinResult | null>(null);

  gridRef.current = grid;

  const setAutoplayRemaining = useCallback((n: number) => {
    const next = Math.max(0, Math.floor(n));
    autoplayLeftRef.current = next;
    setAutoplayLeft(next);
  }, []);

  const playResult = useCallback(
    async (result: ZeusSpinResult) => {
      setSpinning(true);
      spinningRef.current = true;
      setLastResult(result);
      setMultTotal(Math.max(1, result.appliedMultiplier));
      setMatchedIds(new Set());
      setDestroyingIds(new Set());
      setDropping({});
      setAnticipation(false);
      setBigWin(null);
      setPanelWin(0);
      setPanelBase(0);
      setPanelMult(1);
      setPanelTier('NONE');
      setWinSticky(false);

      const initialDrop = dropDistancesFromAbove(
        result.initialGrid,
        isEmptyInstanceId,
      );
      for (const k of Object.keys(initialDrop)) {
        initialDrop[k] = Math.min(initialDrop[k] ?? 0, 1);
      }

      const controller = createPlaybackController({
        speedFactor,
        onPhase: (p, meta) => {
          setPhase(p);
          switch (p) {
            case 'LANDING':
              setDropping(
                (meta?.dropping as Record<string, number> | undefined) ??
                  initialDrop,
              );
              setGrid(
                (meta?.grid as GridMatrix | undefined) ?? result.initialGrid,
              );
              void playZeusSfx('symbols_falling');
              break;
            case 'EVALUATE':
              setDropping({});
              void playZeusSfx('symbol_land');
              break;
            case 'WIN_HIGHLIGHT': {
              const ids = new Set(
                (meta?.matched as { cellIds: string[] }[] | undefined)?.flatMap(
                  (m) => m.cellIds,
                ) ?? [],
              );
              setMatchedIds(ids);
              const stepWin = Number(meta?.win ?? 0);
              if (stepWin > 0) {
                setPanelWin((prev) => {
                  const next = prev + stepWin;
                  setPanelBase(next);
                  setPanelMult(1);
                  setPanelTier(next >= bet * 20 ? 'NICE' : 'NORMAL');
                  setWinSticky(true);
                  return next;
                });
              }
              void playZeusSfx('symbol_match');
              if (ids.size >= 10) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              break;
            }
            case 'EXPLOSION':
              setDestroyingIds(new Set((meta?.removedIds as string[]) ?? []));
              void playZeusSfx('symbol_destroy');
              void playZeusSfx('character_cast');
              void playZeusSfx('lightning');
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case 'CASCADE': {
              setMatchedIds(new Set());
              setDestroyingIds(new Set());
              const after =
                (meta?.grid as GridMatrix | undefined) ??
                (meta?.gridAfter as GridMatrix | undefined) ??
                result.initialGrid;
              const fromEngine = meta?.dropping as
                | Record<string, number>
                | undefined;
              const droppingMap =
                fromEngine ??
                dropDistancesBetween(
                  gridRef.current,
                  after,
                  isEmptyInstanceId,
                );
              for (const k of Object.keys(droppingMap)) {
                droppingMap[k] = Math.min(droppingMap[k] ?? 0, 3);
              }
              setDropping(droppingMap);
              setGrid(after);
              void playZeusSfx('cascade_start');
              break;
            }
            case 'MULTIPLIER':
              setDropping({});
              setMultTotal(Math.max(1, Number(meta?.applied ?? result.appliedMultiplier)));
              setPanelBase(Number(meta?.base ?? result.sequenceBaseWin));
              setPanelMult(Math.max(1, Number(meta?.applied ?? result.appliedMultiplier)));
              setPanelWin(Number(meta?.total ?? result.totalWin));
              setPanelTier(result.winTier === 'NONE' ? 'NORMAL' : result.winTier);
              setWinSticky(result.totalWin > 0);
              void playZeusSfx('multiplier_spawn');
              {
                const maxOrb = Math.max(
                  0,
                  ...(((meta?.orbs as number[] | undefined) ?? result.orbValues)),
                );
                if (maxOrb >= 25) void playZeusSfx('multiplier_large');
                else if (maxOrb >= 8) void playZeusSfx('multiplier_medium');
                else void playZeusSfx('multiplier_small');
              }
              void playZeusSfx('multiplier_collect');
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              break;
            case 'SCATTER_CHECK':
              setDropping({});
              setAnticipation(Number(meta?.scatterCount ?? 0) >= 3);
              if (result.totalWin > 0) {
                setPanelWin(result.totalWin);
                setPanelBase(result.sequenceBaseWin);
                setPanelMult(Math.max(1, result.appliedMultiplier));
                setPanelTier(result.winTier === 'NONE' ? 'NORMAL' : result.winTier);
                setWinSticky(true);
                void startZeusCountUp();
                if (
                  result.winTier !== 'BIG' &&
                  result.winTier !== 'MEGA' &&
                  result.winTier !== 'SENSATIONAL'
                ) {
                  void playZeusSfx('normal_win');
                }
              }
              if (Number(meta?.scatterCount ?? 0) > 0) {
                void playZeusSfx('scatter_land');
              }
              if (Number(meta?.scatterCount ?? 0) >= 3) {
                void playZeusSfx('scatter_anticipation');
              }
              break;
            case 'FREE_SPIN_TRIGGER':
              setAnticipation(false);
              setBonusToast(Number(meta?.freeSpins ?? result.bonus?.freeSpins ?? 0));
              setTimeout(() => setBonusToast(null), 1800);
              void playZeusSfx('bonus_trigger');
              void playZeusSfx('bonus_intro');
              void playZeusSfx('free_spin_start');
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              break;
            case 'RETRIGGER':
              setRetriggerToast(Number(meta?.extra ?? result.retriggerSpins));
              setTimeout(() => setRetriggerToast(null), 1800);
              void playZeusSfx('retrigger');
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              break;
            case 'BIG_WIN':
              setBigWin({
                tier: (meta?.tier as ZeusWinTier) ?? result.winTier,
                amount: Number(meta?.amount ?? result.totalWin),
              });
              setPanelWin(Number(meta?.amount ?? result.totalWin));
              setPanelBase(result.sequenceBaseWin);
              setPanelMult(Math.max(1, result.appliedMultiplier));
              setPanelTier((meta?.tier as ZeusWinTier) ?? result.winTier);
              setWinSticky(true);
              {
                const tier = (meta?.tier as ZeusWinTier) ?? result.winTier;
                void startZeusCountUp();
                if (tier === 'SENSATIONAL') void playZeusSfx('legendary_win');
                else if (tier === 'MEGA') void playZeusSfx('mega_win');
                else if (tier === 'BIG') void playZeusSfx('big_win');
                else void playZeusSfx('normal_win');
              }
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              break;
            case 'ROUND_END':
              stopZeusCountUp(true);
              setMatchedIds(new Set());
              setDestroyingIds(new Set());
              setDropping({});
              setAnticipation(false);
              if (result.totalWin > 0) {
                setPanelWin(result.totalWin);
                setPanelBase(result.sequenceBaseWin);
                setPanelMult(Math.max(1, result.appliedMultiplier));
                setPanelTier(result.winTier === 'NONE' ? 'NORMAL' : result.winTier);
                setWinSticky(true);
              }
              break;
            case 'READY':
              stopZeusCountUp(false);
              setMatchedIds(new Set());
              setDestroyingIds(new Set());
              setDropping({});
              setAnticipation(false);
              setBigWin(null);
              break;
            default:
              break;
          }
        },
      });

      playbackCancelRef.current = () => controller.cancel();
      try {
        await controller.play(result);
      } finally {
        playbackCancelRef.current = null;
      }
      void markZeusRoundPlayed(result.roundId);
    },
    [bet, speedFactor],
  );

  const doSpin = useCallback(async () => {
    if (leavingRef.current || spinningRef.current) return;
    const isFree = remainingRef.current > 0;
    if (!isFree && !isAdminTest && balance < bet) {
      setAutoplayRemaining(0);
      coinYukleAc();
      void playZeusSfx('insufficient_balance');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    spinningRef.current = true;
    setSpinning(true);
    setPhase('SPIN_REQUEST');
    setSpinHata(null);
    setWinSticky(false);
    setPanelWin(0);
    setBigWin(null);
    void playZeusSfx('spin_press');
    void Haptics.selectionAsync();

    const idempotencyKey =
      pendingSpinKeyRef.current ?? newZeusIdempotencyKey();
    pendingSpinKeyRef.current = idempotencyKey;

    const unlockSpin = () => {
      spinningRef.current = false;
      setSpinning(false);
      setPhase('READY');
    };

    const watchdog = setTimeout(() => {
      if (!spinningRef.current || leavingRef.current) return;
      playbackCancelRef.current?.();
      unlockSpin();
      setSpinHata('Bağlantı zaman aşımı — tekrar dene');
      setAutoplayRemaining(0);
      void playZeusSfx('error');
    }, 28_000);

    try {
      const res = await requestZeusSpin({
        betAmount: bet,
        idempotencyKey,
        roomId: roomId ?? null,
        adminTest: isAdminTest,
      });

      if (leavingRef.current) {
        if (res.ok) patchWallet({ coins: res.data.balanceAfter });
        unlockSpin();
        return;
      }

      if (!res.ok) {
        const yetersiz =
          res.code === 'insufficient_balance' ||
          /insufficient|yetersiz/i.test(res.hata);
        unlockSpin();
        if (yetersiz) {
          pendingSpinKeyRef.current = null;
          setAutoplayRemaining(0);
          coinYukleAc();
          void playZeusSfx('insufficient_balance');
          return;
        }
        pendingSpinKeyRef.current = null;
        setSpinHata(res.hata);
        setAutoplayRemaining(0);
        void playZeusSfx('error');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      pendingSpinKeyRef.current = null;
      // Animasyon bitene kadar kazanç sızmasın (yalnızca bahis düşmüş bakiye)
      patchWallet({
        coins: res.data.balanceAfter - res.data.totalWin,
      });
      remainingRef.current = res.data.remainingFreeSpins;
      persistentRef.current = res.data.persistentMultiplierAfter;
      setBonusSpins(res.data.remainingFreeSpins);
      setBonusMode(res.data.remainingFreeSpins > 0 || res.data.isFreeSpin);
      setPersistentMult(
        res.data.remainingFreeSpins > 0 ? res.data.persistentMultiplierAfter : 0,
      );

      try {
        await playResult(res.data);
      } finally {
        if (!leavingRef.current) {
          patchWallet({ coins: res.data.balanceAfter });
          spinningRef.current = false;
          setSpinning(false);
          setMatchedIds(new Set());
          setDestroyingIds(new Set());
          setDropping({});
          setAnticipation(false);
          setPhase('READY');
          if (autoplayLeftRef.current > 0) {
            setAutoplayRemaining(autoplayLeftRef.current - 1);
          }
        } else {
          unlockSpin();
        }
      }
    } catch {
      if (!leavingRef.current) {
        unlockSpin();
        setSpinHata('Tur oynatılamadı — tekrar dene');
        setAutoplayRemaining(0);
        void playZeusSfx('error');
      } else {
        unlockSpin();
      }
    } finally {
      clearTimeout(watchdog);
    }
  }, [
    balance,
    bet,
    coinYukleAc,
    isAdminTest,
    patchWallet,
    playResult,
    roomId,
    setAutoplayRemaining,
  ]);

  useEffect(() => {
    registerZeus();
    beginZeusAudioSession();
    setZeusVoiceDuck(voiceActive);
    void preloadZeusAudio();
    void warmupZeusSpin();
    void playZeusSfx('game_open');

    let alive = true;
    setGrid(
      generateInitialGrid(config, createSeededRng(Date.now() ^ 0x5f3759df), {
        allowSpecial: true,
      }),
    );
    // Tahta hemen açılsın — sembol decode arka planda
    setPreloadOk(true);
    setImagesWarmed(true);
    setReady(true);
    setPhase('READY');
    setLoadPct(100);
    void startZeusMusic(false);
    void preloadZeusAssets();

    void (async () => {
      const unfinished = await restoreUnfinishedZeusRound().catch(() => null);
      if (!alive || !unfinished?.result) return;
      remainingRef.current = unfinished.result.remainingFreeSpins;
      persistentRef.current = unfinished.result.persistentMultiplierAfter;
      setBonusSpins(unfinished.result.remainingFreeSpins);
      setBonusMode(
        unfinished.result.remainingFreeSpins > 0 || unfinished.result.isFreeSpin,
      );
      setPersistentMult(
        unfinished.result.remainingFreeSpins > 0
          ? unfinished.result.persistentMultiplierAfter
          : 0,
      );
      setGrid(unfinished.result.initialGrid);
      unfinishedRef.current = unfinished.result;
    })();

    const rm = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => {
      alive = false;
      leavingRef.current = true;
      playbackCancelRef.current?.();
      stopAllZeusAudio();
      rm.remove();
    };
  }, [config]);

  useEffect(() => {
    setZeusVoiceDuck(voiceActive);
  }, [voiceActive]);

  useEffect(() => {
    if (!ready) return;
    void startZeusMusic(bonusMode);
  }, [bonusMode, ready]);

  const retryPreload = useCallback(() => {
    resetZeusVisualCache();
    setReady(false);
    setImagesWarmed(false);
    setPreloadOk(false);
    setLoadFailed(false);
    setLoadPct(8);
    void (async () => {
      const ok = await preloadZeusAssets((prog) => {
        setLoadPct(12 + Math.round(prog * 80));
      });
      setPreloadOk(true);
      setImagesWarmed(true);
      setReady(true);
      setPhase('READY');
      setGrid(
        generateInitialGrid(config, createSeededRng(Date.now() ^ 0x5f3759df), {
          allowSpecial: true,
        }),
      );
      setLoadPct(100);
      if (!ok && typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ZEUS] preload soft-fail — board opened anyway');
      }
    })();
  }, [config]);

  useEffect(() => {
    if (!ready || spinningRef.current) return;
    const pending = unfinishedRef.current;
    if (!pending) return;
    unfinishedRef.current = null;
    void playResult(pending).finally(() => {
      if (leavingRef.current) return;
      spinningRef.current = false;
      setSpinning(false);
      setPhase('READY');
    });
  }, [playResult, ready]);

  useEffect(() => {
    if (!ready || spinning || autoplayLeft <= 0) return;
    if (autoplayStop.current) {
      autoplayStop.current = false;
      setAutoplayRemaining(0);
      return;
    }
    const t = setTimeout(() => {
      void doSpin();
    }, 220);
    return () => clearTimeout(t);
  }, [autoplayLeft, doSpin, ready, setAutoplayRemaining, spinning]);

  const canSpin =
    ready &&
    !spinning &&
    (isAdminTest || bonusSpins > 0 || balance >= bet);
  const spinState: SpinButtonState = useMemo(() => {
    if (autoplayLeft > 0) return 'autoplay';
    if (phase === 'SPIN_REQUEST') return 'requesting';
    if (spinning) return 'animating';
    if (!canSpin) return 'disabled';
    return 'idle';
  }, [autoplayLeft, canSpin, phase, spinning]);

  const handleExit = useCallback(() => {
    leavingRef.current = true;
    autoplayStop.current = true;
    setAutoplayRemaining(0);
    playbackCancelRef.current?.();
    stopAllZeusAudio();
    onClose();
  }, [onClose, setAutoplayRemaining]);

  const betPresets = config.betPresets;
  const kazancGorunur =
    winSticky ||
    phase === 'READY' ||
    phase === 'ROUND_END' ||
    phase === 'BIG_WIN' ||
    phase === 'MULTIPLIER' ||
    phase === 'WIN_HIGHLIGHT' ||
    phase === 'SCATTER_CHECK' ||
    phase === 'FREE_SPIN' ||
    phase === 'FREE_SPIN_TRIGGER' ||
    phase === 'RETRIGGER';
  const kazancAmount =
    panelWin > 0 ? panelWin : lastResult?.totalWin && winSticky
      ? lastResult.totalWin
      : panelWin;
  const kazancBase =
    panelBase > 0 ? panelBase : lastResult?.sequenceBaseWin ?? 0;
  const kazancMult =
    panelMult > 1 ? panelMult : lastResult?.appliedMultiplier ?? 1;
  const kazancTier =
    panelTier !== 'NONE'
      ? panelTier
      : lastResult?.winTier && lastResult.winTier !== 'NONE'
        ? lastResult.winTier
        : 'NONE';

  if (!ready) {
    return (
      <View style={[styles.root, { paddingTop: embedded ? 4 : insets.top }]}>
        <ZeusOnYukleme
          progress={loadPct}
          failed={loadFailed}
          onRetry={retryPreload}
          onImagesWarmed={() => setImagesWarmed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: embedded ? 4 : insets.top }]}>
      <ZeusArkaPlan
        bonusMode={bonusMode}
        performance={performance}
        reduceMotion={reduceMotion}
        phase={phase}
      />

      <ZeusBaslik
        multiplierTotal={multTotal}
        persistentMultiplier={persistentMult}
        bonusLabel={
          bonusMode || bonusSpins > 0 ? `ÜCRETSİZ · ${bonusSpins}` : null
        }
        onClose={handleExit}
        onInfo={() => setPaytableOpen(true)}
        compact={embedded}
      />

      {isAdminTest ? (
        <View style={styles.onizleme}>
          <Text style={styles.onizlemeYazi}>Admin test · coin düşmez</Text>
        </View>
      ) : null}
      {spinHata ? (
        <View style={styles.hataKutu}>
          <Text style={styles.hataYazi}>{spinHata}</Text>
        </View>
      ) : null}

      <View
        style={styles.stageRow}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          setStageH((prev) => (prev === h ? prev : h));
        }}
      >
        <View
          style={embedded ? styles.karakterKatmanGomulu : styles.karakterKatman}
          pointerEvents="none"
        >
          <ZeusKarakter
            phase={phase}
            bonusMode={bonusMode}
            size={embedded ? 150 : 120}
            performance={performance}
            reduceMotion={reduceMotion}
          />
        </View>
        <View style={[styles.boardSlot, embedded && styles.boardSlotGomulu]}>
          <GameBoard
            grid={grid}
            matchedIds={matchedIds}
            destroyingIds={destroyingIds}
            dropping={dropping}
            anticipation={anticipation}
            performance={performance}
            bonusMode={bonusMode}
            speedFactor={speedFactor}
            compact={embedded}
            maxHeight={
              stageH > 0
                ? Math.max(180, stageH - (embedded ? 28 : 36))
                : undefined
            }
          />
          <ZeusKazanc
            visible={kazancGorunur && kazancAmount > 0}
            totalWin={kazancAmount}
            baseWin={kazancBase}
            totalMultiplier={kazancMult}
            tier={kazancTier}
            compact={embedded}
          />
        </View>
      </View>

      {retriggerToast != null && retriggerToast > 0 ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastTitle}>YENİDEN TETİK</Text>
          <Text style={styles.toastBody}>+{retriggerToast} ücretsiz tur</Text>
        </View>
      ) : null}
      {bonusToast != null && bonusToast > 0 ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastTitle}>OLYMPUS BONUS</Text>
          <Text style={styles.toastBody}>{bonusToast} ücretsiz tur</Text>
        </View>
      ) : null}

      <View style={{ paddingBottom: embedded ? 8 : Math.max(insets.bottom, 8) }}>
        <GameFooter
          bet={bet}
          balance={balance}
          spinState={spinState}
          autoplayEnabled={config.autoplayEnabled && !bonusMode}
          autoplayLeft={autoplayLeft}
          unlimitedAutoplay={isAdminTest}
          reduceMotion={reduceMotion}
          compact={embedded}
          spinArt={UiImages.spinButton}
          onBetDown={() => {
            const idx = betPresets.indexOf(bet);
            const next =
              betPresets[Math.max(0, (idx < 0 ? 0 : idx) - 1)] ?? config.minBet;
            setBet(clampBet(config, next));
          }}
          onBetUp={() => {
            const idx = betPresets.indexOf(bet);
            const next =
              betPresets[
                Math.min(betPresets.length - 1, (idx < 0 ? 0 : idx) + 1)
              ] ?? config.maxBet;
            setBet(clampBet(config, next));
          }}
          onOpenBetSelector={() => setBetSheetOpen(true)}
          onSpin={() => {
            void doSpin();
          }}
          onAutoplay={(n) => {
            const max = isAdminTest
              ? n
              : maxAffordableAutoplayTours(balance, bet);
            const allowed = clampAutoplayTours(n, Math.max(max, isAdminTest ? n : 0));
            if (allowed <= 0) {
              coinYukleAc();
              return;
            }
            setAutoplayRemaining(allowed);
          }}
          onStopAutoplay={() => {
            autoplayStop.current = true;
            setAutoplayRemaining(0);
          }}
          onPaytable={() => setPaytableOpen(true)}
        />
      </View>

      <BetSelector
        visible={betSheetOpen}
        presets={betPresets}
        current={bet}
        balance={isAdminTest ? Number.MAX_SAFE_INTEGER : balance}
        onSelect={(v) => setBet(clampBet(config, v))}
        onClose={() => setBetSheetOpen(false)}
      />

      <Modal
        visible={paytableOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPaytableOpen(false)}
      >
        <Pressable
          style={styles.payBackdrop}
          onPress={() => setPaytableOpen(false)}
        >
          <Pressable style={styles.paySheet} onPress={() => undefined}>
            <Text style={styles.payTitle}>{GAME_DISPLAY_NAME} ödeme</Text>
            <Text style={styles.payHint}>
              8 / 10 / 12 aynı sembol · 4 Zeus = 15 ücretsiz tur
            </Text>
            <ScrollView style={styles.payList}>
              {(
                [
                  ...LOW_SYMBOLS,
                  ...HIGH_SYMBOLS,
                  'zeusScatter',
                  'multiplierOrb',
                ] as ZeusSymbolType[]
              ).map((sym) => {
                  const band = config.paytable[sym];
                  return (
                    <View key={sym} style={styles.payRow}>
                      <Text style={styles.payName}>{SYMBOL_LABELS[sym]}</Text>
                      <Text style={styles.payVals}>
                        {band
                          ? `${band[8]}× / ${band[10]}× / ${band[12]}×`
                          : sym === 'zeusScatter'
                            ? '4 = 15 tur'
                            : 'Dizi sonu çarpan'}
                      </Text>
                    </View>
                  );
                })}
            </ScrollView>
            <Pressable
              style={styles.payClose}
              onPress={() => setPaytableOpen(false)}
            >
              <Text style={styles.payCloseText}>Kapat</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!bigWin}
        transparent
        animationType="fade"
        onRequestClose={() => setBigWin(null)}
      >
        <Pressable style={styles.winBackdrop} onPress={() => setBigWin(null)}>
          <View style={styles.winCard}>
            <Text style={styles.winTier}>
              {bigWin ? WIN_TIER_LABELS[bigWin.tier] : ''}
            </Text>
            <Text style={styles.winAmount}>
              {bigWin ? Math.floor(bigWin.amount).toLocaleString('tr-TR') : ''}
            </Text>
            <Text style={styles.winHint}>Dokunarak kapat</Text>
          </View>
        </Pressable>
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
    </View>
  );
}

export function ZeusEkrani(props: ZeusEkraniProps) {
  return (
    <ModulHataSiniri modulAdi="zeus" varyant="ekran">
      <ZeusEkraniGovde {...props} />
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B18',
  },
  onizleme: {
    alignSelf: 'center',
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(232,197,71,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
  },
  onizlemeYazi: {
    color: '#F6E27A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  hataKutu: {
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(232,64,145,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.4)',
  },
  hataYazi: {
    color: '#FFB3D4',
    fontSize: 12,
    fontWeight: '700',
  },
  stageRow: {
    flex: 1,
    overflow: 'visible',
    minHeight: 0,
  },
  karakterKatman: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -28,
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.55,
  },
  karakterKatmanGomulu: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -44,
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.5,
  },
  boardSlot: {
    flex: 1,
    minHeight: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  boardSlotGomulu: {
    paddingTop: 4,
    gap: 4,
  },
  toast: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(7,11,24,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.55)',
    alignItems: 'center',
  },
  toastTitle: {
    color: '#F6E27A',
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  toastBody: {
    color: '#E8E0D4',
    marginTop: 4,
    fontWeight: '700',
  },
  payBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  paySheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: BoslukTokenlari.lg,
    maxHeight: '72%',
  },
  payTitle: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.h2.fontSize,
    fontWeight: '900',
  },
  payHint: {
    color: RenkTokenlari.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  payList: { maxHeight: 360 },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  payName: { color: RenkTokenlari.text, fontWeight: '700' },
  payVals: { color: '#E8C547', fontWeight: '700' },
  payClose: { alignItems: 'center', paddingTop: 14 },
  payCloseText: { color: RenkTokenlari.textMuted, fontWeight: '700' },
  winBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: {
    minWidth: 240,
    padding: 28,
    borderRadius: 20,
    backgroundColor: '#120828',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.55)',
    alignItems: 'center',
  },
  winTier: {
    color: '#F6E27A',
    fontWeight: '900',
    letterSpacing: 2,
  },
  winAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 8,
  },
  winHint: {
    color: RenkTokenlari.textMuted,
    marginTop: 10,
  },
});
