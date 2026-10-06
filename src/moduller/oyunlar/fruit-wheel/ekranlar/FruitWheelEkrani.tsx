import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCeviri } from '../../../../i18n/useCeviri';
import { supabase } from '../../../../lib/supabase';
import { fruitWheelOlay } from '../analitik/FruitWheelAnalitik';
import { readAuthoritativeBalance } from '../ekonomi/FruitWheelEconomyAdapter';
import {
  FRUIT_ACCENT,
  FRUIT_IMAGES,
  FRUIT_ORDER,
  type FruitId,
} from '../sabitler/FruitWheelSabitleri';
import {
  fruitWheelConfirm,
  fruitWheelHeartbeat,
  fruitWheelSync,
  newFruitWheelIdempotencyKey,
} from '../servisler/FruitWheelApi';
import { fruitWheelSes, fruitWheelSesKapat, preloadFruitWheelAudio, setFruitWheelSoundEnabled } from '../ses/FruitWheelAudio';
import type { FruitWheelState, PublicFruit, RoundStatus } from '../tipler/FruitWheelTipleri';
import { FruitWheelCarki } from '../ui/FruitWheelCarki';
import { FruitWheelKazanan } from '../ui/FruitWheelKazanan';

type Props = {
  onClose: () => void;
  onHistory: () => void;
  onRules: () => void;
};

const CUSTOM_INPUT_ID = 'fruit-wheel-custom-amount';
const YEREL_MEYVELER: PublicFruit[] = FRUIT_ORDER.map((id) => ({
  id,
  multiplier: 0,
  accent: FRUIT_ACCENT[id],
  enabled: true,
  tier: 'NORMAL',
}));

function clockText(remainSec: number): string {
  return `${String(Math.floor(remainSec / 60)).padStart(2, '0')}:${String(remainSec % 60).padStart(2, '0')}`;
}

