import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { SesHataMetni } from '../baglanti/SesHataMetni';

export type LiveKitRol = 'listener' | 'speaker' | 'host' | 'publisher';

export type LiveKitTokenSonuc =
  | {
      ok: true;
      token: string;
      url: string;
      roomName: string;
      mock: boolean;
    }
  | { ok: false; hata: string };

/** Odaya girerken token edge round-trip'ini gizle (sunucu token'ı 6 saat geçerli) */
const TOKEN_TTL_MS = 5 * 60_000;

const tokenCache = new Map<
  string,
  { sonuc: Extract<LiveKitTokenSonuc, { ok: true }>; expiresAt: number }
>();
const tokenInflight = new Map<string, Promise<LiveKitTokenSonuc>>();

function cacheKey(roomName: string, role: LiveKitRol) {
  return `${roomName}|${role}`;
}

function cacheOku(
  roomName: string,
  role: LiveKitRol,
): Extract<LiveKitTokenSonuc, { ok: true }> | null {
  const key = cacheKey(roomName, role);
  const kayit = tokenCache.get(key);
  if (!kayit) return null;
  if (Date.now() >= kayit.expiresAt || !kayit.sonuc.token) {
    tokenCache.delete(key);
    return null;
  }
  return kayit.sonuc;
}

function cacheYaz(
  roomName: string,
  role: LiveKitRol,
  sonuc: Extract<LiveKitTokenSonuc, { ok: true }>,
) {
  if (!sonuc.token) return;
  tokenCache.set(cacheKey(roomName, role), {
    sonuc,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
}

/** Kart dokunuşunda / navigasyonda — oda ekranı token beklemesin */
export function LiveKitTokenOncedenAl(input: {
  roomName: string;
  role?: LiveKitRol;
}): void {
  void LiveKitTokenAl({
    roomName: input.roomName,
    role: input.role ?? 'listener',
  });
}

/**
 * LiveKit secret mobilde yok — Edge Function `livekit-token`.
 * Audit RPC sadece sunucuda (cift istek yok → daha hizli).
 *
 * Not: Mock token dönmek görüşmeyi "bağlı" gösterir ama ses/görüntü gitmez.
 * URL yoksa hata dön — sessiz mock yok.
 */
export async function LiveKitTokenAl(input: {
  roomName: string;
  role: LiveKitRol;
}): Promise<LiveKitTokenSonuc> {
  const hazir = cacheOku(input.roomName, input.role);
  if (hazir) return hazir;

  const key = cacheKey(input.roomName, input.role);
  const bekleyen = tokenInflight.get(key);
  if (bekleyen) return bekleyen;

  const istek = tokenGetirIc(input).finally(() => {
    if (tokenInflight.get(key) === istek) tokenInflight.delete(key);
  });
  tokenInflight.set(key, istek);
  return istek;
}

async function tokenGetirIc(input: {
  roomName: string;
  role: LiveKitRol;
}): Promise<LiveKitTokenSonuc> {
  const edgeUrl =
    OrtamDegiskenleri.livekitTokenUrl ||
    process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_URL ||
    '';
  const livekitUrl =
    OrtamDegiskenleri.livekitUrl || process.env.EXPO_PUBLIC_LIVEKIT_URL || '';

  if (!edgeUrl || !livekitUrl) {
    return { ok: false, hata: SesHataMetni() };
  }

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: i18n.t('sesOda.tekrarGirisGerekli') };

  const birKez = async (): Promise<LiveKitTokenSonuc> => {
    try {
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
          apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
        },
        body: JSON.stringify({
          roomName: input.roomName,
          role: input.role,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        token?: string;
        url?: string;
        error?: string;
      };

      if (!res.ok) {
        const msg = json.error ?? '';
        if (res.status === 401) {
          return { ok: false, hata: i18n.t('sesOda.tekrarGirisGerekli') };
        }
        // 5xx / rate limit — geçici; ham metin kullanıcıya gitmez
        if (res.status >= 500 || res.status === 429) {
          return { ok: false, hata: `TOKEN_RETRY:${msg}` };
        }
        return { ok: false, hata: SesHataMetni(msg) };
      }
      if (!json.token) return { ok: false, hata: SesHataMetni() };

      return {
        ok: true,
        token: json.token,
        url: json.url ?? livekitUrl,
        roomName: input.roomName,
        mock: false,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Token alinamadi';
      return { ok: false, hata: `TOKEN_RETRY:${msg}` };
    }
  };

  const ilk = await birKez();
  if (ilk.ok) {
    cacheYaz(input.roomName, input.role, ilk);
    return ilk;
  }
  if (!ilk.hata.startsWith('TOKEN_RETRY:')) return ilk;

  await new Promise((r) => setTimeout(r, 220));
  const tekrar = await birKez();
  if (tekrar.ok) {
    cacheYaz(input.roomName, input.role, tekrar);
    return tekrar;
  }
  if (tekrar.hata.startsWith('TOKEN_RETRY:')) {
    return { ok: false, hata: i18n.t('sesOda.sesInternetKontrol') };
  }
  return tekrar;
}
