import { supabase } from '../../lib/supabase';

export type RtcSaglayiciKodu = 'LIVEKIT' | 'AGORA';

export type RtcProviderDurum = {
  active_provider: RtcSaglayiciKodu;
  previous_provider: RtcSaglayiciKodu | null;
  version: number;
  changed_at: string | null;
};

type Dinleyici = (d: RtcProviderDurum) => void;

const VARSAYILAN: RtcProviderDurum = {
  active_provider: 'LIVEKIT',
  previous_provider: null,
  version: 1,
  changed_at: null,
};

let durum: RtcProviderDurum = VARSAYILAN;
let hazir = false;
const dinleyiciler = new Set<Dinleyici>();
let kanalKuruldu = false;

function kod(v: unknown): RtcSaglayiciKodu {
  return v === 'AGORA' ? 'AGORA' : 'LIVEKIT';
}

function yayinla() {
  dinleyiciler.forEach((fn) => fn(durum));
}

export function RtcProviderAnlik(): RtcProviderDurum {
  return durum;
}

export function RtcAktifSaglayici(): RtcSaglayiciKodu {
  return durum.active_provider;
}

export function RtcProviderDinle(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  fn(durum);
  return () => {
    dinleyiciler.delete(fn);
  };
}

export async function RtcProviderYukle(): Promise<RtcProviderDurum> {
  try {
    const { data, error } = await supabase.rpc('rtc_provider_durum');
    if (error || !data) {
      if (!hazir) durum = VARSAYILAN;
      hazir = true;
      return durum;
    }
    const row = data as {
      active_provider?: string;
      previous_provider?: string | null;
      version?: number;
      changed_at?: string | null;
    };
    const sonraki: RtcProviderDurum = {
      active_provider: kod(row.active_provider),
      previous_provider: row.previous_provider ? kod(row.previous_provider) : null,
      version: Number(row.version ?? 1),
      changed_at: row.changed_at ?? null,
    };
    const degisti = hazir && sonraki.version !== durum.version;
    durum = sonraki;
    hazir = true;
    if (degisti) yayinla();
    else if (!degisti) yayinla();
    return durum;
  } catch {
    if (!hazir) durum = VARSAYILAN;
    hazir = true;
    return durum;
  }
}

/** Config okunamazsa LIVEKIT. Agora yalnız sunucu açıkça AGORA derse. */
export function RtcProviderRealtimeBaslat(): () => void {
  if (kanalKuruldu) return () => undefined;
  kanalKuruldu = true;
  const kanal = supabase
    .channel('rtc-provider-config')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rtc_provider_config' },
      () => {
        void RtcProviderYukle();
      },
    )
    .subscribe();
  return () => {
    kanalKuruldu = false;
    void supabase.removeChannel(kanal);
  };
}
