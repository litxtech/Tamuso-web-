import { useCallback, useEffect, useRef, useState } from 'react';
import { BET_OPTIONS, createGrid, createSpinPlan, type Grid } from './engine';
import { playSound } from './audio';

const START_CREDITS = 5000;
const STORAGE_KEY = 'astral-falls-demo-credits';

function initialCredits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return START_CREDITS;
    const stored = Number(raw);
    return Number.isFinite(stored) && stored >= 0 ? stored : START_CREDITS;
  } catch {
    return START_CREDITS;
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function useSlotGame() {
  const [board, setBoard] = useState<Grid>(() => createGrid());
  const [phase, setPhase] = useState<'idle' | 'fall' | 'win'>('idle');
  const [highlightIds, setHighlightIds] = useState<number[]>([]);
  const [credits, setCredits] = useState(initialCredits);
  const [bet, setBetValue] = useState<number>(BET_OPTIONS[0]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [totalMultiplier, setTotalMultiplier] = useState(0);
  const [cascades, setCascades] = useState(0);
  const [statusText, setStatusText] = useState('Bir bahis seç ve dönüşü başlat');
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayRemaining, setAutoPlayRemaining] = useState<number | null>(null);
  const [autoPlayPlayed, setAutoPlayPlayed] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const creditsRef = useRef(credits);
  const betRef = useRef(bet);
  const freeSpinsRef = useRef(0);
  const freeBetRef = useRef<number>(BET_OPTIONS[0]);
  const mutedRef = useRef(false);
  const turboRef = useRef(false);
  const autoActiveRef = useRef(false);
  const autoSessionRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      autoSessionRef.current++;
      autoActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(credits));
    } catch {
      // Demo remains playable if browser storage is unavailable.
    }
  }, [credits]);

  const setBet = useCallback((value: number) => {
    if (!busy.current && !autoActiveRef.current && freeSpinsRef.current === 0 &&
        Number.isFinite(value) && value >= 0.2 && value <= 500) {
      const next = Math.round(value * 100) / 100;
      betRef.current = next;
      setBetValue(next);
    }
  }, []);

  const resetDemo = useCallback(() => {
    if (busy.current || autoActiveRef.current) return;
    creditsRef.current = START_CREDITS;
    freeSpinsRef.current = 0;
    freeBetRef.current = BET_OPTIONS[0];
    setCredits(START_CREDITS);
    setFreeSpins(0);
    setHistory([]);
    setLastWin(0);
    setTotalMultiplier(0);
    setCascades(0);
    setStatusText('Demo bakiyesi yenilendi');
  }, []);

  const playRound = useCallback(async (): Promise<boolean> => {
    if (busy.current || !mounted.current) return false;
    const isFree = freeSpinsRef.current > 0;
    const stake = isFree ? freeBetRef.current : betRef.current;
    if (!isFree && creditsRef.current < stake) {
      setStatusText('Demo bakiyesi yetersiz — bakiyeyi yenile');
      return false;
    }
    busy.current = true;
    try {
      const speed = turboRef.current ? 0.52 : 1;
      // Local demo only. Production must receive the whole outcome from its server.
      const plan = createSpinPlan(stake, isFree);
      if (isFree) {
        freeSpinsRef.current--;
        setFreeSpins(freeSpinsRef.current);
      } else {
        creditsRef.current = Math.round((creditsRef.current - stake) * 100) / 100;
        setCredits(creditsRef.current);
      }
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
        const step = plan.cascades[i];
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

      creditsRef.current = Math.round((creditsRef.current + plan.payout) * 100) / 100;
      setCredits(creditsRef.current);
      setLastWin(plan.payout);
      setHistory((current) => [plan.payout, ...current].slice(0, 8));
      if (plan.freeSpinsAwarded) {
        freeBetRef.current = stake;
        freeSpinsRef.current += plan.freeSpinsAwarded;
        setFreeSpins(freeSpinsRef.current);
        setStatusText(`Bonus açıldı • ${plan.freeSpinsAwarded} ücretsiz dönüş`);
        playSound('bonus', mutedRef.current);
      } else if (plan.payout > 0) {
        setStatusText(`${plan.payout.toLocaleString('tr-TR')} demo kredi kazandın`);
        playSound('win', mutedRef.current);
      } else {
        setStatusText('Bu tur kazanç yok • yeniden dene');
      }
      setPhase('idle');
      return true;
    } catch (error) {
      if (mounted.current) {
        setStatusText('Demo turu tamamlanamadı');
        setPhase('idle');
      }
      console.error('Demo spin failed:', error);
      return false;
    } finally {
      busy.current = false;
    }
  }, []);

  const spin = useCallback(() => {
    if (!autoActiveRef.current) void playRound();
  }, [playRound]);

  const stopAutoPlay = useCallback(() => {
    if (!autoActiveRef.current) return;
    autoActiveRef.current = false;
    autoSessionRef.current++;
    setIsAutoPlaying(false);
    setAutoPlayRemaining(null);
    setStatusText(busy.current ? 'Otomatik oynatma bu turun sonunda duracak' : 'Otomatik oynatma durduruldu');
  }, []);

  const startAutoPlay = useCallback((count: number | null) => {
    if (busy.current || autoActiveRef.current ||
        (count !== null && ![10, 20, 30, 50].includes(count))) return;
    if (freeSpinsRef.current === 0 && creditsRef.current < betRef.current) {
      setStatusText('Demo bakiyesi yetersiz — bakiyeyi yenile');
      return;
    }
    const session = ++autoSessionRef.current;
    autoActiveRef.current = true;
    setIsAutoPlaying(true);
    setAutoPlayRemaining(count);
    setAutoPlayPlayed(0);
    void (async () => {
      let played = 0;
      while (mounted.current && autoSessionRef.current === session &&
             (count === null || played < count)) {
        const completed = await playRound();
        if (!mounted.current) return;
        if (!completed) break;
        played++;
        setAutoPlayPlayed(played);
        if (autoSessionRef.current !== session) break;
        setAutoPlayRemaining(count === null ? null : count - played);
        if (count !== null && played >= count) break;
        if (freeSpinsRef.current === 0 && creditsRef.current < betRef.current) {
          setStatusText('Demo bakiyesi yetersiz — otomatik oynatma durdu');
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
  }, [playRound]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  const toggleTurbo = useCallback(() => {
    turboRef.current = !turboRef.current;
    setTurbo(turboRef.current);
  }, []);

  return {
    board, phase, highlightIds, credits, bet, setBet, spin, resetDemo,
    muted, toggleMute, turbo, toggleTurbo,
    isAutoPlaying, autoPlayRemaining, autoPlayPlayed, startAutoPlay, stopAutoPlay,
    freeSpins, lastWin, totalMultiplier, cascades, statusText, history,
  };
}