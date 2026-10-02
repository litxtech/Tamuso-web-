import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import { supabase } from '../../lib/supabase';
import type { LiveKitRol } from '../livekit/token/LiveKitTokenAl';

export type AgoraTokenSonuc =
  | {
      ok: true;
      token: string;
      appId: string;
      channelName: string;
      uid: string;
      role: LiveKitRol;
    }
  | { ok: false; hata: string; kod?: string };

export async function AgoraTokenAl(input: {
  roomName: string;
  role: LiveKitRol;
}): Promise<AgoraTokenSonuc> {
  const base = OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '');
  if (!base) return { ok: false, hata: 'Sunucu adresi yok', kod: 'PROVIDER_UNAVAILABLE' };

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: 'Oturum gerekli' };

  try {
    const res = await fetch(`${base}/functions/v1/agora-token`, {
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
      appId?: string;
      channelName?: string;
      uid?: string;
      role?: LiveKitRol;
      error?: string;
    };
    if (!res.ok || !json.token || !json.appId) {
      const hata = json.error ?? 'Token alinamadi';
      const kod = /BANNED/i.test(hata)
        ? 'USER_BANNED'
        : /NOT_FOUND/i.test(hata)
          ? 'ROOM_NOT_FOUND'
          : /uyusmuyor/i.test(hata)
            ? 'PROVIDER_UNAVAILABLE'
            : 'TOKEN_EXPIRED';
      return { ok: false, hata, kod };
    }
    return {
      ok: true,
      token: json.token,
      appId: json.appId,
      channelName: json.channelName ?? input.roomName,
      uid: json.uid ?? '',
      role: json.role ?? input.role,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : 'Token alinamadi',
      kod: 'NETWORK_ERROR',
    };
  }
}
