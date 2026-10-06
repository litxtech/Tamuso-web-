import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export type WebTanitimMedya = {
  id: string;
  tur: 'video' | 'image';
  public_url: string;
  baslik: string | null;
  sira?: number;
  anasayfa?: boolean;
  lobi?: boolean;
  aktif?: boolean;
  storage_path?: string | null;
  mime_type?: string | null;
};

export const VARSAYILAN_TANITIM_MEDYA: WebTanitimMedya[] = [
  { id: 'yerel-cagri', tur: 'video', public_url: '/tanitim/cagri.mp4', baslik: 'Görüntülü gülüş', sira: 4 },
  { id: 'yerel-portre', tur: 'video', public_url: '/tanitim/portre.mp4', baslik: 'Portre', sira: 5 },
  { id: 'yerel-vlog', tur: 'video', public_url: '/tanitim/vlog.mp4', baslik: 'Yayın', sira: 6 },
  { id: 'yerel-gorusme', tur: 'video', public_url: '/tanitim/gorusme.mp4', baslik: 'Görüntülü görüşme', sira: 10 },
  { id: 'yerel-canli', tur: 'video', public_url: '/tanitim/canli.mp4', baslik: 'Canlı yayın', sira: 20 },
  { id: 'yerel-arkadas', tur: 'video', public_url: '/tanitim/arkadas.mp4', baslik: 'Arkadaş bul', sira: 30 },
];

const SITE = 'https://www.tamuso.com';

/** Webde göreli yol yerelde de çalışır. Telefonda lobi tam adres ister. */
export function TanitimMedyaUri(url: string, mutlak = Platform.OS !== 'web'): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('/') && mutlak) return `${SITE}${t}`;
  return t;
}

export async function WebTanitimMedyaGetir(
  yer: 'anasayfa' | 'lobi',
): Promise<WebTanitimMedya[]> {
  const { data, error } = await supabase.rpc('web_tanitim_medya_public', {
    p_yer: yer,
  });
  if (error || !Array.isArray(data) || data.length === 0) {
    return yer === 'anasayfa' ? VARSAYILAN_TANITIM_MEDYA : [];
  }
  return data as WebTanitimMedya[];
}