function KalanSure({
  locksAt,
  offset,
  style,
  prefix,
  active,
  onTick,
}: {
  locksAt: number;
  offset: React.RefObject<number>;
  style: object;
  prefix: string;
  active: boolean;
  onTick?: (remainSec: number) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const lastSec = useRef<number | null>(null);
  useEffect(() => {
    if (!active || !locksAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, locksAt]);
  const remainSec =
    active && locksAt ? Math.max(0, Math.ceil((locksAt - (now + offset.current)) / 1000)) : null;
  useEffect(() => {
    if (remainSec == null) return;
    if (lastSec.current === remainSec) return;
    lastSec.current = remainSec;
    onTick?.(remainSec);
  }, [remainSec, onTick]);
  if (!active || !locksAt || remainSec == null) {
    return <Text style={style} numberOfLines={1}>{prefix}</Text>;
  }
  return <Text style={style} numberOfLines={1}>{prefix}{`  ·  ${clockText(remainSec)}`}</Text>;
}

function coin(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('tr-TR');
}

function statusText(status: RoundStatus, t: ReturnType<typeof useCeviri>['t']): string {
  if (status === 'LOCKING') return t('oyun.fwStLocking');
  if (status === 'LOCKED') return t('oyun.fwStLocked');
  if (status === 'SPINNING') return t('oyun.fwStSpinning');
  if (status === 'SETTLING') return t('oyun.fwStSettling');
  if (status === 'RESULT' || status === 'SETTLED') return t('oyun.fwStResult');
  if (status === 'NEXT_ROUND') return t('oyun.fwStNext');
  return t('oyun.fwStOpen');
}

export function FruitWheelEkrani({ onClose, onHistory, onRules }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [soundOn, setSoundOn] = useState(true);
  const [state, setState] = useState<FruitWheelState | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [activeFruit, setActiveFruit] = useState<FruitId>('cherry');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const customInput = useRef<TextInput>(null);

  const closeCustom = useCallback((apply: boolean) => {
    Keyboard.dismiss();
    customInput.current?.blur();
    if (apply) {
      const n = Math.floor(Number(customText));
      if (Number.isFinite(n) && n > 0) {
        setCustomText('');
        setCustomOpen(false);
        return n;
      }
    }
    setCustomText('');
    setCustomOpen(false);
    return 0;
  }, [customText]);
  const [shownBalance, setShownBalance] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [spinArmed, setSpinArmed] = useState(false);
  const [armedWin, setArmedWin] = useState<FruitId | null>(null);
  const [spinRoundNo, setSpinRoundNo] = useState(1);
  const [stageH, setStageH] = useState(220);
  const [chip, setChip] = useState(10);
  const [kazancKarti, setKazancKarti] = useState(false);
  const armedRoundId = useRef<string | null>(null);
  const armedRoundNo = useRef<number | null>(null);
  const armedLocksAt = useRef<number>(0);
  const pendingWinId = useRef<FruitId | null>(null);
  const spinDoneRef = useRef(false);
  const spinningRef = useRef(false);
  const spinArmedRef = useRef(false);
  const frozenSpin = useRef<{ roundNo: number; fruitId: FruitId } | null>(null);
  const sealedStakes = useRef<Record<string, number>>({});
  const lastSettlement = useRef<{ fruitId: string; matched: boolean; payout: number; multiplier: number }[]>([]);
  const [winPayout, setWinPayout] = useState<{ payout: number; multiplier: number } | null>(null);
  const [akis, setAkis] = useState<
    { id: string; kind: 'play' | 'win' | 'lose'; text: string; fruitId?: FruitId }[]
  >([]);
  const akisScroll = useRef<ScrollView>(null);
  const idem = useRef<string | null>(null);
  const offset = useRef(0);
  const seenRound = useRef<string | null>(null);
  const kartTur = useRef<string | null>(null);
  const kartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCountdownSec = useRef<number | null>(null);
  const autoConfirmRound = useRef<string | null>(null);
  const confirmRef = useRef<() => Promise<void>>(async () => undefined);
  const selecting = Object.keys(draft).length > 0;

  const names = useMemo(
    () => ({
      cherry: t('oyun.fwCherry'),
      lemon: t('oyun.fwLemon'),
      orange: t('oyun.fwOrange'),
      watermelon: t('oyun.fwWatermelon'),
      grape: t('oyun.fwGrape'),
      strawberry: t('oyun.fwStrawberry'),
      pineapple: t('oyun.fwPineapple'),
      kiwi: t('oyun.fwKiwi'),
    }),
    [t],
  );

  const pull = useCallback(async () => {
    const res = await fruitWheelSync();
    if (!res.ok) {
      fruitWheelOlay('game_error', { code: res.code });
      setNote(t('oyun.fwClosed'));
      return;
    }
    offset.current = new Date(res.serverNow).getTime() - Date.now();
    const roundId = res.round?.id ?? null;
    const win = (res.round?.winningFruitId ?? null) as FruitId | null;

    // Settlement bir an görünüp sonraki OPEN'da silinmesin diye önbellekle
    if ((res.mySettlement?.length ?? 0) > 0) {
      lastSettlement.current = res.mySettlement.map((s) => ({
        fruitId: s.fruitId,
        matched: Boolean(s.matched),
        payout: Number(s.payout) || 0,
        multiplier: Number(s.multiplier) || 0,
      }));
    }

    // Silahlı tur sonucu: aynı turda veya recent'ten kurtar
    if (armedRoundId.current && !spinDoneRef.current) {
      if (win && roundId === armedRoundId.current) {
        pendingWinId.current = win;
        setArmedWin(win);
      } else if (!pendingWinId.current && armedRoundNo.current != null) {
        const hit = res.recent?.find((r) => r.roundNo === armedRoundNo.current);
        if (hit?.fruitId) {
          pendingWinId.current = hit.fruitId as FruitId;
          setArmedWin(hit.fruitId as FruitId);
        }
      }
    }

    setState(res);
    if (roundId && roundId !== seenRound.current) {
      // Sonuç kaçtıysa recent'ten kurtar (yeni tur gelmeden önce / hemen sonra)
      if (
        armedRoundId.current &&
        !spinDoneRef.current &&
        !pendingWinId.current &&
        armedRoundNo.current != null
      ) {
        const hit = res.recent?.find((r) => r.roundNo === armedRoundNo.current);
        if (hit?.fruitId) {
          pendingWinId.current = hit.fruitId as FruitId;
          setArmedWin(hit.fruitId as FruitId);
        }
      }

      let keepForSpin =
        Boolean(armedRoundId.current) &&
        !spinDoneRef.current &&
        (spinningRef.current || spinArmedRef.current || Boolean(pendingWinId.current));

      // Silahlı tur recent penceresinden düştüyse vazgeç
      if (
        keepForSpin &&
        !pendingWinId.current &&
        !spinningRef.current &&
        armedRoundNo.current != null &&
        (res.recent?.length ?? 0) > 0
      ) {
        const oldest = Math.min(...res.recent.map((r) => r.roundNo));
        if (armedRoundNo.current < oldest) keepForSpin = false;
      }

      seenRound.current = roundId;
      const next: Record<string, number> = {};
      for (const line of res.mySelections) next[line.fruitId] = line.amount;
      setDraft(next);
      if (!keepForSpin) {
        spinningRef.current = false;
        spinArmedRef.current = false;
        setSpinning(false);
        setSpinDone(false);
        setSpinArmed(false);
        armedRoundId.current = null;
        armedRoundNo.current = null;
        pendingWinId.current = null;
        frozenSpin.current = null;
        setArmedWin(null);
      }
      fruitWheelOlay('round_view', { roundId });
      if (!spinningRef.current) fruitWheelSes('round-open');
    }
    setShownBalance(res.balance);
  }, [t]);

  useEffect(() => {
    void preloadFruitWheelAudio();
    setFruitWheelSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    fruitWheelOlay('fruit_wheel_open');
    void pull();
    void fruitWheelHeartbeat();
    const syncTimer = setInterval(() => void pull(), 8000);
    const beat = setInterval(() => void fruitWheelHeartbeat(), 15000);
    let livePull: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('fruit-wheel-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fruit_wheel_live' },
        () => {
          if (livePull) clearTimeout(livePull);
          livePull = setTimeout(() => void pull(), 500);
        },
      )
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        fruitWheelOlay('recover_round');
        void pull();
      }
    });
    return () => {
      clearInterval(syncTimer);
      clearInterval(beat);
      if (livePull) clearTimeout(livePull);
      void supabase.removeChannel(channel);
      sub.remove();
      fruitWheelSesKapat();
      fruitWheelOlay('game_exit');
    };
  }, [pull]);

  // Bakiye count-up yok — ısı / JS yükü
  useEffect(() => {
    if (state) setShownBalance(state.balance);
  }, [state?.balance]);

  const onWheelSettled = useCallback(() => {
    spinningRef.current = false;
    setSpinning(false);
    setSpinDone(true);
    spinDoneRef.current = true;
    spinArmedRef.current = false;
    setSpinArmed(false);
    armedRoundId.current = null;
    // armedWin / frozenSpin sonucu göstermek için tut — yeni turda silinir
    setNote('');
    fruitWheelSes('wheel-stop');
    void pull();
  }, [pull]);

  const status = state?.round?.status ?? 'OPEN';
  const openForBets = status === 'OPEN' || status === 'LOCKING';
  const locksAt = state?.round ? new Date(state.round.locksAt).getTime() : 0;

  // Sunucu SPINNING olduktan sonra kazananı al — erken dönmesin
  useEffect(() => {
    const serverWin = state?.round?.winningFruitId as FruitId | null | undefined;
    if (!serverWin || spinDoneRef.current || spinningRef.current) return;
    const spinPhase =
      status === 'SPINNING' || status === 'SETTLING' || status === 'RESULT';
    if (!spinPhase) return;

    pendingWinId.current = serverWin;
    setArmedWin(serverWin);
    if (!armedRoundId.current && state?.round) {
      armedRoundId.current = state.round.id;
      armedRoundNo.current = state.round.roundNo;
      armedLocksAt.current = new Date(state.round.locksAt).getTime();
    }
    if (!spinArmedRef.current) {
      if (Object.keys(sealedStakes.current).length === 0 && (state?.mySelections?.length ?? 0) > 0) {
        const seal: Record<string, number> = {};
        for (const line of state!.mySelections) seal[line.fruitId] = line.amount;
        sealedStakes.current = seal;
      }
      spinDoneRef.current = false;
      spinArmedRef.current = true;
      setSpinDone(false);
      setSpinArmed(true);
    }
  }, [status, state?.round?.id, state?.round?.roundNo, state?.round?.winningFruitId, state?.mySelections, state?.round?.locksAt]);

  const winId = frozenSpin.current?.fruitId ?? armedWin ?? pendingWinId.current ?? null;

  // Hazırlık: silahlıyken sık sync (gecikmeyi kısalt)
  useEffect(() => {
    if (!spinArmed || spinning || spinDone) return;
    void pull();
    const id = setInterval(() => void pull(), 220);
    return () => clearInterval(id);
  }, [spinArmed, spinning, spinDone, pull]);

  // Kilit / spin fazında sık sync
  useEffect(() => {
    if (spinning || spinDone) return;
    if (status !== 'LOCKING' && status !== 'LOCKED' && status !== 'SPINNING' && status !== 'SETTLING') {
      return;
    }
    void pull();
    const id = setInterval(() => void pull(), 200);
    return () => clearInterval(id);
  }, [status, spinning, spinDone, pull]);

  // Silahlı + kazanan + SPINNING → hemen dön (saat kayması yüzünden ekstra bekletme)
  useEffect(() => {
    if (!spinArmed || spinning || spinDone) return;
    const fruit = armedWin ?? pendingWinId.current;
    if (!fruit) return;
    const spinPhase =
      status === 'SPINNING' || status === 'SETTLING' || status === 'RESULT';
    if (!spinPhase) {
      // Faz henüz gelmediyse sadece kilit saati geçtiyse dene
      const lockTs = armedLocksAt.current || locksAt;
      if (!(lockTs > 0 && Date.now() + offset.current >= lockTs)) return;
    }
    const rNo = armedRoundNo.current ?? state?.round?.roundNo ?? 1;
    frozenSpin.current = { roundNo: rNo, fruitId: fruit };
    setSpinRoundNo(rNo);
    setArmedWin(fruit);
    spinningRef.current = true;
    setSpinning(true);
    setNote('');
    fruitWheelOlay('spin_started', { fruitId: fruit });
  }, [spinArmed, armedWin, spinning, spinDone, status, locksAt, state?.round?.roundNo]);

  const total = Object.values(draft).reduce((s, n) => s + n, 0);
  const balance = readAuthoritativeBalance(state?.balance ?? 0, state?.economyMode ?? 'TEST_BALANCE');
  const remaining = Math.max(0, balance.amount - total);

  const addAmount = (fruit: FruitId, amount: number) => {
    if (!openForBets || !state) return;
    const maxF = state.limits.maximumSelectionPerFruit;
    const maxT = state.limits.maximumTotalPerRound;
    setDraft((prev) => {
      const cur = prev[fruit] ?? 0;
      const roomFruit = Math.max(0, maxF - cur);
      const roomTotal = Math.max(0, maxT - total);
      const roomBal = Math.max(0, balance.amount - total);
      const next = Math.min(amount, roomFruit, roomTotal, roomBal);
      if (next <= 0) return prev;
      fruitWheelOlay('selection_add', { fruitId: fruit, amount: next });
      fruitWheelSes('selection-add');
      return { ...prev, [fruit]: cur + next };
    });
    setActiveFruit(fruit);
  };

  const clearFruit = (fruit: string) => {
    if (!openForBets) return;
    setDraft((prev) => {
      if (!prev[fruit]) return prev;
      fruitWheelOlay('selection_remove', { fruitId: fruit });
      fruitWheelSes('selection-remove');
      const next = { ...prev };
      delete next[fruit];
      return next;
    });
  };

  const pushAkis = useCallback(
    (kind: 'play' | 'win' | 'lose', text: string, fruitId?: FruitId) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setAkis((prev) => [{ id, kind, text, fruitId }, ...prev].slice(0, 24));
      requestAnimationFrame(() => akisScroll.current?.scrollTo({ x: 0, animated: true }));
    },
    [],
  );

  const confirm = useCallback(async () => {
    if (!state?.round || busy || !openForBets) return;
    if (!idem.current) idem.current = newFruitWheelIdempotencyKey();
    const items = FRUIT_ORDER.filter((id) => (draft[id] ?? 0) > 0).map((id) => ({
      fruitId: id,
      amount: draft[id]!,
    }));
    if (items.length === 0) return;
    setBusy(true);
    setNote(t('oyun.fwChecking'));
    const res = await fruitWheelConfirm(state.round.id, idem.current, items);
    setBusy(false);
    if (!res.ok) {
      if (res.code === 'round_closed') setNote(t('oyun.fwRoundClosed'));
      else if (res.code === 'insufficient_balance') setNote(t('oyun.fwInsufficient'));
      else if (res.code === 'limit') setNote(t('oyun.fwLimit'));
      else setNote(t('oyun.fwClosed'));
      if (res.code !== 'network') idem.current = null;
      fruitWheelOlay('game_error', { code: res.code });
      return;
    }
    idem.current = null;
    fruitWheelSes('selection-confirm');
    fruitWheelOlay('selection_confirm', { total: res.total, duplicate: res.duplicate === true });
    setNote(t('oyun.fwPreparing'));
    sealedStakes.current = { ...draft };
    lastSettlement.current = [];
    setWinPayout(null);
    const playParts = items.map((it) => `${names[it.fruitId as FruitId] ?? it.fruitId} ${coin(it.amount)}`);
    pushAkis('play', `${t('oyun.fwPlayed')}: ${playParts.join(' · ')}`, items[0]?.fruitId as FruitId);
    armedRoundId.current = state.round.id;
    armedRoundNo.current = state.round.roundNo;
    armedLocksAt.current = new Date(state.round.locksAt).getTime();
    pendingWinId.current = null;
    frozenSpin.current = null;
    spinDoneRef.current = false;
    spinningRef.current = false;
    spinArmedRef.current = true;
    setArmedWin(null);
    setSpinDone(false);
    setSpinning(false);
    setSpinArmed(true);
    if (typeof res.balance === 'number') {
      setState((prev) => (prev ? { ...prev, balance: res.balance! } : prev));
    }
    void pull();
  }, [state, busy, openForBets, draft, t, pull, names, pushAkis]);

  confirmRef.current = () => confirm();

  const settleLines =
    (state?.mySettlement?.length ?? 0) > 0 ? state!.mySettlement : lastSettlement.current;
  const matchedFromServer = settleLines.find((s) => s.matched && Number(s.payout) > 0);
  const stakeOnWin = winId ? Number(sealedStakes.current[winId] ?? 0) : 0;
  const fruitMult = winId
    ? Number(
        state?.fruits?.find((f) => f.id === winId)?.multiplier ??
          state?.round?.multiplier ??
          matchedFromServer?.multiplier ??
          0,
      )
    : 0;
  // Sunucu settlement OPEN'da silinse bile: seçtiğin meyve = kazanan → eşleşme
  const didMatch = Boolean(matchedFromServer) || stakeOnWin > 0;
  const matched = didMatch
    ? matchedFromServer ?? {
        fruitId: winId!,
        stake: stakeOnWin,
        matched: true,
        multiplier: fruitMult,
        payout: Math.max(0, Math.floor(stakeOnWin * (fruitMult || 1))),
      }
    : undefined;
  const showResult = spinDone && Boolean(winId);
  const countdownActive = selecting && openForBets && !spinArmed && !spinning;

  // Süre bitmek üzere — seçim varsa otomatik onay (LOCKING başında değil, son anda)
  useEffect(() => {
    if (!state?.round || busy || spinArmed || spinning || spinDone) return;
    if (total <= 0 || !openForBets || !locksAt) return;
    const tick = () => {
      const remainMs = locksAt - (Date.now() + offset.current);
      // En erken ~0.6 sn kala onayla — 3-4 sn kala çarkı tetikleme
      if (remainMs > 600) return;
      const rid = state.round!.id;
      if (autoConfirmRound.current === rid) return;
      autoConfirmRound.current = rid;
      void confirmRef.current();
    };
    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [status, total, busy, spinArmed, spinning, spinDone, openForBets, locksAt, state?.round?.id]);

  // Animasyon bitti — yerel seçim + settlement ile kazan/kaybet (OPEN settlement silinse bile)
  useEffect(() => {
    if (!spinDone || !winId) {
      if (status === 'OPEN' || status === 'LOCKING') {
        if (kartTimer.current) clearTimeout(kartTimer.current);
        setKazancKarti(false);
        kartTur.current = null;
        lastCountdownSec.current = null;
      }
      return;
    }
    const key = `r${spinRoundNo}:${winId}`;
    if (kartTur.current === key) return;
    kartTur.current = key;

    const stake = Number(sealedStakes.current[winId] ?? 0);
    const fromServer = (lastSettlement.current.length
      ? lastSettlement.current
      : state?.mySettlement ?? []
    ).find((s) => s.matched && Number(s.payout) > 0);
    const won = Boolean(fromServer) || stake > 0;
    const mult = Number(
      fromServer?.multiplier ??
        state?.round?.multiplier ??
        state?.fruits?.find((f) => f.id === winId)?.multiplier ??
        0,
    );
    const payout = Number(fromServer?.payout ?? Math.floor(stake * (mult || 1)));

    if (won) {
      setWinPayout({ payout, multiplier: mult || 1 });
      setKazancKarti(true);
      fruitWheelSes('win');
      pushAkis(
        'win',
        `${t('oyun.fwWinTitle')} ${names[winId] ?? winId} · +${coin(payout)}`,
        winId,
      );
      if (kartTimer.current) clearTimeout(kartTimer.current);
      kartTimer.current = setTimeout(() => {
        setKazancKarti(false);
        setNote('');
      }, 1700);
      return;
    }

    setWinPayout(null);
    setKazancKarti(false);
    fruitWheelSes('lose');
    const lostTotal = Object.values(sealedStakes.current).reduce((s, n) => s + n, 0);
    pushAkis(
      'lose',
      `${t('oyun.fwLostShort')} · −${coin(lostTotal)}`,
      winId,
    );
    if (kartTimer.current) clearTimeout(kartTimer.current);
    kartTimer.current = setTimeout(() => {
      spinningRef.current = false;
      spinArmedRef.current = false;
      setSpinning(false);
      setSpinArmed(false);
      setSpinDone(false);
      frozenSpin.current = null;
      pendingWinId.current = null;
      setArmedWin(null);
      setNote(t('oyun.fwPreparing'));
      void pull();
    }, 280);
  }, [spinDone, winId, spinRoundNo, status, state?.mySettlement, state?.fruits, state?.round?.multiplier, pull, t, names, pushAkis]);

  // Spin bitti, settlement yoksa sık sync (payout güncellemek için)
  useEffect(() => {
    if (!spinDone || !didMatch) return;
    if (matchedFromServer) return;
    const id = setInterval(() => void pull(), 400);
    return () => clearInterval(id);
  }, [spinDone, didMatch, matchedFromServer, pull]);

  useEffect(() => {
    if (showResult && winId) {
      fruitWheelOlay('result_shown', { fruitId: winId });
      if (matched) fruitWheelOlay('settlement_displayed', { payout: matched.payout });
    }
  }, [showResult, winId, matched]);

  // Settlement sonradan gelirse kart payout'unu güncelle
  useEffect(() => {
    if (!kazancKarti || !matchedFromServer) return;
    setWinPayout({
      payout: Number(matchedFromServer.payout),
      multiplier: Number(matchedFromServer.multiplier) || fruitMult || 1,
    });
  }, [kazancKarti, matchedFromServer, fruitMult]);

  const onCountdownTick = useCallback((remainSec: number) => {
    if (!countdownActive) return;
    if (remainSec <= 5 && remainSec > 0) fruitWheelSes('countdown');
    if (remainSec === 0 && lastCountdownSec.current !== 0) fruitWheelSes('lock');
    lastCountdownSec.current = remainSec;
  }, [countdownActive]);

  const quick = state?.limits.quickAmounts ?? [10, 50, 100, 500, 1000, 5000];
  useEffect(() => {
    if (quick.length > 0 && !quick.includes(chip)) setChip(quick[0]!);
  }, [chip, state?.limits.quickAmounts]);
  const hasRecent = (state?.recent?.length ?? 0) > 0;
  const focusWheel = status === 'LOCKED' || status === 'SPINNING' || status === 'SETTLING';
  const wheelMode = status === 'SPINNING' || spinning ? 'spin' : status === 'LOCKING' || status === 'LOCKED' ? 'lock' : showResult ? 'result' : 'open';
  const wheelSize = Math.min(
    Math.round(width - 16),
    Math.max(180, stageH > 40 ? stageH - 8 : Math.round(width * 0.88)),
  );
  const fruits = state?.fruits?.length ? state.fruits : YEREL_MEYVELER;
  const active = fruits.find((f) => f.id === activeFruit) ?? fruits[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4, paddingBottom: Math.max(8, insets.bottom) }]}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.top}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#F4D47A" />
        </Pressable>
        <View style={styles.topMid}>
          <Text style={styles.title} numberOfLines={1}>{state?.displayName || t('oyun.fwTitle')}</Text>
          <KalanSure
            locksAt={status === 'OPEN' || status === 'LOCKING' ? locksAt : 0}
            offset={offset}
            style={styles.sub}
            prefix={state?.round ? `#${state.round.roundNo}  ·  ${statusText(status, t)}` : '—'}
            active={countdownActive}
            onTick={onCountdownTick}
          />
        </View>
        <Pressable onPress={onHistory} hitSlop={6} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={18} color="#E8E4F0" />
        </Pressable>
        <Pressable onPress={onRules} hitSlop={6} style={styles.iconBtn}>
          <Ionicons name="information-circle-outline" size={18} color="#E8E4F0" />
        </Pressable>
        <Pressable
          onPress={() => {
            setSoundOn((v) => {
              const next = !v;
              setFruitWheelSoundEnabled(next);
              return next;
            });
          }}
          hitSlop={6}
          style={styles.iconBtn}
        >
          <Ionicons name={soundOn ? 'volume-high-outline' : 'volume-mute-outline'} size={18} color="#E8E4F0" />
        </Pressable>
      </View>

      <View style={styles.hud}>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel} numberOfLines={1}>
            {t('oyun.fwBalance')}
            {balance.mode === 'TEST_BALANCE' ? ` · ${t('oyun.fwTestBadge')}` : ''}
          </Text>
          <Text style={styles.hudValue}>{coin(shownBalance)}</Text>
        </View>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>{t('oyun.fwThisRound')}</Text>
          <Text style={styles.hudAccent}>{coin(total)}</Text>
        </View>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>{t('oyun.fwRemaining')}</Text>
          <Text style={styles.hudValue}>{coin(remaining)}</Text>
        </View>
      </View>

      {hasRecent ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentBar} contentContainerStyle={styles.recent}>
          <Text style={styles.recentLabel}>{t('oyun.fwRecent')}</Text>
          {state?.recent.map((r, i) => (
            <View key={`${r.roundNo}-${r.fruitId}`} style={[styles.chip, i === 0 && styles.chipOn]}>
              <Image source={FRUIT_IMAGES[r.fruitId]} style={styles.chipArt} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View
        style={styles.stage}
        onLayout={(e) => {
          if (spinning) return;
          const h = Math.round(e.nativeEvent.layout.height);
          setStageH((prev) => (Math.abs(prev - h) > 8 ? h : prev));
        }}
      >
        <FruitWheelCarki
          fruits={fruits}
          stakes={draft}
          spinning={spinning}
          targetFruitId={spinning ? (frozenSpin.current?.fruitId ?? winId) : null}
          winnerFruitId={showResult ? (frozenSpin.current?.fruitId ?? winId) : null}
          roundNo={spinning || spinDone ? spinRoundNo : (state?.round?.roundNo ?? 1)}
          names={names}
          size={wheelSize}
          mode={wheelMode}
          interactive={openForBets && !spinning && !spinArmed}
          selectedFruitId={activeFruit}
          onFruitPress={(id) => {
            if (!openForBets) return;
            addAmount(id, chip);
          }}
          onSettled={onWheelSettled}
        />
      </View>

      <View style={[styles.footer, { opacity: focusWheel || spinArmed ? 0.45 : 1 }]} pointerEvents={focusWheel || spinArmed ? 'none' : 'auto'}>
        {openForBets && active ? (
          <>
            <View style={styles.activeRow}>
              <Image source={FRUIT_IMAGES[active.id]} style={styles.activeArt} resizeMode="contain" />
              <Text style={styles.activeText} numberOfLines={1}>
                {names[active.id]} · x{active.multiplier} · +{chip}
              </Text>
              <Pressable hitSlop={8} onPress={() => clearFruit(active.id)}>
                <Ionicons name="trash-outline" size={16} color="#9B95A8" />
              </Pressable>
            </View>
            <View style={styles.coinGrid}>
              {quick.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.coinBtn, chip === n && styles.coinBtnOn]}
                  onPress={() => setChip(n)}
                >
                  <Text style={[styles.coinText, chip === n && styles.coinTextOn]}>
                    {n >= 1000 ? `${n / 1000}K` : n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.customBtn}
              onPress={() => setCustomOpen(true)}
            >
              <Ionicons name="create-outline" size={18} color="#1A1208" />
              <Text style={styles.customBtnText}>{t('oyun.fwCustom')}</Text>
            </Pressable>
            <View style={styles.sideRow}>
              <Pressable onPress={() => setDraft({})}>
                <Text style={styles.sideText}>{t('oyun.fwClearAll')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.lock}>{t('oyun.fwLocked')} · {t('oyun.fwPreparing')}</Text>
        )}
      </View>

      <Text style={styles.note} numberOfLines={1}>{note || ' '}</Text>

      {akis.length > 0 ? (
        <ScrollView
          ref={akisScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.akisBar}
          contentContainerStyle={styles.akisRow}
        >
          {akis.map((item) => (
            <View
              key={item.id}
              style={[
                styles.akisChip,
                item.kind === 'win' && styles.akisWin,
                item.kind === 'lose' && styles.akisLose,
                item.kind === 'play' && styles.akisPlay,
              ]}
            >
              {item.fruitId ? (
                <Image source={FRUIT_IMAGES[item.fruitId]} style={styles.akisArt} resizeMode="contain" />
              ) : null}
              <Text
                style={[
                  styles.akisText,
                  item.kind === 'win' && styles.akisTextWin,
                  item.kind === 'lose' && styles.akisTextLose,
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Pressable
        style={[styles.cta, (total <= 0 || !openForBets || busy || spinArmed) && styles.ctaOff]}
        disabled={total <= 0 || !openForBets || busy || spinArmed}
        onPress={() => void confirm()}
      >
        <Text style={[styles.ctaText, (total <= 0 || !openForBets) && styles.ctaTextOff]} numberOfLines={1}>
          {busy
            ? t('oyun.fwChecking')
            : spinArmed && !spinDone
              ? t('oyun.fwPreparing')
              : total > 0
                ? `${t('oyun.fwConfirm')} · ${coin(total)}`
                : t('oyun.fwChooseCta')}
        </Text>
      </Pressable>

      {kazancKarti && showResult && winId && didMatch ? (
        <FruitWheelKazanan
          fruitId={winId}
          name={names[winId]}
          multiplier={Number(winPayout?.multiplier ?? matched?.multiplier ?? fruitMult ?? 0)}
          matched
          payoutText={`+${coin(winPayout?.payout ?? matched?.payout ?? 0)}`}
          title={t('oyun.fwWinTitle')}
        />
      ) : null}

      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => closeCustom(false)}>
        <Pressable style={styles.modalBg} onPress={() => closeCustom(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={styles.modal} onPress={() => undefined}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t('oyun.fwCustomTitle')}</Text>
                <Pressable hitSlop={8} onPress={() => closeCustom(false)}>
                  <Text style={styles.topBtn}>{t('ortak.kapat')}</Text>
                </Pressable>
              </View>
              <TextInput
                ref={customInput}
                value={customText}
                onChangeText={setCustomText}
                keyboardType="number-pad"
                inputAccessoryViewID={CUSTOM_INPUT_ID}
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#8A7E68"
                autoFocus
              />
              <Pressable
                style={styles.cta}
                onPress={() => {
                  const n = closeCustom(true);
                  if (n > 0) addAmount(activeFruit, n);
                }}
              >
                <Text style={styles.ctaText}>{t('oyun.fwApply')}</Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
        {Platform.OS === 'ios' ? (
          <InputAccessoryView nativeID={CUSTOM_INPUT_ID}>
            <View style={styles.accessory}>
              <Pressable onPress={() => Keyboard.dismiss()}>
                <Text style={styles.accessoryText}>{t('ortak.tamam')}</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060D', overflow: 'hidden' },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(109,59,245,0.16)', top: 120, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  topMid: { flex: 1, marginLeft: 4 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  sub: { color: '#9B95A8', fontSize: 12, marginTop: 1 },
  hud: {
    marginHorizontal: 12,
    marginBottom: 4,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19,11,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(244,212,122,0.22)',
  },
  hudCol: { flex: 1, alignItems: 'center' },
  hudLabel: { color: '#9B95A8', fontSize: 10, fontWeight: '700' },
  hudValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  hudAccent: { color: '#F4D47A', fontSize: 16, fontWeight: '800', marginTop: 2 },
  testBadge: { color: '#F4D47A', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },
  players: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 2 },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2A2340', borderWidth: 1, borderColor: '#6D3BF5' },
  playerText: { color: '#E8E4F0', fontSize: 12, marginLeft: 4, fontWeight: '700' },
  recentBar: { height: 36, flexGrow: 0 },
  recent: { paddingHorizontal: 12, gap: 6, alignItems: 'center', height: 36 },
  recentLabel: { color: '#9B95A8', fontSize: 10, fontWeight: '700', marginRight: 4 },
  chip: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(19,11,32,0.8)', alignItems: 'center', justifyContent: 'center', opacity: 0.55 },
  chipOn: { opacity: 1, borderWidth: 1, borderColor: '#F4D47A', width: 36, height: 36 },
  chipArt: { width: 26, height: 26 },
  stage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  activeRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, gap: 8 },
  activeArt: { width: 22, height: 22 },
  activeText: { flex: 1, color: '#E8E4F0', fontSize: 12, fontWeight: '700' },
  coinGrid: { flexDirection: 'row', paddingHorizontal: 10, marginTop: 4, gap: 4 },
  coinBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,11,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
  },
  coinBtnOn: { borderColor: '#F4D47A', backgroundColor: 'rgba(215,174,85,0.22)' },
  coinText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  coinTextOn: { color: '#F4D47A' },
  customBtn: {
    marginHorizontal: 10,
    marginTop: 6,
    minHeight: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E6CE92',
    borderWidth: 1,
    borderColor: '#F4D47A',
    paddingHorizontal: 14,
  },
  customBtnText: { color: '#1A1208', fontSize: 14, fontWeight: '800' },
  footer: { minHeight: 124, justifyContent: 'center', paddingBottom: 2 },
  sideRow: { flexDirection: 'row', justifyContent: 'flex-end', marginHorizontal: 16, marginTop: 4 },
  sideText: { color: '#9B95A8', fontSize: 12, fontWeight: '700' },
  lock: { color: '#F4D47A', textAlign: 'center', fontWeight: '700' },
  note: { color: '#E8E4F0', textAlign: 'center', height: 16, fontSize: 12 },
  akisBar: { maxHeight: 36, marginBottom: 4 },
  akisRow: { paddingHorizontal: 10, gap: 8, alignItems: 'center' },
  akisChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(28,20,44,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,228,240,0.18)',
    maxWidth: 280,
  },
  akisWin: { borderColor: 'rgba(158,240,180,0.55)', backgroundColor: 'rgba(20,48,32,0.92)' },
  akisLose: { borderColor: 'rgba(255,120,120,0.4)', backgroundColor: 'rgba(48,18,24,0.9)' },
  akisPlay: { borderColor: 'rgba(244,212,122,0.4)' },
  akisArt: { width: 18, height: 18 },
  akisText: { color: '#E8E4F0', fontSize: 11, fontWeight: '700' },
  akisTextWin: { color: '#9EF0B4' },
  akisTextLose: { color: '#FFB4B4' },
  cta: { marginHorizontal: 12, marginTop: 2, marginBottom: 2, backgroundColor: '#D7AE55', borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { backgroundColor: '#241C33', opacity: 0.9 },
  ctaText: { color: '#1A1208', fontWeight: '800', fontSize: 15 },
  ctaTextOff: { color: '#E8E4F0' },
  topBtn: { color: '#F4D47A', fontWeight: '700' },
  ctaSub: { color: '#3A2A10', fontSize: 12, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#120E1E', padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#F7F1E4', fontSize: 16, fontWeight: '800' },
  accessory: { backgroundColor: '#1A1428', borderTopWidth: 1, borderTopColor: '#3A3158', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  accessoryText: { color: '#E6CE92', fontWeight: '800', fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#E6CE92', borderRadius: 12, color: '#F7F1E4', padding: 12, fontSize: 18 },
});
