import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import { supabase } from '../../lib/supabase';

export type RtcKalite = {
  mukemmel: number;
  iyi: number;
  zayif: number;
  koptu: number;
  yeni: number;
  bilinmiyor: number;
};

export type RtcTokenOzet = {
  son_15dk: number;
  son_60dk: number;
  son_24s: number;
  son_istek_at: string | null;
  oda_15dk: number;
  kisi_15dk: number;
};

export type RtcLiveKitOlcum =
  | {
      ok: true;
      olcum_at: string;
      oda: number;
      kismi: boolean;
      okunan_oda: number;
      okunamayan_oda: number;
      katilimci: number;
      yayinci: number;
      kalite: RtcKalite;
      token: RtcTokenOzet | null;
    }
  | { ok: false; hata: string; olcum_at?: string; token?: RtcTokenOzet | null };

function sayi(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function kalite(v: unknown): RtcKalite {
  const k = (v ?? {}) as Record<string, unknown>;
  return {
    mukemmel: sayi(k.mukemmel),
    iyi: sayi(k.iyi),
    zayif: sayi(k.zayif),
    koptu: sayi(k.koptu),
    yeni: sayi(k.yeni),
    bilinmiyor: sayi(k.bilinmiyor),
  };
}

function token(v: unknown): RtcTokenOzet | null {
  if (!v || typeof v !== 'object') return null;
  const t = v as Record<string, unknown>;
  return {
    son_15dk: sayi(t.son_15dk),
    son_60dk: sayi(t.son_60dk),
    son_24s: sayi(t.son_24s),
    son_istek_at: typeof t.son_istek_at === 'string' ? t.son_istek_at : null,
    oda_15dk: sayi(t.oda_15dk),
    kisi_15dk: sayi(t.kisi_15dk),
  };
}

export async function RtcLiveKitOlcumAl(): Promise<RtcLiveKitOlcum> {
  const base = OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '');
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!base || !jwt) return { ok: false, hata: 'Oturum gerekli' };

  try {
    const res = await fetch(`${base}/functions/v1/rtc-livekit-olcum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
      },
      body: '{}',
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || json.ok !== true) {
      return {
        ok: false,
        hata: typeof json.hata === 'string' ? json.hata : 'LiveKit ölçümü alınamadı',
        olcum_at: typeof json.olcum_at === 'string' ? json.olcum_at : undefined,
        token: token(json.token),
      };
    }
    return {
      ok: true,
      olcum_at: String(json.olcum_at ?? new Date().toISOString()),
      oda: sayi(json.oda),
      kismi: json.kismi === true,
      okunan_oda: sayi(json.okunan_oda),
      okunamayan_oda: sayi(json.okunamayan_oda),
      katilimci: sayi(json.katilimci),
      yayinci: sayi(json.yayinci),
      kalite: kalite(json.kalite),
      token: token(json.token),
    };
  } catch {
    return { ok: false, hata: 'LiveKit ölçümü alınamadı' };
  }
}

export type RtcYorum = {
  etiket: 'İyi' | 'Dikkat' | 'Kötü' | 'Sessiz' | 'Ölçülemedi' | 'Ölçülüyor';
  renk: 'iyi' | 'dikkat' | 'kotu' | 'sessiz';
  aciklama: string;
};

/** Yalnız dönen sayılardan çıkar. Boş oda "iyi" sayılmaz. */
export function RtcLiveKitYorumu(olcum: RtcLiveKitOlcum | null): RtcYorum {
  if (!olcum || !olcum.ok) {
    return {
      etiket: 'Ölçülemedi',
      renk: 'kotu',
      aciklama: olcum?.hata ?? 'LiveKit şu an ölçülemedi.',
    };
  }
  const k = olcum.kalite;
  const olculen = k.mukemmel + k.iyi + k.zayif + k.koptu;
  if (olcum.katilimci === 0) {
    return {
      etiket: 'Sessiz',
      renk: 'sessiz',
      aciklama:
        olcum.oda === 0
          ? 'LiveKit’te açık oda yok. Bağlantı kalitesi ancak biri bağlanınca ölçülür.'
          : 'Açık oda var ama bağlı kullanıcı görünmüyor. Kalite için örnek yok.',
    };
  }
  if (olculen === 0) {
    return {
      etiket: 'Ölçülemedi',
      renk: 'dikkat',
      aciklama: `${olcum.katilimci} kişi bağlı. LiveKit henüz kalite değeri döndürmedi.`,
    };
  }
  const sorun = k.zayif + k.koptu;
  const oran = sorun / olculen;
  if (k.koptu > 0 && oran >= 0.2) {
    return {
      etiket: 'Kötü',
      renk: 'kotu',
      aciklama: `${k.koptu} bağlantı kopuk, ${k.zayif} zayıf. Ölçülen ${olculen} kişinin %${Math.round(oran * 100)} kadarı sorunlu.`,
    };
  }
  if (sorun > 0) {
    return {
      etiket: 'Dikkat',
      renk: 'dikkat',
      aciklama: `${k.zayif} zayıf, ${k.koptu} kopuk. ${k.mukemmel + k.iyi} kişinin kalitesi iyi veya mükemmel.`,
    };
  }
  return {
    etiket: 'İyi',
    renk: 'iyi',
    aciklama: `Ölçülen ${olculen} kişinin bağlantısı LiveKit’te iyi veya mükemmel. Zayıf veya kopuk yok.`,
  };
}
