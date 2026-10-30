import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { DirektMesaj } from '../okuma/MesajlariGetir';
import { mesajRealtimeDebounce } from './mesajRealtimeDebounce';

type ChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DirektMesaj;
  old: Partial<DirektMesaj>;
};

/**
 * Telegram tarzi anlik mesaj kanali — INSERT/UPDATE/DELETE + peer okundu
 */
export function useMesajKanali(
  threadId: string | undefined,
  onMesaj: (msg: DirektMesaj, event: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  onPeerOkundu?: (lastReadAt: string, fromUserId?: string) => void,
) {
  const cb = useRef(onMesaj);
  cb.current = onMesaj;
  const okunduCb = useRef(onPeerOkundu);
  okunduCb.current = onPeerOkundu;

  useEffect(() => {
    if (
      !threadId ||
      typeof threadId !== 'string' ||
      threadId === 'yeni' ||
      threadId.includes(',')
    ) {
      return;
    }

    const topic = `dm-thread-${threadId}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const handle = (payload: ChangePayload) => {
      if (payload.eventType === 'DELETE') {
        const oldId = payload.old?.id;
        if (!oldId) return;
        cb.current(
          {
            id: oldId,
            thread_id: threadId,
          } as DirektMesaj,
          'DELETE',
        );
        return;
      }
      const row = payload.new;
      if (!row?.id) return;
      cb.current(row, payload.eventType);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kanal: any = supabase.channel(topic);
    kanal
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        handle,
      )
      .on(
        'broadcast',
        { event: 'peer_okundu' },
        (payload: {
          payload?: { at?: string; userId?: string };
        }) => {
          const at = payload?.payload?.at;
          const fromUserId = payload?.payload?.userId;
          if (typeof at === 'string' && at) {
            okunduCb.current?.(at, fromUserId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [threadId]);
}

/** Karsi tarafa aninda "goruldu" sinyali — mevcut thread kanalina yazar */
export async function MesajPeerOkunduYayinla(
  threadId: string,
  atIso?: string,
  userId?: string,
): Promise<void> {
  try {
    const at = atIso ?? new Date().toISOString();
    const topic = `dm-thread-${threadId}`;
    const payload = {
      type: 'broadcast' as const,
      event: 'peer_okundu',
      payload: { at, userId },
    };
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (ch as any).send(payload);
        return;
      }
    }
  } catch {
    /* opsiyonel */
  }
}

/** Inbox listesini anlik yenile — debounce + kendi mesajını yok say */
export function useMesajInboxKanali(
  onDegisti: () => void,
  kendiUserId?: string | null,
) {
  const cb = useRef(onDegisti);
  cb.current = onDegisti;
  const uidRef = useRef(kendiUserId);
  uidRef.current = kendiUserId;

  useEffect(() => {
    const topic = 'dm-inbox';
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const yenile = mesajRealtimeDebounce(() => cb.current(), 1200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kanal: any = supabase.channel(topic);
    kanal
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'message_threads' },
        yenile,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload: { new?: { sender_id?: string } }) => {
          if (
            uidRef.current &&
            payload?.new?.sender_id === uidRef.current
          ) {
            return;
          }
          yenile();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, []);
}
