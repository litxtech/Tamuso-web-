import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { supabase } from '../../../lib/supabase';

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
  const edgeUrl =
    OrtamDegiskenleri.livekitTokenUrl ||
    process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_URL ||
    '';
  const livekitUrl =
    OrtamDegiskenleri.livekitUrl || process.env.EXPO_PUBLIC_LIVEKIT_URL || '';

  if (!edgeUrl || !livekitUrl) {
    return {
      ok: false,
      hata:
        'LiveKit yapılandırması eksik (EXPO_PUBLIC_LIVEKIT_URL / TOKEN_URL). Yeni build gerekli.',
    };
  }

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: 'Oturum gerekli' };

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
        const msg = json.error ?? `Token servisi hata: ${res.status}`;
        if (/api key|secret|invalid.*key/i.test(msg) && res.status !== 401) {
          return {
            ok: false,
            hata: 'LiveKit API anahtari gecersiz — Cloud Keys yenile',
          };
        }
        if (res.status === 401) {
          return { ok: false, hata: 'Oturum gerekli' };
        }
        // 5xx / rate limit — geçici
        if (res.status >= 500 || res.status === 429) {
          return { ok: false, hata: `TOKEN_RETRY:${msg}` };
        }
        return { ok: false, hata: msg };
      }
      if (!json.token) return { ok: false, hata: 'Token bos' };

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
  if (ilk.ok) return ilk;
  if (!ilk.hata.startsWith('TOKEN_RETRY:')) return ilk;

  await new Promise((r) => setTimeout(r, 450));
  const tekrar = await birKez();
  if (tekrar.ok) return tekrar;
  if (tekrar.hata.startsWith('TOKEN_RETRY:')) {
    return {
      ok: false,
      hata: 'Ses sunucusuna ulaşılamadı. İnterneti kontrol edip tekrar dene.',
    };
  }
  return tekrar;
}
