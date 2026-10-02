/**
 * Bridge: WebView ↔ RN. Demo RNG/kredi yok — sunucu planı oynatılır.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BET_OPTIONS, createGrid, type Grid, type SpinPlan } from './engine';
import { playSound } from './audio';

type HostToWeb =
  | { type: 'init'; balance: number; freeSpins?: number; freeBet?: number }
  | { type: 'balance'; balance: number }
  | {
      type: 'spinResult';
      ok: true;
      idempotencyKey: string;
      plan: SpinPlan;
      balanceAfter: number;
      roundId: string;
      remainingFreeSpins: number;
      freeBet: number;
    }
  | { type: 'spinResult'; ok: false; idempotencyKey: string; error: string; code?: string }
  | { type: 'spinBusy' };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    __astralHost?: (msg: HostToWeb) => void;
  }
}

function postToHost(payload: Record<string, unknown>) {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
  } catch {
    // native bridge yoksa sessiz
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function newIdempotencyKey() {
  return `af_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useSlotGame() {
  const [board, setBoard] = useState<Grid>(() => createGrid(() => 0.42));
  const [phase, setPhase] = useState<'idle' | 'fall' | 'win'>('idle');
  const [highlightIds, setHighlightIds] = useState<number[]>([]);
  const [credits, setCredits] = useState(0);
  const [bet, setBetValue] = useState<number>(BET_OPTIONS[0]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [totalMultiplier, setTotalMultiplier] = useState(0);
  const [cascades, setCascades] = useState(0);
  const [statusText, setStatusText] = useState('Bağlanıyor…');
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayRemaining, setAutoPlayRemaining] = useState<number | null>(null);
  const [autoPlayPlayed, setAutoPlayPlayed] = useState(0);
  const [hostReady, setHostReady] = useState(false);

  const busy = useRef(false);
  const mounted = useRef(true);
  const creditsRef = useRef(0);
  const betRef = useRef(bet);
  const freeSpinsRef = useRef(0);
  const freeBetRef = useRef<number>(BET_OPTIONS[0]);
  const mutedRef = useRef(false);
  const turboRef = useRef(false);
  const autoActiveRef = useRef(false);
  const autoSessionRef = useRef(0);
  const spinWaiters = useRef<
    Map<
      string,
      {
        resolve: (v: HostToWeb & { type: 'spinResult' }) => void;
        reject: (e: Error) => void;
      }
    >
  >(new Map());

  useEffect(() => {
    mounted.current = true;
    const onHost = (msg: HostToWeb) => {
      if (!mounted.current) return;
      if (msg.type === 'init' || msg.type === 'balance') {
        creditsRef.current = msg.balance;
        setCredits(msg.balance);
        if (msg.type === 'init') {
          if (typeof msg.freeSpins === 'number') {
            freeSpinsRef.current = msg.freeSpins;
            setFreeSpins(msg.freeSpins);
          }
          if (typeof msg.freeBet === 'number' && msg.freeBet > 0) {
            freeBetRef.current = msg.freeBet;
          }
          setHostReady(true);
          setStatusText('Bir bahis seç ve dönüşü başlat');
        }
        return;
      }
      if (msg.type === 'spinResult') {
        const key = msg.idempotencyKey;
        const entry = spinWaiters.current.get(key);
        if (entry) {
          spinWaiters.current.delete(key);
          entry.resolve(msg);
        }
      }
    };
    window.__astralHost = onHost;
    postToHost({ type: 'ready' });
    return () => {
      mounted.current = false;
      autoSessionRef.current++;
      autoActiveRef.current = false;
      delete window.__astralHost;
    };
  }, []);

  const setBet = useCallback((value: number) => {
    if (
      !busy.current &&
      !autoActiveRef.current &&
      freeSpinsRef.current === 0 &&
      Number.isFinite(value) &&
      value >= 0.2 &&
      value <= 500
    ) {
      const next = Math.round(value * 100) / 100;
      betRef.current = next;
      setBetValue(next);
    }
  }, []);

  /** Demo reset yok — production bridge */
  const resetDemo = useCallback(() => {
    setStatusText('Bakiye sunucudan gelir');
  }, []);

  const requestServerPlan = useCallback((stake: number, isFree: boolean) => {
    const idempotencyKey = newIdempotencyKey();
    return new Promise<HostToWeb & { type: 'spinResult' }>((resolve, reject) => {
      const timer = setTimeout(() => {
        spinWaiters.current.delete(idempotencyKey);
        reject(new Error('timeout'));
      }, 28_000);
      spinWaiters.current.set(idempotencyKey, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      postToHost({
        type: 'requestSpin',
        betAmount: stake,
        freeMode: isFree,
        idempotencyKey,
      });
    });
  }, []);

  const playRound = useCallback(async (): Promise<boolean> => {
    if (busy.current || !mounted.current || !hostReady) return false;
    const isFree = freeSpinsRef.current > 0;
    const stake = isFree ? freeBetRef.current : betRef.current;
    if (!isFree && creditsRef.current < stake) {
      setStatusText('Bakiye yetersiz');
      return false;
    }
    busy.current = true;
    try {
      const speed = turboRef.current ? 0.52 : 1;
      setStatusText(isFree ? 'Ücretsiz dönüş isteniyor…' : 'Tur isteniyor…');
      // Optimistic debit display (win hidden until end — balanceAfter from server at end)
      if (!isFree) {
        creditsRef.current = Math.max(0, creditsRef.current - Math.ceil(stake));
        setCredits(creditsRef.current);
      } else {
        freeSpinsRef.current = Math.max(0, freeSpinsRef.current - 1);
        setFreeSpins(freeSpinsRef.current);
      }

      const res = await requestServerPlan(stake, isFree);
      if (!res.ok) {
        // restore display from host will follow; ask refresh
        postToHost({ type: 'refreshBalance' });
        setStatusText(res.error || 'Tur başarısız');
        setPhase('idle');
        return false;
      }

      const plan = res.plan;
      setLastWin(0);
      setTotalMultiplier(0);
      setCascades(0);
      setHighlightIds([]);
      setStatusText(isFree ? 'Ücretsiz dönüş oynanıyor' : 'Semboller düşüyor');
      setBoard(plan.initialGrid);
      setPhase('fall');
      playSound('drop', mutedRef.current);
      await delay(490 * speed);
      if (!mounted.current) return false;

      for (let i = 0; i < plan.cascades.length; i++) {
        const step = plan.cascades[i]!;
        setPhase('win');
        setHighlightIds(step.removedIds);
        setTotalMultiplier(step.multiplier);
        setCascades(i + 1);
        setStatusText(`${i + 1}. zincir • ${step.multiplier}× çarpan`);
        playSound('match', mutedRef.current);
        await delay(530 * speed);
        if (!mounted.current) return false;
        setHighlightIds([]);
        setBoard(step.nextGrid);
        setPhase('fall');
        playSound('drop', mutedRef.current);
        await delay(430 * speed);
        if (!mounted.current) return false;
      }

      creditsRef.current = res.balanceAfter;
      setCredits(res.balanceAfter);
      freeSpinsRef.current = res.remainingFreeSpins;
      setFreeSpins(res.remainingFreeSpins);
      if (res.freeBet > 0) freeBetRef.current = res.freeBet;
      setLastWin(plan.payout);
      setHistory((current) => [plan.payout, ...current].slice(0, 8));
      if (plan.freeSpinsAwarded) {
        setStatusText(`Bonus açıldı • ${plan.freeSpinsAwarded} ücretsiz dönüş`);
        playSound('bonus', mutedRef.current);
      } else if (plan.payout > 0) {
        setStatusText(`${plan.payout.toLocaleString('tr-TR')} coin kazandın`);
        playSound('win', mutedRef.current);
      } else {
        setStatusText('Bu tur kazanç yok • yeniden dene');
      }
      postToHost({ type: 'markPlayed', roundId: res.roundId });
      setPhase('idle');
      return true;
    } catch (error) {
      if (mounted.current) {
        setStatusText('Tur tamamlanamadı');
        setPhase('idle');
        postToHost({ type: 'refreshBalance' });
      }
      console.error('Astral spin failed:', error);
      return false;
    } finally {
      busy.current = false;
    }
  }, [hostReady, requestServerPlan]);

  const spin = useCallback(() => {
    if (!autoActiveRef.current) void playRound();
  }, [playRound]);

  const stopAutoPlay = useCallback(() => {
    if (!autoActiveRef.current) return;
    autoActiveRef.current = false;
    autoSessionRef.current++;
    setIsAutoPlaying(false);
    setAutoPlayRemaining(null);
    setStatusText(
      busy.current
        ? 'Otomatik oynatma bu turun sonunda duracak'
        : 'Otomatik oynatma durduruldu',
    );
  }, []);

  const startAutoPlay = useCallback(
    (count: number | null) => {
      if (
        busy.current ||
        autoActiveRef.current ||
        (count !== null && ![10, 20, 30, 50].includes(count))
      )
        return;
      if (freeSpinsRef.current === 0 && creditsRef.current < betRef.current) {
        setStatusText('Bakiye yetersiz');
        return;
      }
      const session = ++autoSessionRef.current;
      autoActiveRef.current = true;
      setIsAutoPlaying(true);
      setAutoPlayRemaining(count);
      setAutoPlayPlayed(0);
      void (async () => {
        let played = 0;
        while (
          mounted.current &&
          autoSessionRef.current === session &&
          (count === null || played < count)
        ) {
          const completed = await playRound();
          if (!mounted.current) return;
          if (!completed) break;
          played++;
          setAutoPlayPlayed(played);
          if (autoSessionRef.current !== session) break;
          setAutoPlayRemaining(count === null ? null : count - played);
          if (count !== null && played >= count) break;
          if (
            freeSpinsRef.current === 0 &&
            creditsRef.current < betRef.current
          ) {
            setStatusText('Bakiye yetersiz — otomatik oynatma durdu');
            break;
          }
          await delay(turboRef.current ? 120 : 260);
        }
        if (mounted.current && autoSessionRef.current === session) {
          autoActiveRef.current = false;
          setIsAutoPlaying(false);
          setAutoPlayRemaining(null);
        }
      })();
    },
    [playRound],
  );

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  const toggleTurbo = useCallback(() => {
    turboRef.current = !turboRef.current;
    setTurbo(turboRef.current);
  }, []);

  return {
    board,
    phase,
    highlightIds,
    credits,
    bet,
    setBet,
    spin,
    resetDemo,
    muted,
    toggleMute,
    turbo,
    toggleTurbo,
    isAutoPlaying,
    autoPlayRemaining,
    autoPlayPlayed,
    startAutoPlay,
    stopAutoPlay,
    freeSpins,
    lastWin,
    totalMultiplier,
    cascades,
    statusText,
    history,
  };
}
