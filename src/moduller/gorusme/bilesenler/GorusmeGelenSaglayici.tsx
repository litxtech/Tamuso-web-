import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Keyboard, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  GorusmeCevapla,
  GorusmeReddet,
} from '../islemler/GorusmeIslemleri';
import { KullanicilarEngelliMi } from '../../moderasyon/islemler/ModerasyonIslemleri';
import type { DirectCall } from '../tipler';
import { GorusmeOturumAl } from '../oturum/GorusmeOturumYoneticisi';
import i18n from '../../../i18n';
import {
  TamusoCallKitBootstrap,
  TamusoCallKitEnabled,
  TamusoCallKitOnAnswer,
  TamusoCallKitOnEnd,
  TamusoCallKitReportIncoming,
  TamusoCallKitEnd,
} from '../../tamuso-activity/callkit/TamusoCallKitBridge';
import {
  BekleyenGelenAramaAl,
  BekleyenGelenAramaDinle,
  BekleyenGelenAramaDirectCallStub,
  BekleyenGelenAramaTemizle,
} from '../android/BekleyenGelenArama';
import {
  GelenAramaZilBaslat,
  GelenAramaZilDurdur,
} from '../android/GelenAramaZil';

/** LiveKit VideoView zincirini app acilisinda yukleme */
function GorusmeGelenEkraniLazy(
  props: React.ComponentProps<
    typeof import('./GorusmeEkranlari').GorusmeGelenEkrani
  >,
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GorusmeGelenEkrani } = require('./GorusmeEkranlari') as typeof import('./GorusmeEkranlari');
  return <GorusmeGelenEkrani {...props} />;
}

type Ctx = {
  gelen: DirectCall | null;
};

const GorusmeCtx = createContext<Ctx>({ gelen: null });

export function useGorusmeGelen() {
  return useContext(GorusmeCtx);
}

async function arayanProfilYukle(callerId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url')
    .eq('id', callerId)
    .maybeSingle();
  return {
    name:
      data?.display_name?.trim() ||
      data?.username?.trim() ||
      i18n.t('gorusme.arayan'),
    avatar: data?.avatar_url ?? null,
  };
}

