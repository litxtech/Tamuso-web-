/**
 * Analitik olayları UI thread'i bekletmeden küçük partiler halinde yollar.
 * Sunucu aynı olayı dedupe eder; istemci de aynı anahtarı ikinci kez kuyruğa almaz.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../../lib/supabase';
import type { DuyuruOlayTipi } from '../tipler';

type Olay = {
  announcement_id: string;
  event_type: DuyuruOlayTipi;
  media_id?: string | null;
  cta_id?: string | null;
  read_source?: string | null;
};

const kuyruk: Olay[] = [];
const gorulen = new Set<string>();
let zamanlayici: ReturnType<typeof setTimeout> | null = null;
let oturum = `${Date.now().toString(36)}`;

function anahtar(o: Olay) {
  return `${o.announcement_id}|${o.event_type}|${o.media_id ?? ''}|${o.cta_id ?? ''}|${o.read_source ?? ''}`;
}

async function bosalt() {
  zamanlayici = null;
  if (kuyruk.length === 0) return;
  const paket = kuyruk.splice(0, 20);
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  const app_version = Constants.expoConfig?.version ?? '';
  try {
    await supabase.rpc('duyuru_olay_yaz', {
      p_events: paket.map((o) => ({
        announcement_id: o.announcement_id,
        event_type: o.event_type,
        media_id: o.media_id ?? null,
        cta_id: o.cta_id ?? null,
        read_source: o.read_source ?? null,
        session_id: oturum,
        platform,
        app_version,
      })),
    });
  } catch {
    /* analitik kaybı duyuruyu kırmaz */
  }
  if (kuyruk.length > 0) zamanla();
}

function zamanla() {
  if (zamanlayici) return;
  zamanlayici = setTimeout(() => {
    void bosalt();
  }, 1200);
}

export function DuyuruOlayEkle(olay: Olay) {
  const k = anahtar(olay);
  if (gorulen.has(k) && olay.event_type !== 'CTA_CLICK') return;
  gorulen.add(k);
  kuyruk.push(olay);
  if (kuyruk.length >= 8) {
    if (zamanlayici) clearTimeout(zamanlayici);
    zamanlayici = null;
    void bosalt();
    return;
  }
  zamanla();
}
