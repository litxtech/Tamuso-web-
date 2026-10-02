/**
 * Uzak / yerel bildirim tıklanınca hedef rota + güvenli navigasyon.
 * Payload anahtarları notification-push dataStringMap ile düz string gelir.
 */
import { InteractionManager } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SesOdasinaHrefIleGit } from '../../ses-odalari/navigasyon/SesOdasinaGit';
import { BildirimHedefYolu } from './BildirimHedefYolu';
import {
  BekleyenPushHedefiAyarla,
  PushNavigasyonKapisiAcikMi,
  PushYanitiIslendiMi,
} from './BekleyenPushHedefi';

function strData(
  data: Record<string, unknown> | undefined,
  k: string,
): string | null {
  const v = data?.[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Bildirim content.data → uygulama içi href */
export function BildirimVerisindenHedef(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data || typeof data !== 'object') return null;

  // Yerel ses odası sticky bildirimi
  if (strData(data, 'tip') === 'ses_odasi') {
    const roomId = strData(data, 'roomId');
    return roomId ? `/room/${roomId}` : null;
  }

  return BildirimHedefYolu({
    deep_link: strData(data, 'deep_link'),
    category: strData(data, 'category') ?? undefined,
    payload: data,
    actor_id: strData(data, 'actor_id'),
  });
}

export async function BildirimHedefineGit(href: string): Promise<void> {
  const h = href.trim().replace(/^\/announcements\//, '/duyuru/');
  if (!h) return;
  try {
    if (/\/(?:lobi|room)\//.test(h)) {
      await SesOdasinaHrefIleGit(h);
      return;
    }
    router.push(h as any);
  } catch {
    /* nav henüz hazır değil / geçersiz rota */
  }
}

/**
 * Stack / InteractionManager hazır olana kadar bekle, sonra git.
 * Cold start'ta splash replace ile çakışmayı azaltır.
 */
export function BildirimHedefineGecikmeliGit(
  href: string,
  gecikmeMs = 80,
): void {
  const h = href.trim();
  if (!h) return;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      void BildirimHedefineGit(h);
    }, Math.max(0, gecikmeMs));
  });
}

function yanitAnahtari(yanit: Notifications.NotificationResponse): string {
  const id = yanit.notification.request.identifier || '';
  const tarih = yanit.notification.date ?? 0;
  return `${id}:${tarih}:${yanit.actionIdentifier}`;
}

/**
 * OS bildirim yanıtını işle.
 * Oturum yoksa hedefi saklar; varsa bekleyen olarak yazar (splash flush eder)
 * veya hemen yönlendirir (uygulama zaten açıkken).
 */
export function BildirimYanitiniIsle(
  yanit: Notifications.NotificationResponse | null | undefined,
  opts?: { oturumVar: boolean; hemenGit?: boolean },
): string | null {
  if (!yanit) return null;
  if (yanit.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  const anahtar = yanitAnahtari(yanit);
  if (PushYanitiIslendiMi(anahtar)) return null;

  const data = yanit.notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  const hedef = BildirimVerisindenHedef(data);
  if (!hedef) return null;

  BekleyenPushHedefiAyarla(hedef);

  try {
    void Notifications.clearLastNotificationResponseAsync();
  } catch {
    /* Expo Go / eski SDK */
  }

  const hemen =
    !!opts?.oturumVar &&
    !!opts.hemenGit &&
    PushNavigasyonKapisiAcikMi();

  if (hemen) {
    BekleyenPushHedefiAyarla(null);
    BildirimHedefineGecikmeliGit(hedef, 40);
  }

  return hedef;
}