/** Uygulama genelinde gelen arama dinleyicisi (WhatsApp/iOS tarzi) */
export function GorusmeGelenSaglayici({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [gelen, setGelen] = useState<DirectCall | null>(null);
  const [peerName, setPeerName] = useState(() => i18n.t('gorusme.arayan'));
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [callKitAktif, setCallKitAktif] = useState(false);
  const gelenIdRef = useRef<string | null>(null);
  const gelenRef = useRef<DirectCall | null>(null);

  useEffect(() => {
    gelenIdRef.current = gelen?.id ?? null;
    gelenRef.current = gelen;
  }, [gelen?.id, gelen]);

  // Android: in-app Modal açıkken zil çal (CallKit yoksa)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (gelen && !callKitAktif) {
      void GelenAramaZilBaslat();
    } else {
      GelenAramaZilDurdur();
    }
    return () => {
      GelenAramaZilDurdur();
    };
  }, [gelen?.id, callKitAktif]);

  useEffect(() => {
    TamusoCallKitBootstrap();
    TamusoCallKitOnAnswer((callId) => {
      const c = gelenRef.current;
      if (!c || c.id !== callId) {
        // VoIP path — accept by id
        void (async () => {
          const r = await GorusmeCevapla(callId);
          if (!r.ok) return;
          setGelen(null);
          router.push(`/gorusme/${callId}` as never);
        })();
        return;
      }
      void (async () => {
        Keyboard.dismiss();
        const r = await GorusmeCevapla(callId);
        setGelen(null);
        if (!r.ok) return;
        router.push(`/gorusme/${callId}` as never);
      })();
    });
    TamusoCallKitOnEnd((callId, reason) => {
      if (reason === 'declined') {
        void GorusmeReddet(callId).catch(() => undefined);
      }
      setCallKitAktif(false);
      setGelen((cur) => (cur?.id === callId ? null : cur));
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const goster = async (c: DirectCall) => {
      if (c.status !== 'ringing') return;
      if (gelenIdRef.current === c.id) return;
      // Aktif görüşme varken ikinci arama UI'sı açma
      const aktif = GorusmeOturumAl();
      if (aktif && aktif.callId !== c.id) return;

      // Once UI — profili bekleme
      setGelen(c);
      setPeerName(i18n.t('gorusme.arayan'));
      setPeerAvatar(null);

      // Engelli / profil arka planda
      void (async () => {
        if (await KullanicilarEngelliMi(c.caller_id)) {
          await GorusmeReddet(c.id).catch(() => undefined);
          TamusoCallKitEnd(c.id);
          setGelen((cur) => (cur?.id === c.id ? null : cur));
          return;
        }
        const p = await arayanProfilYukle(c.caller_id);
        if (gelenIdRef.current !== c.id) return;
        setPeerName(p.name);
        setPeerAvatar(p.avatar);

        // CallKit native incoming UI (app background / terminated via VoIP;
        // foreground: still report so Dynamic Island / system UI stays consistent)
        if (TamusoCallKitEnabled()) {
          const ok = await TamusoCallKitReportIncoming({
            callId: c.id,
            callerName: p.name,
            hasVideo: c.call_type === 'video',
          });
          if (gelenIdRef.current === c.id) setCallKitAktif(ok);
        } else {
          setCallKitAktif(false);
        }
      })();
    };

    // Push / cold-start bekleyen arama
    const unsubBekleyen = BekleyenGelenAramaDinle((b) => {
      if (!b) return;
      void (async () => {
        const { data } = await supabase
          .from('direct_calls')
          .select('*')
          .eq('id', b.callId)
          .maybeSingle();
        if (data && (data as DirectCall).status === 'ringing') {
          await goster(data as DirectCall);
        } else if (!data || (data as DirectCall).status === 'ringing') {
          await goster(BekleyenGelenAramaDirectCallStub(b));
        }
        BekleyenGelenAramaTemizle();
      })();
    });
    const mevcutBekleyen = BekleyenGelenAramaAl();
    if (mevcutBekleyen) {
      // dinleyici zaten tetikler; no-op
    }

    // Kacirilan realtime icin acik ringing cagriyi cek
    void (async () => {
      const { data } = await supabase
        .from('direct_calls')
        .select('*')
        .eq('callee_id', user.id)
        .eq('status', 'ringing')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) await goster(data as DirectCall);
    })();

    const topic = `incoming-calls-${user.id}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = supabase.channel(topic);
    channel
      .on(
        'broadcast',
        { event: 'incoming_call' },
        (payload: { payload?: DirectCall }) => {
          const c = payload.payload;
          if (c?.id) void goster(c);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_calls',
          filter: `callee_id=eq.${user.id}`,
        },
        (payload: { new: DirectCall }) => {
          void goster(payload.new);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_calls',
          filter: `callee_id=eq.${user.id}`,
        },
        (payload: { new: DirectCall }) => {
          const c = payload.new;
          if (
            gelenIdRef.current === c.id &&
            ['ended', 'cancelled', 'missed', 'rejected', 'active'].includes(
              c.status,
            )
          ) {
            if (c.status !== 'active') {
              GelenAramaZilDurdur();
              setGelen(null);
            }
          }
        },
      )
      .subscribe();

    // Ayrica arayanin dogrudan broadcast kanali
    const ringTopic = `call-ring-${user.id}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${ringTopic}` || ch.topic === ringTopic) {
        void supabase.removeChannel(ch);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ringCh: any = supabase.channel(ringTopic);
    ringCh
      .on(
        'broadcast',
        { event: 'incoming_call' },
        (payload: { payload?: DirectCall }) => {
          const c = payload.payload;
          if (c?.id) void goster(c);
        },
      )
      .subscribe();

    return () => {
      unsubBekleyen();
      void supabase.removeChannel(channel);
      void supabase.removeChannel(ringCh);
    };
  }, [user?.id]);

  const kabul = useCallback(async () => {
    if (!gelen) return;
    Keyboard.dismiss();
    GelenAramaZilDurdur();
    BekleyenGelenAramaTemizle();
    const r = await GorusmeCevapla(gelen.id);
    setGelen(null);
    if (!r.ok) return;
    router.push(`/gorusme/${gelen.id}` as never);
  }, [gelen]);

  const red = useCallback(async () => {
    if (!gelen) return;
    Keyboard.dismiss();
    GelenAramaZilDurdur();
    BekleyenGelenAramaTemizle();
    TamusoCallKitEnd(gelen.id);
    await GorusmeReddet(gelen.id);
    setGelen(null);
  }, [gelen]);

  const value = useMemo(() => ({ gelen }), [gelen]);

  return (
    <GorusmeCtx.Provider value={value}>
      {children}
      <Modal
        visible={!!gelen && !callKitAktif}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        transparent={false}
        onRequestClose={() => void red()}
      >
        {/* Modal kendi window'unda inset kaybeder — provider şart */}
        <SafeAreaProvider>
          {gelen ? (
            <GorusmeGelenEkraniLazy
              peerName={peerName}
              peerAvatar={peerAvatar}
              callType={gelen.call_type}
              onAccept={() => void kabul()}
              onReject={() => void red()}
            />
          ) : null}
        </SafeAreaProvider>
      </Modal>
    </GorusmeCtx.Provider>
  );
}
