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
import * as Haptics from 'expo-haptics';
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
import { fruitWheelSes, fruitWheelSesKapat } from '../ses/FruitWheelAudio';
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
}: {
  locksAt: number;
  offset: React.RefObject<number>;
  style: object;
  prefix: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!locksAt) return <Text style={style} numberOfLines={1}>{prefix}</Text>;
  const remainSec = Math.max(0, Math.ceil((locksAt - (now + offset.current)) / 1000));
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
  const idem = useRef<string | null>(null);
  const offset = useRef(0);
  const seenRound = useRef<string | null>(null);

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
    setState(res);
    const roundId = res.round?.id ?? null;
    if (roundId && roundId !== seenRound.current) {
      seenRound.current = roundId;
      const next: Record<string, number> = {};
      for (const line of res.mySelections) next[line.fruitId] = line.amount;
      setDraft(next);
      setSpinning(false);
      setSpinDone(false);
      fruitWheelOlay('round_view', { roundId });
      fruitWheelSes('round-open');
    }
    setShownBalance((prev) => (prev === 0 ? res.balance : prev));
  }, [t]);

  useEffect(() => {
    fruitWheelOlay('fruit_wheel_open');
    void pull();
    void fruitWheelHeartbeat();
    const syncTimer = setInterval(() => void pull(), 4000);
    const beat = setInterval(() => void fruitWheelHeartbeat(), 8000);
    const channel = supabase
      .channel('fruit-wheel-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fruit_wheel_live' },
        () => { void pull(); },
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
      void supabase.removeChannel(channel);
      sub.remove();
      fruitWheelSesKapat();
      fruitWheelOlay('game_exit');
    };
  }, [pull]);

  useEffect(() => {
    if (!state) return;
    const target = state.balance;
    if (shownBalance === target) return;
    if (Math.abs(target - shownBalance) < 80) {
      setShownBalance(target);
      return;
    }
    const step = Math.max(1, Math.round(Math.abs(target - shownBalance) / 8));
    const timer = setTimeout(() => {
      setShownBalance((v) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step)));
    }, 50);
    return () => clearTimeout(timer);
  }, [shownBalance, state]);

  const [stageH, setStageH] = useState(220);
  const [chip, setChip] = useState(10);
  const [kazancKarti, setKazancKarti] = useState(false);
  const kartTur = useRef<string | null>(null);
  const kartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onWheelSettled = useCallback(() => {
    setSpinning(false);
    setSpinDone(true);
    fruitWheelSes('wheel-stop');
  }, []);

  const status = state?.round?.status ?? 'OPEN';
  const openForBets = status === 'OPEN' || status === 'LOCKING';
  const locksAt = state?.round ? new Date(state.round.locksAt).getTime() : 0;
  const reveal = Boolean(state?.round?.winningFruitId);
  const winId = reveal ? state?.round?.winningFruitId ?? null : null;

  useEffect(() => {
    if (status === 'SPINNING' && winId && !spinning && !spinDone) {
      setSpinning(true);
      fruitWheelOlay('spin_started', { fruitId: winId });
    }
    if (status === 'LOCKED') fruitWheelOlay('round_locked');
  }, [status, winId, spinning, spinDone]);

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
      void Haptics.selectionAsync().catch(() => undefined);
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

  const confirm = async () => {
    if (!state?.round || busy || !openForBets) return;
    if (!idem.current) idem.current = newFruitWheelIdempotencyKey();
    setBusy(true);
    setNote(t('oyun.fwChecking'));
    const items = FRUIT_ORDER.filter((id) => (draft[id] ?? 0) > 0).map((id) => ({
      fruitId: id,
      amount: draft[id],
    }));
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
    setNote('');
    if (typeof res.balance === 'number') {
      setState((prev) => (prev ? { ...prev, balance: res.balance! } : prev));
    }
    void pull();
  };

  const matched = (state?.mySettlement ?? []).find((s) => s.matched && s.payout > 0);
  const showResult = (status === 'RESULT' || status === 'NEXT_ROUND' || spinDone) && Boolean(winId);

  useEffect(() => {
    const tur = state?.round?.id ?? null;
    if (!tur || status === 'OPEN' || status === 'LOCKING' || status === 'LOCKED') {
      if (kartTimer.current) clearTimeout(kartTimer.current);
      setKazancKarti(false);
      if (status === 'OPEN' || status === 'LOCKING') kartTur.current = null;
      return;
    }
    if (!winId || (!spinDone && status !== 'RESULT' && status !== 'NEXT_ROUND')) return;
    if (kartTur.current === tur) return;
    kartTur.current = tur;
    setKazancKarti(true);
    if (kartTimer.current) clearTimeout(kartTimer.current);
    kartTimer.current = setTimeout(() => setKazancKarti(false), 2200);
  }, [state?.round?.id, status, winId, spinDone]);

  useEffect(() => {
    if (showResult && winId) {
      fruitWheelOlay('result_shown', { fruitId: winId });
      if (matched) fruitWheelOlay('settlement_displayed', { payout: matched.payout });
    }
  }, [showResult, winId, matched]);

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
          />
        </View>
        <Pressable onPress={onHistory} hitSlop={6} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={18} color="#E8E4F0" />
        </Pressable>
        <Pressable onPress={onRules} hitSlop={6} style={styles.iconBtn}>
          <Ionicons name="information-circle-outline" size={18} color="#E8E4F0" />
        </Pressable>
        <Pressable onPress={() => setSoundOn((v) => !v)} hitSlop={6} style={styles.iconBtn}>
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
          targetFruitId={status === 'SPINNING' || spinning ? winId : null}
          winnerFruitId={showResult ? winId : null}
          roundNo={state?.round?.roundNo ?? 1}
          names={names}
          size={wheelSize}
          mode={wheelMode}
          interactive={openForBets && !spinning}
          selectedFruitId={activeFruit}
          onFruitPress={(id) => {
            if (!openForBets) return;
            addAmount(id, chip);
          }}
          onSettled={onWheelSettled}
        />
      </View>

      <View style={[styles.footer, { opacity: focusWheel ? 0.45 : 1 }]} pointerEvents={focusWheel ? 'none' : 'auto'}>
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
            <View style={styles.sideRow}>
              <Pressable onPress={() => setCustomOpen(true)}><Text style={styles.sideText}>{t('oyun.fwCustom')}</Text></Pressable>
              <Pressable onPress={() => setDraft({})}><Text style={styles.sideText}>{t('oyun.fwClearAll')}</Text></Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.lock}>{t('oyun.fwLocked')} · {t('oyun.fwPreparing')}</Text>
        )}
      </View>

      <Text style={styles.note} numberOfLines={1}>{note || ' '}</Text>

      <Pressable
        style={[styles.cta, (total <= 0 || !openForBets || busy) && styles.ctaOff]}
        disabled={total <= 0 || !openForBets || busy}
        onPress={() => void confirm()}
      >
        <Text style={[styles.ctaText, (total <= 0 || !openForBets) && styles.ctaTextOff]} numberOfLines={1}>
          {busy
            ? t('oyun.fwChecking')
            : total > 0
              ? `${t('oyun.fwConfirm')} · ${coin(total)}`
              : t('oyun.fwChooseCta')}
        </Text>
      </Pressable>

      {kazancKarti && showResult && winId ? (
        <FruitWheelKazanan
          fruitId={winId}
          name={names[winId]}
          multiplier={Number(state?.round?.multiplier ?? 0)}
          matched={Boolean(matched)}
          payoutText={matched ? `+${coin(matched.payout)}` : null}
          title={matched ? t('oyun.fwWinTitle') : t('oyun.fwNoMatch')}
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
  footer: { height: 92, justifyContent: 'center' },
  activeRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, gap: 8 },
  activeArt: { width: 22, height: 22 },
  activeText: { flex: 1, color: '#E8E4F0', fontSize: 12, fontWeight: '700' },
  coinGrid: { flexDirection: 'row', paddingHorizontal: 10, marginTop: 4, gap: 4 },
  coinBtn: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,11,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
  },
  coinBtnOn: { borderColor: '#F4D47A', backgroundColor: 'rgba(215,174,85,0.22)' },
  coinText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  coinTextOn: { color: '#F4D47A' },
  sideRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 2 },
  sideText: { color: '#9B95A8', fontSize: 12, fontWeight: '700' },
  lock: { color: '#F4D47A', textAlign: 'center', fontWeight: '700' },
  note: { color: '#E8E4F0', textAlign: 'center', height: 16, fontSize: 12 },
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
