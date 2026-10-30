import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCeviri } from '../../../../i18n/useCeviri';
import {
  abortStormKing,
  fetchStormKingBalance,
  fetchStormKingGameBalance,
  loadPendingSpin,
  newStormKingRequestId,
  savePendingSpin,
  spinStormKing,
  type PendingSpin,
} from '../api/spinStormKing';
import { AUTO_GAP_MS, BIG_WIN_BET_MULT, STORM_THEME } from '../constants/theme';
import { useStormKingAudio } from '../hooks/useStormKingAudio';
import { useStormKingHaptics } from '../hooks/useStormKingHaptics';
import {
  cycleStormKingBet,
  patchStormKing,
  stormKingSnapshot,
  useStormKingStore,
} from '../store/useStormKingStore';
import { clearSymbolMotions, playSpin } from '../timeline/playSpin';
import type { GemId, SymbolData } from '../types';
import { CoinChip } from './CoinChip';
import { GameCardFrame } from './GameCardFrame';
import { MultiplierDisplay } from './MultiplierDisplay';
import { PayTableSheet } from './PayTableSheet';
import { StormBoard } from './StormBoard';
import { StormControlPanel } from './StormControlPanel';
import { StormEffects } from './StormEffects';
import { TempleBackground } from './TempleBackground';
import { TempleFrame } from './TempleFrame';
import { WinBanner } from './WinBanner';
import { WinDisplay } from './WinDisplay';

type Props = {
  roomId?: string | null;
  onClose: () => void;
  embedded?: boolean;
};

const GEM_CYCLE: readonly GemId[] = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'aqua'];

