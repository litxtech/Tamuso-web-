/**
 * TAMUSO: REALM OF STORMS — ana oyun ekranı.
 * SERVER sonuç üretir; bu ekran yalnızca deterministic timeline'ı oynatır.
 * AnimationDirector tüm ses/haptik/karakter/kamera koordinasyonunu yapar.
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
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../contexts/AuthContext';
import { ModulHataSiniri } from '../../../../ortak/hata-sinirlari/ModulHataSiniri';
import { AdminYetkisiVarMi } from '../../../admin/yetki/AdminYetkisiVarMi';
import { CoinYuklePaneli } from '../../../cuzdan/bilesenler/CoinYuklePaneli';
import { useCoinYuklePaneli } from '../../../cuzdan/islemler/useCoinYuklePaneli';
import { DurumOyunKazanciOlustur } from '../../../durum/islemler/DurumIslemleri';
import { useMisafirIslemKapisi } from '../../../misafir-hesabi/islemler/useMisafirIslemKapisi';
import { HesabiTamamlaKarti } from '../../../misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  castLevelFor,
  createAnimationDirector,
} from '../animasyonlar/AnimationDirector';
import { BigWinAnimation } from '../animasyonlar/BigWinAnimation';
import { BonusIntroAnimation } from '../animasyonlar/BonusIntroAnimation';
import { useCameraEffect } from '../animasyonlar/CameraController';
import { useScreenShake } from '../animasyonlar/ScreenShakeController';
import { GameBackground } from '../arkaplan/GameBackground';
import {
  LightningLayer,
  type LightningHandle,
} from '../arkaplan/LightningLayer';
import {
  GameHaptics,
  kaskadHapticEventListener,
  loadKaskadHapticsEnabled,
  isKaskadHapticsEnabled,
  setKaskadHapticsEnabled,
} from '../haptikler/GameHaptics';
import {
  castStateFor,
  createCharacterMachine,
} from '../karakter/CharacterStateMachine';
import { createPlaybackController } from '../motor/PlaybackEngine';
import {
  DEFAULT_MATH_CONFIG,
  FAST_SPEED_FACTOR,
  GAME_CODE,
  SYMBOL_LABELS,
  clampAutoplayTours,
  maxAffordableAutoplayTours,
} from '../sabitler/KaskadSabitleri';
import {
  fetchKaskadConfig,
  markKaskadRoundPlayed,
  newKaskadIdempotencyKey,
  requestKaskadSpin,
  restoreUnfinishedKaskadRound,
  warmupKaskadSpin,
  type KaskadGameStatus,
  type UnfinishedRound,
} from '../servisler/GameApi';
import { trackKaskad } from '../servisler/GameTelemetri';
import {
  clearKaskadOtoTur,
  loadKaskadOtoTur,
  saveKaskadOtoTur,
} from '../servisler/KaskadOtoTurKayit';
import { detectPerformanceProfile } from '../servisler/PerformansProfili';
import {
  getKaskadAudioSettings,
  kaskadAudioEventListener,
  loadKaskadAudioSettings,
  playKaskadSfx,
  saveKaskadAudioSettings,
  setKaskadVoiceDuck,
  beginKaskadAudioSession,
  setKaskadMusicCatalog,
  startKaskadMusic,
  stopAllKaskadAudio,
  stopKaskadMusic,
} from '../ses/GameAudioManager';
import type {
  BonusAward,
  GridMatrix,
  KaskadMathConfig,
  KaskadPhase,
  SpinResult,
  WinTier,
} from '../tipler/KaskadTipleri';
import { GameBoard } from '../ui/GameBoard';
import { BetSelector } from '../ui/BetSelector';
import { GameFooter } from '../ui/GameFooter';
import { GameHeader } from '../ui/GameHeader';
import { PreloadScreen } from '../ui/PreloadScreen';
import { WinDisplay } from '../ui/WinDisplay';
import type { SpinButtonState } from '../ui/SpinButton';
import { createEmptyGrid, generateInitialGrid } from '../grid/GridGenerator';
import { createSeededRng } from '../rng/SeededRng';
import { clampBet } from '../paytable/PaytableEngine';
import {
  kaskadVisualsCached,
  preloadKaskadAssets,
} from '../assets/preloadKaskadAssets';
import {
  dropDistancesBetween,
  dropDistancesFromAbove,
} from '../../ortak/grid/DusmeMesafeleri';
import { isEmptyInstanceId } from '../symbols/SymbolRules';

export type KozmikKaskadEkraniProps = {
  roomId?: string | null;
  onClose: () => void;
  voiceActive?: boolean;
  /** Yalnızca Admin → Oyun testi. Coin düşmez. Ses odası / solo = false. */
  adminTestMode?: boolean;
  /** Ses odasi kartinin icinde — ustte oda gorunur. */
  embedded?: boolean;
};

