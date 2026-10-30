import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { mesajRealtimeDebounce } from '../gercek-zamanli/mesajRealtimeDebounce';
import { MesajKonulariniGetir } from '../okuma/MesajKonulariniGetir';

type MesajOkunmamisContextValue = {
  okunmamis: number;
  yenile: () => Promise<void>;
  /** Mesajlar sekmesine girince tab rozetini sifirlar; yeni mesaj gelince tekrar artar */
  sayfayiAcincaTemizle: () => void;
};

const MesajOkunmamisContext =
  createContext<MesajOkunmamisContextValue | null>(null);

async function toplamOkunmamisGetir(): Promise<number> {
  try {
    const konular = await MesajKonulariniGetir(false);
    return konular.reduce((s, k) => s + (Number(k.unread_count) || 0), 0);
  } catch {
    return 0;
  }
}

export function MesajOkunmamisSaglayici({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user, isGuest } = useAuth();
  const [okunmamis, setOkunmamis] = useState(0);
  const userId = user?.id ?? null;
  const baskilanmis = useRef(false);
  const sonSayi = useRef(0);
  const odakli = useRef(true);

  const uygula = useCallback((n: number) => {
    const v = Math.max(0, Math.floor(n));
    sonSayi.current = v;
    if (baskilanmis.current) {
      setOkunmamis(0);
      return;
    }
    setOkunmamis(v);
  }, []);

  const yenile = useCallback(async () => {
    if (!session || isGuest) {
      baskilanmis.current = false;
      uygula(0);
      return;
    }
    const n = await toplamOkunmamisGetir();
    // Baski acikken yeni mesaj geldiyse (sayi artti) rozeti geri ac
    if (baskilanmis.current && n > sonSayi.current) {
      baskilanmis.current = false;
    }
    uygula(n);
  }, [session, isGuest, uygula]);

  const sayfayiAcincaTemizle = useCallback(() => {
    baskilanmis.current = true;
    setOkunmamis(0);
  }, []);

  useEffect(() => {
    if (!session || !userId || isGuest) {
      baskilanmis.current = false;
      uygula(0);
      return;
    }
    void yenile();

    /**
     * Tablo-geniş Realtime fan-out var; sunucu filtresi (üyelik) gelene kadar
     * yenilemeyi debounce et — her INSERT için RPC fırtınası olmasın.
     * Kendi gönderdiğin mesaj rozeti şişirmesin.
     */
    const yenileGecikmeli = mesajRealtimeDebounce(() => {
      if (odakli.current) void yenile();
    }, 1500);

    const topic = `dm-tab-badge-${userId}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload: { new?: { sender_id?: string } }) => {
          if (payload?.new?.sender_id === userId) return;
          yenileGecikmeli();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'message_threads' },
        () => {
          yenileGecikmeli();
        },
      )
      .subscribe();

    const onApp = (s: AppStateStatus) => {
      odakli.current = s === 'active';
      if (s === 'active') void yenile();
    };
    const sub = AppState.addEventListener('change', onApp);

    return () => {
      sub.remove();
      void supabase.removeChannel(kanal);
    };
  }, [session, userId, isGuest, yenile, uygula]);

  const value = useMemo(
    () => ({
      okunmamis,
      yenile,
      sayfayiAcincaTemizle,
    }),
    [okunmamis, yenile, sayfayiAcincaTemizle],
  );

  return (
    <MesajOkunmamisContext.Provider value={value}>
      {children}
    </MesajOkunmamisContext.Provider>
  );
}

export function useMesajOkunmamis(): MesajOkunmamisContextValue {
  const ctx = useContext(MesajOkunmamisContext);
  if (!ctx) {
    return {
      okunmamis: 0,
      yenile: async () => undefined,
      sayfayiAcincaTemizle: () => undefined,
    };
  }
  return ctx;
}
