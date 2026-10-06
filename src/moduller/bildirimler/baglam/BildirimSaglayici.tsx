import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  BildirimOkunmamisSayim,
  BildirimOkunduIsaretle,
  BildirimleriHepsiniOkundu,
} from '../okuma/BildirimKuyrugumuGetir';
import { CihazBildirimRozetiniAyarla } from '../islemler/CihazBildirimRozetiniAyarla';
import { BekleyenPushHedefiAlVeTemizle } from '../islemler/BekleyenPushHedefi';
import {
  BildirimHedefineGecikmeliGit,
  BildirimYanitiniIsle,
} from '../islemler/BildirimPushYonlendirme';
import { GelenAramaPushVerisindenIsle } from '../../gorusme/android/BekleyenGelenArama';
import {
  GelenAramaZilBaslat,
  GelenAramaZilDurdur,
} from '../../gorusme/android/GelenAramaZil';
import { AndroidBildirimKanallariniKur } from '../kayit/BildirimIzniIste';

type BildirimContextValue = {
  okunmamis: number;
  yenile: () => Promise<void>;
  /** Bildirim sayfasina girince: sayac + ikon rozeti sifir */
  sayfayiAcincaOkundu: () => Promise<void>;
  tekOkundu: (id: string) => Promise<void>;
};

const BildirimContext = createContext<BildirimContextValue | null>(null);

export function BildirimSaglayici({ children }: { children: React.ReactNode }) {
  const { session, user, loading: authLoading } = useAuth();
  const [okunmamis, setOkunmamis] = useState(0);
  const userId = user?.id ?? null;
  const odakli = useRef(true);
  /** null = henüz bilinmiyor; login geçişi false→true için */
  const oncekiOturum = useRef<boolean | null>(null);

  const uygulaSayi = useCallback((n: number) => {
    const v = Math.max(0, Math.floor(n));
    setOkunmamis(v);
    void CihazBildirimRozetiniAyarla(v);
  }, []);

  const yenile = useCallback(async () => {
    if (!session) {
      uygulaSayi(0);
      return;
    }
    try {
      const n = await BildirimOkunmamisSayim();
      uygulaSayi(n);
    } catch {
      // sessiz
    }
  }, [session, uygulaSayi]);

  const sayfayiAcincaOkundu = useCallback(async () => {
    uygulaSayi(0);
    try {
      await BildirimleriHepsiniOkundu();
      await yenile();
    } catch {
      await yenile();
    }
  }, [uygulaSayi, yenile]);

  const tekOkundu = useCallback(
    async (id: string) => {
      try {
        const r = await BildirimOkunduIsaretle(id);
        uygulaSayi(r.unread);
      } catch {
        await yenile();
      }
    },
    [uygulaSayi, yenile],
  );

  // Arka plan / ön planda push tıklama (cold start app/index'te)
  useEffect(() => {
    if (authLoading) return;

    // Kanallar + Yanıtla/Takip kategorileri
    void AndroidBildirimKanallariniKur().catch(() => undefined);

    const yanitSub = Notifications.addNotificationResponseReceivedListener(
      (yanit) => {
        const data = yanit.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data && String(data.type ?? '') === 'incoming_call') {
          GelenAramaPushVerisindenIsle(data);
          if (Platform.OS === 'android') void GelenAramaZilBaslat();
        }
        BildirimYanitiniIsle(yanit, {
          oturumVar: !!session,
          hemenGit: !!session && String(data?.type ?? '') !== 'incoming_call',
        });
        // incoming_call: GorusmeGelen Modal açılır — /gorusme'ye zorla gitme
        if (String(data?.type ?? '') === 'incoming_call' && session) {
          // Modal bekleyen üzerinden açılır; deep link flush etme
          return;
        }
      },
    );

    const alinanSub = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (!data || String(data.type ?? '') !== 'incoming_call') return;
      GelenAramaPushVerisindenIsle(data);
      if (Platform.OS === 'android') {
        void GelenAramaZilBaslat();
      }
    });

    return () => {
      yanitSub.remove();
      alinanSub.remove();
      GelenAramaZilDurdur();
    };
  }, [authLoading, session]);

  // Login sonrası (oturumsuzken tıklanan push) bekleyen hedefi uygula
  useEffect(() => {
    if (authLoading) return;
    const onceki = oncekiOturum.current;
    const simdi = !!session;
    oncekiOturum.current = simdi;
    if (onceki === false && simdi) {
      const hedef = BekleyenPushHedefiAlVeTemizle();
      if (hedef) BildirimHedefineGecikmeliGit(hedef, 200);
    }
  }, [authLoading, session]);

  useEffect(() => {
    if (!session || !userId) {
      uygulaSayi(0);
      return;
    }
    void yenile();

    const topic = `user-notifications-${userId}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Arka planda da sayacı çek — iOS ikon için push badge asıl yol;
          // process canlıysa in-app + setBadgeCountAsync da güncellensin.
          void yenile();
        },
      )
      .subscribe();

    const onApp = (s: AppStateStatus) => {
      odakli.current = s === 'active';
      if (s === 'active') void yenile();
    };
    const sub = AppState.addEventListener('change', onApp);

    // Push geldiğinde (foreground/background process canlı): badge data veya DB
    const pushSub = Notifications.addNotificationReceivedListener((n) => {
      const raw = n.request.content.data?.badge ?? n.request.content.badge;
      const parsed =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? Number(raw)
            : NaN;
      if (Number.isFinite(parsed)) {
        uygulaSayi(parsed);
      } else {
        void yenile();
      }
    });

    return () => {
      sub.remove();
      pushSub.remove();
      void supabase.removeChannel(kanal);
    };
  }, [session, userId, yenile, uygulaSayi]);

  const value = useMemo(
    () => ({
      okunmamis,
      yenile,
      sayfayiAcincaOkundu,
      tekOkundu,
    }),
    [okunmamis, yenile, sayfayiAcincaOkundu, tekOkundu],
  );

  return (
    <BildirimContext.Provider value={value}>{children}</BildirimContext.Provider>
  );
}

export function useBildirimler(): BildirimContextValue {
  const ctx = useContext(BildirimContext);
  if (!ctx) {
    return {
      okunmamis: 0,
      yenile: async () => undefined,
      sayfayiAcincaOkundu: async () => undefined,
      tekOkundu: async () => undefined,
    };
  }
  return ctx;
}