type BigWinState = {
  tier: WinTier;
  amount: number;
  baseWin: number;
  totalMultiplier: number;
  roundId: string;
};

function KozmikKaskadEkraniGovde({
  roomId,
  onClose,
  voiceActive = true,
  adminTestMode = false,
  embedded = false,
}: KozmikKaskadEkraniProps) {
  const insets = useSafeAreaInsets();
  const { wallet, profile, patchWallet, refreshWallet, refreshProfile, isGuest, user } =
    useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
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
  /** Admin ücretsiz yalnızca oyun-test ekranı. Ses odası / solo = gerçek coin. */
  const isAdminTest = isAdmin && adminTestMode && !roomId;

  const [config, setConfig] = useState<KaskadMathConfig>(DEFAULT_MATH_CONFIG);
  const [bet, setBet] = useState(DEFAULT_MATH_CONFIG.betPresets[1] ?? 50);
  const [grid, setGrid] = useState<GridMatrix>(() =>
    createEmptyGrid(DEFAULT_MATH_CONFIG.columns, DEFAULT_MATH_CONFIG.rows),
  );
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [destroyingIds, setDestroyingIds] = useState<Set<string>>(new Set());
  const [dropping, setDropping] = useState<Record<string, number>>({});
  const [anticipation, setAnticipation] = useState(false);
  const [phase, setPhase] = useState<KaskadPhase>('IDLE');
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [multTotal, setMultTotal] = useState(1);
  const [persistentMult, setPersistentMult] = useState(0);
  const [fastMode, setFastMode] = useState(false);
  const [autoplayLeft, setAutoplayLeft] = useState(0);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [bonusMode, setBonusMode] = useState(false);
  const [bonusIntro, setBonusIntro] = useState<BonusAward | null>(null);
  const [showBonusIntro, setShowBonusIntro] = useState(false);
  const [retriggerToast, setRetriggerToast] = useState<number | null>(null);
  const [bigWin, setBigWin] = useState<BigWinState | null>(null);
  const [winShareBusy, setWinShareBusy] = useState(false);
  const [winShared, setWinShared] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [imagesWarmed, setImagesWarmed] = useState(kaskadVisualsCached);
  const [bootDone, setBootDone] = useState(false);
  const [gameStatus, setGameStatus] = useState<KaskadGameStatus>({
    gamePaused: false,
    maintenance: false,
    maintenanceMessage: '',
  });

  const performance = useMemo(() => detectPerformanceProfile(), []);
  const director = useMemo(() => createAnimationDirector(), []);
  const character = useMemo(() => createCharacterMachine(), []);
  const lightningRef = useRef<LightningHandle>(null);
  const playbackRef = useRef<ReturnType<typeof createPlaybackController> | null>(
    null,
  );
  const autoplayStop = useRef(false);
  const autoplayLeftRef = useRef(0);
  const pendingRecoverRef = useRef<UnfinishedRound | null>(null);
  const mountedRef = useRef(true);
  const leavingRef = useRef(false);
  const appActiveRef = useRef(AppState.currentState === 'active');
  const spinningRef = useRef(false);
  const userIdRef = useRef(user?.id ?? '');
  const betRef = useRef(bet);
  const configRef = useRef(config);
  const pendingSpinKeyRef = useRef<string | null>(null);
  const gridRef = useRef(grid);
  const spinRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinRetryCountRef = useRef(0);
  const [appActive, setAppActive] = useState(
    () => AppState.currentState === 'active',
  );
  const { style: shakeStyle, shake } = useScreenShake(!reduceMotion);
  const { style: cameraStyle, setPreset: setCamera } = useCameraEffect(
    !reduceMotion,
  );

  const balance = wallet?.coins ?? 0;
  const speedFactor = fastMode ? FAST_SPEED_FACTOR : 1;
  gridRef.current = grid;

  // ---------------------------------------------------------------------
  // Director aboneleri: ses + haptik + karakter + kamera + shake + lightning
  // ---------------------------------------------------------------------
  useEffect(() => {
    const unsubAudio = director.subscribe(kaskadAudioEventListener);
    const unsubHaptic = director.subscribe(kaskadHapticEventListener);
    const unsubVisual = director.subscribe((event, payload) => {
      switch (event) {
        case 'SPIN_START':
          character.request('WATCHING');
          break;
        case 'CHARACTER_CAST': {
          const maxMult = payload.maxMultiplier ?? 0;
          character.request(castStateFor(maxMult));
          if (castLevelFor(maxMult) === 'large') {
            shake('MEDIUM');
            setCamera('CAMERA_MULTIPLIER');
            lightningRef.current?.strike('large');
          } else {
            lightningRef.current?.strike('small');
          }
          break;
        }
        case 'BONUS_TRIGGER':
          character.request('BONUS_TRIGGER');
          shake('LARGE');
          setCamera('CAMERA_BONUS');
          lightningRef.current?.strike('large');
          setTimeout(() => lightningRef.current?.strike('large'), 180);
          break;
        case 'BIG_WIN': {
          const tier = payload.tier;
          if (tier === 'DIVINE' || tier === 'COSMIC') {
            character.request('SUPER_WIN');
            shake('LARGE');
            lightningRef.current?.strike('large');
            setTimeout(() => lightningRef.current?.strike('large'), 220);
            setTimeout(() => lightningRef.current?.strike('small'), 420);
          } else {
            character.request('BIG_WIN');
            lightningRef.current?.strike('large');
          }
          setCamera('CAMERA_BIG_WIN');
          break;
        }
        case 'ROUND_IDLE':
          setCamera('CAMERA_RETURN');
          break;
        default:
          break;
      }
    });
    return () => {
      unsubAudio();
      unsubHaptic();
      unsubVisual();
    };
  }, [character, director, setCamera, shake]);

  // ---------------------------------------------------------------------
  // Playback: server sonucunu faz faz oynat
  // ---------------------------------------------------------------------
  const playResult = useCallback(
    async (result: SpinResult) => {
      setSpinning(true);
      setLastResult(result);
      setMultTotal(1);
      setMatchedIds(new Set());
      setDestroyingIds(new Set());
      setDropping({});
      setAnticipation(false);

      const initialDrop = dropDistancesFromAbove(
        result.initialGrid,
        isEmptyInstanceId,
      );

      const controller = createPlaybackController({
        speedFactor,
        onPhase: (p, meta) => {
          setPhase(p);
          director.handlePhase(p, meta);

          switch (p) {
            case 'SYMBOLS_DROP':
              setDropping(initialDrop);
              setGrid(result.initialGrid);
              break;
            case 'MATCH_CHECK':
              break;
            case 'WIN_HIGHLIGHT': {
              const ids = new Set(
                (meta?.matched as { cellIds: string[] }[] | undefined)?.flatMap(
                  (m) => m.cellIds,
                ) ?? [],
              );
              setMatchedIds(ids);
              break;
            }
            case 'DESTROY':
              setDestroyingIds(new Set((meta?.removedIds as string[]) ?? []));
              break;
            case 'MULTIPLIER_COLLECT': {
              const vals = (meta?.multipliers as number[]) ?? [];
              setMultTotal((prev) => {
                const base = prev === 1 && vals.length > 0 ? 0 : prev;
                return Math.max(1, base + vals.reduce((a, b) => a + b, 0));
              });
              break;
            }
            case 'CASCADE': {
              setMatchedIds(new Set());
              setDestroyingIds(new Set());
              const after = meta?.gridAfter as GridMatrix;
              if (after) {
                const fromEngine = meta?.dropping as
                  | Record<string, number>
                  | undefined;
                setDropping(
                  fromEngine ??
                    dropDistancesBetween(
                      gridRef.current,
                      after,
                      isEmptyInstanceId,
                    ),
                );
                setGrid(after);
              }
              trackKaskad('cascade');
              break;
            }
            case 'ANTICIPATION':
              setAnticipation(true);
              break;
            case 'SCATTER_CHECK':
              setAnticipation(false);
              break;
            case 'RETRIGGER':
              setRetriggerToast(Number(meta?.extraSpins ?? 0));
              setTimeout(() => setRetriggerToast(null), 1800);
              break;
            case 'BONUS_INTRO':
              setBonusIntro(meta?.bonus as BonusAward);
              setShowBonusIntro(true);
              trackKaskad('bonus_trigger');
              break;
            case 'BONUS_MODE':
              setBonusMode(true);
              setBonusSpins(result.remainingBonusSpins);
              break;
            case 'BIG_WIN':
              setWinShared(false);
              setWinShareBusy(false);
              setBigWin({
                tier: (meta?.tier as WinTier) ?? result.winTier,
                amount: Number(meta?.totalWin ?? result.totalWin),
                baseWin: result.baseWin,
                totalMultiplier: result.totalMultiplier,
                roundId: result.roundId,
              });
              break;
            case 'FINALIZE':
              // Bakiye spin cevabında anlık güncellenir; burada sunucu ile hizala
              void refreshWallet();
              void markKaskadRoundPlayed(result.roundId);
              setPersistentMult(
                result.remainingBonusSpins > 0
                  ? result.persistentMultiplierAfter
                  : 0,
              );
              setBonusSpins(result.remainingBonusSpins);
              if (result.remainingBonusSpins <= 0 && result.isBonusSpin) {
                setBonusMode(false);
                void startKaskadMusic(false);
                trackKaskad('bonus_complete');
              }
              break;
            case 'IDLE':
              // spinning burada dusurulmez — autoplay cakismasin diye
              // playResult/doSpin sonunda temizlenir.
              setMatchedIds(new Set());
              setDestroyingIds(new Set());
              setDropping({});
              setAnticipation(false);
              break;
            default:
              break;
          }
        },
      });

      playbackRef.current = controller;
      const playing = controller.play(result);
      if (!appActiveRef.current) controller.skip();
      await playing;
      // spinning: doSpin / recover cagrisi temizler (autoplay sira guvenligi)
    },
    [director, refreshWallet, speedFactor],
  );

  // ---------------------------------------------------------------------
  // Preload: görseller + config paralel. Ses kritik path'te yok.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    beginKaskadAudioSession();
    (async () => {
      setLoadPct(6);
      await Promise.all([loadKaskadAudioSettings(), loadKaskadHapticsEnabled()]);
      if (!alive) return;
      setHapticsOn(isKaskadHapticsEnabled());
      setLoadPct(12);

      const [, cfgBundle, unfinished] = await Promise.all([
        preloadKaskadAssets((prog) => {
          if (!alive) return;
          setLoadPct((prev) => Math.max(prev, 12 + Math.round(prog * 55)));
        }),
        fetchKaskadConfig(),
        restoreUnfinishedKaskadRound().catch(() => null),
        warmupKaskadSpin(),
      ]);
      if (!alive) return;

      const { config: cfg, durum, muzik } = cfgBundle;
      setKaskadMusicCatalog(muzik);
      setConfig(cfg);
      setGameStatus(durum);
      setBet(clampBet(cfg, cfg.betPresets[1] ?? cfg.minBet));
      setGrid(
        generateInitialGrid(
          cfg,
          createSeededRng(Date.now() ^ 0x5f3759df),
          { allowSpecial: true },
        ),
      );
      pendingRecoverRef.current = unfinished;
      setLoadPct(92);
      setBootDone(true);
    })().catch(() => {
      if (alive) {
        setLoadPct(92);
        setBootDone(true);
      }
    });

    const rmSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    return () => {
      alive = false;
      leavingRef.current = true;
      autoplayStop.current = true;
      autoplayLeftRef.current = 0;
      playbackRef.current?.cancel();
      if (spinRetryTimerRef.current) {
        clearTimeout(spinRetryTimerRef.current);
        spinRetryTimerRef.current = null;
      }
      stopAllKaskadAudio();
      setKaskadMusicCatalog(null);
      character.dispose();
      director.clear();
      rmSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bootDone || ready) return;
    if (!imagesWarmed) {
      const t = setTimeout(() => setImagesWarmed(true), 2500);
      return () => clearTimeout(t);
    }

    let alive = true;
    setLoadPct(100);
    setReady(true);

    const audio = getKaskadAudioSettings();
    setMusicOn(audio.music);
    setSfxOn(audio.sfx);
    setKaskadVoiceDuck(voiceActive);
    void startKaskadMusic(false);
    void playKaskadSfx('game_open');
    trackKaskad('game_open');

    const unfinished = pendingRecoverRef.current;
    pendingRecoverRef.current = null;

    const offerSavedAutoplay = () => {
      if (!alive) return;
      const uid = userIdRef.current;
      if (!uid) return;
      void loadKaskadOtoTur(uid).then((saved) => {
        if (!alive || !saved || saved.remaining <= 0) return;
        Alert.alert(
          'Oto tur duraklatıldı',
          `${saved.remaining.toLocaleString('tr-TR')} tur kaldı. Uygulama kapalıyken yeni tur atılmaz. Devam edilsin mi?`,
          [
            {
              text: 'Durdur',
              style: 'cancel',
              onPress: () => {
                void clearKaskadOtoTur();
              },
            },
            {
              text: 'Devam',
              onPress: () => {
                const nextBet = clampBet(
                  configRef.current,
                  saved.bet > 0 ? saved.bet : betRef.current,
                );
                betRef.current = nextBet;
                setBet(nextBet);
                autoplayStop.current = false;
                setAutoplayRemaining(saved.remaining);
              },
            },
          ],
        );
      });
    };

    if (unfinished?.status === 'pending_playback') {
      trackKaskad('round_recovered');
      setSpinning(true);
      void playResult(unfinished.result).finally(() => {
        if (!alive) return;
        setSpinning(false);
        setPhase('IDLE');
        offerSavedAutoplay();
      });
    } else {
      offerSavedAutoplay();
    }

    return () => {
      alive = false;
    };
  }, [bootDone, imagesWarmed, ready, voiceActive, playResult]);

  useEffect(() => {
    setKaskadVoiceDuck(voiceActive);
  }, [voiceActive]);

  // ---------------------------------------------------------------------
  // Spin akışı
  // ---------------------------------------------------------------------
  const setAutoplayRemaining = useCallback((n: number) => {
    const next = Math.max(0, Math.floor(n));
    autoplayLeftRef.current = next;
    setAutoplayLeft(next);
    if (next <= 0) void clearKaskadOtoTur();
    else {
      const uid = userIdRef.current;
      if (uid) {
        void saveKaskadOtoTur({
          userId: uid,
          remaining: next,
          bet: betRef.current,
        });
      }
    }
  }, []);

  const doSpin = useCallback(async (opts?: { resume?: boolean }) => {
    if (leavingRef.current || !mountedRef.current) return;
    if (!appActiveRef.current && autoplayLeftRef.current > 0) return;
    if (!opts?.resume && (spinning || phase === 'REQUESTING_RESULT')) return;
    if (
      !pendingSpinKeyRef.current &&
      !isAdminTest &&
      bonusSpins <= 0 &&
      balance < bet
    ) {
      void playKaskadSfx('insufficient_balance');
      setAutoplayRemaining(0);
      coinYukleAc();
      return;
    }

    setPhase('REQUESTING_RESULT');
    setSpinning(true);
    trackKaskad('spin_request', { bet });

    const idempotencyKey =
      pendingSpinKeyRef.current ?? newKaskadIdempotencyKey();
    pendingSpinKeyRef.current = idempotencyKey;

    const res = await requestKaskadSpin({
      betAmount: bet,
      idempotencyKey,
      roomId: roomId ?? null,
      adminTest: isAdminTest,
    });

    if (leavingRef.current || !mountedRef.current) {
      if (res.ok) {
        pendingSpinKeyRef.current = null;
        patchWallet({ coins: res.data.balanceAfter });
      }
      return;
    }

    if (!res.ok) {
      trackKaskad('spin_error', { code: res.code ?? 'unknown' });
      const yetersiz =
        res.code === 'insufficient_balance' ||
        /insufficient|yetersiz/i.test(res.hata);
      if (yetersiz) {
        pendingSpinKeyRef.current = null;
        setSpinning(false);
        setPhase('IDLE');
        void playKaskadSfx('insufficient_balance');
        setAutoplayRemaining(0);
        coinYukleAc();
        return;
      }
      if (res.code === 'paused') {
        pendingSpinKeyRef.current = null;
        setGameStatus((prev) => ({ ...prev, gamePaused: true }));
        setSpinning(false);
        setPhase('IDLE');
        if (bonusSpins <= 0) setAutoplayRemaining(0);
        return;
      }
      if (res.code === 'maintenance') {
        pendingSpinKeyRef.current = null;
        setGameStatus((prev) => ({
          ...prev,
          maintenance: true,
          maintenanceMessage: res.hata,
        }));
        setSpinning(false);
        setPhase('IDLE');
        setAutoplayRemaining(0);
        return;
      }
      if (res.retryable !== false) {
        spinRetryCountRef.current += 1;
        if (spinRetryCountRef.current > 8) {
          spinRetryCountRef.current = 0;
          setSpinning(false);
          setPhase('IDLE');
          return;
        }
        if (spinRetryTimerRef.current) clearTimeout(spinRetryTimerRef.current);
        spinRetryTimerRef.current = setTimeout(() => {
          spinRetryTimerRef.current = null;
          if (leavingRef.current || !mountedRef.current) return;
          void doSpin({ resume: true });
        }, 900 + spinRetryCountRef.current * 250);
        return;
      }
      pendingSpinKeyRef.current = null;
      setSpinning(false);
      setPhase('IDLE');
      if (autoplayLeftRef.current > 0) setAutoplayRemaining(0);
      return;
    }

    pendingSpinKeyRef.current = null;
    spinRetryCountRef.current = 0;
    // Animasyon bitene kadar kazanç sızmasın (yalnızca bahis düşmüş bakiye)
    patchWallet({
      coins: res.data.balanceAfter - res.data.totalWin,
    });
    trackKaskad('spin_success');
    try {
      await playResult(res.data);
    } finally {
      if (!mountedRef.current || leavingRef.current) return;
      patchWallet({ coins: res.data.balanceAfter });
      // Autoplay sayaci spin bitince dusur; sonra spinning kapat
      if (autoplayLeftRef.current > 0) {
        if (
          res.data.bonusTriggered ||
          res.data.winTier === 'COSMIC' ||
          res.data.winTier === 'DIVINE'
        ) {
          autoplayStop.current = true;
          setAutoplayRemaining(0);
        } else {
          setAutoplayRemaining(Math.max(0, autoplayLeftRef.current - 1));
        }
      }
      setSpinning(false);
      setPhase('IDLE');
    }
  }, [
    balance,
    bet,
    bonusSpins,
    coinYukleAc,
    isAdminTest,
    patchWallet,
    phase,
    playResult,
    roomId,
    setAutoplayRemaining,
    spinning,
  ]);

  useEffect(() => {
    autoplayLeftRef.current = autoplayLeft;
  }, [autoplayLeft]);

  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    userIdRef.current = user?.id ?? '';
  }, [user?.id]);

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    mountedRef.current = true;
    leavingRef.current = false;
    const persistPaused = () => {
      const uid = userIdRef.current;
      if (!uid) return;
      const left = autoplayLeftRef.current;
      const remain = spinningRef.current ? Math.max(0, left - 1) : left;
      if (remain > 0) {
        void saveKaskadOtoTur({
          userId: uid,
          remaining: remain,
          bet: betRef.current,
        });
      } else {
        void clearKaskadOtoTur();
      }
    };
    const onApp = (next: AppStateStatus) => {
      const active = next === 'active';
      appActiveRef.current = active;
      setAppActive(active);
      if (!active) persistPaused();
      if (next === 'background') playbackRef.current?.skip();
    };
    const sub = AppState.addEventListener('change', onApp);
    return () => {
      mountedRef.current = false;
      leavingRef.current = true;
      autoplayStop.current = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!appActive || autoplayLeft <= 0 || spinning || !ready) return;
    if (autoplayStop.current) {
      autoplayStop.current = false;
      setAutoplayRemaining(0);
      return;
    }
    const t = setTimeout(() => {
      void doSpin();
    }, 180);
    return () => clearTimeout(t);
  }, [appActive, autoplayLeft, doSpin, ready, setAutoplayRemaining, spinning]);

  const kazanciDurumdaPaylas = useCallback(() => {
    if (!bigWin?.roundId || winShareBusy || winShared) return;
    islemiDene('durum_paylas', () => {
      void (async () => {
        setWinShareBusy(true);
        try {
          const r = await DurumOyunKazanciOlustur({
            gameCode: GAME_CODE,
            roundId: bigWin.roundId,
          });
          if (!r.ok) {
            Alert.alert('Paylaşım', r.hata ?? 'Durum paylaşılamadı');
            return;
          }
          setWinShared(true);
          if (!r.already) {
            Alert.alert(
              'Durumda paylaşıldı',
              'Kazancın modern kart olarak durumunda görünecek.',
            );
          }
        } finally {
          setWinShareBusy(false);
        }
      })();
    });
  }, [bigWin?.roundId, islemiDene, winShareBusy, winShared]);

  const canSpin = useMemo(
    () => {
      if (!ready || spinning) return false;
      if (isAdminTest) return true;
      if (!isAdmin && gameStatus.maintenance) return false;
      if (bonusSpins > 0) return true;
      if (!isAdmin && gameStatus.gamePaused) return false;
      return balance >= bet;
    },
    [
      balance,
      bet,
      bonusSpins,
      gameStatus,
      isAdmin,
      isAdminTest,
      ready,
      spinning,
    ],
  );

  const spinState: SpinButtonState = useMemo(() => {
    if (autoplayLeft > 0) return 'autoplay';
    if (phase === 'REQUESTING_RESULT') return 'requesting';
    if (spinning) return 'animating';
    if (!canSpin) return 'disabled';
    return 'idle';
  }, [autoplayLeft, canSpin, phase, spinning]);

  const handleExit = useCallback(() => {
    leavingRef.current = true;
    autoplayStop.current = true;
    setAutoplayRemaining(0);
    playbackRef.current?.cancel();
    // Unmount öncesi yeni SFX açma — eski keepAudioSessionActive:false
    // AVAudioSession'ı kapatıp ses odası / UI donmasına yol açıyordu.
    stopAllKaskadAudio();
    trackKaskad('game_exit');
    onClose();
  }, [onClose, setAutoplayRemaining]);

  const betPresets = config.betPresets;

  if (!ready) {
    return (
      <View style={[styles.root, { paddingTop: embedded ? 4 : insets.top }]}>
        <PreloadScreen
          progress={loadPct}
          onImagesWarmed={() => setImagesWarmed(true)}
        />
      </View>
    );
  }

  // Bakım modu: oyun tamamen kapalı (admin önizleme hariç)
  if (gameStatus.maintenance && !isAdmin) {
    return (
      <View style={[styles.root, styles.statusRoot, { paddingTop: embedded ? 4 : insets.top }]}>
        <Text style={styles.statusTitle}>REALM OF STORMS</Text>
        <Text style={styles.statusText}>
          {gameStatus.maintenanceMessage || 'Oyun kısa süreliğine bakımda. Az sonra tekrar deneyin.'}
        </Text>
        <Pressable style={styles.statusBtn} onPress={handleExit}>
          <Text style={styles.statusBtnText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: embedded ? 4 : insets.top }]}>
      <GameBackground
        bonusMode={bonusMode}
        performance={performance}
        reduceMotion={reduceMotion}
      />
      <LightningLayer
        ref={lightningRef}
        ambient={!reduceMotion}
        ambientIntervalMs={bonusMode ? 5000 : 11000}
        reduceFlash={reduceMotion}
      />

      <Animated.View style={[styles.fill, shakeStyle]}>
        <GameHeader
          balance={balance}
          musicOn={musicOn}
          sfxOn={sfxOn}
          hapticsOn={hapticsOn}
          multiplierTotal={multTotal}
          persistentMultiplier={persistentMult}
          bonusLabel={
            bonusMode || bonusSpins > 0 ? `BONUS · ${bonusSpins} SPIN` : null
          }
          onClose={handleExit}
          onInfo={() => setPaytableOpen(true)}
          compact={embedded}
          onToggleMusic={() => {
            const next = !musicOn;
            setMusicOn(next);
            void saveKaskadAudioSettings({ music: next });
            if (next) void startKaskadMusic(bonusMode);
            else stopKaskadMusic();
          }}
          onToggleSfx={() => {
            const next = !sfxOn;
            setSfxOn(next);
            void saveKaskadAudioSettings({ sfx: next });
          }}
          onToggleHaptics={() => {
            const next = !hapticsOn;
            setHapticsOn(next);
            void setKaskadHapticsEnabled(next);
            if (next) void GameHaptics.spin();
          }}
        />

        {gameStatus.gamePaused && !isAdmin ? (
          <View style={styles.pausedBanner}>
            <Text style={styles.pausedBannerText}>
              Oyun geçici olarak durduruldu — başlamış bonus spinleri tamamlanır.
            </Text>
          </View>
        ) : null}

        <Animated.View style={[styles.cameraLayer, cameraStyle]}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stage}>
              <GameBoard
                grid={grid}
                matchedIds={matchedIds}
                destroyingIds={destroyingIds}
                dropping={dropping}
                anticipation={anticipation}
                performance={performance}
                bonusMode={bonusMode}
                speedFactor={speedFactor}
              />
            </View>

            <WinDisplay
              visible={phase === 'FINALIZE' || phase === 'IDLE' || phase === 'BIG_WIN'}
              totalWin={lastResult?.totalWin ?? 0}
              baseWin={lastResult?.baseWin ?? 0}
              totalMultiplier={lastResult?.totalMultiplier ?? 1}
              tier={lastResult?.winTier ?? 'NONE'}
            />
          </ScrollView>
        </Animated.View>

        <GameFooter
          bet={bet}
          balance={balance}
          spinState={spinState}
          autoplayEnabled={config.autoplayEnabled && !bonusMode}
          autoplayLeft={autoplayLeft}
          unlimitedAutoplay={isAdminTest}
          reduceMotion={reduceMotion}
          compact={embedded}
          onBetDown={() => {
            const idx = betPresets.indexOf(bet);
            const next =
              betPresets[Math.max(0, (idx < 0 ? 0 : idx) - 1)] ?? config.minBet;
            setBet(clampBet(config, next));
            void playKaskadSfx('bet_change');
          }}
          onBetUp={() => {
            const idx = betPresets.indexOf(bet);
            const next =
              betPresets[
                Math.min(betPresets.length - 1, (idx < 0 ? 0 : idx) + 1)
              ] ?? config.maxBet;
            setBet(clampBet(config, next));
            void playKaskadSfx('bet_change');
          }}
          onOpenBetSelector={() => setBetSheetOpen(true)}
          onSpin={() => {
            void playKaskadSfx('button_press');
            void doSpin();
          }}
          onAutoplay={(n) => {
            autoplayStop.current = false;
            const allowed = isAdminTest
              ? n
              : clampAutoplayTours(
                  n,
                  maxAffordableAutoplayTours(balance, bet),
                );
            if (allowed <= 0) {
              void playKaskadSfx('insufficient_balance');
              coinYukleAc();
              return;
            }
            setAutoplayRemaining(allowed);
          }}
          onStopAutoplay={() => setAutoplayRemaining(0)}
          onPaytable={() => setPaytableOpen(true)}
        />
      </Animated.View>

      {retriggerToast != null ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.retriggerToast}
          pointerEvents="none"
        >
          <Text style={styles.retriggerText}>+{retriggerToast} FREE SPIN</Text>
        </Animated.View>
      ) : null}

      <BonusIntroAnimation
        visible={showBonusIntro}
        bonus={bonusIntro}
        performance={performance}
        onDone={() => setShowBonusIntro(false)}
      />
      <BigWinAnimation
        visible={bigWin != null}
        tier={bigWin?.tier ?? 'NONE'}
        amount={bigWin?.amount ?? 0}
        baseWin={bigWin?.baseWin ?? 0}
        totalMultiplier={bigWin?.totalMultiplier ?? 1}
        performance={performance}
        sharing={winShareBusy}
        shared={winShared}
        onShare={kazanciDurumdaPaylas}
        onDone={() => setBigWin(null)}
      />

      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={upgradeKapat}
        onCompleted={() => {
          upgradeKapat();
          void refreshProfile();
          void refreshWallet();
        }}
      />

      <BetSelector
        visible={betSheetOpen}
        presets={betPresets}
        current={bet}
        balance={balance}
        onSelect={(b) => {
          setBet(clampBet(config, b));
          void playKaskadSfx('bet_change');
        }}
        onClose={() => setBetSheetOpen(false)}
      />

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

      <Modal
        visible={paytableOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPaytableOpen(false)}
      >
        <View style={styles.payBackdrop}>
          <View style={styles.paySheet}>
            <Text style={styles.payTitle}>Ödeme Tablosu</Text>
            <Text style={styles.payHint}>
              Grid'in herhangi bir yerinde aynı sembolden 8 / 10 / 12+ → ödeme
              (pay anywhere). Fırtına Çarpanı kazançlı adımı çarpar; 4+ Portal
              free spin verir. Bonus'ta çarpanlar kalıcı toplanır; 3+ Portal +
              {config.bonus.retrigger.extraSpins} spin.
            </Text>
            <ScrollView style={styles.payList}>
              {Object.entries(config.paytable).map(([sym, band]) =>
                band ? (
                  <Text key={sym} style={styles.payRow}>
                    {SYMBOL_LABELS[sym as keyof typeof SYMBOL_LABELS] ?? sym}:
                    {'  '}8→{band[8]}× · 10→{band[10]}× · 12+→{band[12]}×
                  </Text>
                ) : null,
              )}
            </ScrollView>
            <Pressable
              style={styles.payClose}
              onPress={() => setPaytableOpen(false)}
            >
              <Text style={styles.payCloseText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function KozmikKaskadEkrani(props: KozmikKaskadEkraniProps) {
  return (
    <ModulHataSiniri modulAdi="Oyun" varyant="ekran">
      <KozmikKaskadEkraniGovde {...props} />
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RenkTokenlari.bg },
  fill: { flex: 1 },
  cameraLayer: { flex: 1 },
  statusRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  statusTitle: {
    color: '#8FD0FF',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 2,
  },
  statusText: {
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  statusBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.primary,
  },
  statusBtnText: { color: RenkTokenlari.text, fontWeight: '700' },
  pausedBanner: {
    marginHorizontal: BoslukTokenlari.md,
    marginTop: 4,
    backgroundColor: 'rgba(240, 180, 41, 0.15)',
    borderColor: 'rgba(240, 180, 41, 0.5)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pausedBannerText: {
    color: '#F0B429',
    fontSize: 12,
    textAlign: 'center',
  },
  scroll: {
    paddingVertical: BoslukTokenlari.sm,
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  retriggerToast: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(139,92,246,0.92)',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 18,
  },
  retriggerText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: TipografiTokenlari.h2.fontSize,
    letterSpacing: 1.5,
  },
  payBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  paySheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '70%',
  },
  payTitle: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.h1.fontSize,
    fontWeight: '800',
  },
  payHint: {
    color: RenkTokenlari.textMuted,
    marginVertical: 8,
    fontSize: TipografiTokenlari.caption.fontSize,
    lineHeight: 18,
  },
  payList: { maxHeight: 300 },
  payRow: {
    color: RenkTokenlari.text,
    marginBottom: 6,
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  payClose: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 12,
  },
  payCloseText: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
});
