/** Coin / ajans yükleme bildirimleri → cüzdan Yükle sekmesi */
import i18n, { AktifDil } from '../../../i18n';

const YUKLEME_TIPLERI = new Set([
  'coin_purchase',
  'agency_topup',
  'admin_topup',
  'wallet_topup',
]);

const TARIH_LOCALE: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar-SA',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

function cuzdanYukleYolu(): string {
  return '/(tabs)/wallet?sekme=yukle';
}

function cuzdanHareketYolu(): string {
  return '/(tabs)/wallet?sekme=hareket';
}

const DUYURU_ID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function duyuruKimligi(deger: unknown): string | null {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim().replace(/^"+|"+$/g, '');
  const eslesen = temiz.match(DUYURU_ID);
  return eslesen ? eslesen[0] : null;
}

/** Resmi duyuru bildirimi → /duyuru/{id} */
function duyuruHedefi(
  type: string,
  category: string | undefined,
  deepLink: string,
  payload: Record<string, unknown>,
): string | null {
  const yol = deepLink.toLowerCase();
  const duyuruMu =
    type === 'announcement' ||
    (category ?? '').toLowerCase() === 'announcement' ||
    yol.startsWith('/duyuru/') ||
    yol.startsWith('/announcements/');
  if (!duyuruMu) return null;
  const id =
    duyuruKimligi(payload.announcement_id) ||
    duyuruKimligi(deepLink);
  return id ? `/duyuru/${id}` : deepLink.startsWith('/duyuru') ? deepLink : null;
}

function yuklemeTipiMi(type: string, category?: string): boolean {
  if (YUKLEME_TIPLERI.has(type)) return true;
  if (category === 'wallet') {
    if (
      type.startsWith('wallet_transfer') ||
      type.includes('trade') ||
      type.includes('withdraw')
    ) {
      return false;
    }
    // Genel cüzdan / yükleme tamam bildirimleri
    return !type || YUKLEME_TIPLERI.has(type) || type.includes('topup') || type.includes('purchase');
  }
  return false;
}

/** Bildirim tıklanınca gidecek rota */
export function BildirimHedefYolu(input: {
  deep_link?: string | null;
  category?: string;
  payload?: Record<string, unknown> | null;
  actor_id?: string | null;
}): string | null {
  const p = input.payload ?? {};
  const str = (k: string) => {
    const v = p[k];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };

  const type = (str('type') ?? '').toLowerCase();
  const hamHam = (input.deep_link ?? '').trim();
  const ham = hamHam.replace(/^\/announcements\//, '/duyuru/');
  const duyuru = duyuruHedefi(type, input.category, ham, p);
  if (duyuru) return duyuru;

  // /(tabs)/wallet (± query) — yükleme bildirimlerinde Yükle sekmesi
  if (
    ham === '/(tabs)/wallet' ||
    ham === '/wallet' ||
    ham.startsWith('/(tabs)/wallet?')
  ) {
    if (ham.includes('sekme=')) return ham;
    if (yuklemeTipiMi(type, input.category)) return cuzdanYukleYolu();
    if (
      type.startsWith('wallet_transfer') ||
      type.includes('withdraw')
    ) {
      return cuzdanHareketYolu();
    }
    if (input.category === 'wallet') return cuzdanYukleYolu();
    return ham;
  }

  if (
    ham &&
    ham !== '/(tabs)/profile' &&
    ham !== '/profile' &&
    ham !== '/bildirimler'
  ) {
    return ham;
  }

  const reportId = str('report_id');
  if (reportId || type === 'report_status' || p.kind === 'report_status') {
    return reportId ? `/raporlarim/${reportId}` : '/raporlarim';
  }

  // Gelen arama: thread_id'den önce — sohbet yerine görüşme ekranı
  const callId = str('call_id');
  if (callId && (type === 'incoming_call' || type === 'missed_call')) {
    return `/gorusme/${callId}`;
  }

  const thread = str('thread_id');
  if (thread) return `/mesaj/${thread}`;

  const live = str('live_id');
  if (live) return `/canli/${live}`;

  const status = str('status_id');
  if (status) return `/durum/${status}`;

  const room = str('room_id');
  if (room) return `/lobi/${room}`;

  const election = str('election_id');
  if (election) return `/sehir/secim/${election}`;

  if (
    type === 'city_election_start' ||
    type === 'city_election_voting' ||
    type === 'city_election_winner'
  ) {
    if (election) return `/sehir/secim/${election}`;
    return '/sehir/secim';
  }
  const actor =
    str('follower_id') ||
    str('sender_id') ||
    str('host_id') ||
    str('actor_id') ||
    input.actor_id ||
    null;

  if (type === 'follow_request') return '/takip/istekler';
  if ((type === 'follow' || type === 'new_follower' || type === 'follow_request_accepted') && actor) {
    return `/kullanici/${actor}`;
  }
  if (type === 'agency_host_approved') return '/ajans/uye';
  const agency = str('agency_id');
  if (type === 'agency_host_apply' && agency) return `/ajans/${agency}/basvurular`;
  if (type === 'agency_announcement' && agency) return `/ajans/${agency}/duyurular`;
  if (type === 'agency_host_rejected') return '/ajans';
  if (type === 'support_reply') return '/destek';
  if (type === 'agency_sale_gift' && agency) return `/ajans/${agency}/cuzdan`;
  if (type === 'agency_support_reply' && agency) return `/ajans/${agency}/destek`;
  if (
    type === 'trade_offer_new' ||
    type === 'trade_offer_accepted' ||
    type === 'trade_offer_rejected'
  ) {
    return str('agency_id') ? '/ajans/teklifler' : '/cuzdan/takas?sekme=teklifler';
  }
  if (yuklemeTipiMi(type, input.category)) {
    return cuzdanYukleYolu();
  }
  if (type.startsWith('wallet_transfer') || type.includes('withdraw')) {
    return cuzdanHareketYolu();
  }
  if (input.category === 'wallet') {
    return cuzdanYukleYolu();
  }
  if (actor) return `/kullanici/${actor}`;
  if (ham) return ham;
  return null;
}

export function BildirimTarihSaat(iso: string): { tarih: string; saat: string; kisa: string } {
  try {
    const d = new Date(iso);
    const loc = TARIH_LOCALE[AktifDil()] ?? 'en-US';
    const tarih = d.toLocaleDateString(loc, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const saat = d.toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const fark = Date.now() - d.getTime();
    let kisa = `${tarih} · ${saat}`;
    if (fark < 60_000) kisa = i18n.t('bildirimler.azOnce') as string;
    else if (fark < 3_600_000) {
      kisa = i18n.t('bildirimler.dkOnce', {
        n: Math.floor(fark / 60_000),
      }) as string;
    } else if (fark < 86_400_000) {
      kisa = i18n.t('bildirimler.saOnce', {
        n: Math.floor(fark / 3_600_000),
      }) as string;
    }
    return { tarih, saat, kisa };
  } catch {
    return { tarih: '', saat: '', kisa: '' };
  }
}
