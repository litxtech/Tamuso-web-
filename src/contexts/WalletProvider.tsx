import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Wallet } from '../types/models';
import {
  WalletContext,
  type WalletContextValue,
} from './WalletContextNesnesi';

type BakiyeAlani = 'coins' | 'game_coins' | 'bonus_coins' | 'diamonds';

type CuzdanSatiriHam = {
  user_id: string;
  coins: unknown;
  game_coins?: unknown;
  bonus_coins?: unknown;
  diamonds: unknown;
  updated_at?: string | null;
};

const ALANLAR: readonly BakiyeAlani[] = ['coins', 'game_coins', 'bonus_coins', 'diamonds'];

function tamSayi(deger: unknown, yedek = 0): number {
  const n = typeof deger === 'number' ? deger : Number(deger);
  if (!Number.isFinite(n)) return yedek;
  return Math.max(0, Math.floor(n));
}

function cuzdanSatiri(row: CuzdanSatiriHam): Wallet {
  return {
    user_id: row.user_id,
    coins: tamSayi(row.coins),
    game_coins: tamSayi(row.game_coins),
    bonus_coins: tamSayi(row.bonus_coins),
    diamonds: tamSayi(row.diamonds),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export function WalletProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      return;
    }
    let { data, error } = await supabase
      .from('wallets')
      .select('user_id, coins, game_coins, bonus_coins, diamonds, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    // Ekonomi migration'ları (090100) uygulanmamış veritabanında ayrık kovalar yok.
    if (error?.code === '42703') {
      ({ data, error } = await supabase
        .from('wallets')
        .select('user_id, coins, diamonds, updated_at')
        .eq('user_id', userId)
        .maybeSingle());
    }
    if (error) return;
    if (!data) {
      setWallet({
        user_id: userId,
        coins: 0,
        game_coins: 0,
        bonus_coins: 0,
        diamonds: 0,
        updated_at: new Date().toISOString(),
      });
      return;
    }
    setWallet(cuzdanSatiri(data as CuzdanSatiriHam));
  }, [userId]);

  const patchWallet = useCallback(
    (patch: Partial<Pick<Wallet, BakiyeAlani>>) => {
      setWallet((prev) => {
        if (!prev) return prev;
        const next: Wallet = { ...prev, updated_at: new Date().toISOString() };
        for (const alan of ALANLAR) {
          const v = patch[alan];
          if (v !== undefined) next[alan] = Math.max(0, Math.floor(v));
        }
        return next;
      });
    },
    [],
  );

  const adjustWallet = useCallback(
    (delta: Partial<Pick<Wallet, BakiyeAlani>>) => {
      setWallet((prev) => {
        if (!prev) return prev;
        const next: Wallet = { ...prev, updated_at: new Date().toISOString() };
        for (const alan of ALANLAR) {
          const v = delta[alan];
          if (v !== undefined) next[alan] = Math.max(0, Math.floor(prev[alan] + v));
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!userId) {
      setWallet(null);
      return;
    }
    void refreshWallet();

    const channel = supabase
      .channel(`wallet-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Partial<CuzdanSatiriHam> | null;
          if (!row?.user_id || row.coins == null || row.diamonds == null) return;
          setWallet(cuzdanSatiri(row as CuzdanSatiriHam));
        },
      )
      .subscribe();

    const onApp = (state: AppStateStatus) => {
      if (state === 'active') void refreshWallet();
    };
    const sub = AppState.addEventListener('change', onApp);

    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshWallet]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallet,
      refreshWallet,
      patchWallet,
      adjustWallet,
    }),
    [wallet, refreshWallet, patchWallet, adjustWallet],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

/** Canlı bakiye — yalnızca cüzdan UI / harcama ekranları */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    return {
      wallet: null,
      refreshWallet: async () => undefined,
      patchWallet: () => undefined,
      adjustWallet: () => undefined,
    };
  }
  return ctx;
}
