/**
 * Bildirim aksiyonları — uygulamayı açmadan yanıt / okundu / takip.
 */
import * as Notifications from 'expo-notifications';
import {
  MesajGonder,
  MesajThreadOkundu,
} from '../../mesajlasma/islemler/MesajGonder';
import { TakipEt } from '../../kullanici-profili/okuma/TakipIslemleri';
import { TakipServisi } from '../../takip/islemler/TakipServisi';
import {
  BILDIRIM_AKSIYON_KABUL,
  BILDIRIM_AKSIYON_OKUNDU,
  BILDIRIM_AKSIYON_TAKIP,
  BILDIRIM_AKSIYON_YANITLA,
} from '../kayit/BildirimKategorileri';

function str(
  data: Record<string, unknown> | undefined,
  k: string,
): string | null {
  const v = data?.[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function uuidClientId(): string {
  // RN crypto.randomUUID yoksa basit fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function bildirimiKapat(
  yanit: Notifications.NotificationResponse,
): Promise<void> {
  try {
    const id = yanit.notification.request.identifier;
    if (id) await Notifications.dismissNotificationAsync(id);
  } catch {
    /* */
  }
  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch {
    /* */
  }
}

/**
 * DEFAULT dışındaki aksiyonları işle. true = işlendi (navigasyon yok).
 */
export async function BildirimAksiyonIsle(
  yanit: Notifications.NotificationResponse,
): Promise<boolean> {
  const action = yanit.actionIdentifier;
  if (
    !action ||
    action === Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    return false;
  }

  const data = yanit.notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  const threadId = str(data, 'thread_id');
  const messageId = str(data, 'message_id');
  const followerId =
    str(data, 'follower_id') ?? str(data, 'actor_id');
  const requestId = str(data, 'request_id');

  try {
    if (action === BILDIRIM_AKSIYON_YANITLA) {
      const metin = (yanit.userText ?? '').trim();
      if (!threadId || !metin) return true;
      const r = await MesajGonder({
        threadId,
        body: metin,
        replyToId: messageId,
        clientId: uuidClientId(),
      });
      if (r.ok) await bildirimiKapat(yanit);
      return true;
    }

    if (action === BILDIRIM_AKSIYON_OKUNDU) {
      if (!threadId) return true;
      await MesajThreadOkundu(threadId);
      await bildirimiKapat(yanit);
      return true;
    }

    if (action === BILDIRIM_AKSIYON_TAKIP) {
      if (!followerId) return true;
      const r = await TakipEt(followerId);
      if (r.ok) await bildirimiKapat(yanit);
      return true;
    }

    if (action === BILDIRIM_AKSIYON_KABUL) {
      if (!requestId) return true;
      const r = await TakipServisi.istekKabul(requestId);
      if (r.ok) await bildirimiKapat(yanit);
      return true;
    }
  } catch (e) {
    console.warn(
      '[Push] aksiyon',
      action,
      e instanceof Error ? e.message : e,
    );
    return true;
  }

  return false;
}