function idleBoard(): SymbolData[] {
  const symbols: SymbolData[] = [];
  let index = 0;
  for (let col = 0; col < 6; col += 1) {
    for (let row = 0; row < 5; row += 1) {
      symbols.push({
        uid: 1_000_000 + index,
        col,
        row,
        cell: { type: 'gem', id: GEM_CYCLE[(col + row) % GEM_CYCLE.length] ?? 'ruby' },
      });
      index += 1;
    }
  }
  return symbols;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function StormKingScreen({ roomId, onClose, embedded = false }: Props) {
  const { t } = useCeviri();
  const store = useStormKingStore();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [symbols, setSymbols] = useState<SymbolData[]>(idleBoard);
  const [pops, setPops] = useState<Record<number, number>>({});
  const [running, setRunning] = useState(0);
  const [banner, setBanner] = useState<number | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const symbolsRef = useRef(symbols);
  const cancelled = useRef(false);
  const busy = useRef(false);
  const ready = useRef(false);
  const activeRequest = useRef<string | null>(null);
  const voided = useRef(new Set<string>());
  const refunds = useRef(new Map<string, Promise<boolean>>());
  const balanceToken = useRef(0);
  const cellRef = useRef(48);
  const reduceRef = useRef(false);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<View>(null);
  const multRef = useRef<View>(null);
  const winRef = useRef<View>(null);
  const [flyTo, setFlyTo] = useState<{ dx: number; dy: number } | null>(null);
  const audio = useStormKingAudio(embedded || !!roomId);
  const haptics = useStormKingHaptics(!reduceMotion);

  const compact = width < 390 || height < 740;
  const frameCorner = compact ? 42 : 52;
  const framePad = Math.round(frameCorner * 0.42);
  const topPad = frameCorner + (embedded ? 10 : Math.max(insets.top, 8));
  const bottomPad = Math.max(insets.bottom, 8) + framePad;
  const arch = compact ? 62 : 86;
  const layout = useMemo(() => {
    const reserved = topPad + bottomPad + 72 + arch + 54 + 52 + 168;
    const maxH = Math.max(120, height - reserved);
    const maxW = width - framePad * 2 - (compact ? 28 : 40);
    const cell = Math.max(26, Math.floor(Math.min(maxW / 6, maxH / 5) * 0.86));
    return { cell, boardW: cell * 6, boardH: cell * 5 };
  }, [arch, bottomPad, compact, framePad, height, topPad, width]);

  useEffect(() => {
    cellRef.current = layout.cell;
  }, [layout.cell]);

  useEffect(() => {
    reduceRef.current = reduceMotion;
  }, [reduceMotion]);

  const refundRound = useCallback((requestId: string) => {
    const existing = refunds.current.get(requestId);
    if (existing) return existing;
    const job = (async () => {
      balanceToken.current += 1;
      const outcome = await abortStormKing(requestId);
      if (!outcome) {
        refunds.current.delete(requestId);
        patchStormKing({ auto: false, status: 'idle' });
        return false;
      }
      if (activeRequest.current === requestId) activeRequest.current = null;
      await savePendingSpin(null);
      patchStormKing({
        balance: outcome.balance,
        status: 'idle',
        auto: false,
        error: null,
        lastWin: 0,
        multiplier: 1,
      });
      setRunning(0);
      setBanner(null);
      return true;
    })();
    refunds.current.set(requestId, job);
    return job;
  }, []);

  const stopRound = useCallback(
    (requestId: string | null) => {
      cancelled.current = true;
      patchStormKing({ auto: false });
      if (!requestId) return;
      voided.current.add(requestId);
      void refundRound(requestId);
    },
    [refundRound],
  );

  useEffect(() => {
    cancelled.current = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        stopRound(activeRequest.current);
        return;
      }
      if (next === 'active') {
        cancelled.current = false;
        const id = activeRequest.current;
        if (id && voided.current.has(id)) void refundRound(id);
      }
    });
    const token = balanceToken.current;
    void fetchStormKingBalance().then((balance) => {
      if (balance != null && token === balanceToken.current && !activeRequest.current) {
        patchStormKing({ balance });
      }
    });
    void fetchStormKingGameBalance().then((gameBalance) => {
      if (gameBalance != null) patchStormKing({ gameBalance });
    });
    return () => {
      stopRound(activeRequest.current);
      clearSymbolMotions();
      motion.remove();
      app.remove();
    };
  }, [refundRound, stopRound]);

  const measureTarget = useCallback(() => {
    boardRef.current?.measureInWindow((bx, by) => {
      multRef.current?.measureInWindow((mx, my, mw, mh) => {
        targetRef.current = {
          x: mx - bx + mw / 2 - cellRef.current / 2,
          y: my - by + mh / 2 - cellRef.current / 2,
        };
      });
    });
  }, []);

  const runSpin = useCallback(
    async (pending?: PendingSpin) => {
      if (!ready.current || busy.current || cancelled.current || activeRequest.current) return;
      const snap = stormKingSnapshot();
      if (snap.status === 'requesting' || snap.status === 'animating') return;
      const bet = pending?.bet ?? snap.bet;
      if (!pending && snap.balance < bet) {
        patchStormKing({ status: 'error', error: t('stormKing.insufficient'), auto: false });
        return;
      }
      busy.current = true;
      const ticket: PendingSpin = {
        requestId: pending?.requestId ?? newStormKingRequestId(),
        bet,
        roomId: pending?.roomId ?? roomId ?? null,
      };
      activeRequest.current = ticket.requestId;
      await savePendingSpin(ticket);
      patchStormKing({ status: 'requesting', error: null, bet });
      haptics.spin();
      audio.play('spin');
      const response = await spinStormKing(ticket);
      const abandoned = () => cancelled.current || voided.current.has(ticket.requestId);
      if (abandoned() || (response.ok && response.cancelled)) {
        await refundRound(ticket.requestId);
        voided.current.delete(ticket.requestId);
        busy.current = false;
        return;
      }
      if (!response.ok) {
        if (response.retryable) {
          voided.current.add(ticket.requestId);
          const refunded = await refundRound(ticket.requestId);
          if (refunded) voided.current.delete(ticket.requestId);
          else patchStormKing({ status: 'requesting', error: response.message, auto: false });
        } else {
          if (activeRequest.current === ticket.requestId) activeRequest.current = null;
          await savePendingSpin(null);
          patchStormKing({ status: 'error', error: response.message, auto: false });
        }
        busy.current = false;
        return;
      }
      patchStormKing({ status: 'animating', balance: response.balance, multiplier: 1 });
      setRunning(0);
      measureTarget();
      await playSpin({
        result: response.result,
        previous: symbolsRef.current,
        cell: cellRef.current,
        turbo: stormKingSnapshot().turbo,
        reduceMotion: reduceRef.current,
        cancelled: () => cancelled.current || voided.current.has(ticket.requestId),
        onBoard: (next) => {
          symbolsRef.current = next;
          setSymbols(next);
        },
        onWinPop: setPops,
        onRunningWin: setRunning,
        onMultiplier: (value) => patchStormKing({ multiplier: value }),
        target: targetRef.current,
      });
      if (cancelled.current || voided.current.has(ticket.requestId)) {
        await refundRound(ticket.requestId);
        voided.current.delete(ticket.requestId);
        busy.current = false;
        return;
      }
      activeRequest.current = null;
      await savePendingSpin(null);
      setPops({});
      setRunning(response.win);
      patchStormKing({
        status: 'idle',
        lastWin: response.win,
        balance: response.balance,
        ...(response.gameBalance != null ? { gameBalance: response.gameBalance } : {}),
        multiplier: response.result.multiplierSum,
      });
      if (response.win > 0) {
        audio.play(response.win >= bet * BIG_WIN_BET_MULT ? 'big-win' : 'win');
        if (response.win >= bet * BIG_WIN_BET_MULT) haptics.bigWin();
        const reveal = (dx: number, dy: number) => {
          setFlyTo({ dx, dy });
          setBanner(response.win);
        };
        const node = winRef.current;
        if (node) {
          node.measureInWindow((x, y, w, h) => {
            reveal(x + w / 2 - width / 2, y + h / 2 - height / 2);
          });
        } else {
          reveal(0, 140);
        }
        busy.current = false;
        return;
      }
      busy.current = false;
      const after = stormKingSnapshot();
      if (after.auto && after.balance >= after.bet) {
        await sleep(AUTO_GAP_MS);
        if (!cancelled.current && stormKingSnapshot().auto) void runSpin();
      } else if (after.auto) {
        patchStormKing({ auto: false, status: 'error', error: t('stormKing.insufficient') });
      }
    },
    [audio, haptics, height, measureTarget, refundRound, roomId, t, width],
  );

  const runSpinRef = useRef(runSpin);
  runSpinRef.current = runSpin;

  useEffect(() => {
    let live = true;
    void loadPendingSpin().then(async (pending) => {
      if (!live) return;
      if (pending) {
        busy.current = true;
        activeRequest.current = pending.requestId;
        voided.current.add(pending.requestId);
        await refundRound(pending.requestId);
        voided.current.delete(pending.requestId);
        busy.current = false;
      }
      ready.current = true;
    });
    return () => {
      live = false;
    };
  }, [refundRound]);

  const busyUi = store.status === 'requesting' || store.status === 'animating';
  const bursts = symbols
    .filter((symbol) => (pops[symbol.uid] ?? 0) > 0)
    .slice(0, 8)
    .map((symbol) => ({
      id: symbol.uid,
      x: symbol.col * layout.cell,
      y: symbol.row * layout.cell,
    }));

  const closeBanner = useCallback(() => {
    setBanner(null);
    const after = stormKingSnapshot();
    if (!after.auto) return;
    if (after.balance >= after.bet) void runSpinRef.current();
    else patchStormKing({ auto: false, status: 'error', error: t('stormKing.insufficient') });
  }, [t]);

  return (
    <View style={styles.root}>
      <TempleBackground reduceMotion={reduceMotion} />
      <GameCardFrame corner={frameCorner} />
      <View style={[styles.column, { paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: framePad }]}>
        <View style={styles.hud}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
            hitSlop={8}
            style={styles.close}
          >
            <Ionicons name="close" size={18} color={STORM_THEME.ink} />
            <Text style={styles.closeText}>{t('ortak.kapat')}</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{t('stormKing.title')}</Text>
            <Text style={styles.hint} numberOfLines={1}>{t('stormKing.leaveRefund')}</Text>
          </View>
          <Pressable
            onPress={audio.toggleMusic}
            accessibilityRole="button"
            accessibilityLabel={audio.musicOn ? t('stormKing.muteMusic') : t('stormKing.unmuteMusic')}
            style={styles.back}
          >
            <Ionicons
              name={audio.musicOn ? 'volume-high' : 'volume-mute'}
              size={20}
              color={STORM_THEME.gold}
            />
          </Pressable>
          <CoinChip label={t('stormKing.coin')} value={store.balance} />
          {store.gameBalance != null ? (
            <CoinChip label={t('oyunY.oyunCoinKisa')} value={store.gameBalance} />
          ) : null}
        </View>
        {store.error ? <Text style={styles.error}>{store.error}</Text> : null}
        <View ref={multRef} onLayout={measureTarget}>
          <MultiplierDisplay
            label={t('stormKing.multiplier')}
            value={`${store.multiplier}×`}
            width={layout.boardW}
          />
        </View>
        <TempleFrame boardWidth={layout.boardW} boardHeight={layout.boardH} archHeight={arch}>
          <View ref={boardRef} onLayout={measureTarget}>
            <StormBoard symbols={symbols} cell={layout.cell} pops={pops} />
            <StormEffects bursts={bursts} cell={layout.cell} />
          </View>
        </TempleFrame>
        <View ref={winRef} collapsable={false}>
          <WinDisplay label={t('stormKing.win')} value={busyUi ? running : store.lastWin} />
        </View>
        <StormControlPanel
          betLabel={t('stormKing.bet')}
          bet={store.bet}
          turboLabel={t('stormKing.turbo')}
          autoLabel={store.auto ? t('stormKing.stop') : t('stormKing.auto')}
          payLabel={t('stormKing.paytable')}
          spinLabel={t('stormKing.spin')}
          turbo={store.turbo}
          auto={store.auto}
          showAuto={false}
          busy={busyUi}
          reduceMotion={reduceMotion}
          onDec={() => {
            haptics.tap();
            cycleStormKingBet(-1);
          }}
          onInc={() => {
            haptics.tap();
            cycleStormKingBet(1);
          }}
          onTurbo={() => patchStormKing({ turbo: !store.turbo })}
          onAuto={() => {
            const next = !stormKingSnapshot().auto;
            patchStormKing({ auto: next });
            if (next) void runSpin();
          }}
          onPay={() => setPayOpen(true)}
          onSpin={() => void runSpin()}
        />
      </View>
      <WinBanner
        visible={banner != null}
        title={
          banner != null && banner >= store.bet * BIG_WIN_BET_MULT
            ? t('stormKing.bigWin')
            : t('stormKing.win')
        }
        amount={banner ?? 0}
        reduceMotion={reduceMotion}
        flyTo={flyTo}
        onDone={closeBanner}
      />
      <PayTableSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title={t('stormKing.paytable')}
        closeLabel={t('stormKing.back')}
        tumble={t('stormKing.tumble')}
        orb={t('stormKing.orb')}
        maxWin={t('stormKing.max')}
        nonCash={t('stormKing.nonCash')}
        tier8={t('stormKing.tier8')}
        tier10={t('stormKing.tier10')}
        tier12={t('stormKing.tier12')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: STORM_THEME.ink },
  column: { flex: 1, alignItems: 'center' },
  hud: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    zIndex: 8,
  },
  close: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: STORM_THEME.gold,
  },
  closeText: {
    color: STORM_THEME.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 8, 28, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.35)',
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  title: {
    textAlign: 'center',
    color: STORM_THEME.gold,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 15,
  },
  hint: {
    marginTop: 2,
    color: STORM_THEME.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  error: { color: '#F2C14E', fontSize: 12, marginBottom: 4, paddingHorizontal: 16 },
});
